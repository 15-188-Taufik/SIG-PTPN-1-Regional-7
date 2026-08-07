from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = None
SessionLocal = None

is_mock = not settings.DATABASE_URL or settings.DATABASE_URL.startswith("mock")

from sqlalchemy.pool import NullPool

if not is_mock:
    try:
        engine = create_engine(
            settings.DATABASE_URL,
            poolclass=NullPool
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        print(f"Warning: Gagal membuat engine database ({e}). Beralih ke fallback file lokal.")
        is_mock = True


def get_db():
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
