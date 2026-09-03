from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt, JWTError
import os
import bcrypt
import secrets

SECRET_KEY = os.environ.get("SECRET_KEY")
_DEV_SECRET_KEY = None
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

def is_development_mode() -> bool:
    dev_mode = os.environ.get("DEV_MODE", "").lower()
    env = os.environ.get("ENV", "").lower()
    return dev_mode in {"1", "true", "yes", "on"} or env == "development"

def validate_security_config() -> None:
    if SECRET_KEY or is_development_mode():
        return
    raise RuntimeError(
        "SECRET_KEY environment variable is required unless DEV_MODE is enabled "
        "or ENV=development is set."
    )

def get_jwt_secret_key() -> str:
    global _DEV_SECRET_KEY
    if SECRET_KEY:
        return SECRET_KEY
    if is_development_mode():
        if _DEV_SECRET_KEY is None:
            _DEV_SECRET_KEY = secrets.token_urlsafe(32)
        return _DEV_SECRET_KEY
    validate_security_config()

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password=password_byte_enc, hashed_password=hashed_password_byte_enc)

def create_access_token(subject: Union[str, Any], role: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "role": role, "type": "access"}
    encoded_jwt = jwt.encode(to_encode, get_jwt_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, get_jwt_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        decoded_data = jwt.decode(token, get_jwt_secret_key(), algorithms=[ALGORITHM])
        return decoded_data
    except JWTError:
        return None
