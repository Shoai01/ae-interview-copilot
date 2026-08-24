import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import engine, SessionLocal
from models.domain import Base
from sqlalchemy import text
from services.admin_seed_service import seed_admin

print("Dropping schema...")
with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE;"))
    conn.execute(text("CREATE SCHEMA public;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
    conn.commit()

print("Recreating tables from models...")
Base.metadata.create_all(bind=engine)

print("Stamping alembic head...")
import subprocess
try:
    subprocess.run(["alembic", "stamp", "head"], check=True)
except Exception as e:
    print("Alembic stamp failed, but tables are created:", e)

print("Seeding admin user...")
db = SessionLocal()
try:
    seed_admin(db)
    print("Success!")
finally:
    db.close()
