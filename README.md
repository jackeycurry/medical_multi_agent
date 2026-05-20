# 大健康AI智能体医生平台

> 基于阿里云通义千问的 AI 医生问诊系统，支持多医院隔离、角色权限控制、真人医生随时接管

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-brightgreen)](https://vitejs.dev)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-6-orange)](https://ant.design)

## 功能特性

- **AI 智能问诊** — 患者选择医院和科室，AI 医生根据症状自动匹配，支持流式对话（SSE）
- **真人医生接管** — 患者可随时申请转接真人医生，医生端抢单接诊，全程无缝切换
- **多医院隔离** — 医院间数据完全隔离，外部 API 通过 X-API-Key 绑定医院
- **角色权限分明** — 超级管理员 / 医院管理员 / 医生 / 患者四级角色
- **AI 辅助建议** — 真人医生接诊时，后台异步生成 AI 回复建议供参考
- **长轮询实时通讯** — 患者与医生之间通过长轮询实现准实时消息推送

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI + SQLAlchemy (SQLite) |
| AI 模型 | 阿里云 DashScope · 通义千问 qwen-plus |
| 前端框架 | React 19 + TypeScript + Vite |
| UI 组件库 | Ant Design 6 |
| 路由 | React Router v7 |
| 认证 | JWT (内部) + X-API-Key (外部) |

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- 阿里云 DashScope API Key

### 1. 启动后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY 和 JWT_SECRET
pip install -r requirements.txt
python run.py
# 服务运行于 http://localhost:8000
# 启动时自动建表并写入种子数据
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
# 服务运行于 http://localhost:5173
# Vite 自动代理 /api 到后端 :8000
```

### 3. 访问系统

打开浏览器访问 http://localhost:5173，用下方测试账号登录。

## 种子账号

| 用户名 | 密码 | 角色 | 所属医院 |
|--------|------|------|----------|
| `admin` | `admin123` | 超级管理员 | — |
| `wang_yuanzhang` | `123456` | 医院管理员 | 北京协和医院 |
| `doctor_zhang` | `123456` | 医生 | 北京协和医院 |
| `doctor_li` | `123456` | 医生 | 北京协和医院 |
| `patient_wang` | `123456` | 患者 | 北京协和医院 |
| `doctor_chen_sh` | `123456` | 医生 | 上海华山医院 |
| `patient_li_si` | `123456` | 患者 | 上海华山医院 |

## 项目结构

```
├── backend/                  # FastAPI 后端
│   └── app/
│       ├── main.py          # 入口，注册路由，启动时建表 + 种子数据
│       ├── config.py        # 环境变量配置
│       ├── database.py      # SQLAlchemy engine + SessionLocal
│       ├── models/          # ORM 模型 (Doctor/User/Hospital/Session/Message/EscalationQueue/CallLog)
│       ├── routers/         # 路由层（薄层，调用 services）
│       │   ├── auth.py      # 登录/注册/当前用户
│       │   ├── patient_api.py   # 患者端：开始问诊、发消息、转接真人
│       │   ├── doctor_api.py    # 医生端：抢单、会话、回复
│       │   ├── hospital_api.py  # 医院管理端：统计、患者、会话管理
│       │   └── external_api.py   # 对外 API v1（X-API-Key 鉴权）
│       ├── services/        # 业务逻辑层
│       │   ├── ai_service.py        # DashScope OpenAI 兼容接口封装
│       │   ├── routing_service.py   # 症状 → 科室 → AI 医生匹配
│       │   ├── consultation_service.py  # 会话生命周期管理
│       │   └── doctor_service.py   # 转接排队 + 真人回复
│       └── middleware/
│           ├── auth.py      # JWT 解码、角色守卫
│           └── api_key.py   # X-API-Key 鉴权 + 滑动窗口限流
│
└── frontend/                # React 19 前端
    └── src/
        ├── App.tsx          # React Router v7 路由定义
        ├── contexts/
        │   └── AuthContext.tsx   # JWT 状态管理
        ├── api/
        │   └── client.ts    # Axios 实例，自动附加 Bearer token
        ├── layouts/         # PatientLayout / DoctorLayout / HospitalLayout
        └── pages/
            ├── patient/     # 医院选择 + AI 问诊聊天页面
            ├── doctor/      # 抢单 + 接诊会话页面
            └── hospital/    # 医院管理仪表盘
```

## 核心流程

### 患者问诊流程

```
患者选择医院 → 输入症状 → AI 医生匹配 → 流式对话(SSE)
    ↓ 可随时申请转接真人
真人医生抢单 → 接诊会话 → 结束接诊 → 恢复 AI 问诊
```

### AI 对话实现

患者发送消息 → 后端加载 DB 历史 → 拼接 `[system_prompt, ...history, user_msg]`
→ 调用 DashScope qwen-plus → SSE 流式返回 → 落库持久化

AI 建议（医生端）：消息无变化时命中进程内存缓存，有变化时重新调用 DashScope。

### 对外 API（X-API-Key）

外部调用方通过 `X-API-Key: <key>` 访问 `/api/v1/*`，每个 key 绑定特定医院（强制多租户隔离），支持按 key 限流。

## 配置说明

`.env` 关键变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DASHSCOPE_API_KEY` | 是 | 阿里云通义千问 API Key |
| `JWT_SECRET` | 是 | 生产用 `python -c "import secrets; print(secrets.token_urlsafe(48))"` 生成 |
| `DATABASE_URL` | 否 | 默认 `sqlite:///./data/ai_doctor.db`（需以 backend/ 为 cwd 启动） |
| `EXTERNAL_API_KEYS` | 否 | 格式 `key:hid,key:hid` |
| `EXTERNAL_API_RATE_LIMIT_PER_MIN` | 否 | 默认 60 次/分钟 |

## 生产部署注意事项

- **CORS** — `main.py` 当前 `allow_origins=["*"]`，生产应改为具体域名
- **限流** — 内存计数器，多 worker 需迁移 Redis
- **数据库** — SQLite 单文件，建议生产换 PostgreSQL
- **JWT_SECRET** — 必须换为强随机值
- **前端构建** — `npm run build` 输出到 `frontend/dist/`，nginx 反代 `/api` 到后端

## License

MIT