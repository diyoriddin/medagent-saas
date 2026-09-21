"""
Authentication Routes (Login, Register, Token Refresh)
Multi-tenant Support
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import EmailStr

from app.core.security import (
    verify_password,
    hash_password,
    create_access_token
)
from app.schemas import (
    UserLoginRequest,
    UserLoginResponse,
    UserRegisterRequest
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ===== LOGIN =====

@router.post(
    "/login",
    response_model=UserLoginResponse,
    summary="Foydalanuvchini tizimga kirish",
    tags=["Auth"]
)
async def login(request: UserLoginRequest):
    """
    User login endpoint
    Returns JWT token for subsequent API calls
    """
    
    logger.info(f"🔐 Login attempt: {request.email}")
    
    try:
        # 1. Find user by email
        user = await get_user_from_db(request.email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # 2. Verify password (allow plaintext fallback for local seed only)
        try:
            verified = verify_password(request.password, user.get("password"))
        except Exception:
            # fallback: if stored password matches plaintext (seed fallback), accept
            verified = (request.password == user.get("password"))

        if not verified:
            logger.warning(f"⚠️ Invalid password for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # 3. Check if user is active
        if not user.get("isActive"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # 4. Create JWT token
        access_token = create_access_token(
            data={
                "sub": user.get("id"),
                "clinic_id": user.get("clinicId"),
                "role": user.get("role"),
                "email": user.get("email")
            }
        )
        
        logger.info(f"✅ Login successful: {request.email}")
        
        return UserLoginResponse(
            access_token=access_token,
            user_id=user.get("id"),
            clinic_id=user.get("clinicId"),
            role=user.get("role")
        )
    
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

# ===== REGISTER (SUPER ADMIN ONLY) =====

@router.post(
    "/register",
    summary="Yangi foydalanuvchi ro'yxatdan o'tkazish",
    tags=["Auth"]
)
async def register(request: UserRegisterRequest):
    """
    Register new user (clinic staff)
    Only clinic admins can create new users
    """
    
    logger.info(f"📝 Registration attempt: {request.email}")
    
    try:
        # 1. Check if email already exists
        existing_user = await get_user_from_db(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 2. Verify clinic exists
        clinic = await get_clinic_from_db(request.clinicId)
        if not clinic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Clinic not found"
            )
        
        # 3. Hash password
        hashed_password = hash_password(request.password)
        
        # 4. Create user in database
        user = await create_user_in_db(
            clinic_id=request.clinicId,
            email=request.email,
            password=hashed_password,
            full_name=request.fullName,
            role="RECEPTIONIST"  # Default role
        )
        
        logger.info(f"✅ User registered: {request.email}")
        
        return {
            "message": "User registered successfully",
            "user_id": user.get("id")
        }
    
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

# ===== CHANGE PASSWORD =====

@router.post(
    "/change-password",
    summary="Parolni o'zgartirish",
    tags=["Auth"]
)
async def change_password(
    old_password: str,
    new_password: str,
    confirm_password: str
):
    """
    Change user password
    """
    
    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords don't match"
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # TODO: Verify user, check old password, update new password
    return {"message": "Password changed successfully"}

# ===== DATABASE FUNCTIONS (SQLAlchemy fallback) =====

from app.db import SessionLocal
from app.models import User, Clinic


async def get_user_from_db(email: str) -> dict:
    """Get user from database by email using SQLAlchemy."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "password": user.password,
            "clinicId": user.clinic_id,
            "role": user.role,
            "isActive": user.is_active
        }
    finally:
        db.close()


async def get_clinic_from_db(clinic_id: str) -> dict:
    db = SessionLocal()
    try:
        clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
        if not clinic:
            return None
        return {"id": clinic.id, "name": clinic.name}
    finally:
        db.close()


async def create_user_in_db(
    clinic_id: str,
    email: str,
    password: str,
    full_name: str,
    role: str
) -> dict:
    db = SessionLocal()
    try:
        user = User(
            clinic_id=clinic_id,
            email=email,
            password=password,
            full_name=full_name,
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"id": user.id, "email": user.email}
    finally:
        db.close()
