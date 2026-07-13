import logging
from typing import List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db, check_db_health
from app.seed import seed_database
from app.routers import auth, analytics, forecast, reports, audit
from app.routers.auth import get_current_user
from app.services.agents import AgentOrchestrator
from app import models

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TRINETRA AI - Crime Intelligence API",
    description="Intelligent Conversational Crime Analytics Platform for Karnataka Police",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins, restricted by security roles in headers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event: Seed mock data
@app.on_event("startup")
def on_startup():
    logger.info("Starting up TRINETRA AI services...")
    try:
        seed_database()
        logger.info("Database initialized and seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding database on startup: {e}")

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

# ==========================================
# Chat & Memory Persistence Endpoints
# ==========================================

class QueryRequest(BaseModel):
    session_id: str
    query: str

@app.post("/api/chat/query")
def process_agent_query(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Process user natural language query via the multi-agent orchestrator
    """
    try:
        logger.info(f"Query request in session {payload.session_id} from user {user['username']}")
        res = AgentOrchestrator.process_query(
            db=db,
            session_id=payload.session_id,
            query=payload.query,
            username=user["username"]
        )
        return res
    except Exception as e:
        logger.error(f"Failed to process agent query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/sessions")
def get_user_chat_sessions(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    List previous conversation sessions for session restoration
    """
    sessions = db.query(models.ConversationSession)\
        .filter(models.ConversationSession.Username == user["username"])\
        .order_by(models.ConversationSession.UpdatedAt.desc()).all()
        
    return [
        {
            "session_id": s.SessionID,
            "title": s.Title,
            "created_at": str(s.CreatedAt),
            "updated_at": str(s.UpdatedAt)
        }
        for s in sessions
    ]

@app.get("/api/chat/sessions/{session_id}/messages")
def get_session_messages_history(
    session_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Load message history for a specific conversation session
    """
    session = db.query(models.ConversationSession)\
        .filter(models.ConversationSession.SessionID == session_id, models.ConversationSession.Username == user["username"])\
        .first()
        
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    messages = db.query(models.ChatMessage)\
        .filter(models.ChatMessage.SessionID == session_id)\
        .order_by(models.ChatMessage.Timestamp.asc()).all()
        
    res = []
    for msg in messages:
        evidence_dict = None
        if msg.Evidence:
            try:
                evidence_dict = json_loads_safe(msg.Evidence)
            except Exception:
                evidence_dict = {}
                
        res.append({
            "message_id": msg.MessageID,
            "sender": msg.Sender,
            "content": msg.Content,
            "timestamp": str(msg.Timestamp),
            "evidence": evidence_dict
        })
        
    return res

# Health check
@app.get("/api/health")
def api_health():
    db_health = check_db_health()
    return {
        "status": "HEALTHY" if all(v == "HEALTHY" for v in db_health.values()) else "DEGRADED",
        "services": db_health
    }


def json_loads_safe(val: str):
    import json
    return json.loads(val)
