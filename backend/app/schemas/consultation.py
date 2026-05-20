from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SessionCreate(BaseModel):
    doctor_id: int
    symptom: str = ""
    patient_name: str = ""


class SessionResponse(BaseModel):
    id: int
    doctor_id: int
    patient_name: str
    symptom: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StartConsultationResponse(BaseModel):
    session_id: int
    doctor: dict
    greeting: str
