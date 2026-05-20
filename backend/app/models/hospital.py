from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    address = Column(String(200), default="")
    phone = Column(String(20), default="")
    created_at = Column(DateTime, server_default=func.now())

    ai_doctors = relationship("Doctor", back_populates="hospital", lazy="noload")
