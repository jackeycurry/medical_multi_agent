from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    phone: str = ""
    hospital_code: str = ""


class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    hospital_id: int | None
    hospital_name: str | None
    specialty: str = ""
    phone: str = ""


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
