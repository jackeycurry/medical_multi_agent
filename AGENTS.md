# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

大健康AI智能体医生平台 — AI 医生问诊系统。患者通过网页与 AI 医生（通义千问）对话问诊，可随时申请转接真人医生。支持多医院隔离、角色权限控制（超级管理员/医院管理员/医生/患者）。

## 技术栈

- **后端**: FastAPI + SQLAlchemy (SQLite) + DashScope (阿里云通义千问 qwen-plus)
- **前端**: React 19 + TypeScript + Vite + Ant Design 6 + React Router 7

## 常用命令

```bash
# 后端 (首次安装依赖)
cd backend
pip install -r requirements.txt
python run.py                          # 启动开发服务器 (localhost:8000, auto-reload)
                                       # main.py 启动时自动 create_all() + seed_all()

# 前端
cd frontend
npm install
npm run dev                            # 启动 Vite 开发服务器 (localhost:5173)
npm run build                          # tsc -b + vite build
npm run lint                           # ESLint 检查
```

仓库当前无测试框架（pytest / vitest 未配置）。

## 配置

所有 secrets 通过 `backend/.env` 注入（`python-dotenv` 加载，`app/config.py` 调 `_required()` 缺值即抛 `RuntimeError`）。模板见 `backend/.env.example`。`.env` 已在 `.gitignore` 中。

关键变量：
- `DASHSCOPE_API_KEY` — 阿里云通义千问 key，必填
- `JWT_SECRET` — 生产环境用 `python -c "import secrets; print(secrets.token_urlsafe(48))"` 生成
- `DATABASE_URL` — 默认 `sqlite:///./data/ai_doctor.db`（相对路径，要求 `python run.py` 启动时 cwd=`backend/`）
- `EXTERNAL_API_KEYS` — `/api/v1/*` 调用方的 X-API-Key 白名单，逗号分隔多个
- `EXTERNAL_API_RATE_LIMIT_PER_MIN` — 每个 key 每分钟最大请求数，默认 60

## 对外 API 鉴权与限流

`/api/v1/*` 由 `app/middleware/api_key.py` 守卫：
- 请求头必须带 `X-API-Key: <key>`，key 必须在 `EXTERNAL_API_KEYS` 白名单
- 内存滑动窗口限流（per-key，1 分钟），超出返回 `429` 附带 `Retry-After`
- 当前是单进程内存计数器，多 worker 部署需迁移到 Redis 才能严格全局限流

## 架构

### 后端 (backend/)

```
app/
├── main.py            # FastAPI 入口, 注册路由, 建表, 种子数据
├── config.py          # DashScope API key, JWT secret, 数据库路径
├── database.py        # SQLAlchemy engine + SessionLocal + get_db 依赖
├── seed.py            # 种子: 2家医院 + 7个用户 + 6个AI医生
├── models/            # SQLAlchemy ORM 模型
│   ├── doctor.py      # AI医生 (belongs to Hospital)
│   ├── user.py        # 用户 (4种角色: super_admin/hospital_admin/doctor/patient)
│   ├── hospital.py    # 医院
│   ├── session.py     # 问诊会话 + 消息 (Session 1:N Message)
│   ├── escalation.py  # 转接真人医生排队
│   └── call_log.py    # API 调用日志
├── routers/           # API 路由层 (薄层, 调用 services)
│   ├── auth.py        # POST /api/auth/login|register, GET /api/auth/me
│   ├── doctors.py     # CRUD /api/doctors
│   ├── consultations.py   # 内部问诊 API
│   ├── external_api.py    # 对外 API v1 (公开文档)
│   ├── patient_api.py     # 患者端: 医院列表, 开始问诊, 发消息, 转接
│   ├── doctor_api.py      # 医生端: 排队列表, 接单, 我的会话, 回复
│   ├── hospital_api.py    # 医院管理端: 统计, 患者列表, 会话管理
│   └── call_logs.py       # 调用日志 + 统计
├── services/          # 业务逻辑层
│   ├── ai_service.py      # DashScope chat 封装 (OpenAI 兼容模式)
│   ├── routing_service.py # 症状关键词 → 科室 → AI医生 匹配
│   ├── consultation_service.py  # 会话生命周期 + AI 对话管理
│   └── doctor_service.py # AI医生管理 + 转接排队 + 真人回复
├── middleware/
│   └── auth.py        # JWT 解码, get_current_user, require_role, require_hospital
└── schemas/           # Pydantic 请求/响应模型
```

**认证流程**: 所有 API 通过 `Authorization: Bearer <JWT>` 认证。JWT payload: `{sub: user_id, role: str, hid: hospital_id}`。`require_role(*roles)` 工厂函数生成角色守卫依赖。

**路由权限矩阵**:
- `/api/auth/*` — 无需 token（login/register），`/me` 任意登录用户
- `/api/doctors/*`、`/api/consultations/*`、`/api/sessions`、`/api/stats`、`/api/call-logs` — `super_admin`（router 级 `dependencies=[Depends(require_role("super_admin"))]`）
- `/api/v1/*` — `X-API-Key` 鉴权 + 限流（见下文）
- `/api/patient/*` — `patient`
- `/api/doctor/*` — `doctor`
- `/api/hospital/*` — `hospital_admin`（super_admin 也放行，作为全院视图）

**AI 对话流程**: 每次用户消息 → 从 DB 加载历史 → 拼接 `[system_prompt, ...history, user_msg]` → 调用 DashScope → 保存 assistant 回复到 DB。上下文通过 DB 持久化而非内存。

**流式响应 (SSE)**: 患者端发消息 `POST /api/patient/consultations/{id}/message` 返回 `text/event-stream`（`data: {"delta": "..."}\n\n`，结束 `data: {"done": true}`）。生成器内部完成后用独立 `SessionLocal()` 落库（不复用请求级 `db`，避免连接已关闭）。`ai_service.chat_stream()` 是同步生成器，`ai_service.chat()` 是阻塞调用——初次问诊 `start_consultation` 仍走非流式以便同步返回 greeting。

**真人接管逻辑**: `EscalationQueue` 状态 `pending → in_progress → done`。当某会话有 `in_progress` 的 escalation 时，患者消息**不调用** AI，仅回固定提示由医生接管。已结束的真人介入历史（`Message.source == "human"`）会在拼接给 AI 时以 `[真人医生] ...` 前缀作为 assistant 消息注入，并附加"不可矛盾"约束到 system prompt。

### 前端 (frontend/src/)

```
src/
├── App.tsx            # 路由定义 (React Router v7)
├── main.tsx           # Vite 入口
├── contexts/
│   └── AuthContext.tsx # JWT + 用户状态管理 (localStorage 持久化)
├── api/
│   ├── client.ts      # Axios 实例 (baseURL=/api, 自动附加 Bearer token, 401 清除)
│   ├── doctors.ts     # 医生 API 调用
│   ├── consultations.ts
│   └── callLogs.ts
├── types/
│   └── index.ts       # TypeScript 接口定义
├── layouts/
│   ├── PatientLayout.tsx   # 患者端布局
│   ├── DoctorLayout.tsx    # 医生端布局
│   └── HospitalLayout.tsx  # 医院管理端布局
├── pages/
│   ├── LoginPage.tsx / RegisterPage.tsx
│   ├── admin/         # 超级管理员: Dashboard, DoctorCreate, DoctorChat, CallLogs, ApiDemo
│   ├── patient/       # 患者端: PatientHome (医院选择), PatientConsultPage (问诊聊天)
│   ├── doctor/        # 医生端: DoctorDashboard (排队+会话列表), DoctorSessionPage
│   └── hospital/      # 医院管理: Dashboard, PatientList, PatientProfile, SessionList, SessionDetail
└── components/        # 共享组件: DoctorCard, DoctorForm, ChatBubble, ChatInput, StatCard
```

**路由与角色映射**: `/login` → 登录后 RoleRedirect 根据 role 跳转 → `super_admin`→`/admin`, `hospital_admin`→`/hospital`, `doctor`→`/doctor`, `patient`→`/patient`。

**前后端通信**: Vite dev server 将 `/api`、`/docs`、`/openapi.json`、`/redoc` 代理到 `localhost:8000`（见 `vite.config.ts`），方便前端直连 Swagger 调试。生产部署需单独配置反向代理。

**患者端流式接收**: `PatientConsultPage` 用 `fetch` + `ReadableStream` 解析 SSE 行（`data: {...}`），逐 delta 追加到当前 assistant 气泡。不能用 axios（不支持流），也不能用原生 `EventSource`（其不支持 POST + Authorization header）。

### 数据库

SQLite 单文件 (`backend/data/ai_doctor.db`)，通过 `check_same_thread=False` 支持 FastAPI 异步。种子用户密码均为 `123456`，admin 密码为 `admin123`。AI 医生种子数据在 `backend/data/seed_doctors.json`。

### 关键外部依赖

- **DashScope**: 阿里云通义千问 API，OpenAI 兼容模式，base_url 为 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 默认模型 `qwen-plus`，每轮 `max_tokens=1024`, `temperature=0.7`
