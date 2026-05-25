from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth Schemas ───────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str


# ─── Trip Schemas ────────────────────────────────────────

class TripCreate(BaseModel):
    destination: str
    num_days: int
    budget: str
    interests: str

class TripOut(BaseModel):
    id: int
    destination: str
    num_days: int
    budget: str
    interests: str
    itinerary: Optional[dict] = None
    share_token: str
    created_at: datetime

    class Config:
        from_attributes = True