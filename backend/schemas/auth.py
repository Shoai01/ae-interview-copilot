from pydantic import BaseModel
from typing import Optional
from models.domain import UserRole

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    id: int
    role: UserRole
    username: str
    employee_id: Optional[str] = None
