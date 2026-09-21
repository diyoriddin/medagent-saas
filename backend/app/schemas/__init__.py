"""
Pydantic schemas for API request/response validation
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# ===== AUTH SCHEMAS =====

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    clinic_id: str
    role: str

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    fullName: str
    clinicId: str

# ===== CLINIC SCHEMAS =====

class ClinicCreateRequest(BaseModel):
    name: str
    slug: str
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    language: str = "uz"
    timezone: str = "Asia/Tashkent"

class ClinicResponse(BaseModel):
    id: str
    name: str
    slug: str
    phone: str
    address: Optional[str]
    isActive: bool
    createdAt: datetime
    
    class Config:
        from_attributes = True

# ===== DOCTOR SCHEMAS =====

class DoctorCreateRequest(BaseModel):
    fullName: str
    specialty: str
    price: float
    durationMin: int = 30
    bio: Optional[str] = None
    imageUrl: Optional[str] = None

class DoctorResponse(BaseModel):
    id: str
    fullName: str
    specialty: str
    price: float
    durationMin: int
    isActive: bool
    
    class Config:
        from_attributes = True

class DoctorDetailResponse(DoctorResponse):
    bio: Optional[str]
    imageUrl: Optional[str]
    createdAt: datetime

# ===== SCHEDULE SCHEMAS =====

class ScheduleCreateRequest(BaseModel):
    dayOfWeek: int  # 0-6 (0 = Sunday)
    startTime: str  # "09:00"
    endTime: str    # "18:00"
    breakStart: Optional[str] = None
    breakEnd: Optional[str] = None

class ScheduleResponse(BaseModel):
    id: str
    dayOfWeek: int
    startTime: str
    endTime: str
    breakStart: Optional[str]
    breakEnd: Optional[str]
    
    class Config:
        from_attributes = True

# ===== SLOT SCHEMAS =====

class SlotResponse(BaseModel):
    id: str
    doctorId: str
    startTime: datetime
    endTime: datetime
    status: str  # AVAILABLE, HELD, BOOKED
    
    class Config:
        from_attributes = True

class SlotHoldRequest(BaseModel):
    doctorId: str
    slotId: str
    patientPhone: str

class SlotHoldResponse(BaseModel):
    slotId: str
    status: str
    heldUntil: datetime
    message: str

# ===== PATIENT SCHEMAS =====

class PatientCreateRequest(BaseModel):
    firstName: str
    lastName: Optional[str] = None
    phone: str
    telegramId: Optional[int] = None

class PatientResponse(BaseModel):
    id: str
    firstName: str
    lastName: Optional[str]
    phone: str
    telegramId: Optional[int]
    
    class Config:
        from_attributes = True

# ===== APPOINTMENT SCHEMAS =====

class AppointmentBookRequest(BaseModel):
    doctorId: str
    patientId: str
    startTime: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    doctorId: str
    patientId: str
    startTime: datetime
    endTime: datetime
    status: str
    notes: Optional[str]
    createdAt: datetime
    
    class Config:
        from_attributes = True

class AppointmentDetailResponse(AppointmentResponse):
    doctor: DoctorResponse
    patient: PatientResponse

class AppointmentStatusUpdateRequest(BaseModel):
    status: str  # CONFIRMED, CANCELLED, IN_PROGRESS, COMPLETED, NO_SHOW
    notes: Optional[str] = None

# ===== WAITING LIST SCHEMAS =====

class WaitingListAddRequest(BaseModel):
    patientId: str
    doctorId: str
    specialty: str
    preferredDate: Optional[datetime] = None

class WaitingListResponse(BaseModel):
    id: str
    patientId: str
    doctorId: str
    specialty: str
    priority: int
    isActive: bool
    createdAt: datetime
    
    class Config:
        from_attributes = True

# ===== AI CONFIG SCHEMAS =====

class AIConfigUpdateRequest(BaseModel):
    systemPrompt: str
    welcomeMsg: str
    language: str = "uz"
    modelProvider: str = "openai"
    modelName: str = "gpt-4-turbo"
    temperature: float = 0.7

class AIConfigResponse(BaseModel):
    id: str
    systemPrompt: str
    welcomeMsg: str
    language: str
    modelProvider: str
    modelName: str
    
    class Config:
        from_attributes = True

# ===== NOTIFICATION SCHEMAS =====

class NotificationResponse(BaseModel):
    id: str
    messageType: str
    message: str
    sentVia: str
    isSent: bool
    scheduledFor: datetime
    createdAt: datetime
    
    class Config:
        from_attributes = True

# ===== ERROR SCHEMAS =====

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ValidationErrorResponse(BaseModel):
    detail: List[dict]
    code: str = "VALIDATION_ERROR"
