# AGENTS.md — PAYGUARD

AI Payment Authorization Agent between an AI shopping agent and the payment system.
Core principle: "AI can request the payment. PayGuard decides whether it gets through."
Product principle: "AI reasons. Code enforces. Humans control."

## Stack

- Frontend: React + TypeScript
- Backend: FastAPI (Python)
- Database: MongoDB
- Payments: PayPal Sandbox REST API
- LLM: policy interpretation + contextual risk reasoning only

## Architecture flow

User defines policies in natural language → LLM converts to structured rules → AI shopping agent submits purchase request → deterministic backend code enforces hard financial rules → merchant rules + spending history check → LLM produces contextual risk analysis/explanation → decision: APPROVE / HUMAN REVIEW / BLOCK → sensitive transactions require human approval → approved only then create PayPal order → persist policies, purchases, approvals, payments, risk decisions, audit logs in MongoDB.

## Non-negotiable security rules

- LLM/AI must NEVER directly authorize money movement or override deterministic financial rules. AI output is advisory; deterministic code decides.
- PayPal Client Secret stays server-side only. Never expose in frontend, logs, or responses.
- Blocked transactions must NEVER create a PayPal order. No PayPal call before final decision.
- Deterministic financial checks (limits, balances, rules) always win over LLM reasoning.

## Coding conventions

- Backend enforces all money-related rules in typed Python code; LLM calls wrapped behind a single client module, never scattered.
- Decisions are explicit enum: APPROVE / HUMAN_REVIEW / BLOCK.
- Every decision (including blocks) writes an audit log entry in MongoDB.
- Frontend never computes authorization decisions; it displays backend results only.
- UI: premium AI fintech/security aesthetic — dark navy background, electric blue/cyan/violet/magenta/emerald/amber/red accents, glassmorphism, glowing cards, smooth animations, professional typography.

## Development workflow

- Run backend and frontend separately; source `.env` server-side only.
- Required env vars (server-side): MongoDB URI, PayPal client id/secret, LLM API key.
- Verify backend with API calls before wiring frontend; demo path: policy → request → decision → PayPal order for approvals only.
