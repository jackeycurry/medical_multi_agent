from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    name = Column(String(50), nullable=False)
    role = Column(String(20), nullable=False)
    specialty = Column(String(100), default="")
    status = Column(String(20), default="online")
    phone = Column(String(20), default="")
    avatar_url = Column(String(200), default="")
    created_at = Column(DateTime, server_default=func.now())
