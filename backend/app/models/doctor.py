from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    name = Column(String(50), nullable=False)
    department = Column(String(50), nullable=False)
    avatar_url = Column(String(200), default="")
    specialty = Column(Text, default="")
    personality = Column(Text, default="")
    system_prompt = Column(Text, default="")
    status = Column(String(20), default="online")
    call_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    hospital = relationship("Hospital", back_populates="ai_doctors", lazy="noload")
