from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    trips = relationship("Trip", back_populates="owner")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination = Column(String, nullable=False)
    num_days = Column(Integer, nullable=False)
    budget = Column(String, nullable=False)
    interests = Column(String, nullable=False)
    itinerary = Column(JSON, nullable=True)
    share_token = Column(String, default=lambda: str(uuid.uuid4()), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="trips")