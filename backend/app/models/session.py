from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_escalated = Column(Boolean, default=False)
    escalation_id = Column(Integer, ForeignKey("escalation_queue.id"), nullable=True)
    patient_name = Column(String(50), default="")
    symptom = Column(String(200), default="")
    status = Column(String(20), default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    doctor = relationship("Doctor", backref="sessions", lazy="noload")
    messages = relationship("Message", back_populates="session", order_by="Message.created_at", lazy="noload")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    role = Column(String(10), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(10), default="ai")
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("Session", back_populates="messages", lazy="noload")
