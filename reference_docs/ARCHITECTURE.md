# ARCHITECTURE.md
> Defines system structure and layer boundaries. This module is a standalone, self-contained "Viva" service that will eventually plug into AE's existing training exam platform via a token handoff — it does not own login, exams, MCQ, or Post-Exam aggregation.
>
> **CURRENT BUILD PHASE: no auth.** The token handoff, trainer/admin login, and `users` table described below are the TARGET design for a later integration phase. Right now, `trainee_id`/`module_id` are passed directly into requests and every endpoint is open. Do not implement auth, JWT, or the `core/token_verify.py` middleware until explicitly asked — build the core viva engine first.

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

**Current phase (build this now):** `POST /viva/sessions` accepts `{trainee_id, module_id}` directly in the request body. `trainee_service.get_or_create_trainee()` still exists as the entry point — just called with the raw id/module instead of decoded token claims. This keeps the eventual token-based swap a one-line change in the router, not a rewrite of `viva_service`.

**Deferred (future integration phase — do not build yet):**
1. Existing platform redirects to `https://<viva-app>/entry?token=<jwt>`
2. Backend `core/token_verify.py` validates signature + expiry against the existing platform's shared secret/public key
3. On success: decode claims (employee_id, name, email, module) → same `trainee_service.get_or_create_trainee()` call → create `viva_sessions` row
4. On failure: reject with a clear error page — no fallback login, no guessing

When this is eventually built, `core/token_verify.py` becomes the ONE place external trust enters the system — treat it as security-critical, isolated, and heavily tested. Right now it doesn't exist.

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
- `trainee_service` — get-or-create trainee (currently from raw id, later from token claims — same function signature either way)
- `viva_service` — orchestrates the Q&A loop, session lifecycle
- `scoring_service` — aggregates per-question evaluations into a report + AI recommendation
- `fraud_service` — stores multi-face/no-face flags from frontend-provided signals

**Deferred — do not build yet:**
- `token_verify_service` — validates incoming JWT from the existing platform
- `admin_seed_service` — seeds first admin from env vars on startup

---

## 10. Modularity Principles

- This module must remain independently deployable — it should never hard-require the existing platform's DB or internal APIs, only the token contract at entry
- AI provider logic isolated in `ai/` so Whisper/Gemini/TTS can be swapped later
- Integration-back-to-main-platform (pushing scores) should be an optional outbound call in `viva_service`, feature-flagged off until that integration is actually built — don't block the core viva flow on it