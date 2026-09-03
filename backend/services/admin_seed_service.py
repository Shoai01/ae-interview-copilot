import os
import secrets
from sqlalchemy.orm import Session
from models.domain import User, UserRole
from core.security import get_password_hash

def seed_admin(db: Session):
    admin_username = os.environ.get("SEED_ADMIN_USERNAME", "admin")
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD")
    must_change_password = False
    
    # Check if any admin exists
    admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin_exists:
        if not admin_password:
            try:
                admin_password = secrets.token_urlsafe(18)
                must_change_password = True
            except Exception as exc:
                raise RuntimeError(
                    "SEED_ADMIN_PASSWORD is required because an initial admin "
                    "password could not be generated."
                ) from exc

        print(f"Seeding initial admin user: {admin_username}")
        if must_change_password:
            print(f"Generated one-time admin password: {admin_password}")
        db_admin = User(
            username=admin_username,
            password_hash=get_password_hash(admin_password),
            role=UserRole.ADMIN,
            full_name="System Admin",
            must_change_password=must_change_password,
            created_by=None
        )
        db.add(db_admin)
        db.commit()
    else:
        print("Admin user already exists. Skipping seed.")
