from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.doctor import Doctor
from app.models.session import Session, Message
from app.models.user import User
from app.models.escalation import EscalationQueue
from app.models.call_log import CallLog

router = APIRouter(prefix="/api/hospital", tags=["hospital"])


def get_hospital(request: Request) -> int:
    user = get_current_user(request)
    role = user.get("role")
    if role == "super_admin":
        return 0
    if role != "hospital_admin":
        raise HTTPException(status_code=403, detail="仅医院管理员可访问")
    hid = user.get("hid")
    if not hid:
        raise HTTPException(status_code=400, detail="未关联医院")
    return hid


@router.get("/stats")
def stats(request: Request, db: Session = Depends(get_db)):
    hid = get_hospital(request)
    q_sessions = db.query(Session).filter(Session.hospital_id == hid) if hid else db.query(Session)
    q_doctors = db.query(Doctor).filter(Doctor.hospital_id == hid) if hid else db.query(Doctor)
    q_users = db.query(User).filter(User.hospital_id == hid, User.role == "patient") if hid else db.query(User).filter(User.role == "patient")
    q_real_doctors = db.query(User).filter(User.hospital_id == hid, User.role == "doctor") if hid else db.query(User).filter(User.role == "doctor")
    q_esc = db.query(EscalationQueue).filter(EscalationQueue.hospital_id == hid) if hid else db.query(EscalationQueue)

    return {
        "total_patients": q_users.count(),
        "total_ai_doctors": q_doctors.count(),
        "total_real_doctors": q_real_doctors.count(),
        "total_sessions": q_sessions.count(),
        "sessions_today": q_sessions.filter(func.date(Session.created_at) == func.date("now")).count(),
        "escalation_total": q_esc.count(),
        "escalation_pending": q_esc.filter(EscalationQueue.status == "pending").count(),
    }


@router.get("/patients")
def patients(page: int = 1, page_size: int = 20, request: Request = None,
             db: Session = Depends(get_db)):
    hid = get_hospital(request)
    q = db.query(User).filter(User.role == "patient")
    if hid:
        q = q.filter(User.hospital_id == hid)

    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for p in items:
        sessions = db.query(Session).filter(Session.patient_id == p.id).all()
        esc_count = db.query(EscalationQueue).filter(EscalationQueue.patient_id == p.id).count()
        last_s = sessions[0] if sessions else None
        result.append({
            "id": p.id, "name": p.name, "phone": p.phone[:3] + "****" + p.phone[-4:] if p.phone else "",
            "tags": [],
            "session_count": len(sessions),
            "last_session_time": str(last_s.created_at) if last_s else "",
            "last_symptom": last_s.symptom if last_s else "",
            "escalation_count": esc_count,
        })
    return {"total": total, "items": result}


@router.get("/patients/{patient_id}/profile")
def patient_profile(patient_id: int, request: Request, db: Session = Depends(get_db)):
    hid = get_hospital(request)
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(status_code=404, detail="病人不存在")
    if hid and patient.hospital_id != hid:
        raise HTTPException(status_code=403, detail="无权查看")

    sessions = db.query(Session).filter(Session.patient_id == patient_id).order_by(Session.created_at.desc()).all()
    symptoms = [s.symptom for s in sessions if s.symptom]
    departments = []
    for s in sessions:
        doc = db.query(Doctor).filter(Doctor.id == s.doctor_id).first()
        if doc and doc.department not in departments:
            departments.append(doc.department)

    timeline = []
    for s in sessions[:10]:
        doc = db.query(Doctor).filter(Doctor.id == s.doctor_id).first()
        esc = db.query(EscalationQueue).filter(EscalationQueue.session_id == s.id).first()
        timeline.append({
            "date": str(s.created_at)[:10],
            "event": "问诊",
            "detail": f"{s.symptom[:30] if s.symptom else '咨询'}，{doc.name if doc else ''}接诊",
            "escalated": s.is_escalated,
        })

    return {
        "id": patient.id, "name": patient.name,
        "phone": patient.phone[:3] + "****" + patient.phone[-4:] if patient.phone else "",
        "registered_at": str(patient.created_at)[:10],
        "tags": [],
        "stats": {
            "total_sessions": len(sessions),
            "escalation_count": db.query(EscalationQueue).filter(EscalationQueue.patient_id == patient_id).count(),
            "common_symptoms": list(set(symptoms))[:5],
            "common_departments": departments,
        },
        "timeline": timeline,
    }


@router.get("/sessions")
def sessions(page: int = 1, page_size: int = 20, patient_id: int = None,
             is_escalated: bool = None, request: Request = None, db: Session = Depends(get_db)):
    hid = get_hospital(request)
    q = db.query(Session)
    if hid:
        q = q.filter(Session.hospital_id == hid)
    if patient_id:
        q = q.filter(Session.patient_id == patient_id)
    if is_escalated is not None:
        q = q.filter(Session.is_escalated == is_escalated)

    total = q.count()
    items = q.order_by(Session.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for s in items:
        patient = db.query(User).filter(User.id == s.patient_id).first()
        ai_doc = db.query(Doctor).filter(Doctor.id == s.doctor_id).first()
        real_doc = db.query(User).filter(User.id == s.assigned_user_id).first()
        msg_count = db.query(Message).filter(Message.session_id == s.id).count()
        result.append({
            "session_id": s.id,
            "patient_name": patient.name if patient else s.patient_name,
            "ai_doctor_name": ai_doc.name if ai_doc else "",
            "real_doctor_name": real_doc.name if real_doc else "",
            "is_escalated": s.is_escalated,
            "symptom": s.symptom,
            "message_count": msg_count,
            "started_at": str(s.created_at),
        })
    return {"total": total, "items": result}


@router.get("/sessions/{session_id}")
def session_detail(session_id: int, request: Request, db: Session = Depends(get_db)):
    hid = get_hospital(request)
    q = db.query(Session).filter(Session.id == session_id)
    if hid:
        q = q.filter(Session.hospital_id == hid)
    s = q.first()
    if not s:
        raise HTTPException(status_code=404, detail="会话不存在")

    patient = db.query(User).filter(User.id == s.patient_id).first()
    ai_doc = db.query(Doctor).filter(Doctor.id == s.doctor_id).first()
    real_doc = db.query(User).filter(User.id == s.assigned_user_id).first()
    esc = db.query(EscalationQueue).filter(EscalationQueue.session_id == session_id).first()
    msgs = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at).all()

    return {
        "session_id": s.id,
        "patient": {"name": patient.name if patient else s.patient_name, "phone": ""},
        "ai_doctor": {"name": ai_doc.name if ai_doc else "", "department": ai_doc.department if ai_doc else ""},
        "real_doctor": {"name": real_doc.name} if real_doc else None,
        "is_escalated": s.is_escalated,
        "escalation_reason": esc.reason if esc else "",
        "messages": [{"role": m.role, "content": m.content, "created_at": str(m.created_at)[11:19], "source": m.source} for m in msgs],
    }
