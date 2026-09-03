import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.security import verify_password
from models.domain import User, UserRole
from services.admin_seed_service import seed_admin


class AdminSeedServiceTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        User.__table__.create(bind=engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def test_seed_admin_without_password_generates_one_time_password_and_forces_reset(self):
        with self.SessionLocal() as db:
            with patch.dict(os.environ, {"SEED_ADMIN_USERNAME": "admin@example.com"}, clear=True):
                with patch("services.admin_seed_service.secrets.token_urlsafe", return_value="generated-once"):
                    seed_admin(db)

            admin = db.query(User).filter(User.role == UserRole.ADMIN).one()
            self.assertEqual(admin.username, "admin@example.com")
            self.assertTrue(admin.must_change_password)
            self.assertTrue(verify_password("generated-once", admin.password_hash))

    def test_seed_admin_without_password_fails_when_generation_fails(self):
        with self.SessionLocal() as db:
            with patch.dict(os.environ, {}, clear=True):
                with patch("services.admin_seed_service.secrets.token_urlsafe", side_effect=RuntimeError("no entropy")):
                    with self.assertRaisesRegex(RuntimeError, "SEED_ADMIN_PASSWORD is required"):
                        seed_admin(db)

            self.assertEqual(db.query(User).filter(User.role == UserRole.ADMIN).count(), 0)


if __name__ == "__main__":
    unittest.main()
