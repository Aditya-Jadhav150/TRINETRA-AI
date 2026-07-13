import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
from app.routers.auth import get_current_user, RoleChecker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Security Audits"])

@router.get("/logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(RoleChecker(["Administrator"])) # Admin only RBAC check!
):
    """
    Retrieve system audit logs. Admin role restricted.
    """
    logger.info(f"Admin user {user['username']} reading system audit logs.")
    
    logs = db.query(models.AuditLog)\
        .order_by(models.AuditLog.Timestamp.desc())\
        .limit(limit).all()
        
    res = []
    for log in logs:
        res.append({
            "id": log.AuditLogID,
            "username": log.Username,
            "role": log.Role,
            "action": log.Action,
            "details": log.Details,
            "timestamp": str(log.Timestamp),
            "ip_address": log.IPAddress or "127.0.0.1"
        })
        
    return res

@router.post("/log")
def create_custom_audit_log(
    action: str,
    details: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Allows the client application to record user interactions in the central audit trail.
    """
    try:
        log = models.AuditLog(
            Username=user["username"],
            Role=user["role"],
            Action=action,
            Details=details
        )
        db.add(log)
        db.commit()
        return {"status": "SUCCESS", "message": "Interaction logged successfully."}
    except Exception as e:
        logger.error(f"Failed to record custom client audit log: {e}")
        db.rollback()
        return {"status": "ERROR", "message": str(e)}
