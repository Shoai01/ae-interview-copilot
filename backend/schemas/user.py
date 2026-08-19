from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from models.domain import UserRole

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    full_name: Optional[str] = None
    employee_id: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
