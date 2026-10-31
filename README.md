# PAYGUARD

AI Payment Authorization Agent that sits between an AI shopping agent and the payment system.

> AI can request the payment. PayGuard decides whether it gets through.
> AI reasons. Code enforces. Humans control.

## Architecture

```
AI shopping agent
      │ purchase request
      ▼
FastAPI backend ── policy_engine (deterministic rules, LLM never decides)
      │                    │
      │                    ├─ BLOCKED → audit log, no PayPal call
      │                    ├─ REVIEW_REQUIRED → human approval gate
      │                    └─ APPROVED → PayPal Sandbox order
      ▼
MongoDB (policies, requests, risk decisions, approvals, payments, audit logs, spending history, merchants)
```

The LLM layer only *parses natural-language policies* and *explains risk*. It never authorizes money movement or overrides deterministic financial rules. The PayPal client secret is server-side only. Blocked transactions never create a PayPal order.

## Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router
- **Backend**: FastAPI, Python, Pydantic, Uvicorn, Motor (async MongoDB), httpx
- **Database**: MongoDB
- **Payments**: PayPal Sandbox REST API (OAuth2 server-side, Orders API)
- **AI**: provider-agnostic service layer (`app/services/ai_service.py`), key via env only

## Local development

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in values
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` to `http://localhost:8000`.

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DATABASE` | Database name (default `payguard`) |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal Sandbox app credentials (server-side only) |
| `PAYPAL_ENVIRONMENT` | `sandbox` (default) or `live` |
| `AI_API_KEY` | LLM provider key (enables policy parsing / risk reasoning) |

Missing config never prevents startup: `GET /api/health` reports real status of MongoDB, PayPal configuration, and AI configuration. PayPal/AI errors surface only when an operation requiring them is invoked.

## API overview

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Real backend/DB/integration status |
| POST | `/api/policies/parse` | NL policy → structured rules (AI layer) |
| POST | `/api/policies/confirm` | Persist parsed rules |
| GET | `/api/policies` | List policies |
| POST | `/api/purchase/request` | Submit request; deterministic decision |
| GET | `/api/purchase/{id}` | Fetch request |
| POST | `/api/purchase/{id}/approve` | Human approval (required before PayPal for REVIEW_REQUIRED) |
| POST | `/api/purchase/{id}/block` | Human block |
| GET | `/api/payments` | Payments |
| GET | `/api/audit` | Audit logs |
| GET | `/api/dashboard` | Summary stats |
| GET | `/api/risk` | Risk decisions |

## Decision model

- `APPROVED` — deterministic checks pass; PayPal order may be created.
- `REVIEW_REQUIRED` — waits for explicit human approval; PayPal order only after approval.
- `BLOCKED` — no PayPal call, ever; audit event written.

PayPal Sandbox base URL: `https://api-m.sandbox.paypal.com` (OAuth token → Create Order → Capture Order).
