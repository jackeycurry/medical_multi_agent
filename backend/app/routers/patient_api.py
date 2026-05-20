import asyncio
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, SessionLocal
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.session import Session, Message
from app.models.escalation import EscalationQueue
from app.models.user import User
from app.schemas.patient import PatientConsultStart, PatientMessage, PatientEscalate
from app.services.routing_service import match_doctor
from app.services.ai_service import chat as ai_chat, chat_stream as ai_chat_stream
from app.middleware.auth import get_current_user


def require_patient(request: Request) -> dict:
    user = get_current_user(request)
    if user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="仅患者可访问")
    return user


router = APIRouter(prefix="/api/patient", tags=["patient"])


@router.get("/hospitals")
def list_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    result = []
    for h in hospitals:
        depts = [d[0] for d in db.query(Doctor.department).filter(
            Doctor.hospital_id == h.id, Doctor.status == "online"
        ).distinct().all()]
        result.append({
            "id": h.id,
            "name": h.name,
            "code": h.code,
            "departments": depts,
        })
    return result


@router.post("/consultations/start")
def start_consultation(
    data: PatientConsultStart,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_patient),
):
    hospital = db.query(Hospital).filter(Hospital.code == data.hospital_code).first()
    if not hospital:
        raise HTTPException(status_code=400, detail="医院不存在")

    doctor = match_doctor(db, symptom=data.symptom, department=data.department,
                          hospital_id=hospital.id)
    if not doctor:
        raise HTTPException(status_code=400, detail="该医院暂无可用医生")

    patient_user = db.query(User).filter(User.id == current_user["sub"]).first()
    patient_name = patient_user.name if patient_user else "患者"

    session = Session(
        doctor_id=doctor.id,
        hospital_id=hospital.id,
        patient_id=current_user["sub"],
        patient_name=patient_name,
        symptom=data.symptom,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    messages = [{"role": "system", "content": doctor.system_prompt}]
    messages.append({"role": "user", "content": f"您好，我的症状是：{data.symptom or '初次问诊'}。请开始问诊。"})
    try:
        reply_text, _ = ai_chat(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 服务暂时不可用：{str(e)}")

    db.add(Message(session_id=session.id, role="assistant", content=reply_text, source="ai"))
    db.commit()

    return {
        "session_id": session.id,
        "doctor": {"id": doctor.id, "name": doctor.name, "department": doctor.department},
        "greeting": reply_text,
    }


@router.post("/consultations/{session_id}/message")
def send_message(
    session_id: int,
    data: PatientMessage,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_patient),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if session.patient_id != current_user["sub"]:
        raise HTTPException(status_code=403, detail="无权访问该会话")

    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=400, detail="医生不存在")

    db.add(Message(session_id=session_id, role="user", content=data.content, source="patient"))
    db.commit()

    # 检查真人医生是否正在进行中
    active_esc = db.query(EscalationQueue).filter(
        EscalationQueue.session_id == session_id,
        EscalationQueue.status == "in_progress",
    ).first()

    if active_esc:
        # 真人医生在线 → 不调 AI，由医生回复
        assistant_msg = Message(
            session_id=session_id, role="assistant", content="已收到您的消息，真人医生正在处理中，请稍候。", source="ai"
        )
        db.add(assistant_msg)
        db.commit()
        return {"reply": assistant_msg.content, "session_id": session_id, "doctor_online": True}

    history = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.role.in_(["user", "assistant"]))
        .order_by(Message.created_at)
        .all()
    )

    # 检查是否有已结束的真人医生介入历史
    has_human = any(m.source == "human" for m in history)
    system_content = doctor.system_prompt
    if has_human:
        system_content += (
            "\n\n注意：已有一位真人医生参与过此会话。"
            "对话中标记[真人医生]的内容是医生的专业判断，请勿与之矛盾，"
            "你可以补充科普信息、用药注意事项和生活建议来辅助。"
        )

    messages = [{"role": "system", "content": system_content}]
    for msg in history:
        if msg.source == "human":
            messages.append({"role": "assistant", "content": f"[真人医生] {msg.content}"})
        else:
            messages.append({"role": msg.role, "content": msg.content})

    doctor_id = doctor.id

    def event_stream():
        full_text = ""
        try:
            for piece in ai_chat_stream(messages):
                full_text += piece
                yield f"data: {json.dumps({'delta': piece}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': f'AI 服务暂时不可用：{str(e)}'}, ensure_ascii=False)}\n\n"
            return

        # 流式生成完成，在新 session 中落库
        write_db = SessionLocal()
        try:
            write_db.add(Message(session_id=session_id, role="assistant", content=full_text, source="ai"))
            d = write_db.query(Doctor).filter(Doctor.id == doctor_id).first()
            if d:
                d.call_count += 1
            write_db.commit()
        finally:
            write_db.close()

        yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/consultations/{session_id}/messages")
async def get_messages(
    session_id: int,
    after_id: int = 0,
    wait: int = 0,
    current_user: dict = Depends(require_patient),
):
    """获取会话消息。
    - 默认（wait=0）：返回当前所有消息，立即响应。
    - 长轮询（after_id>0, wait>0）：服务端 hold 至多 wait 秒（封顶 30s），
      一旦出现 id>after_id 的新消息立即返回；超时返回空列表，客户端可立即重连。
    """
    patient_id = current_user["sub"]

    def query_once():
        db = SessionLocal()
        try:
            session = db.query(Session).filter(Session.id == session_id).first()
            if not session:
                return "notfound", None
            if session.patient_id != patient_id:
                return "denied", None
            q = db.query(Message).filter(Message.session_id == session_id)
            if after_id:
                q = q.filter(Message.id > after_id)
            msgs = q.order_by(Message.id).all()
            return "ok", [
                {"id": m.id, "role": m.role, "content": m.content,
                 "created_at": str(m.created_at), "source": m.source}
                for m in msgs
            ]
        finally:
            db.close()

    status, data = await run_in_threadpool(query_once)
    if status == "notfound":
        raise HTTPException(status_code=404, detail="会话不存在")
    if status == "denied":
        raise HTTPException(status_code=403, detail="无权访问该会话")
    if data or wait <= 0:
        return data

    deadline = time.monotonic() + min(wait, 30)
    while time.monotonic() < deadline:
        await asyncio.sleep(0.2)
        status, data = await run_in_threadpool(query_once)
        if status != "ok":
            raise HTTPException(status_code=410, detail="会话状态变化")
        if data:
            return data
    return []


@router.post("/consultations/{session_id}/escalate")
def escalate(
    session_id: int,
    data: PatientEscalate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_patient),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if session.patient_id != current_user["sub"]:
        raise HTTPException(status_code=403, detail="无权访问该会话")

    existing = db.query(EscalationQueue).filter(
        EscalationQueue.session_id == session_id,
        EscalationQueue.status.in_(["pending", "in_progress"]),
    ).first()
    if existing:
        return {"escalation_id": existing.id, "status": existing.status,
                "message": "已有进行中的真人接诊请求"}

    escalation = EscalationQueue(
        session_id=session_id,
        hospital_id=session.hospital_id,
        patient_id=session.patient_id,
        reason=data.reason,
        status="pending",
    )
    db.add(escalation)
    session.is_escalated = True
    db.commit()
    db.refresh(escalation)

    queue_pos = db.query(func.count(EscalationQueue.id)).filter(
        EscalationQueue.hospital_id == session.hospital_id,
        EscalationQueue.status == "pending",
        EscalationQueue.id <= escalation.id,
    ).scalar()

    return {
        "escalation_id": escalation.id,
        "status": "pending",
        "message": f"已提交真人接诊请求，当前排队位置：第 {queue_pos} 位。您可继续与 AI 医生交流。",
    }


@router.get("/consultations/{session_id}/escalation-status")
def escalation_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_patient),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if session.patient_id != current_user["sub"]:
        raise HTTPException(status_code=403, detail="无权访问该会话")

    esc = db.query(EscalationQueue).filter(
        EscalationQueue.session_id == session_id,
        EscalationQueue.status.in_(["pending", "in_progress"]),
    ).order_by(EscalationQueue.created_at.desc()).first()

    if not esc:
        return {"status": "none", "message": "未请求真人接诊"}

    queue_pos = 0
    doctor_info = None
    if esc.status == "pending":
        queue_pos = db.query(func.count(EscalationQueue.id)).filter(
            EscalationQueue.hospital_id == esc.hospital_id,
            EscalationQueue.status == "pending",
            EscalationQueue.id <= esc.id,
        ).scalar()
    elif esc.assigned_doctor_id:
        doc = db.query(User).filter(User.id == esc.assigned_doctor_id).first()
        if doc:
            doctor_info = {"name": doc.name, "specialty": doc.specialty}

    return {
        "escalation_id": esc.id,
        "status": esc.status,
        "assigned_doctor": doctor_info,
        "queue_position": queue_pos,
    }
