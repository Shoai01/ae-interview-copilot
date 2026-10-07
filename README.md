# AE Interview Copilot (Viva Copilot)

An AI-assisted platform for running and evaluating spoken viva exams. Trainers and
admins build a question bank from uploaded knowledge documents, assign timed
sessions to trainees, and review AI-scored results. Trainees answer by voice with
live transcription and background proctoring.

- **Frontend:** React 19, Vite, Material UI
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Alembic
- **AI:** Google Vertex AI (Gemini) for question generation, evaluation and embeddings; FAISS for the knowledge-base index
- **Speech-to-text:** Deepgram (streaming)

See [ARCHITECTURE.md](ARCHITECTURE.md) for the layered design and
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the feature history.

## Features

| Role | Can do |
|---|---|
| **Admin** | Manage users, knowledge base and question bank, assign sessions, view audit logs and LLM usage analytics |
| **Trainer** | Assign sessions (single/bulk), review sessions with transcripts, audio, scores and integrity flags, record pass/fail decisions |
| **Trainee** | Take an assigned viva: speak answers with live captions, with camera/mic checks and a countdown timer |

**Proctoring (browser-side, stored per question):** face absent, multiple faces,
tab switch, fullscreen exit and background noise. Face/tab/fullscreen flags are
recorded as timed episodes (start → end) with repeat reminders to the candidate;
trainers see them in a collapsible *Integrity timeline* on the review page. Flags
never lower the AI score — they are for human review.

## Prerequisites

- **Python 3.11**
- **Node.js** 20.19+ or 22.12+ (with npm)
- **PostgreSQL** 13+
- A **Google Cloud service-account key** with Vertex AI access
- A **Deepgram API key**
- Optional: an SMTP account (without one, emails are printed to the backend console)

## Quick start (local development)

### 1. Database

```sql
CREATE DATABASE viva_copilot;
```

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows:  venv\Scripts\activate        macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # Windows: copy .env.example .env
# edit .env — see "Configuration" below
```

Place your Google service-account key at `backend/vertex-key.json` (or point
`GOOGLE_APPLICATION_CREDENTIALS` at it). It is git-ignored.

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

On first start the app creates the tables and seeds an `admin` user. If
`SEED_ADMIN_PASSWORD` is empty, a one-time password is printed in the console and
you must change it on first login.

**Stamp Alembic on a brand-new database** (the tables were just created from the
models, so mark them as already migrated):

```bash
alembic stamp head
```

API docs are served at <http://localhost:8000/docs>; a health check is at `/health`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. On `localhost` the frontend talks to
`http://localhost:8000` automatically; no env file is needed.

## Configuration

### Backend — `backend/.env`

See [backend/.env.example](backend/.env.example) for the full annotated template.

| Variable | Required | Purpose |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | PostgreSQL credentials. The app refuses to start without them (no fallback DB) |
| `DB_HOST`, `DB_PORT` | no | Default `localhost` / `5432` |
| `SECRET_KEY` | yes* | JWT signing key. *Not needed if `DEV_MODE=true` (ephemeral key, dev only) |
| `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` | no | Initial admin. Defaults to `admin` with a generated one-time password |
| `GOOGLE_APPLICATION_CREDENTIALS` | yes | Path to the Vertex AI service-account JSON (region `us-central1`) |
| `DEEPGRAM_API_KEY` | yes | Used by the backend to mint short-lived browser tokens for live STT |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` | no | Welcome / assignment emails. Port 465 = SSL, otherwise STARTTLS. Empty host = print to console |

Generate a secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Frontend — `frontend/.env.local` (all optional)

See [frontend/.env.example](frontend/.env.example).

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL. Defaults to `http://localhost:8000` on localhost, otherwise `/api` on the same origin |
| `VITE_DEEPGRAM_MODEL`, `VITE_DEEPGRAM_LANGUAGE` | STT model (`nova-3`) and language (`en-IN`) |
| `VITE_DEEPGRAM_MIN_FINAL_CONFIDENCE` | Confidence below which a final transcript is only logged as low-confidence |
| `VITE_DEEPGRAM_KEYTERMS` | Extra comma-separated vocabulary hints |

## Database migrations

Schema changes live in [backend/alembic/versions/](backend/alembic/versions/).

```bash
cd backend
alembic upgrade head                              # apply pending migrations
alembic revision -m "describe the change"         # new migration
alembic current                                   # where this database is
```

- **Existing database (e.g. UAT/production):** run `alembic upgrade head` on every deploy, **before or together with** restarting the backend.
- **New database:** start the backend once (creates tables), then `alembic stamp head`.
- `backend/reset_db.py` wipes the whole `public` schema and rebuilds it. It is for local development only and asks for confirmation.

## Production notes

- **Build the frontend:** `cd frontend && npm run build` → static files in `frontend/dist/`.
- **Serve behind a reverse proxy.** When not on `localhost`, the frontend calls `/api/...` on its own origin. Proxy `/api/` to the backend (`http://127.0.0.1:8000`) and strip the `/api` prefix — backend routes have no prefix. Alternatively set `VITE_API_URL` at build time.
- **Run the API** with `uvicorn main:app --host 0.0.0.0 --port 8000` (add `--workers N` as needed) under a process manager such as systemd.
- **HTTPS is required** in production: browsers only allow camera, microphone and fullscreen on secure origins.
- Set a strong `SECRET_KEY`, never enable `DEV_MODE`, and keep `.env` and the service-account key out of version control.
- CORS origins are configured in `backend/main.py`.
- Candidate audio is stored in `backend/uploads/` and the knowledge-base index in `backend/faiss_index/`. Both are git-ignored — back them up and persist them across deploys.

## Project layout

```
.
├── backend/
│   ├── main.py              # FastAPI app, CORS, startup (tables + admin seed)
│   ├── alembic/             # migrations
│   ├── core/                # database, security (JWT), rate limiting, dependencies
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic request/response models
│   ├── repositories/        # data access
│   ├── services/            # business logic (viva, users, email, Deepgram, audit, ...)
│   ├── routers/             # auth, admin, viva endpoints
│   ├── ai/                  # question generation, evaluation, embeddings
│   ├── assets/              # logo used in emails
│   ├── requirements.txt     # runtime dependencies (pinned)
│   └── requirements-dev.txt # + test tooling
├── frontend/
│   ├── src/
│   │   ├── pages/           # screens (admin, trainer, trainee)
│   │   ├── components/
│   │   ├── hooks/           # speech recognition, fraud/noise detection, flag episodes
│   │   ├── services/        # API client
│   │   ├── store/           # auth + session state
│   │   └── utils/           # audio graph, helpers
│   └── public/              # face-detection model, PCM worklet, static assets
├── samples/                 # sample bulk-trainee upload CSV
├── ARCHITECTURE.md
└── PROJECT_CONTEXT.md
```

## Common tasks

| Task | Command |
|---|---|
| Run backend | `cd backend && uvicorn main:app --reload --port 8000` |
| Run frontend | `cd frontend && npm run dev` |
| Lint frontend | `cd frontend && npm run lint` |
| Build frontend | `cd frontend && npm run build` |
| Install test tooling | `cd backend && pip install -r requirements-dev.txt` |
| Apply migrations | `cd backend && alembic upgrade head` |

## Troubleshooting

- **`DB_USER, DB_PASSWORD, and DB_NAME must be set`** — create `backend/.env` from the example and fill in the database values.
- **`SECRET_KEY environment variable is required`** — set `SECRET_KEY`, or `DEV_MODE=true` for local development only.
- **Live captions unavailable** — check `DEEPGRAM_API_KEY` and that the page is on `localhost` or HTTPS with microphone access allowed.
- **Vertex AI / credentials errors** — confirm `GOOGLE_APPLICATION_CREDENTIALS` points at a valid key whose project has the Vertex AI API enabled.
- **Flags not saving after an update** — the database is missing a migration; run `alembic upgrade head`.
