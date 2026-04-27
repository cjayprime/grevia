import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

user = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "")
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "3306")
db = os.getenv("DB_NAME", "grevia")
DATABASE_URL = os.getenv(
    "DATABASE_URL", f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Base declarative class for SQLAlchemy ORM models.

    Serves as the shared superclass for all mapped model classes,
    providing the common metadata registry and mapping behavior for
    database schema definitions.
    """

    pass


def init_db():
    # import models  # noqa: F401 – registers all tables
    Base.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
