from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorStatusUpdate, DoctorResponse, DoctorBrief
from app.services import doctor_service

router = APIRouter(
    prefix="/api/doctors",
    tags=["doctors"],
    dependencies=[Depends(require_role("super_admin"))],
)


@router.get("", response_model=list[DoctorBrief])
def list_doctors(department: str = None, status: str = None, db: Session = Depends(get_db)):
    return doctor_service.list_doctors(db, department=department, status=status)


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = doctor_service.get_doctor(db, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="医生不存在")
    return doctor


@router.post("", response_model=DoctorResponse, status_code=201)
def create_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    return doctor_service.create_doctor(db, data)


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(doctor_id: int, data: DoctorUpdate, db: Session = Depends(get_db)):
    doctor = doctor_service.update_doctor(db, doctor_id, data)
    if not doctor:
        raise HTTPException(status_code=404, detail="医生不存在")
    return doctor


@router.patch("/{doctor_id}/status", response_model=DoctorResponse)
def update_doctor_status(doctor_id: int, data: DoctorStatusUpdate, db: Session = Depends(get_db)):
    doctor = doctor_service.update_status(db, doctor_id, data.status)
    if not doctor:
        raise HTTPException(status_code=404, detail="医生不存在")
    return doctor


@router.delete("/{doctor_id}")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    ok = doctor_service.delete_doctor(db, doctor_id)
    if not ok:
        raise HTTPException(status_code=404, detail="医生不存在")
    return {"ok": True}
