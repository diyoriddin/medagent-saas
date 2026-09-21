"""
Doctor Management Routes
Handles: Doctor CRUD, Schedule Management, Emergency Blocking
"""

import logging
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import (
    get_current_user,
    get_clinic_id_from_request,
    check_role
)
from app.schemas import (
    DoctorCreateRequest,
    DoctorDetailResponse,
    ScheduleCreateRequest,
    ScheduleResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ===== CREATE DOCTOR =====

@router.post(
    "/",
    response_model=dict,
    summary="Yangi shifokor qo'shish",
    tags=["Doctors"]
)
async def create_doctor(
    request: DoctorCreateRequest,
    current_user: dict = Depends(check_role(["CLINIC_ADMIN"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Create new doctor (clinic admin only)
    """
    
    logger.info(f"➕ Creating doctor: {request.fullName}")
    
    try:
        doctor = await create_doctor_in_db(
            clinic_id=clinic_id,
            full_name=request.fullName,
            specialty=request.specialty,
            price=request.price,
            duration_min=request.durationMin,
            bio=request.bio,
            image_url=request.imageUrl
        )
        
        return doctor
    
    except Exception as e:
        logger.error(f"❌ Doctor creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET DOCTORS LIST =====

@router.get(
    "/",
    response_model=List[DoctorDetailResponse],
    summary="Klinika shifokorlari ro'yxati",
    tags=["Doctors"]
)
async def get_doctors(
    specialty: str = None,
    clinicId: str = "clinic-medlife-001"
):
    """
    Get doctors list (optionally filtered by specialty)
    Visible to: All users (Mini App, Bot, Admin)
    """
    logger.info(f"📋 Getting doctors for clinic: {clinicId}")
    try:
        doctors = await get_doctors_from_db(
            clinic_id=clinicId,
            specialty=specialty
        )
        return doctors
    except Exception as e:
        logger.error(f"❌ Error fetching doctors: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET DOCTOR SLOTS =====

@router.get(
    "/{doctor_id}/slots",
    summary="Shifokorning erkin va band slotlarini qaytaradi",
    tags=["Doctors"]
)
async def get_doctor_slots(
    doctor_id: str,
    date: str,
    clinicId: str = "clinic-medlife-001"
):
    """
    Get slots for a doctor on a specific date (YYYY-MM-DD)
    Returns: AVAILABLE, HELD (180s), BOOKED, WAITING_LIST slots
    """
    logger.info(f"🕒 Fetching slots for doctor: {doctor_id} on {date}")
    try:
        slots = await get_doctor_slots_from_db(clinicId, doctor_id, date)
        return slots
    except Exception as e:
        logger.error(f"❌ Error fetching slots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET DOCTOR DETAIL =====

@router.get(
    "/{doctor_id}",
    response_model=DoctorDetailResponse,
    summary="Shifokor detalllari",
    tags=["Doctors"]
)
async def get_doctor_detail(
    doctor_id: str,
    clinicId: str = "clinic-medlife-001"
):
    """
    Get single doctor details with bio and image
    """
    try:
        doctor = await get_doctor_from_db(clinicId, doctor_id)
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        return doctor
    except Exception as e:
        logger.error(f"❌ Error fetching doctor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== SCHEDULE MANAGEMENT =====

@router.post(
    "/{doctor_id}/schedule",
    response_model=ScheduleResponse,
    summary="Shifokorin haftalik grafigini o'rnatish",
    tags=["Doctors"]
)
async def set_doctor_schedule(
    doctor_id: str,
    request: ScheduleCreateRequest,
    current_user: dict = Depends(check_role(["CLINIC_ADMIN", "DOCTOR"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Set doctor's weekly schedule
    
    Parameters:
    - dayOfWeek: 0 (Sunday) to 6 (Saturday) 
    - startTime: "09:00"
    - endTime: "18:00"
    - breakStart: "13:00"
    - breakEnd: "14:00"
    """
    
    logger.info(f"📅 Setting schedule for doctor: {doctor_id}")
    
    try:
        # Verify doctor exists and belongs to clinic
        doctor = await get_doctor_from_db(clinic_id, doctor_id)
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Create/update schedule
        schedule = await create_or_update_schedule(
            doctor_id=doctor_id,
            day_of_week=request.dayOfWeek,
            start_time=request.startTime,
            end_time=request.endTime,
            break_start=request.breakStart,
            break_end=request.breakEnd
        )
        
        logger.info(f"✅ Schedule created: {schedule['id']}")
        
        return schedule
    
    except Exception as e:
        logger.error(f"❌ Schedule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== EMERGENCY BLOCK (Favqulodda Bloklash) =====

@router.post(
    "/{doctor_id}/emergency-block",
    summary="Shifokorning barcha navbatini bloklash (kasal hollda va b.)",
    tags=["Doctors"]
)
async def emergency_block_doctor(
    doctor_id: str,
    block_reason: str,
    current_user: dict = Depends(check_role(["CLINIC_ADMIN"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Emergency block: Cancel all appointments for a doctor
    Use case: Doctor is sick or emergency situation
    
    Flow:
    1. Cancel all upcoming appointments
    2. Send auto-message to patients about rescheduling
    3. Move patients to waiting list with priority
    """
    
    logger.info(f"🚨 Emergency blocking doctor: {doctor_id}, reason: {block_reason}")
    
    try:
        # Get all upcoming appointments
        appointments = await get_doctor_upcoming_appointments(clinic_id, doctor_id)
        
        for appointment in appointments:
            # Cancel appointment
            await update_appointment_status(
                appointment_id=appointment["id"],
                status="CANCELLED",
                notes=f"Doctor unavailable: {block_reason}"
            )
            
            # Add patient to waiting list
            await add_to_waiting_list(
                clinic_id=clinic_id,
                patient_id=appointment["patientId"],
                doctor_id=doctor_id,
                priority=100  # High priority - rescheduled
            )
            
            # Send notification
            await send_reschedule_notification(
                patient_id=appointment["patientId"],
                message=f"Navbatingiz bekor qilindi. Qabullashuvni qayta jadval qiling."
            )
        
        logger.info(f"✅ Emergency blocked: {len(appointments)} appointments cancelled")
        
        return {
            "message": f"{len(appointments)} appointments cancelled",
            "reason": block_reason
        }
    
    except Exception as e:
        logger.error(f"❌ Emergency block error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== DATABASE STUBS =====

async def create_doctor_in_db(
    clinic_id: str,
    full_name: str,
    specialty: str,
    price: float,
    duration_min: int,
    bio: str,
    image_url: str
) -> dict:
    """Create doctor in database"""
    from app.db import SessionLocal
    from app.models import Doctor

    db = SessionLocal()
    try:
        doc = Doctor(
            clinic_id=clinic_id,
            full_name=full_name,
            specialty=specialty,
            price=price or 0.0,
            duration_min=duration_min or 30,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return {
            "id": doc.id,
            "clinicId": doc.clinic_id,
            "fullName": doc.full_name,
            "specialty": doc.specialty,
            "price": doc.price,
            "durationMin": doc.duration_min,
            "isActive": doc.is_active,
            "createdAt": doc.created_at
        }
    finally:
        db.close()

DEFAULT_DOCTORS = [
    {
        "id": "doc-001",
        "clinicId": "clinic-medlife-001",
        "fullName": "Dr. Jasur Alimov",
        "specialty": "Kardiolog",
        "price": 180000.0,
        "durationMin": 30,
        "bio": "Yurak-qon tomir kasalliklari bo'yicha oliy toifali mutaxassis. Germaniya va Turkiyada malaka oshirgan.",
        "imageUrl": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300",
        "isActive": True,
        "createdAt": datetime.utcnow()
    },
    {
        "id": "doc-002",
        "clinicId": "clinic-medlife-001",
        "fullName": "Dr. Nigora Rahimova",
        "specialty": "Pediatr",
        "price": 150000.0,
        "durationMin": 30,
        "bio": "Bolalar salomatligi, profilaktik ko'rik va erta tashxis qo'yish bo'yicha mutaxassis.",
        "imageUrl": "https://images.unsplash.com/photo-1594824813580-c0490b411d33?w=300",
        "isActive": True,
        "createdAt": datetime.utcnow()
    },
    {
        "id": "doc-003",
        "clinicId": "clinic-medlife-001",
        "fullName": "Dr. Farrux Ergashev",
        "specialty": "Nevropatolog",
        "price": 200000.0,
        "durationMin": 40,
        "bio": "Bosh og'rig'i, uyqusizlik va asab tizimi buzilishlarini zamonaviy diagnostika bilan davolash.",
        "imageUrl": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300",
        "isActive": True,
        "createdAt": datetime.utcnow()
    },
    {
        "id": "doc-004",
        "clinicId": "clinic-medlife-001",
        "fullName": "Dr. Madina Karimova",
        "specialty": "Oftalmolog",
        "price": 160000.0,
        "durationMin": 30,
        "bio": "Ko'z bosimi, ko'rish qobiliyatini tekshirish va apparatli davolash bo'yicha mutaxassis.",
        "imageUrl": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300",
        "isActive": True,
        "createdAt": datetime.utcnow()
    },
    {
        "id": "doc-005",
        "clinicId": "clinic-medlife-001",
        "fullName": "Dr. Sherzod Mirzayev",
        "specialty": "Stomatolog",
        "price": 190000.0,
        "durationMin": 45,
        "bio": "Tishlarni estetik davolash, restavratsiya va og'riqsiz muolajalar.",
        "imageUrl": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300",
        "isActive": True,
        "createdAt": datetime.utcnow()
    }
]

async def get_doctors_from_db(clinic_id: str, specialty: str = None) -> List[dict]:
    """Get all doctors with optional specialty filter from DB"""
    from app.db import SessionLocal
    from app.models import Doctor

    db = SessionLocal()
    try:
        q = db.query(Doctor).filter(Doctor.clinic_id == clinic_id)
        if specialty:
            q = q.filter(Doctor.specialty.ilike(f"%{specialty}%"))
        docs = q.all()
        return [
            {
                "id": d.id,
                "clinicId": d.clinic_id,
                "fullName": d.full_name,
                "specialty": d.specialty,
                "price": d.price,
                "durationMin": d.duration_min,
                "isActive": d.is_active,
                "createdAt": d.created_at
            }
            for d in docs
        ]
    finally:
        db.close()

async def get_doctor_from_db(clinic_id: str, doctor_id: str) -> dict:
    from app.db import SessionLocal
    from app.models import Doctor

    db = SessionLocal()
    try:
        d = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.clinic_id == clinic_id).first()
        if not d:
            return None
        return {
            "id": d.id,
            "clinicId": d.clinic_id,
            "fullName": d.full_name,
            "specialty": d.specialty,
            "price": d.price,
            "durationMin": d.duration_min,
            "isActive": d.is_active,
            "createdAt": d.created_at
        }
    finally:
        db.close()

async def get_doctor_slots_from_db(clinic_id: str, doctor_id: str, date: str) -> List[dict]:
    """Generate time slots with AVAILABLE, BOOKED, and WAITING_LIST states"""
    times = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
    ]
    slots = []
    for idx, t in enumerate(times):
        status = "AVAILABLE"
        if idx in [1, 3, 8]:
            status = "BOOKED"
        elif idx == 5:
            status = "WAITING_LIST"
        
        h, m = map(int, t.split(":"))
        em = m + 30
        eh = h + (1 if em >= 60 else 0)
        em = em % 60
        end_time = f"{eh:02d}:{em:02d}"
        
        slots.append({
            "id": f"slot-{doctor_id}-{date}-{t.replace(':', '')}",
            "doctorId": doctor_id,
            "date": date,
            "time": t,
            "endTime": end_time,
            "status": status
        })
    return slots

async def create_or_update_schedule(
    doctor_id: str,
    day_of_week: int,
    start_time: str,
    end_time: str,
    break_start: str,
    break_end: str
) -> dict:
    """Create or update schedule"""
    # TODO: Insert/update Prisma
    return {"id": "sch-1"}

async def get_doctor_upcoming_appointments(clinic_id: str, doctor_id: str) -> List[dict]:
    """Get future appointments"""
    # TODO: Query Prisma WHERE startTime > now()
    return []

async def update_appointment_status(appointment_id: str, status: str, notes: str = None):
    """Update appointment status"""
    # TODO: Update Prisma
    pass

async def add_to_waiting_list(
    clinic_id: str,
    patient_id: str,
    doctor_id: str,
    priority: int = 0
):
    """Add patient to waiting list"""
    # TODO: Insert into WaitingList
    pass

async def send_reschedule_notification(patient_id: str, message: str):
    """Send notification to patient"""
    # TODO: Create Notification record
    pass
