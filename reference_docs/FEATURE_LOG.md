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

_(No code written yet — this is the baseline entry. Next entries should reflect actual implementation work.)_
## [2026-08-11] AI Evaluation Integration
- **Added**: google-genai integration for evaluating candidate transcripts.
- **Changed**: Moved AI evaluation logic to ackend/ai/evaluator.py as per architecture docs.
- **Added**: Backend API endpoints for /viva/{session_id}/evaluate and /viva/{session_id}/report.
- **Changed**: Made TrainerReviewDetail.jsx and TrainerDashboard.jsx fully dynamic by pulling real session and evaluation data from the DB.
