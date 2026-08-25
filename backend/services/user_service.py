from sqlalchemy.orm import Session
from models.domain import User, UserRole
from schemas.user import UserCreate, UserUpdate
from core.security import get_password_hash
from repositories import user_repository

def get_user_by_username(db: Session, username: str) -> User:
    """
    Fetch a user by their username.
    
    Args:
        db (Session): Database session.
        username (str): The username to query.
        
    Returns:
        User: The user object if found, otherwise None.
    """
    return user_repository.get_user_by_username(db, username)

def get_user_by_id(db: Session, user_id: int) -> User:
    """
    Fetch a user by their unique database ID.
    
    Args:
        db (Session): Database session.
        user_id (int): The unique ID of the user.
        
    Returns:
        User: The user object if found, otherwise None.
    """
    return user_repository.get_user_by_id(db, user_id)

def create_user(db: Session, user: UserCreate, created_by_id: int) -> User:
    """
    Create a new user account with a hashed password.
    
    Args:
        db (Session): Database session.
        user (UserCreate): Pydantic schema containing user details and raw password.
        created_by_id (int): ID of the admin/trainer provisioning this account.
        
    Returns:
        User: The newly created user object.
    """
    password_hash = get_password_hash(user.password)
    return user_repository.create_user(db, user, password_hash, created_by_id)

def get_all_users(db: Session, current_user_role: UserRole) -> list[User]:
    """
    Fetch a list of users based on the requester's role. 
    Admins see everyone, Trainers see only Trainees.
    
    Args:
        db (Session): Database session.
        current_user_role (UserRole): Role of the requesting user.
        
    Returns:
        list[User]: List of users visible to the requester.
    """
    return user_repository.get_all_users_by_role(db, current_user_role)

def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
    """
    Update an existing user's details, including rehashing their password if provided.
    
    Args:
        db (Session): Database session.
        user_id (int): ID of the user to update.
        user_data (UserUpdate): Pydantic schema containing fields to update.
        
    Returns:
        User: The updated user object, or None if the user was not found.
    """
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    update_data = user_data.model_dump(exclude_unset=True)
    
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data.pop('password'))
    elif 'password' in update_data:
        update_data.pop('password')
        
    return user_repository.update_user_fields(db, db_user, update_data)

def delete_user(db: Session, user_id: int) -> bool:
    """
    Delete a user account and cascade delete or nullify related records safely.
    
    Args:
        db (Session): Database session.
        user_id (int): ID of the user to delete.
        
    Returns:
        bool: True if the user was successfully deleted, False if not found.
    """
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
        
    try:
        if db_user.role == UserRole.TRAINEE:
            user_repository.delete_trainee_cascade(db, db_user)
        elif db_user.role in [UserRole.TRAINER, UserRole.ADMIN]:
            user_repository.delete_trainer_admin_cascade(db, db_user, user_id)
            
        return True
    except Exception as e:
        db.rollback()
        raise e
