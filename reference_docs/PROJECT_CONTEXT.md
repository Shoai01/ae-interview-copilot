# PROJECT_CONTEXT.md
> Single source of truth for project memory. Update this file whenever stack, flow, schema, or task status changes. AI assistants must read this file FIRST before making any changes.

Last updated: 2026-08-10

---

## 1. Project Overview

**Name:** AI Voice Viva Copilot
**One-liner:** A standalone module that replaces Section 8 ("Start Viva") of AE's existing training exam platform. Trainees complete Login → System Test → Exam → Solution Upload → MCQ on the EXISTING platform; once MCQ is done, they're redirected here with a signed token to take an AI-conducted voice viva. This app owns ONLY the viva — nothing before it.

**Scope boundary (important):**
- ❌ NOT building right now: token-based entry from the main platform, system test/exam/MCQ (owned by the main platform), Post-Exam aggregation UI.
- ✅ Building NOW: a single shared login system for ALL roles (trainee, trainer, admin) via username/password against one `users` table. Admin/trainer provisions trainee accounts directly (ideally bulk-import by cohort later, one-by-one to start) — no self-registration, no approval queue. Trainees are already verified by having passed Practical Exam + MCQ on the main platform, so there's no unknown-population trust problem to solve here.
- Token handoff from the main platform (replacing direct login as the trainee entry point) is a future integration phase — not blocking, not built now.

**Roles in this module:** Trainee, Trainer, Admin — all authenticate via the same `/auth/login`, differentiated by `role` on their `users` row. Post-login routing differs by role: trainer/admin → `/dashboard`; trainee → resolve or create their current viva session → `/viva/:sessionId/welcome`.

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
| Trainee entry | Direct login (username/password) against the shared `users` table — account provisioned by admin/trainer in advance. Token-based handoff from the main platform is a FUTURE phase, not built now. |
| Trainer/Admin Auth | Username + password against the shared `users` table. First admin seeded via `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` env vars on backend startup. Admin creates trainer accounts; admin/trainer creates trainee accounts. No self-registration for any role. |
| Session strategy | JWT — short-lived access token (15-30 min) + longer-lived refresh token (7 days) in an httpOnly cookie. Access token sent as `Authorization: Bearer` on every request. |
| Fraud/Proctoring | Lightweight browser-based multi-face / no-face detection only |
| Hosting | TBD |

---

## 3. App Flow (current build — shared login for all roles)

### Trainer / Admin
1. Login at `/login` (username + password) → JWT issued → redirected to `/dashboard`
2. Trainer: reviews viva sessions, sets final pass/fail/hold decisions
3. Admin: everything trainer can do, plus manages modules, question bank, and creates trainer/trainee accounts

### Trainee
1. Login at `/login` (same login page, same `users` table, role = trainee) → JWT issued
2. On successful login, backend resolves: does this trainee have an existing in-progress `viva_sessions` row? Resume it. Otherwise, create a new session against their assigned `module_id` (set on their account at creation time by admin/trainer)
3. Redirected to `/viva/:sessionId/welcome` → camera/mic/speaker/network checks
4. AI generates question (Gemini 2.5 Flash, scoped to trainee's module) → spoken (TTS) AND displayed as text → trainee answers by voice
5. Audio → Whisper STT → transcript → Gemini evaluates (Technical Knowledge, Communication, Confidence, Clarity, Logical Reasoning, Response Quality) → basic fraud check runs in parallel (NO_FACE, TAB_SWITCH, FULLSCREEN_EXIT)
6. Repeat until viva question set complete or time runs out
7. Aggregate → AI recommendation (pass/fail/borderline) generated → stored as a `viva_reports` row
8. Trainee sees a calm completion screen — no scores shown to them directly
9. Trainer reviews the report (transcript, per-question scores, AI recommendation) → sets `trainer_decision` (pass/fail/hold), can override AI

### Account provisioning (no self-registration, any role)
- Admin creates trainer accounts
- Admin or trainer creates trainee accounts, including their `module_id` assignment
- One-by-one to start; bulk CSV import by cohort is a natural next step once the manual flow proves out

### Deferred (future integration phase — do not build yet)
- Trainee entry via signed token from the main platform, replacing direct login as the trainee's way in
- Result pushed to or pulled by the main platform's Post-Exam aggregation

---

## 4. Auth Flow

**Single shared login for all roles** — trainee, trainer, admin all authenticate via `POST /auth/login` (username/password) against one `users` table, differentiated by `role`. No self-registration for any role; no approval queue. Accounts are provisioned in advance:
- First admin seeded from `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` env vars on backend startup (password hashed, never logged)
- Admin creates trainer accounts
- Admin or trainer creates trainee accounts — including setting their `module_id` at creation time (trainee doesn't self-select module; it's assigned)

**Why no self-registration for trainees:** trainees reaching this module have already passed Practical Exam + MCQ on the main platform — they're a known, pre-verified population, not an open public signup. Provisioning avoids inventing a trust/approval problem that doesn't exist here.

**Session mechanics:**
- JWT access token (15-30 min) + refresh token (7 days, httpOnly cookie)
- Access token sent as `Authorization: Bearer <token>` on every request
- On 401, attempt silent refresh via the refresh cookie; force re-login only if refresh itself fails
- Role-based route/endpoint guards: `require_role("admin")`, `require_role("trainer", "admin")`, etc.

**Post-login redirect logic (role-dependent, this is the one asymmetry):**
- Trainer/Admin → straight to `/dashboard` (fixed destination)
- Trainee → backend resolves: existing in-progress `viva_sessions` row for this trainee? Resume it. Otherwise create one against their assigned `module_id`. → redirect to `/viva/:sessionId/welcome`

**Deferred (future integration phase — do not build yet):** replacing trainee direct-login with a signed-token handoff from the main platform. When built, only the trainee entry point changes — everything from session-resolution onward stays identical.

---

## 5. Database Schema (draft — see schema.dbml for full ER diagram)

**Active tables (current build):**
- `users` — trainee, trainer, and admin accounts (shared table, `role` column). Trainee rows include `module_id` (assigned at creation), `password_hash`, `created_by` (which admin/trainer provisioned them)
- `training_modules` — Foundation, Intermediate, Developer
- `question_bank` — scoped to a module
- `viva_sessions` — one per trainee attempt, linked to a module and a `users` row (trainee) — created automatically on trainee's first post-login session-resolution, or resumed if already in progress
- `viva_questions` — questions asked in a session, with transcript + audio path, `question_order`, `answered_at`
- `evaluations` — per-question AI scores
- `fraud_flags` — NO_FACE, TAB_SWITCH, FULLSCREEN_EXIT flags per question, real `detected_at` datetime
- `viva_reports` — aggregate score, AI recommendation, `trainer_decision` (now meaningful — FK `reviewed_by` → `users.id`)

**Deferred — do not build yet:** `audit_logs` (add once there's a clear need to track admin/trainer actions beyond what's already implicit in `created_by`/`reviewed_by`)

**Dropped from schema:** the standalone `trainees` cache table — no longer needed now that trainees are real `users` rows. `question_bank.question_type` (VOICE/TEXT) — dropped as dead weight since this module is voice-only by design; revisit only if a text-response format is genuinely needed later.

---

## 6. API Routes (current phase)

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | /auth/login | Login for any role (trainee/trainer/admin) | Public |
| POST | /auth/refresh | Refresh access token via cookie | Public (cookie-gated) |
| POST | /auth/logout | Clear refresh cookie | Authenticated |
| POST | /admin/users | Create trainer or trainee account | admin (trainer can also create trainee) |
| GET | /viva/{session_id}/system-check | Camera/mic/speaker/network checks | trainee (own session) |
| POST | /viva/sessions/start | Creates or resumes a session post-system check | trainee |
| POST | /viva/{session_id}/next-question | Get next question (text + TTS audio) | trainee (own session) |
| POST | /viva/{session_id}/answer | Submit audio, get transcript + eval, trigger next question or completion | trainee (own session) |
| POST | /viva/{session_id}/fraud-flag | Log a fraud flag for the active question | trainee (own session) |
| GET | /viva/{session_id}/report | Full AI-generated report | trainer, admin |
| POST | /viva/{session_id}/decision | Trainer sets final pass/fail/hold | trainer, admin |
| /modules, /question-bank | Manage modules and questions | admin |

**Deferred — do not build yet:** `/viva/entry?token=...` (token-based trainee entry, replaces direct login later)

---

## 7. Dependencies

- Backend: fastapi, uvicorn, sqlalchemy, asyncpg/psycopg2, pydantic, passlib[bcrypt] (password hashing), python-jose (JWT issue/verify), openai-whisper or faster-whisper, google-generativeai (Gemini), a TTS library (TBD)
- Frontend: react, vite, axios, react-router, face-api.js or MediaPipe (NO_FACE detection only — see fraud detection scope)

---

## 8. Completed Features
_(none yet — brand new build)_

---

## 9. Pending Tasks / Open Questions

**Current phase (active work):**
- [ ] Implement `core/security.py` — password hashing (passlib/bcrypt), JWT issue/verify
- [ ] Implement `/auth/login`, `/auth/refresh`, `/auth/logout`
- [ ] Implement `require_role()` dependency for route guards
- [ ] Implement trainee session-resolution logic (`GET /viva/session/current`) — resume in-progress or create new
- [ ] Decide: one-by-one trainee account creation UI first, or build CSV bulk-import from the start given cohort sizes
- [ ] Pick actual TTS engine (Whisper is STT-only)
- [ ] Finalize evaluation rubric prompt for Gemini (Technical Knowledge, Communication, Confidence, Clarity, Logical Reasoning, Response Quality)
- [ ] Seed question_bank content per module with AE trainers

**Deferred to integration phase (do NOT start until explicitly revisited):**
- [ ] Token-based trainee entry from the main platform (replaces direct login as trainee's way in — session-resolution logic downstream stays the same)
- [ ] How/when viva results get pushed to or pulled by the main platform
- [ ] `audit_logs` table
- [ ] Decide hosting/infra
