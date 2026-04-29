"""
Shared pytest fixtures.

Uses an in-memory SQLite database so tests never touch MySQL.
The engine is created once per session; each test gets a fresh transaction
that is rolled back after the test completes.
"""
import os
import sys

# Ensure the api/ package root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Point at SQLite before any model/router is imported
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from models.database import Base, get_session
from models.company import Company
from helpers.auth import hash_password, create_access_token

# ── Database ──────────────────────────────────────────────────────────────────

SQLITE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    eng = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    # SQLite FK enforcement
    @event.listens_for(eng, "connect")
    def set_sqlite_pragma(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture()
def db_session(engine):
    """Each test runs inside a savepoint that is rolled back afterwards."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ── App / HTTP client ─────────────────────────────────────────────────────────

@pytest.fixture()
def app(db_session):
    from main import app as fastapi_app

    def _override_session():
        yield db_session

    fastapi_app.dependency_overrides[get_session] = _override_session
    yield fastapi_app
    fastapi_app.dependency_overrides.clear()


@pytest.fixture()
def client(app):
    return TestClient(app, raise_server_exceptions=True)


# ── Seed helpers ──────────────────────────────────────────────────────────────

@pytest.fixture()
def company(db_session) -> Company:
    c = Company(
        name="Grevia Test Co",
        email="test@grevia.io",
        password=hash_password("password123"),
        industry="Technology",
        region="Europe",
        country="Ireland",
    )
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


@pytest.fixture()
def auth_headers(company) -> dict:
    token = create_access_token(company.company_id)
    return {"Authorization": f"Bearer {token}"}
