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

# ===== DATABASE FUNCTIONS (Prisma ORM) =====

async def create_doctor_in_db(
    clinic_id: str,
    full_name: str,
    specialty: str,
    price: float,
    duration_min: int,
    bio: str,
    image_url: str
) -> dict:
    """Create doctor in database using Prisma ORM"""
    try:
        prisma = await get_prisma()
        doctor = await prisma.doctor.create(
            data={
                "clinicId": clinic_id,
                "fullName": full_name,
                "specialty": specialty,
                "price": price,
                "durationMin": duration_min,
                "bio": bio,
                "imageUrl": image_url
            }
        )
        return {
            "id": doctor.id,
            "clinicId": doctor.clinicId,
            "fullName": doctor.fullName,
            "specialty": doctor.specialty,
            "price": doctor.price,
            "durationMin": doctor.durationMin,
            "isActive": doctor.isActive,
            "createdAt": doctor.createdAt
        }
    except Exception as e:
        logger.error(f"Error creating doctor in DB: {e}")
        raise

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
    """Get all doctors with optional specialty filter from DB using Prisma ORM"""
    try:
        prisma = await get_prisma()
        where_clause = {"clinicId": clinic_id}
        if specialty:
            where_clause["specialty"] = {"contains": specialty}
        
        doctors = await prisma.doctor.find_many(
            where=where_clause,
            order_by={"createdAt": "desc"}
        )
        return [
            {
                "id": doctor.id,
                "clinicId": doctor.clinicId,
                "fullName": doctor.fullName,
                "specialty": doctor.specialty,
                "price": doctor.price,
                "durationMin": doctor.durationMin,
                "isActive": doctor.isActive,
                "createdAt": doctor.createdAt
            }
            for doctor in doctors
        ]
    except Exception as e:
        logger.error(f"Error fetching doctors from DB: {e}")
        return []

async def get_doctor_from_db(clinic_id: str, doctor_id: str) -> dict:
    """Get single doctor by ID using Prisma ORM"""
    try:
        prisma = await get_prisma()
        doctor = await prisma.doctor.find_first(
            where={
                "id": doctor_id,
                "clinicId": clinic_id
            }
        )
        if not doctor:
            return None
        return {
            "id": doctor.id,
            "clinicId": doctor.clinicId,
            "fullName": doctor.fullName,
            "specialty": doctor.specialty,
            "price": doctor.price,
            "durationMin": doctor.durationMin,
            "isActive": doctor.isActive,
            "createdAt": doctor.createdAt
        }
    except Exception as e:
        logger.error(f"Error fetching doctor from DB: {e}")
        return None

async def get_doctor_slots_from_db(clinic_id: str, doctor_id: str, date: str) -> List[dict]:
    """Get time slots for doctor on specific date using Prisma ORM"""
    try:
        prisma = await get_prisma()
        # Parse date to get start and end of day
        from datetime import datetime
        target_date = datetime.strptime(date, "%Y-%m-%d")
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        slots = await prisma.slot.find_many(
            where={
                "doctorId": doctor_id,
                "clinicId": clinic_id,
                "startTime": {
                    "gte": start_of_day,
                    "lte": end_of_day
                }
            },
            order_by={"startTime": "asc"}
        )
        return [
            {
                "id": slot.id,
                "doctorId": slot.doctorId,
                "date": slot.startTime.strftime("%Y-%m-%d"),
                "time": slot.startTime.strftime("%H:%M"),
                "endTime": slot.endTime.strftime("%H:%M"),
                "status": slot.status
            }
            for slot in slots
        ]
    except Exception as e:
        logger.error(f"Error fetching doctor slots from DB: {e}")
        return []

async def create_or_update_schedule(
    doctor_id: str,
    day_of_week: int,
    start_time: str,
    end_time: str,
    break_start: str,
    break_end: str
) -> dict:
    """Create or update schedule using Prisma ORM"""
    try:
        prisma = await get_prisma()
        # Check if schedule already exists
        existing_schedule = await prisma.schedule.find_first(
            where={
                "doctorId": doctor_id,
                "dayOfWeek": day_of_week
            }
        )
        
        if existing_schedule:
            # Update existing schedule
            schedule = await prisma.schedule.update(
                where={"id": existing_schedule.id},
                data={
                    "startTime": start_time,
                    "endTime": end_time,
                    "breakStart": break_start,
                    "breakEnd": break_end
                }
            )
        else:
            # Create new schedule
            schedule = await prisma.schedule.create(
                data={
                    "doctorId": doctor_id,
                    "dayOfWeek": day_of_week,
                    "startTime": start_time,
                    "endTime": end_time,
                    "breakStart": break_start,
                    "breakEnd": break_end
                }
            )
        
        return {
            "id": schedule.id,
            "doctorId": schedule.doctorId,
            "dayOfWeek": schedule.dayOfWeek,
            "startTime": schedule.startTime,
            "endTime": schedule.endTime,
            "breakStart": schedule.breakStart,
            "breakEnd": schedule.breakEnd,
            "isActive": schedule.isActive,
            "createdAt": schedule.createdAt
        }
    except Exception as e:
        logger.error(f"Error creating/updating schedule: {e}")
        raise


async def get_doctor_upcoming_appointments(clinic_id: str, doctor_id: str) -> List[dict]:
    """Get future appointments using Prisma ORM"""
    try:
        prisma = await get_prisma()
        from datetime import datetime
        now = datetime.now()
        
        appointments = await prisma.appointment.find_many(
            where={
                "doctorId": doctor_id,
                "clinicId": clinic_id,
                "startTime": {"gt": now},
                "status": {"not": "CANCELLED"}
            },
            order_by={"startTime": "asc"},
            include={
                "patient": True
            }
        )
        return [
            {
                "id": appointment.id,
                "doctorId": appointment.doctorId,
                "patientId": appointment.patientId,
                "startTime": appointment.startTime.isoformat(),
                "endTime": appointment.endTime.isoformat(),
                "status": appointment.status,
                "patientName": f"{appointment.patient.firstName} {appointment.patient.lastName or ''}".strip()
            }
            for appointment in appointments
        ]
    except Exception as e:
        logger.error(f"Error fetching upcoming appointments: {e}")
        return []


async def update_appointment_status(appointment_id: str, status: str, notes: str = None):
    """Update appointment status using Prisma ORM"""
    try:
        prisma = await get_prisma()
        from datetime import datetime
        appointment = await prisma.appointment.update(
            where={"id": appointment_id},
            data={
                "status": status,
                "notes": notes,
                "updatedAt": datetime.now()
            }
        )
        return {
            "id": appointment.id,
            "status": appointment.status,
            "updatedAt": appointment.updatedAt
        }
    except Exception as e:
        logger.error(f"Error updating appointment status: {e}")
        raise


async def add_to_waiting_list(
    clinic_id: str,
    patient_id: str,
    doctor_id: str,
    priority: int = 0
):
    """Add patient to waiting list using Prisma ORM"""
    try:
        prisma = await get_prisma()
        waiting_list_entry = await prisma.waitingList.create(
            data={
                "clinicId": clinic_id,
                "patientId": patient_id,
                "doctorId": doctor_id,
                "priority": priority
            }
        )
        return {
            "id": waiting_list_entry.id,
            "clinicId": waiting_list_entry.clinicId,
            "patientId": waiting_list_entry.patientId,
            "doctorId": waiting_list_entry.doctorId,
            "priority": waiting_list_entry.priority,
            "createdAt": waiting_list_entry.createdAt
        }
    except Exception as e:
        logger.error(f"Error adding to waiting list: {e}")
        raise


async def send_reschedule_notification(patient_id: str, message: str):
    """Send notification to patient by creating Notification record"""
    try:
        prisma = await get_prisma()
        # Get patient to find clinicId
        patient = await prisma.patient.find_unique(
            where={"id": patient_id}
        )
        if not patient:
            logger.error(f"Patient not found: {patient_id}")
            return
            
        notification = await prisma.notification.create(
            data={
                "clinicId": patient.clinicId,
                "patientId": patient_id,
                "messageType": "APPOINTMENT_RESCHEDULE",
                "message": message,
                "sentVia": "telegram"
            }
        )
        return {
            "id": notification.id,
            "message": notification.message,
            "sentAt": notification.sentAt
        }
    except Exception as e:
        logger.error(f"Error sending reschedule notification: {e}")
        raise
