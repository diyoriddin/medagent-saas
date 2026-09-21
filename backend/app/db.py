from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
from app.core.config import settings

# Create SQLAlchemy engine using DATABASE_URL from settings
DATABASE_URL = settings.DATABASE_URL

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db_session():
    """Yield a DB session (not a FastAPI dependency to keep stubs simple)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
