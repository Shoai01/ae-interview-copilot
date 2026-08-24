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
        return db.query(User).order_by(User.id.desc()).all()
    else:
        return db.query(User).filter(User.role == UserRole.TRAINEE).order_by(User.id.desc()).all()

from schemas.user import UserUpdate

def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    update_data = user_data.model_dump(exclude_unset=True)
    
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data.pop('password'))
    elif 'password' in update_data:
        update_data.pop('password')
        
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
        
    try:
        if db_user.role == UserRole.TRAINEE:
            # Manually delete their sessions to avoid FK constraints
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
                
        elif db_user.role in [UserRole.TRAINER, UserRole.ADMIN]:
            # Nullify created_by and reviewed_by fields to avoid FK constraints
            from models.domain import VivaReport, User
            db.query(User).filter(User.created_by == user_id).update({"created_by": None})
            db.query(VivaReport).filter(VivaReport.reviewed_by == user_id).update({"reviewed_by": None})

        db.delete(db_user)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
