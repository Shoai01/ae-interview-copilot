from sqlalchemy.orm import Session
from models.domain import User, UserRole, VivaReport
from schemas.user import UserCreate

def get_user_by_username(db: Session, username: str) -> User:
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate, password_hash: str, created_by_id: int) -> User:
    db_user = User(
        username=user.username,
        password_hash=password_hash,
        role=user.role,
        full_name=user.full_name,
        employee_id=user.employee_id,
        created_by=created_by_id,
        must_change_password=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_trainee(db: Session, username: str, full_name: str, password_hash: str, created_by_id: int) -> User:
    db_user = User(
        username=username,
        full_name=full_name,
        password_hash=password_hash,
        role=UserRole.TRAINEE,
        created_by=created_by_id,
        must_change_password=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_all_users_by_role(db: Session, role: UserRole) -> list[User]:
    if role == UserRole.ADMIN:
        return db.query(User).order_by(User.id.desc()).all()
    else:
        return db.query(User).filter(User.role == UserRole.TRAINEE).order_by(User.id.desc()).all()

def update_user_fields(db: Session, db_user: User, update_data: dict) -> User:
    for key, value in update_data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_trainee_cascade(db: Session, db_user: User) -> None:
    for session in db_user.sessions:
        if session.report:
            db.delete(session.report)
        for q in session.questions:
            if q.evaluation:
                db.delete(q.evaluation)
            for f in q.fraud_flags:
                db.delete(f)
            db.delete(q)
        db.delete(session)
    db.delete(db_user)
    db.commit()

def delete_trainer_admin_cascade(db: Session, db_user: User, user_id: int) -> None:
    db.query(User).filter(User.created_by == user_id).update({"created_by": None})
    db.query(VivaReport).filter(VivaReport.reviewed_by == user_id).update({"reviewed_by": None})
    db.delete(db_user)
    db.commit()
