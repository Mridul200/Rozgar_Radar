import os
import secrets
import bcrypt
import jwt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.config import settings

logger = logging.getLogger("hirepulse_auth")

_raw_jwt_key = os.getenv("JWT_SECRET_KEY") or (getattr(settings, "JWT_SECRET_KEY", None) if settings else None)
_env = (os.getenv("ENVIRONMENT") or (getattr(settings, "ENVIRONMENT", None) if settings else None) or "production").lower()
_DEFAULT_FALLBACK_JWT = "hirepulse_super_secret_jwt_key_2026_india_first_agent_jwt_token_sign_secure_32bytes"

if _raw_jwt_key:
    if len(_raw_jwt_key) < 32:
        logger.warning("Configured JWT_SECRET_KEY is shorter than 32 characters; padding for HS256 compliance.")
        JWT_SECRET_KEY = _raw_jwt_key.ljust(32, "_")
    else:
        JWT_SECRET_KEY = _raw_jwt_key
else:
    if _env not in ("development", "dev", "local", "test", "testing"):
        logger.warning(
            "JWT_SECRET_KEY is not set in production. Using fallback secret. "
            "For maximum security, configure JWT_SECRET_KEY in Render."
        )
    JWT_SECRET_KEY = _DEFAULT_FALLBACK_JWT

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def verify_admin(x_admin_key: Optional[str] = Header(None)):
    current_env = (os.getenv("ENVIRONMENT") or (getattr(settings, "ENVIRONMENT", None) if settings else None) or "production").lower()
    admin_key = os.getenv("ADMIN_API_KEY") or (getattr(settings, "ADMIN_API_KEY", None) if settings else None)
    if not x_admin_key or not admin_key or not secrets.compare_digest(x_admin_key.encode('utf-8'), admin_key.encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin authentication required"
        )
    if current_env in ("production", "prod", "live") and admin_key == "change-this-secure-admin-key-in-production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Default admin key is not allowed in production."
        )
    return True

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None
