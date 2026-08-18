from sqlalchemy import text
from core.database import engine
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TYPE sessionstatus ADD VALUE 'PENDING' BEFORE 'IN_PROGRESS';"))
        conn.commit()
        print('Enum updated successfully')
    except Exception as e:
        print('Error:', e)
