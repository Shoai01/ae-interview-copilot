# PROJECT_CONTEXT.md
> Single source of truth for project memory. Update this file whenever stack, flow, schema, or task status changes. AI assistants must read this file FIRST before making any changes.

Last updated: 2026-08-10

---

## 1. Project Overview

**Name:** AI Voice Viva Copilot
**One-liner:** A standalone module that replaces Section 8 ("Start Viva") of AE's existing training exam platform. Trainees complete Login → System Test → Exam → Solution Upload → MCQ on the EXISTING platform; once MCQ is done, they're redirected here with a signed token to take an AI-conducted voice viva. This app owns ONLY the viva — nothing before it.

**Scope boundary (important):**
- ❌ NOT building right now: login/OTP for trainees, system test, main exam, solution flow upload, MCQ exam, Post-Exam aggregation UI, token verification, ANY authentication/authorization — all of this belongs to the main platform and will be integrated LATER.
- ✅ Building NOW: the standalone AI viva engine only — session creation (trainee_id + module_id passed directly, no token), question generation, TTS, STT, evaluation, basic fraud flagging, report generation. Every endpoint is open/unauthenticated for this phase.
- Integration back to the main platform (token-based entry, pushing viva score into their Post-Exam aggregation, auth) is a deliberate LATER phase — do not build it now, do not block core functionality on it.

**Roles in this module (current build phase):** none enforced yet — no `users` table, no login, no trainer/admin auth. `trainee_id` and `module_id` are passed directly into API calls as stand-ins for what will later come from a verified token and a trainer/admin session.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| STT | Whisper |
| TTS | TBD engine (Whisper is STT-only — pick a TTS lib/API separately; questions must be spoken AND shown as text) |
| AI Evaluation / Question Gen | Gemini 2.5 Flash |
| Trainee entry | **Deferred.** For now: `trainee_id` + `module_id` passed directly in API requests. Token-based handoff from the existing platform is a future phase — see Section 9. |
| Trainer/Admin Auth | **Deferred.** No `users` table, no login, no roles enforced in this phase. All endpoints open. Will be added when integrating with the main platform. |
| Fraud/Proctoring | Lightweight browser-based multi-face / no-face detection only |
| Hosting | TBD |

---

## 3. App Flow (CURRENT build phase — no auth, standalone engine)

1. A `viva_sessions` row is created directly via `POST /viva/sessions` with `{trainee_id, module_id}` in the body — no token, no verification (stand-in for what will later be a token-verified entry point)
2. Frontend: camera/mic/speaker checks (mirrors the existing platform's "System Test" pattern for consistency, but scoped just to viva readiness)
3. AI generates question (Gemini 2.5 Flash, scoped to trainee's module) → question is spoken (TTS) AND displayed as text → trainee answers by voice
4. Audio → Whisper STT → transcript → Gemini evaluates (Technical Knowledge, Communication, Confidence, Clarity, Logical Reasoning, Response Quality) → basic fraud check (multi-face/no-face, frontend-detected signal) runs in parallel
5. Repeat until viva question set complete or time runs out
6. Aggregate → AI recommendation (pass/fail/borderline) generated → stored as a `viva_reports` row (score breakdown, strengths, areas of improvement — modeled on reference report format)
7. `GET /viva/{session_id}/report` returns the full report — open endpoint for now, no trainer-decision gating built yet (see Section 9 for what's deferred)

### Deferred flow (future integration phase — do not build yet)
- Trainee arrives via signed token from the existing platform → token verified → `trainees` record created/found → session created automatically
- Trainer logs in (username/password) → reviews AI report → sets `trainer_decision` (pass/fail/hold), can override AI
- Result pushed to or pulled by the main platform's Post-Exam aggregation

---

## 4. Auth Flow

**Status: NOT IMPLEMENTED in this phase — by design.** Auth (trainee token handoff, trainer/admin login) will be built when this module integrates with the main platform. Every endpoint in the current build is open/unauthenticated.

For reference, the deferred design (build later, not now):
- **Trainee:** arrives via a signed token issued by the existing platform (shared secret or public key — TBD with platform team). Token verified on entry; trainee identity cached in a `trainees` table.
- **Trainer/Admin:** username + password, first admin seeded from env vars, JWT sessions.

**Do not add auth middleware, `users` table, or login routes until explicitly asked.**

---

## 5. Database Schema (draft — see schema.dbml for full ER diagram)

**Current build phase — active tables only:**
- `trainees` — minimal record, created directly via API for now (stand-in for future token-derived identity): id, employee_id/name (optional at this stage — can be as simple as an id passed in)
- `training_modules` — Foundation, Intermediate, Developer
- `question_bank` — scoped to a module
- `viva_sessions` — one per trainee attempt, linked to a module — created directly via `{trainee_id, module_id}`, no token
- `viva_questions` — questions asked in a session, with transcript + audio path
- `evaluations` — per-question AI scores
- `fraud_flags` — multi-face/no-face flags per question
- `viva_reports` — aggregate score, AI recommendation (trainer_decision field exists in schema but stays null/unused until trainer review is built)

**Deferred — do not build yet:** `users` (trainer/admin accounts), `audit_logs` (needs an actor to log against, meaningless without auth)

---

## 6. API Routes (current phase — all open/unauthenticated)

| Method | Route | Purpose | Status |
|---|---|---|---|
| POST | /viva/sessions | Create session from `{trainee_id, module_id}` directly (stand-in for token entry) | Pending |
| GET | /viva/{session_id}/system-check | Camera/mic/speaker/network checks | Pending |
| POST | /viva/{session_id}/next-question | Get next question (text + TTS audio) | Pending |
| POST | /viva/{session_id}/answer | Submit audio, get transcript + eval, trigger next question or completion | Pending |
| GET | /viva/{session_id}/report | AI-generated report | Pending |
| Admin CRUD | /modules, /question-bank | Manage modules and questions — open for now, no admin auth | Pending |

**Deferred — do not build yet:** `/viva/entry?token=...` (token verification), `/auth/admin/login`, `/admin/users`, `/viva/{session_id}/decision` (trainer decision — needs a trainer identity to attribute it to)

---

## 7. Dependencies (planned)

- Backend: fastapi, uvicorn, sqlalchemy, asyncpg/psycopg2, pydantic, openai-whisper or faster-whisper, google-generativeai (Gemini), a TTS library (TBD). **Not needed yet:** python-jose/JWT libraries — hold off until auth phase.
- Frontend: react, vite, axios, react-router, face-detection lib (face-api.js or MediaPipe) for fraud check

---

## 8. Completed Features
_(none yet — brand new build)_

---

## 9. Pending Tasks / Open Questions

**Current phase (active work):**
- [ ] Pick actual TTS engine (Whisper is STT-only)
- [ ] Confirm face-detection library for fraud check (frontend-side)
- [ ] Finalize evaluation rubric prompt for Gemini (Technical Knowledge, Communication, Confidence, Clarity, Logical Reasoning, Response Quality)
- [ ] Seed question_bank content per module with AE trainers (even dummy data to start)

**Deferred to integration phase (do NOT start until explicitly revisited):**
- [ ] Auth: token format + signing method from the existing platform (HMAC vs RSA, claims included)
- [ ] Auth: trainer/admin login, `users` table, seeded admin via env vars
- [ ] Trainer decision workflow (`/viva/{session_id}/decision`)
- [ ] `audit_logs` (needs auth to have an actor)
- [ ] How/when viva results get pushed to or pulled by the main platform
- [ ] Decide hosting/infra
## Recent Updates (2026-08-11)
- **AI Evaluation Endpoints**: Added POST /viva/{session_id}/evaluate and GET /viva/{session_id}/report.
- **Session API**: Added GET /viva to list all sessions.
- **AI Service Location**: Added ackend/ai/evaluator.py utilizing Gemini 2.5 Flash for grading responses.
