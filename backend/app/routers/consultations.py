from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.schemas.consultation import SessionCreate, MessageCreate, SessionResponse, MessageResponse
from app.services import consultation_service
from app.models.session import Session, Message

router = APIRouter(
    prefix="/api",
    tags=["consultations"],
    dependencies=[Depends(require_role("super_admin"))],
)


@router.post("/consultations/start")
def start_consultation(data: SessionCreate, db: Session = Depends(get_db)):
    session, doctor, reply = consultation_service.start_session(
        db, doctor_id=data.doctor_id, symptom=data.symptom, patient_name=data.patient_name
    )
    if not session:
        raise HTTPException(status_code=400, detail=reply)
    return {
        "session_id": session.id,
        "doctor": {"id": doctor.id, "name": doctor.name, "department": doctor.department, "avatar_url": doctor.avatar_url},
        "greeting": reply,
    }


@router.post("/consultations/{session_id}/message")
def send_message(session_id: int, data: MessageCreate, db: Session = Depends(get_db)):
    reply, error = consultation_service.send_message(db, session_id, data.content)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"reply": reply, "session_id": session_id}


@router.get("/consultations/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(session_id: int, db: Session = Depends(get_db)):
    return consultation_service.get_session_messages(db, session_id)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(doctor_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Session)
    if doctor_id:
        q = q.filter(Session.doctor_id == doctor_id)
    return q.order_by(Session.created_at.desc()).all()
