import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models
from app.database import get_db, redis_client
from app.config import settings

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing configuration (using native bcrypt directly)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Hashed password for 'password123' using native bcrypt
HASHED_PASSWORD_DEMO = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Static demo accounts
DEMO_USERS: Dict[str, dict] = {
    "investigator": {"username": "investigator", "password_hash": HASHED_PASSWORD_DEMO, "role": "Investigator"},
    "analyst": {"username": "analyst", "password_hash": HASHED_PASSWORD_DEMO, "role": "Analyst"},
    "supervisor": {"username": "supervisor", "password_hash": HASHED_PASSWORD_DEMO, "role": "Supervisor"},
    "admin": {"username": "admin", "password_hash": HASHED_PASSWORD_DEMO, "role": "Administrator"}
}

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str # Investigator, Analyst, Supervisor, Administrator

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    username: str
    role: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm="HS256")
    return encoded_jwt

# Verify tokens
def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        return {"username": username, "role": role}
    except JWTError:
        raise credentials_exception

# Role verifiers
class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {self.allowed_roles}"
            )
        return user

# Helper to log audit actions
def log_audit(db: Session, username: str, role: str, action: str, details: str):
    try:
        audit = models.AuditLog(
            Username=username,
            Role=role,
            Action=action,
            Details=details
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = DEMO_USERS.get(payload.username.lower())
    if not user:
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    if user["role"] != payload.role:
        raise HTTPException(status_code=400, detail="Requested role does not match user account")
        
    if not bcrypt.checkpw(payload.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    # Generate tokens
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    refresh_token = create_refresh_token(data={"sub": user["username"], "role": user["role"]})
    
    # Store session in Redis if available
    if redis_client:
        try:
            redis_client.setex(f"session:{user['username']}", 3600, user["role"])
        except Exception as e:
            logger.warning(f"Failed to cache session in Redis: {e}")
            
    # Log audit trail
    log_audit(db, user["username"], user["role"], "LOGIN", "Successfully logged in to platform")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"]
    }

@router.post("/logout")
def logout(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if redis_client:
        try:
            redis_client.delete(f"session:{user['username']}")
        except Exception as e:
            logger.warning(f"Failed to clear session in Redis: {e}")
            
    log_audit(db, user["username"], user["role"], "LOGOUT", "User logged out")
    return {"message": "Successfully logged out"}
