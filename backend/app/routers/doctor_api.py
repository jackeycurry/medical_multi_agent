import asyncio
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.middleware.auth import get_current_user
from app.models.session import Message, Session as ChatSession
from app.services import doctor_service
from app.schemas.doctor_api import DoctorReply

router = APIRouter(prefix="/api/doctor", tags=["doctor"])


def get_doctor_hospital(request: Request) -> tuple[int, int]:
    """返回 (user_id, hospital_id)"""
    user = get_current_user(request)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="仅医生可访问")
    hid = user.get("hid")
    if not hid:
        raise HTTPException(status_code=400, detail="医生未关联医院")
    return user["sub"], hid


@router.get("/queue")
def get_queue(request: Request, db: Session = Depends(get_db)):
    _, hid = get_doctor_hospital(request)
    return doctor_service.get_queue(db, hid)


@router.post("/queue/{escalation_id}/claim")
def claim(escalation_id: int, request: Request, db: Session = Depends(get_db)):
    uid, hid = get_doctor_hospital(request)
    ok, msg = doctor_service.claim_escalation(db, escalation_id, uid, hid)
    if not ok:
        raise HTTPException(status_code=409, detail=msg)
    session = None
    from app.models.escalation import EscalationQueue
    esc = db.query(EscalationQueue).filter(EscalationQueue.id == escalation_id).first()
    return {"success": True, "session_id": esc.session_id if esc else 0, "message": msg}


@router.get("/sessions")
def my_sessions(status: str = "", request: Request = None, db: Session = Depends(get_db)):
    uid, _ = get_doctor_hospital(request)
    return doctor_service.get_my_sessions(db, uid, status)


@router.get("/sessions/{session_id}")
def session_detail(session_id: int, request: Request, db: Session = Depends(get_db)):
    _, hid = get_doctor_hospital(request)
    detail = doctor_service.get_session_detail(db, session_id, hid)
    if not detail:
        raise HTTPException(status_code=404, detail="会话不存在")
    return detail


@router.post("/sessions/{session_id}/reply")
def reply(session_id: int, data: DoctorReply, request: Request, db: Session = Depends(get_db)):
    uid, hid = get_doctor_hospital(request)
    ok, result, msg = doctor_service.doctor_reply(db, session_id, uid, data.content, hid)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "messages": result["messages"]}


@router.get("/sessions/{session_id}/suggestion")
async def get_suggestion(session_id: int, request: Request):
    """单独获取 AI 建议。命中缓存秒返；miss 时阻塞 1-3s（DashScope）。
    与 reply / wait 解耦，前端按需异步拉取。"""
    _, hid = get_doctor_hospital(request)

    def build():
        db = SessionLocal()
        try:
            session = db.query(ChatSession).filter(
                ChatSession.id == session_id,
                ChatSession.hospital_id == hid,
            ).first()
            if not session:
                return None, "notfound"
            from app.models.doctor import Doctor
            ai_doc = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()
            if not ai_doc:
                return None, "ok"
            return doctor_service._build_ai_suggestion(db, ai_doc, session_id), "ok"
        finally:
            db.close()

    suggestion, status = await run_in_threadpool(build)
    if status == "notfound":
        raise HTTPException(status_code=404, detail="会话不存在")
    return {"ai_suggestion": suggestion}


@router.post("/sessions/{session_id}/resolve")
def resolve(session_id: int, request: Request, db: Session = Depends(get_db)):
    uid, _ = get_doctor_hospital(request)
    ok, msg = doctor_service.resolve_escalation(db, session_id, uid)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg}


@router.get("/sessions/{session_id}/wait")
async def wait_for_updates(
    session_id: int,
    after_id: int = 0,
    wait: int = 25,
    request: Request = None,
):
    """医生端长轮询：等待新消息。立即返回，不阻塞等 AI 建议。
    前端在收到新消息后单独调 /suggestion 异步刷新建议。"""
    _, hid = get_doctor_hospital(request)

    def query_once():
        db = SessionLocal()
        try:
            session = db.query(ChatSession).filter(
                ChatSession.id == session_id,
                ChatSession.hospital_id == hid,
            ).first()
            if not session:
                return "notfound", None
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

    status, msgs = await run_in_threadpool(query_once)
    if status == "notfound":
        raise HTTPException(status_code=404, detail="会话不存在")

    if not msgs and wait > 0:
        deadline = time.monotonic() + min(wait, 30)
        while time.monotonic() < deadline:
            await asyncio.sleep(0.2)
            status, msgs = await run_in_threadpool(query_once)
            if status != "ok":
                raise HTTPException(status_code=410, detail="会话状态变化")
            if msgs:
                break

    return {"messages": msgs}
