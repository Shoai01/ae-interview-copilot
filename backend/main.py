from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.database import engine, get_db
from models import domain
from routers import admin, viva, auth
from core.rate_limit import limiter
from services.admin_seed_service import seed_admin

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
    allow_origins=["*"], # For development. Adjust for production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
