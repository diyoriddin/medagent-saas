"""
Security utilities: JWT tokens, password hashing, multi-tenancy
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from passlib.context import CryptContext

from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing

# HTTP Bearer security
security = HTTPBearer()

# ===== PASSWORD HASHING =====

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly to avoid passlib backend issues."""
    if not password:
        return ""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify hashed password using bcrypt.checkpw"""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        # Fallback: if stored password is plaintext, compare directly
        return plain_password == hashed_password

# ===== JWT TOKEN HANDLING =====

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def verify_token(token: str) -> dict:
    """
    Verify JWT token and return payload
    Raises HTTPException if token is invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ===== DEPENDENCY: EXTRACT USER FROM TOKEN =====

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Extract current user from JWT token
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    user_id = payload.get("sub")
    clinic_id = payload.get("clinic_id")
    role = payload.get("role")
    
    if not user_id or not clinic_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "user_id": user_id,
        "clinic_id": clinic_id,
        "role": role
    }

# ===== MULTI-TENANCY ENFORCEMENT =====

async def get_clinic_id_from_request(
    current_user: dict = Depends(get_current_user)
) -> str:
    """
    Extract clinic_id from current user (multi-tenancy)
    """
    return current_user.get("clinic_id")

def enforce_clinic_isolation(clinic_id_from_db: str, clinic_id_from_user: str):
    """
    Enforce that user can only access their own clinic's data
    """
    if clinic_id_from_db != clinic_id_from_user:
        logger.warning(
            f"Clinic isolation violation: User tried to access clinic {clinic_id_from_db} "
            f"but belongs to {clinic_id_from_user}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this clinic"
        )

# ===== ROLE-BASED ACCESS CONTROL =====

def check_role(required_roles: list[str]):
    """Dependency to check user role"""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    
    return role_checker
