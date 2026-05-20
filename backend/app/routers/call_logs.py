from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.database import get_db
from app.middleware.auth import require_role
from app.models.call_log import CallLog
from app.models.doctor import Doctor
from app.models.session import Session
from app.schemas.call_log import CallLogResponse

router = APIRouter(
    prefix="/api",
    tags=["call-logs"],
    dependencies=[Depends(require_role("super_admin"))],
)


@router.get("/call-logs", response_model=list[CallLogResponse])
def list_call_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    doctor_id: int = None,
    db: Session = Depends(get_db),
):
    q = db.query(CallLog)
    if doctor_id:
        q = q.filter(CallLog.doctor_id == doctor_id)
    q = q.order_by(CallLog.created_at.desc())
    offset = (page - 1) * page_size
    return q.offset(offset).limit(page_size).all()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_doctors = db.query(sqlfunc.count(Doctor.id)).scalar()
    online_doctors = db.query(sqlfunc.count(Doctor.id)).filter(Doctor.status == "online").scalar()
    total_sessions = db.query(sqlfunc.count(Session.id)).scalar()
    total_calls = db.query(sqlfunc.count(CallLog.id)).scalar()
    calls_today = db.query(sqlfunc.count(CallLog.id)).filter(
        sqlfunc.date(CallLog.created_at) == sqlfunc.date("now")
    ).scalar()
    avg_time = db.query(sqlfunc.avg(CallLog.response_time_ms)).filter(CallLog.status == "success").scalar() or 0

    return {
        "total_doctors": total_doctors,
        "online_doctors": online_doctors,
        "total_sessions": total_sessions,
        "total_calls": total_calls,
        "calls_today": calls_today,
        "avg_response_time_ms": round(float(avg_time)),
    }
