import jwt
from fastapi import Request, HTTPException, Depends
from functools import wraps

from app.config import JWT_SECRET, JWT_ALGORITHM


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        payload["sub"] = int(payload["sub"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token已过期，请重新登录")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="无效的Token")


def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证Token")
    return decode_token(auth[7:])


def get_optional_user(request: Request) -> dict | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return decode_token(auth[7:])
    except HTTPException:
        return None


def require_role(*roles: str):
    def dependency(request: Request):
        user = get_current_user(request)
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="权限不足")
        return user
    return dependency


def require_hospital(request: Request) -> int:
    user = get_current_user(request)
    hid = user.get("hid")
    if user.get("role") == "super_admin":
        return 0  # 0 表示不过滤
    if not hid:
        raise HTTPException(status_code=400, detail="用户未关联医院")
    return hid
