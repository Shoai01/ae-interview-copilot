import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.database import engine
from sqlalchemy import text

def run_migration():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE fraud_flags ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 1;"))
            conn.commit()
            print("Successfully added count column to fraud_flags table.")
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    run_migration()
