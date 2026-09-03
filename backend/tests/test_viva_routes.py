import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from models.domain import SessionStatus, TrainingModule, User, UserRole, VivaSession
from routers.viva import evaluate_session_route


class VivaRouteSecurityTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        User.__table__.create(bind=engine)
        TrainingModule.__table__.create(bind=engine)
        VivaSession.__table__.create(bind=engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def test_trainee_cannot_evaluate_another_trainees_session(self):
        with self.SessionLocal() as db:
            owner = User(username="owner@example.com", password_hash="x", role=UserRole.TRAINEE)
            other = User(username="other@example.com", password_hash="x", role=UserRole.TRAINEE)
            module = TrainingModule(name="Foundation")
            db.add_all([owner, other, module])
            db.commit()

            session = VivaSession(
                trainee_id=owner.id,
                module_id=module.id,
                status=SessionStatus.COMPLETED,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            db.refresh(other)

            with self.assertRaises(HTTPException) as exc:
                evaluate_session_route(session.id, db=db, current_user=other)

            self.assertEqual(exc.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
