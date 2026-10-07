import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import engine, SessionLocal
from models.domain import Base
from sqlalchemy import text
from services.admin_seed_service import seed_admin

# Destructive: drops the whole public schema of whatever DB core.database points at.
_target = os.getenv("DB_NAME")
if input(f'This will ERASE ALL DATA in database "{_target}". Type its name to continue: ').strip() != _target:
    print("Aborted.")
    sys.exit(1)

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
