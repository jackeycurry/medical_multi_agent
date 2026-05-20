import json
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import consultation_service, routing_service
from app.models.doctor import Doctor
from app.models.session import Session
from app.middleware.api_key import require_external_api_key

router = APIRouter(prefix="/api/v1", tags=["external-api"])


@router.get("/doctors")
def list_doctors(
    caller: dict = Depends(require_external_api_key),
    db: Session = Depends(get_db),
):
    hid = caller["hospital_id"]
    doctors = db.query(Doctor).filter(
        Doctor.status == "online",
        Doctor.hospital_id == hid,
    ).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "department": d.department,
            "specialty": d.specialty,
            "status": d.status,
        }
        for d in doctors
    ]


@router.post("/consultations")
def start_consultation(
    symptom: str = "", department: str = "", doctor_id: int = 0, patient_name: str = "",
    caller: dict = Depends(require_external_api_key),
    db: Session = Depends(get_db),
):
    hid = caller["hospital_id"]
    start = time.time()
    request_params = json.dumps({"symptom": symptom, "department": department, "doctor_id": doctor_id, "patient_name": patient_name, "hospital_id": hid}, ensure_ascii=False)
    try:
        session, doctor, reply = consultation_service.start_session(
            db, doctor_id=doctor_id or None, symptom=symptom,
            patient_name=patient_name, hospital_id=hid,
        )
        elapsed = int((time.time() - start) * 1000)
        if not session:
            consultation_service.log_call(db, None, None, "/api/v1/consultations",
                                          request_params, elapsed, "failure", reply)
            raise HTTPException(status_code=400, detail=reply)

        consultation_service.log_call(db, doctor.id, session.id, "/api/v1/consultations",
                                      request_params, elapsed, "success")
        return {
            "session_id": session.id,
            "doctor": {"id": doctor.id, "name": doctor.name, "department": doctor.department},
            "greeting": reply,
        }
    except HTTPException:
        raise
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        consultation_service.log_call(db, None, None, "/api/v1/consultations",
                                      request_params, elapsed, "failure", str(e))
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")


@router.post("/consultations/{session_id}/message")
def send_message(
    session_id: int, content: str = "",
    caller: dict = Depends(require_external_api_key),
    db: Session = Depends(get_db),
):
    hid = caller["hospital_id"]
    start = time.time()
    request_params = json.dumps({"session_id": session_id, "content": content}, ensure_ascii=False)
    try:
        # 先校验 session 归属，避免泄漏 doctor_id
        session = db.query(Session).filter(
            Session.id == session_id, Session.hospital_id == hid,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")

        reply, error = consultation_service.send_message(db, session_id, content, hospital_id=hid)
        elapsed = int((time.time() - start) * 1000)
        if error:
            consultation_service.log_call(db, session.doctor_id, session_id,
                                          f"/api/v1/consultations/{session_id}/message",
                                          request_params, elapsed, "failure", error)
            raise HTTPException(status_code=400, detail=error)
        consultation_service.log_call(db, session.doctor_id, session_id,
                                      f"/api/v1/consultations/{session_id}/message",
                                      request_params, elapsed, "success")
        return {"reply": reply, "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        consultation_service.log_call(db, None, session_id,
                                      f"/api/v1/consultations/{session_id}/message",
                                      request_params, elapsed, "failure", str(e))
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")


@router.get("/consultations/{session_id}")
def get_session(
    session_id: int,
    caller: dict = Depends(require_external_api_key),
    db: Session = Depends(get_db),
):
    hid = caller["hospital_id"]
    session = db.query(Session).filter(
        Session.id == session_id, Session.hospital_id == hid,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    messages = consultation_service.get_session_messages(db, session_id)
    return {
        "session_id": session.id,
        "doctor_id": session.doctor_id,
        "status": session.status,
        "symptom": session.symptom,
        "messages": [{"role": m.role, "content": m.content, "created_at": str(m.created_at)} for m in messages],
    }
