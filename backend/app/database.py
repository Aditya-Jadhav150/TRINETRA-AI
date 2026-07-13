import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from neo4j import GraphDatabase
from qdrant_client import QdrantClient
import redis
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. PostgreSQL setup
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. Neo4j setup
neo4j_driver = None
try:
    neo4j_driver = GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
    )
    logger.info("Neo4j driver initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Neo4j driver: {e}")

# 3. Qdrant setup
qdrant_client = None
try:
    if settings.QDRANT_API_KEY:
        qdrant_client = QdrantClient(
            url=settings.QDRANT_URL or f"https://{settings.QDRANT_HOST}",
            api_key=settings.QDRANT_API_KEY
        )
    else:
        qdrant_client = QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT
        )
    logger.info("Qdrant client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Qdrant client: {e}")

# 4. Redis setup
redis_client = None
try:
    if settings.REDIS_URL:
        redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5
        )
    else:
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True,
            socket_timeout=5
        )
    logger.info("Redis client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")

def check_db_health():
    status = {
        "postgres": "UNKNOWN",
        "neo4j": "UNKNOWN",
        "qdrant": "UNKNOWN",
        "redis": "UNKNOWN"
    }
    
    # Check Postgres
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        status["postgres"] = "HEALTHY"
    except Exception as e:
        status["postgres"] = f"UNHEALTHY: {str(e)}"
        
    # Check Neo4j
    if neo4j_driver:
        try:
            with neo4j_driver.session() as session:
                session.run("RETURN 1")
            status["neo4j"] = "HEALTHY"
        except Exception as e:
            status["neo4j"] = f"UNHEALTHY: {str(e)}"
    else:
        status["neo4j"] = "NOT_INITIALIZED"
        
    # Check Qdrant
    if qdrant_client:
        try:
            # simple check by listing collections
            qdrant_client.get_collections()
            status["qdrant"] = "HEALTHY"
        except Exception as e:
            status["qdrant"] = f"UNHEALTHY: {str(e)}"
    else:
        status["qdrant"] = "NOT_INITIALIZED"
        
    # Check Redis
    if redis_client:
        try:
            redis_client.ping()
            status["redis"] = "HEALTHY"
        except Exception as e:
            status["redis"] = f"UNHEALTHY: {str(e)}"
    else:
        status["redis"] = "NOT_INITIALIZED"
        
    return status
