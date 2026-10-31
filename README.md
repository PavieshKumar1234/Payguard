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


# 🛡️ PayGuard – AI-Powered Payment Protection

### Give AI a wallet. Keep the control.

PayGuard is an AI-powered payment protection platform that acts as a security layer between AI shopping agents and PayPal. It evaluates purchase requests, enforces user-defined spending policies, identifies potential risks, and keeps users in control of their payments.

---

## 🚀 Overview

As AI agents become capable of making purchases, protecting users from unauthorized or risky transactions becomes essential.

PayGuard solves this problem through a combination of deterministic policy enforcement, Gemini AI risk analysis, human approval, and PayPal Sandbox integration.

Every purchase request receives one of three decisions:

- 🟢 **APPROVED** – The purchase satisfies the configured policies.
- 🟡 **REVIEW_REQUIRED** – Human approval is required before proceeding.
- 🔴 **BLOCKED** – The purchase violates a security policy and must not proceed to PayPal.

## ✨ Key Features

- **Natural Language Policies:** Define spending rules using everyday language.
- **AI-Powered Risk Analysis:** Use Google Gemini to analyze transaction risks.
- **Deterministic Policy Engine:** Enforce spending limits and merchant restrictions.
- **Human-in-the-Loop Approval:** Require user authorization for sensitive transactions.
- **PayPal Sandbox Integration:** Test real payment workflows in a simulated environment.
- **Payment Protection:** Prevent blocked purchase requests from creating PayPal orders.
- **Audit Trail:** Track purchase requests, decisions, and payment activities.
- **Interactive Dashboard:** Monitor payment requests, approvals, risks, and transactions.

## 🏗️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Database | MongoDB |
| AI Integration | Google Gemini |
| Payment Gateway | PayPal Sandbox |
| API Communication | REST API |

## 🔄 How It Works

1. **Policy Creation:** Users define their spending policies.
2. **Purchase Request:** An AI shopping agent submits a purchase request.
3. **Policy Evaluation:** The deterministic policy engine evaluates the request.
4. **AI Risk Analysis:** Gemini provides additional risk analysis.
5. **Decision:** PayGuard returns APPROVED, REVIEW_REQUIRED, or BLOCKED.
6. **Human Approval:** Requests requiring review wait for user authorization.
7. **Payment Processing:** Eligible requests proceed through PayPal Sandbox checkout and payment capture.
8. **Audit Logging:** Transaction decisions and activities are recorded.

### 🔐 Security Principle

**AI can analyze risk, but it cannot authorize payments.**

The deterministic backend policy engine remains responsible for authorization decisions. PayGuard keeps payment control in the hands of the user.

## 📂 Project Structure

```text
PayGuard/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── pytest.ini
│
├── screenshots/
├── README.md
└── .gitignore
```

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- Python 3.10+
- MongoDB Atlas account or MongoDB instance
- Google Gemini API key
- PayPal Developer account with Sandbox credentials

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/PayGuard-AI-Payment-Protection.git

cd PayGuard-AI-Payment-Protection
```

### 2. Configure the Backend

```bash
cd backend

python -m venv .venv
```

Activate the environment on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your environment variables using the provided `.env.example` file.

Required configuration includes:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

Start the backend using the actual application entry point:

```bash
uvicorn app.main:app --reload
```

Adjust the entry point if your project uses a different module path.

### 3. Configure the Frontend

Open a new terminal:

```bash
cd frontend

npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

## 🧪 Testing

Run backend tests:

```bash
cd backend

pytest
```

Build the frontend:

```bash
cd frontend

npm run build
```

## 💳 PayPal Sandbox

PayGuard integrates with PayPal Sandbox to test payment workflows without using real money.

The Sandbox integration supports testing:
- Payment order creation.
- Buyer checkout approval.
- Payment capture.
- Transaction status verification.

Use Sandbox credentials for development and testing. Never expose PayPal secrets in frontend code or public repositories.

## 🔮 Future Enhancements

- Multi-payment gateway support.
- Advanced fraud and anomaly detection.
- Real-time spending analytics.
- Multi-user authentication and authorization.
- Advanced financial policy management.
- Production-ready payment deployment.

## 🎯 Project Vision

PayGuard aims to make autonomous AI shopping safer by combining intelligent risk analysis with strict financial controls.

**Give AI the freedom to shop. Keep users in control of their money.**

---

### 👨‍💻 Built With

React • TypeScript • FastAPI • Python • MongoDB • Google Gemini • PayPal

**Project:** PayGuard – AI-Powered Payment Protection

**Hackathon:** PayPal AI Hackathon 2026
