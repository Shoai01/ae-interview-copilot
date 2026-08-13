# FEATURE_LOG.md
> Running log of everything added, removed, refactored, or changed. Append-only — newest entry on top. AI must add an entry here after every meaningful change (new feature, dependency, schema change, refactor).

---

## How to log an entry

```
## [YYYY-MM-DD] Short title
**Type:** Added / Removed / Refactored / Dependency / Architecture change / Fixed
**Summary:** 1-3 lines on what changed and why.
**Files touched:** list of key files/modules
**Related:** links to PROJECT_CONTEXT.md sections or task if applicable
```

## [2026-08-13] Frontend Auth and User Management
**Type:** Added
**Summary:** Integrated the React frontend with the new JWT auth backend. Added global `AuthContext` to manage token state and silent refresh. Built a dedicated UI for Admins and Trainers to provision new accounts. Added generic `Login.jsx`, guarded routes with `ProtectedRoute.jsx`, and implemented `UserManagement.jsx` for role-based account creation.
**Files touched:** `frontend/src/store/AuthContext.jsx`, `frontend/src/components/ProtectedRoute.jsx`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/UserManagement.jsx`, `frontend/src/services/api.js`, `frontend/src/App.jsx`, `frontend/src/pages/WelcomeCheck.jsx`
**Related:** Auth Module Implementation, User Management Feature

---

## [2026-08-13] Auth module and role-based access implemented
**Type:** Added
**Summary:** Implemented the full backend authentication layer. `Trainee` model merged into a unified `User` model with roles (`TRAINEE`, `TRAINER`, `ADMIN`). Implemented JWT access tokens, `httpOnly` refresh cookies, and `slowapi` rate limiting on login. Refactored session creation to occur via `POST /viva/sessions/start` post-system-check. Added `POST /admin/users` for account provisioning.
**Files touched:** `backend/models/domain.py`, `backend/core/security.py`, `backend/core/deps.py`, `backend/core/rate_limit.py`, `backend/routers/auth.py`, `backend/routers/admin.py`, `backend/routers/viva.py`, `backend/services/`
**Related:** PROJECT_CONTEXT.md (Auth Flow), ARCHITECTURE.md (Entry Flow)

---

## [2026-08-10] Project kickoff — foundational docs created
**Type:** Architecture change
**Summary:** Created PROJECT_CONTEXT.md, ARCHITECTURE.md, CODING_RULES.md, FEATURE_LOG.md for AI Voice Interview Copilot. Stack locked: React + FastAPI + PostgreSQL, Whisper for STT, Gemini 2.5 Flash for evaluation/question generation, Email OTP auth (temp session).
**Files touched:** PROJECT_CONTEXT.md, ARCHITECTURE.md, CODING_RULES.md, FEATURE_LOG.md
**Related:** Business architecture diagram (4 phases + Admin Ops)

---

## [2026-08-10] Clarified TTS, fraud detection, and admin auth
**Type:** Architecture change
**Summary:** Questions are pronounced (TTS) AND displayed as text — Whisper is STT-only, so a separate TTS engine still needs picking. Fraud detection scoped to lightweight multi-face/no-face browser detection only, not advanced anti-cheat. Admin auth is username/password with one seeded admin (via script, not UI); seeded admin creates further admin/HR/recruiter accounts through the panel — no public admin self-registration.
**Files touched:** PROJECT_CONTEXT.md, ARCHITECTURE.md
**Related:** Auth Flow, AI Service Abstraction sections

---

## [2026-08-10] Scope narrowed: no-auth build phase
**Type:** Architecture change
**Summary:** Deferred ALL auth (token handoff, trainer/admin login, `users` table, `audit_logs`) to a later integration phase. Current build focuses purely on the core viva engine: session creation via raw `{trainee_id, module_id}`, question generation, TTS, STT, evaluation, basic fraud flagging, and report generation — every endpoint open/unauthenticated for now. `trainee_service` and `viva_service` designed so the future token-based entry is a small swap, not a rewrite.
**Files touched:** PROJECT_CONTEXT.md, ARCHITECTURE.md, schema.dbml
**Related:** Auth Flow, Entry Flow, Reusable Services sections

---

## [2026-08-10] Auth added: shared login for all roles, no self-registration
**Type:** Architecture change
**Summary:** Reversed the earlier "no auth for now" and "token-only trainee entry" decisions. All three roles (trainee, trainer, admin) now authenticate via one shared `users` table and `/auth/login`. Trainees don't self-register — accounts are provisioned in advance by admin/trainer (trainees are already a known, verified population by the time they reach Viva, having passed Practical Exam + MCQ on the main platform). Considered and rejected a self-register + trainer-approval model as solving a trust problem that doesn't exist here. Dropped the standalone `trainees` table (merged into `users` with role=TRAINEE) and `question_bank.question_type` (VOICE/TEXT — dead weight, module is voice-only). Narrowed fraud detection to three deterministic, low-false-positive signals: NO_FACE, TAB_SWITCH, FULLSCREEN_EXIT. Token-based trainee entry from the main platform remains a deferred future phase — only the entry point changes when built, session-resolution logic stays identical.
**Files touched:** PROJECT_CONTEXT.md, ARCHITECTURE.md, schema.dbml
**Related:** Auth Flow, Entry Flow, Reusable Services, fraud detection scope

---

_(No code written yet — this is the baseline entry. Next entries should reflect actual implementation work.)_
