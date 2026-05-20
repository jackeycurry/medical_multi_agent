from pydantic import BaseModel


class ClaimRequest(BaseModel):
    pass  # user_id extracted from token


class DoctorReply(BaseModel):
    content: str
