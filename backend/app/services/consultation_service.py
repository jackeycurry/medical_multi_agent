from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.session import Session, Message
from app.models.call_log import CallLog
from app.services.ai_service import chat as ai_chat
from app.services.routing_service import match_doctor


def start_session(db: Session, doctor_id: int = None, symptom: str = "",
                  patient_name: str = "", hospital_id: int = None):
    doctor = None
    if doctor_id:
        q = db.query(Doctor).filter(Doctor.id == doctor_id)
        if hospital_id:
            q = q.filter(Doctor.hospital_id == hospital_id)
        doctor = q.first()
    if not doctor:
        doctor = match_doctor(db, symptom=symptom, hospital_id=hospital_id)

    if not doctor:
        return None, None, "暂无可用医生"

    session = Session(
        doctor_id=doctor.id,
        hospital_id=doctor.hospital_id,
        symptom=symptom,
        patient_name=patient_name,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    messages = [{"role": "system", "content": doctor.system_prompt}]
    messages.append({"role": "user", "content": f"您好，我的症状是：{symptom or '初次问诊'}。请开始问诊。"})
    reply_text, response_ms = ai_chat(messages)

    assistant_msg = Message(session_id=session.id, role="assistant", content=reply_text)
    db.add(Message(session_id=session.id, role="system", content=f"[系统提示词] {doctor.system_prompt}"))
    db.add(assistant_msg)
    db.commit()

    return session, doctor, reply_text


def send_message(db: Session, session_id: int, content: str, hospital_id: int = None):
    q = db.query(Session).filter(Session.id == session_id)
    if hospital_id:
        q = q.filter(Session.hospital_id == hospital_id)
    session = q.first()
    if not session or session.status != "active":
        return None, "会话不存在或已结束"

    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()
    if not doctor:
        return None, "医生不存在"

    db.add(Message(session_id=session_id, role="user", content=content))

    history = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role.in_(["user", "assistant"]))
        .order_by(Message.created_at)
        .all()
    )
    messages = [{"role": "system", "content": doctor.system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        reply_text, response_ms = ai_chat(messages)
    except Exception as e:
        return None, f"AI响应异常: {str(e)}"

    db.add(Message(session_id=session_id, role="assistant", content=reply_text))
    doctor.call_count += 1
    db.commit()

    return reply_text, None


def get_session_messages(db: Session, session_id: int):
    return (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role.in_(["user", "assistant"]))
        .order_by(Message.created_at)
        .all()
    )


def log_call(db: Session, doctor_id: int, session_id: int, endpoint: str,
             request_params: str, response_time_ms: int, status: str, error_message: str = None):
    log = CallLog(
        doctor_id=doctor_id,
        session_id=session_id,
        endpoint=endpoint,
        request_params=request_params,
        response_time_ms=response_time_ms,
        status=status,
        error_message=error_message,
    )
    db.add(log)
    db.commit()
