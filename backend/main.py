from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import datetime
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.database import engine, get_db
from models import domain
from routers import admin, viva, auth
from core.rate_limit import limiter
from core.security import validate_security_config
from services.admin_seed_service import seed_admin

validate_security_config()

# This line ensures all database tables defined in models/domain.py
# are automatically created in the database when the server starts up.
print("Checking database tables...")
domain.Base.metadata.create_all(bind=engine)
print("Database tables are ready.")

app = FastAPI(
    title="Viva Copilot API",
    description="Backend API for the Viva Copilot Voice Assessment System",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ae-interview-copilot.pages.dev"
    ],
    allow_origin_regex=r"https://.*\.pages\.dev|https://.*\.workers\.dev|https://.*\.cloudflare\.com|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"]
)

os.makedirs("uploads", exist_ok=True)
# Recordings are served through the authenticated /viva/{session_id}/answer/{viva_question_id}/audio
# route instead of a public static mount, so access can be scoped to the owning trainee or a reviewer.

# Seed initial admin on startup
with engine.connect() as connection:
    from sqlalchemy.orm import Session
    with Session(engine) as session:
        seed_admin(session)

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(viva.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Viva Copilot API!"}

@app.get("/health", tags=["System"])
def health_check():
    """
    Real-time health check API to verify system and database status.
    Can be used by the frontend to drive the 'Engine Active' indicator.
    """
    # Also doubles as a clock-sync source for the exam timer (VivaInProgress
    # polls this to correct for candidate-machine clock skew against the
    # server-issued session start_time) — cheap to include since this
    # endpoint is already polled regularly.
    server_time = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        # Simple DB connectivity check
        with engine.connect() as connection:
            pass
        return {"status": "ok", "engine": "active", "database": "connected", "server_time": server_time}
    except Exception as e:
        return {"status": "error", "engine": "down", "database": "disconnected", "details": str(e), "server_time": server_time}
