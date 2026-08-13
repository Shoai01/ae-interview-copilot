import os
from sqlalchemy.orm import Session
from models.domain import User, UserRole
from core.security import get_password_hash

def seed_admin(db: Session):
    admin_username = os.environ.get("SEED_ADMIN_USERNAME", "admin")
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")
    
    # Check if any admin exists
    admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin_exists:
        print(f"Seeding initial admin user: {admin_username}")
        db_admin = User(
            username=admin_username,
            password_hash=get_password_hash(admin_password),
            role=UserRole.ADMIN,
            full_name="System Admin",
            created_by=None
        )
        db.add(db_admin)
        db.commit()
    else:
        print("Admin user already exists. Skipping seed.")
