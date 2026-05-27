import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# ─── Test Database (SQLite in memory) ────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

Base.metadata.create_all(bind=engine)

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


# ─── Auth Tests ──────────────────────────────────────────

def test_register_user():
    response = client.post("/auth/register", json={
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert data["name"] == "Test User"
    assert "id" in data


def test_register_duplicate_email():
    # Register same email twice
    client.post("/auth/register", json={
        "name": "Test User",
        "email": "duplicate@example.com",
        "password": "password123"
    })
    response = client.post("/auth/register", json={
        "name": "Test User 2",
        "email": "duplicate@example.com",
        "password": "password456"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_success():
    # First register
    client.post("/auth/register", json={
        "name": "Login User",
        "email": "loginuser@example.com",
        "password": "password123"
    })
    # Then login
    response = client.post("/auth/login", json={
        "email": "loginuser@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password():
    # Register first
    client.post("/auth/register", json={
        "name": "Wrong Pass User",
        "email": "wrongpass@example.com",
        "password": "correctpassword"
    })
    # Login with wrong password
    response = client.post("/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_login_nonexistent_user():
    response = client.post("/auth/login", json={
        "email": "nobody@example.com",
        "password": "password123"
    })
    assert response.status_code == 401


# ─── Trip Tests ──────────────────────────────────────────

def get_auth_token():
    """Helper to register and login, returns JWT token"""
    client.post("/auth/register", json={
        "name": "Trip User",
        "email": "tripuser@example.com",
        "password": "password123"
    })
    response = client.post("/auth/login", json={
        "email": "tripuser@example.com",
        "password": "password123"
    })
    return response.json()["access_token"]


def test_get_trips_without_token():
    response = client.get("/trips/")
    assert response.status_code == 401


def test_get_trips_with_token():
    token = get_auth_token()
    response = client.get("/trips/", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_nonexistent_trip():
    token = get_auth_token()
    response = client.get("/trips/99999", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 404


def test_delete_nonexistent_trip():
    token = get_auth_token()
    response = client.delete("/trips/99999", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 404


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Travel Planner API is running!"}