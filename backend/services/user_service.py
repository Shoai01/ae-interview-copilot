from sqlalchemy.orm import Session
from models.domain import User, UserRole
from schemas.user import UserCreate
from core.security import get_password_hash

def get_user_by_username(db: Session, username: str) -> User:
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate, created_by_id: int) -> User:
    db_user = User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role=user.role,
        full_name=user.full_name,
        employee_id=user.employee_id,
        created_by=created_by_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_all_users(db: Session, current_user_role: UserRole) -> list[User]:
    # Trainers might only need to see trainees, but for now let's return all non-admins if trainer, or all if admin
    if current_user_role == UserRole.ADMIN:
        return db.query(User).all()
    else:
        return db.query(User).filter(User.role == UserRole.TRAINEE).all()
