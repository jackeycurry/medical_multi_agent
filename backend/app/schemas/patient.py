from pydantic import BaseModel


class PatientConsultStart(BaseModel):
    hospital_code: str
    symptom: str = ""
    department: str = ""


class PatientMessage(BaseModel):
    content: str


class PatientEscalate(BaseModel):
    reason: str = ""
