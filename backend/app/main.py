from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.seed import seed_all
from app.routers import doctors, consultations, external_api, call_logs, auth, patient_api, doctor_api, hospital_api

Base.metadata.create_all(bind=engine)

seed_all(SessionLocal())

app = FastAPI(title="大健康AI智能体医生平台", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(consultations.router)
app.include_router(external_api.router)
app.include_router(call_logs.router)
app.include_router(patient_api.router)
app.include_router(doctor_api.router)
app.include_router(hospital_api.router)
