import os
from pathlib import Path

from dotenv import load_dotenv

# 优先加载 backend/.env（位于本文件上两级）
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)


def _required(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(
            f"必需的环境变量 {name} 未设置。请在 backend/.env 中配置，"
            f"参考 backend/.env.example。"
        )
    return val


DASHSCOPE_API_KEY = _required("DASHSCOPE_API_KEY")
DASHSCOPE_BASE_URL = os.getenv(
    "DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
)
DASHSCOPE_MODEL = os.getenv("DASHSCOPE_MODEL", "qwen-plus")

# 默认相对路径（cwd 应为 backend/）；可在 .env 用绝对路径覆盖
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/ai_doctor.db")

JWT_SECRET = _required("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

# 对外 API（/api/v1/*）的 API Key → 医院 ID 绑定
# 格式：key1:hospital_id1,key2:hospital_id2（每个 key 必须声明所属医院，强制多租户隔离）
def _parse_external_api_keys() -> dict[str, int]:
    raw = os.getenv("EXTERNAL_API_KEYS", "")
    result: dict[str, int] = {}
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        if ":" not in entry:
            raise RuntimeError(
                f"EXTERNAL_API_KEYS 条目 {entry!r} 缺少医院 ID。"
                "格式：key:hospital_id（例 demo_abc:1,demo_def:2）"
            )
        key, _, hid = entry.partition(":")
        key = key.strip()
        hid = hid.strip()
        if not key or not hid.isdigit():
            raise RuntimeError(
                f"EXTERNAL_API_KEYS 条目 {entry!r} 格式错误，hospital_id 必须为正整数"
            )
        result[key] = int(hid)
    return result


EXTERNAL_API_KEYS = _parse_external_api_keys()
EXTERNAL_API_RATE_LIMIT_PER_MIN = int(
    os.getenv("EXTERNAL_API_RATE_LIMIT_PER_MIN", "60")
)
