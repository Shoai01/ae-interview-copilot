from fastapi import FastAPI
from core.database import engine
from models import domain

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Viva Copilot API!"}
