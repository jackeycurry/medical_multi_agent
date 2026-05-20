from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DoctorCreate(BaseModel):
    name: str = Field(..., max_length=50)
    department: str = Field(..., max_length=50)
    avatar_url: str = ""
    specialty: str = ""
    personality: str = ""
    system_prompt: str = ""


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    specialty: Optional[str] = None
    personality: Optional[str] = None
    system_prompt: Optional[str] = None


class DoctorStatusUpdate(BaseModel):
    status: str


class DoctorResponse(BaseModel):
    id: int
    name: str
    department: str
    avatar_url: str
    specialty: str
    personality: str
    system_prompt: str
    status: str
    call_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DoctorBrief(BaseModel):
    id: int
    name: str
    department: str
    avatar_url: str
    specialty: str
    status: str
    call_count: int

    model_config = {"from_attributes": True}
