from sqlalchemy.orm import Session
from models.domain import User, UserRole
from schemas.user import UserCreate
from core.security import get_password_hash

def get_user_by_username(db: Session, username: str) -> User:
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate, created_by_id: int) -> User:
    db_user = User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=user.role,
        full_name=user.full_name,
        employee_id=user.employee_id,
        module_id=user.module_id,
        created_by=created_by_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
