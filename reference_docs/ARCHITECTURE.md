# ARCHITECTURE.md
> Defines system structure and layer boundaries. This module is a standalone "Viva" service that will eventually integrate with AE's existing training exam platform (main platform owns Login/System Test/Exam/MCQ upstream of this). This module now owns its OWN full auth — shared login for trainee, trainer, and admin — provisioned in advance, no self-registration.

---

## 1. System Boundary

```
[ Existing AE Platform ]                    [ This Project: Viva Module ]
Login → System Test → Exam →                 Token verify → System check →
Upload Solution → MCQ                        AI Viva (Q&A loop) → Report →
        |                                    Trainer Decision
        |  redirect with signed token                |
        └──────────────────────────────────>          |
                                              (future: push result back —
                                               NOT built yet, exposed via
                                               our own API for later pull)
```

Rule: this module never assumes it owns exam/MCQ/login data. It only trusts what's in the verified token at entry. Anything else needed later (e.g. MCQ score as AI context) is a deliberate future integration, not a default.

---

## 2. High-Level Layers (internal)

```
React (Frontend)
   |  HTTP/JSON (axios)
FastAPI (Backend)
   |
   ├── routers/        → HTTP endpoints only (thin, no logic)
   ├── services/        → business logic (viva flow, scoring, token verify)
   ├── ai/               → AI provider abstraction (Whisper, TTS, Gemini)
   ├── models/           → SQLAlchemy ORM models
   ├── schemas/          → Pydantic request/response schemas
   ├── repositories/    → DB query layer (called by services only)
   └── core/             → config, security, JWT verify/issue, dependencies
   |
PostgreSQL (isolated DB — only this module's data)
```

Rule: **routers → services → repositories → DB**. Never skip a layer.

---

## 3. Frontend Structure

```
src/
├── pages/            → EntryPage (token handling), SystemCheckPage, VivaPage, ReportPage (trainer), AdminPages
├── components/       → reusable UI pieces
├── features/         → viva/, trainer-review/, admin/
├── services/         → API call wrappers
├── hooks/            → shared React hooks
├── store/            → session state (trainee identity from token, current viva session)
├── utils/
└── types/
```

---

## 4. Entry Flow

**Current design (build this now):** All roles authenticate via `POST /auth/login` against the shared `users` table. Post-login, routing branches by role:
- Trainer/Admin → `/dashboard` (fixed)
- Trainee → redirect to `/viva/welcome` for system checks. Upon clicking "Start Viva", calls `POST /viva/sessions/start` — checks for an existing in-progress `viva_sessions` row for this trainee; resumes it if found, otherwise creates a new one against the `module_id` already assigned on their account → navigates to `/viva/:sessionId/exam`

**Deferred (future integration phase — do not build yet):**
1. Main platform redirects to `https://<viva-app>/entry?token=<jwt>` instead of the trainee using direct login
2. Backend `core/token_verify.py` validates signature + expiry against the main platform's shared secret/public key
3. On success: decode claims → same `viva_service.resolve_or_create_session()` call as above, just fed a token-derived trainee identity instead of a logged-in session's identity
4. On failure: reject with a clear error page — no fallback login, no guessing

When this is eventually built, `core/token_verify.py` becomes the ONE place external trust enters the system. Only the trainee entry point changes — session-resolution logic, the entire viva loop, and reporting stay identical either way.

---

## 5. API Flow (viva Q&A loop)

```
Frontend records audio
  → POST /viva/{session_id}/answer (audio blob)
  → router: viva.py
  → service: viva_service.process_answer()
      → ai/stt.py (Whisper) → transcript
      → ai/evaluator.py (Gemini 2.5 Flash) → scores
      → ai/fraud_detect.py → frontend-provided face-detection signal → flag if needed
      → repository: save transcript + evaluation + flags
      → ai/question_gen.py → next question (or mark session complete)
      → ai/tts.py → audio for next question
  → return { next_question_text, next_question_audio_url } or { status: completed }
```

---

## 6. Database Relationships (high-level)

```
trainees (from token, not full users) (1) ──< viva_sessions
training_modules (1) ──< question_bank
training_modules (1) ──< viva_sessions
viva_sessions (1) ──< viva_questions ──(1)── evaluations
viva_questions (1) ──< fraud_flags
viva_sessions (1) ──(1)── viva_reports
users (trainer/admin) (1) ──< viva_reports (reviewed_by)
users (admin) (1) ──< audit_logs
```

Note: `trainees` is intentionally separate from `users` — trainees never log in locally, they're just an identity cache from the token. `users` is only trainer/admin accounts.

---

## 7. State Management (Frontend)

- Local UI state → `useState`/`useReducer`
- Session state (trainee identity + active viva session) → Context API, seeded once at entry from the token verify response
- Server data → fetched via `services/`, React Query once API stabilizes

---

## 8. AI Service Abstraction

```
ai/
├── stt.py          → transcribe(audio) -> text            [Whisper]
├── tts.py           → synthesize(text) -> audio            [TTS engine — TBD]
├── evaluator.py     → evaluate(transcript, question, context) -> scores  [Gemini 2.5 Flash]
├── question_gen.py  → generate_next_question(module, session_context) -> question [Gemini 2.5 Flash]
├── fraud_detect.py  → analyze(signals) -> fraud_flag        [basic, lightweight]
└── base.py          → shared interfaces so providers are swappable
```

Rule: if Gemini/Whisper/TTS provider changes later, only files inside `ai/` change.

---

## 9. Reusable Services (backend)

**Build now:**
- `auth_service` — login (verify password, issue JWT access + refresh), refresh, logout
- `user_service` — create trainer/trainee accounts (admin creates trainers; admin or trainer creates trainees, sets their `module_id`)
- `viva_service` — resolve-or-create session on trainee login, orchestrates the Q&A loop, session lifecycle
- `scoring_service` — aggregates per-question evaluations into a report + AI recommendation
- `fraud_service` — stores NO_FACE/TAB_SWITCH/FULLSCREEN_EXIT flags from frontend-provided signals
- `admin_seed_service` — seeds first admin from env vars on startup if none exists

**Deferred — do not build yet:**
- `token_verify_service` — validates incoming JWT from the main platform (replaces direct login as trainee's entry point)

---

## 10. Modularity Principles

- This module must remain independently deployable — it should never hard-require the existing platform's DB or internal APIs, only the token contract at entry
- AI provider logic isolated in `ai/` so Whisper/Gemini/TTS can be swapped later
- Integration-back-to-main-platform (pushing scores) should be an optional outbound call in `viva_service`, feature-flagged off until that integration is actually built — don't block the core viva flow on it
