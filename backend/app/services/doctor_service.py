from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.session import Session, Message
from app.models.escalation import EscalationQueue
from app.models.user import User
from app.services.ai_service import chat as ai_chat
from app.schemas.doctor import DoctorCreate, DoctorUpdate

# 进程内 AI 建议缓存：session_id -> (last_message_id, suggestion)
# 消息列表无变化时直接命中，省去 DashScope 调用。重启丢失可接受。
_suggestion_cache: dict[int, tuple[int, str]] = {}


# ======== AI 医生管理 ========

def list_doctors(db: Session, department: str = None, status: str = None):
    q = db.query(Doctor)
    if department:
        q = q.filter(Doctor.department == department)
    if status:
        q = q.filter(Doctor.status == status)
    return q.order_by(Doctor.id).all()


def get_doctor(db: Session, doctor_id: int):
    return db.query(Doctor).filter(Doctor.id == doctor_id).first()


def create_doctor(db: Session, data: DoctorCreate):
    doctor = Doctor(**data.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def update_doctor(db: Session, doctor_id: int, data: DoctorUpdate):
    doctor = get_doctor(db, doctor_id)
    if not doctor:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return doctor


def update_status(db: Session, doctor_id: int, status: str):
    doctor = get_doctor(db, doctor_id)
    if not doctor:
        return None
    doctor.status = status
    db.commit()
    db.refresh(doctor)
    return doctor


def delete_doctor(db: Session, doctor_id: int):
    doctor = get_doctor(db, doctor_id)
    if not doctor:
        return False
    db.delete(doctor)
    db.commit()
    return True


# ======== 医生辅助（真人接替） ========


def get_queue(db: Session, hospital_id: int):
    items = (
        db.query(EscalationQueue)
        .filter(EscalationQueue.hospital_id == hospital_id, EscalationQueue.status == "pending")
        .order_by(EscalationQueue.created_at)
        .all()
    )
    result = []
    for esc in items:
        session = db.query(Session).filter(Session.id == esc.session_id).first()
        patient = db.query(User).filter(User.id == esc.patient_id).first()
        msgs = (
            db.query(Message)
            .filter(Message.session_id == esc.session_id)
            .order_by(Message.created_at)
            .limit(4)
            .all()
        )
        result.append({
            "escalation_id": esc.id,
            "patient_name": patient.name if patient else "匿名",
            "symptom": session.symptom if session else "",
            "reason": esc.reason,
            "session_id": esc.session_id,
            "waiting_minutes": int((datetime.utcnow() - esc.created_at).total_seconds() / 60) if esc.created_at else 0,
            "messages_preview": [{"role": m.role, "content": m.content[:120]} for m in msgs],
        })
    return result


def claim_escalation(db: Session, escalation_id: int, doctor_id: int, hospital_id: int):
    esc = db.query(EscalationQueue).filter(EscalationQueue.id == escalation_id).first()
    if not esc:
        return False, "请求不存在"
    if esc.hospital_id != hospital_id:
        return False, "无权接单"

    # CAS：仅当 status 仍是 pending 时才抢到。两个医生同时点接单，只有第一个 rowcount=1。
    rowcount = (
        db.query(EscalationQueue)
        .filter(EscalationQueue.id == escalation_id, EscalationQueue.status == "pending")
        .update(
            {"status": "in_progress", "assigned_doctor_id": doctor_id},
            synchronize_session=False,
        )
    )
    if rowcount == 0:
        db.rollback()
        return False, "该请求已被其他医生接单"

    db.query(Session).filter(Session.id == esc.session_id).update(
        {"assigned_user_id": doctor_id}, synchronize_session=False
    )
    db.commit()
    return True, "已成功接单"


def get_my_sessions(db: Session, doctor_id: int, status_filter: str = ""):
    q = db.query(Session).filter(
        Session.assigned_user_id == doctor_id
    )
    if status_filter == "escalated":
        q = q.filter(Session.is_escalated == True, Session.status == "active")
    elif status_filter == "active":
        q = q.filter(Session.status == "active")
    sessions = q.order_by(Session.updated_at.desc()).all()
    result = []
    for s in sessions:
        ai_doc = db.query(Doctor).filter(Doctor.id == s.doctor_id).first()
        last_msg = db.query(Message).filter(Message.session_id == s.id).order_by(Message.created_at.desc()).first()
        patient = db.query(User).filter(User.id == s.patient_id).first()
        esc = db.query(EscalationQueue).filter(EscalationQueue.session_id == s.id).order_by(EscalationQueue.created_at.desc()).first()
        result.append({
            "session_id": s.id,
            "patient_name": patient.name if patient else s.patient_name,
            "doctor_name": f"{ai_doc.name}(AI)" if ai_doc else "",
            "is_escalated": s.is_escalated,
            "escalation_status": esc.status if esc else None,
            "last_message": last_msg.content[:100] if last_msg else "",
            "last_message_time": str(last_msg.created_at) if last_msg else "",
        })
    return result


def _build_ai_suggestion(db: Session, ai_doc: Doctor, session_id: int) -> str:
    """基于完整对话历史生成给真人医生的建议回复。
    若消息列表无变化（last_message_id 与缓存相同），直接返回缓存，省 DashScope 调用。
    """
    last_msg_id = db.query(func.max(Message.id)).filter(Message.session_id == session_id).scalar() or 0
    cached = _suggestion_cache.get(session_id)
    if cached and cached[0] == last_msg_id:
        return cached[1]

    history = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role.in_(["user", "assistant"]))
        .order_by(Message.created_at)
        .all()
    )
    ai_messages = [{
        "role": "system",
        "content": (
            ai_doc.system_prompt + "\n\n"
            "你现在是一名医疗顾问，请根据对话历史为真人医生提供一个建议回复。"
            "建议回复应包括：1.可能的诊断方向 2.需要追问的信息 3.建议的检查 4.安全注意事项"
        )
    }]
    ai_messages.append({"role": "user", "content": "以下是完整的医患对话，请生成一个建议回复供真人医生参考。"
                        "如果对话中已包含真人医生的回复，请基于最新进展给出更新的建议。"})
    for m in history[-12:]:
        tag = "患者" if m.role == "user" else ("真人医生" if m.source == "human" else "AI医生")
        ai_messages.append({"role": "user", "content": f"[{tag}] {m.content}"})

    try:
        suggestion, _ = ai_chat(ai_messages)
        _suggestion_cache[session_id] = (last_msg_id, suggestion)
        return suggestion
    except Exception:
        return "AI建议生成失败，请根据专业判断回复"


def get_session_detail(db: Session, session_id: int, hospital_id: int):
    session = db.query(Session).filter(Session.id == session_id, Session.hospital_id == hospital_id).first()
    if not session:
        return None

    ai_doc = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()
    patient = db.query(User).filter(User.id == session.patient_id).first()
    esc = db.query(EscalationQueue).filter(EscalationQueue.session_id == session_id).order_by(EscalationQueue.created_at.desc()).first()

    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at).all()
    ai_suggestion = _build_ai_suggestion(db, ai_doc, session_id)

    return {
        "session_id": session.id,
        "patient_name": patient.name if patient else session.patient_name,
        "doctor_name": f"{ai_doc.name}(AI)" if ai_doc else "",
        "escalation": {
            "status": esc.status if esc else "none",
            "reason": esc.reason if esc else "",
        },
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": str(m.created_at), "source": m.source} for m in messages],
        "ai_suggestion": ai_suggestion,
    }


def doctor_reply(db: Session, session_id: int, doctor_id: int, content: str, hospital_id: int):
    """医生回复：写入消息立即返回。AI 建议由前端在收到 messages 后异步拉取
    （/sessions/{id}/suggestion）。避免 reply 阻塞等 DashScope。"""
    session = db.query(Session).filter(Session.id == session_id, Session.hospital_id == hospital_id).first()
    if not session:
        return False, None, "会话不存在"

    esc = db.query(EscalationQueue).filter(
        EscalationQueue.session_id == session_id,
        EscalationQueue.assigned_doctor_id == doctor_id,
        EscalationQueue.status == "in_progress",
    ).first()
    if not esc:
        return False, None, "无权回复或该会话不在进行中"

    db.add(Message(session_id=session_id, role="assistant", content=content, source="human"))
    db.commit()

    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at).all()
    return True, {
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": str(m.created_at), "source": m.source} for m in messages],
    }, "回复成功"


def resolve_escalation(db: Session, session_id: int, doctor_id: int):
    esc = db.query(EscalationQueue).filter(
        EscalationQueue.session_id == session_id,
        EscalationQueue.assigned_doctor_id == doctor_id,
        EscalationQueue.status == "in_progress",
    ).first()
    if not esc:
        return False, "未找到进行中的接诊记录"
    esc.status = "resolved"
    esc.resolved_at = datetime.utcnow()
    db.commit()
    return True, "已结束本次接诊"
