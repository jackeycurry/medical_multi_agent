from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CallLogResponse(BaseModel):
    id: int
    doctor_id: Optional[int]
    session_id: Optional[int]
    endpoint: str
    request_params: Optional[str]
    response_time_ms: int
    status: str
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
