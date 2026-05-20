"""对外 API 的 X-API-Key 鉴权 + 内存限流。

多 worker 部署时内存计数器各算各的，要严格全局限流需迁移到 Redis。
当前 run.py 是单 worker 起的 uvicorn，足够用。
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request, HTTPException

from app.config import EXTERNAL_API_KEYS, EXTERNAL_API_RATE_LIMIT_PER_MIN

_WINDOW_SECONDS = 60
_buckets: dict[str, deque] = defaultdict(deque)
_lock = Lock()


def _check_rate_limit(key: str) -> None:
    now = time.monotonic()
    cutoff = now - _WINDOW_SECONDS
    with _lock:
        bucket = _buckets[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= EXTERNAL_API_RATE_LIMIT_PER_MIN:
            retry = int(_WINDOW_SECONDS - (now - bucket[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"请求过于频繁，请在 {retry} 秒后重试",
                headers={"Retry-After": str(retry)},
            )
        bucket.append(now)


def require_external_api_key(request: Request) -> dict:
    """校验 X-API-Key header + 限流。返回 {key, hospital_id}。"""
    key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if not key:
        raise HTTPException(status_code=401, detail="缺少 X-API-Key 请求头")
    if not EXTERNAL_API_KEYS:
        raise HTTPException(
            status_code=503,
            detail="服务端未配置 EXTERNAL_API_KEYS，对外 API 不可用",
        )
    if key not in EXTERNAL_API_KEYS:
        raise HTTPException(status_code=401, detail="无效的 API Key")
    _check_rate_limit(key)
    return {"key": key, "hospital_id": EXTERNAL_API_KEYS[key]}
