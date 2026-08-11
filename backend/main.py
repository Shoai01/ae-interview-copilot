from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine
from models import domain
from routers import admin, viva

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development. Adjust for production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(admin.router)
app.include_router(viva.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Viva Copilot API!"}
