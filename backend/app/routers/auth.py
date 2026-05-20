import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.hospital import Hospital
from app.schemas.auth import LoginRequest, RegisterRequest, LoginResponse, UserResponse
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "hid": user.hospital_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def user_to_response(user: User, hospital_name: str = None) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "role": user.role,
        "hospital_id": user.hospital_id,
        "hospital_name": hospital_name,
        "specialty": user.specialty or "",
        "phone": user.phone or "",
    }


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    hospital_name = None
    if user.hospital_id:
        hospital = db.query(Hospital).filter(Hospital.id == user.hospital_id).first()
        if hospital:
            hospital_name = hospital.name

    token = create_token(user)
    return LoginResponse(
        token=token,
        user=UserResponse(**user_to_response(user, hospital_name)),
    )


@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")

    hospital_id = None
    hospital_name = None
    if data.hospital_code:
        hospital = db.query(Hospital).filter(Hospital.code == data.hospital_code).first()
        if not hospital:
            raise HTTPException(status_code=400, detail="医院编码不存在")
        hospital_id = hospital.id
        hospital_name = hospital.name

    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        hospital_id=hospital_id,
        username=data.username,
        password_hash=password_hash,
        name=data.name,
        role="patient",
        phone=data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user)
    return LoginResponse(
        token=token,
        user=UserResponse(**user_to_response(user, hospital_name)),
    )


@router.get("/me", response_model=UserResponse)
def me(request: Request, db: Session = Depends(get_db)):
    payload = get_current_user(request)
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    hospital_name = None
    if user.hospital_id:
        hospital = db.query(Hospital).filter(Hospital.id == user.hospital_id).first()
        if hospital:
            hospital_name = hospital.name

    return UserResponse(**user_to_response(user, hospital_name))
