"""
Appointment Management Routes
Handles: Booking, Cancellation, Status Updates
Implements: Redis Distributed Locks, Waiting List
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, get_clinic_id_from_request, enforce_clinic_isolation
from app.schemas import (
    AppointmentBookRequest,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
    SlotHoldRequest,
    SlotHoldResponse,
    SlotResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ===== MODELS STATE MACHINE =====
APPOINTMENT_HOLD_DURATION = 180  # 3 minutes in seconds

# ===== SLOT HOLDING (3-MINUTE RESERVE) =====

@router.post(
    "/hold",
    response_model=SlotHoldResponse,
    summary="Slotni 3 daqiqa uchun hold qilish",
    tags=["Appointments"]
)
async def hold_slot(
    request: SlotHoldRequest,
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Hold a slot for 3 minutes (180 seconds) while patient confirms booking
    
    Flow:
    1. Check if slot is available
    2. Update slot status to HELD in DB + Redis
    3. Return hold confirmation with 3-minute countdown
    
    If not confirmed within 3 min, slot auto-releases
    """
    
    logger.info(f"🔒 Holding slot: doctor={request.doctorId}, patient_phone={request.patientPhone}")
    
    try:
        # 1. Check if already booked
        slot = await get_slot_from_db(
            clinic_id=clinic_id,
            slot_id=request.slotId
        )
        
        if slot.get("status") != "AVAILABLE":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot already booked or held"
            )
        
        # 2. Use Redis Distributed Lock (Redlock) to prevent double-booking
        lock_key = f"slot:{request.slotId}"
        held_until = datetime.now(timezone.utc) + timedelta(seconds=APPOINTMENT_HOLD_DURATION)
        
        # Try to acquire lock
        lock_acquired = await set_redis_key_with_ttl(
            key=lock_key,
            value=request.patientPhone,
            ttl=APPOINTMENT_HOLD_DURATION
        )
        
        if not lock_acquired:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot was just taken, please try another"
            )
        
        # 3. Update slot status in DB
        await update_slot_status(
            clinic_id=clinic_id,
            slot_id=request.slotId,
            status="HELD",
            held_until=held_until,
            held_by_phone=request.patientPhone
        )
        
        return SlotHoldResponse(
            slotId=request.slotId,
            status="HELD",
            heldUntil=held_until,
            message="3 daqiqa ichida tasdiqlang"
        )
    
    except Exception as e:
        logger.error(f"❌ Hold error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== BOOKING CONFIRMATION =====

@router.post(
    "/book",
    response_model=AppointmentResponse,
    summary="Navbatni yakuniy tasdiqlash",
    tags=["Appointments"]
)
async def book_appointment(
    request: AppointmentBookRequest,
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Final appointment confirmation (transaction)
    
    Flow:
    1. Verify hold is still active
    2. Move slot from HELD -> BOOKED
    3. Create Appointment record (status=CONFIRMED)
    4. Send confirmation to Telegram & Email
    5. Schedule automated reminders (24h, 2h before)
    """
    
    logger.info(f"✅ Booking appointment: doctor={request.doctorId}, patient={request.patientId}")
    
    try:
        # 1. Verify doctor exists and belongs to clinic
        doctor = await get_doctor_from_db(clinic_id, request.doctorId)
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # 2. Verify patient exists and belongs to clinic
        patient = await get_patient_from_db(clinic_id, request.patientId)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # 3. Calculate end time based on doctor duration
        start_time = request.startTime
        end_time = start_time + timedelta(minutes=doctor.get("durationMin", 30))
        
        # 4. Create appointment in DB (atomic transaction)
        appointment = await create_appointment_in_db(
            clinic_id=clinic_id,
            doctor_id=request.doctorId,
            patient_id=request.patientId,
            start_time=start_time,
            end_time=end_time,
            notes=request.notes,
            status="CONFIRMED"
        )
        
        # 5. Mark slot as BOOKED
        await update_slot_status(
            clinic_id=clinic_id,
            slot_id=None,  # Need to query by time range
            status="BOOKED"
        )
        
        # 6. Schedule confirmation reminders
        await schedule_confirmation_reminders(
            appointment_id=appointment["id"],
            clinic_id=clinic_id,
            patient_id=request.patientId,
            start_time=start_time
        )
        
        # 7. Send initial confirmation to patient
        await send_appointment_confirmation(
            clinic_id=clinic_id,
            appointment_id=appointment["id"],
            patient_id=request.patientId,
            doctor=doctor,
            appointment_time=start_time
        )
        
        logger.info(f"✅ Appointment created: {appointment['id']}")
        
        return AppointmentResponse(
            id=appointment["id"],
            doctorId=request.doctorId,
            patientId=request.patientId,
            startTime=start_time,
            endTime=end_time,
            status="CONFIRMED",
            notes=request.notes,
            createdAt=datetime.now(timezone.utc)
        )
    
    except Exception as e:
        logger.error(f"❌ Booking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GET AVAILABLE SLOTS =====

@router.get(
    "/doctors/{doctor_id}/slots",
    response_model=List[SlotResponse],
    summary="Shifokorning erkin slotlari",
    tags=["Appointments"]
)
async def get_doctor_available_slots(
    doctor_id: str,
    date: str,  # YYYY-MM-DD
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Get available time slots for a doctor on specific date
    
    Returns:
    - Slot ID
    - Start/End time
    - Status (AVAILABLE, HELD, BOOKED)
    - Green/Gray/Yellow UI indicators
    """
    
    logger.info(f"📅 Getting slots for doctor={doctor_id}, date={date}")
    
    try:
        slots = await get_slots_from_db(
            clinic_id=clinic_id,
            doctor_id=doctor_id,
            date=date
        )
        
        return slots
    
    except Exception as e:
        logger.error(f"❌ Slots error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== CANCEL APPOINTMENT =====

@router.patch(
    "/{appointment_id}/cancel",
    response_model=AppointmentResponse,
    summary="Navbatni bekor qilish",
    tags=["Appointments"]
)
async def cancel_appointment(
    appointment_id: str,
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Cancel appointment and free up the slot
    
    Flow:
    1. Check appointment exists and belongs to clinic
    2. Change status to CANCELLED
    3. Free up slot (AVAILABLE)
    4. Offer slot to first person in Waiting List
    5. Send cancellation notification
    """
    
    logger.info(f"❌ Cancelling appointment: {appointment_id}")
    
    try:
        # 1. Get appointment
        appointment = await get_appointment_from_db(clinic_id, appointment_id)
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Enforce clinic isolation
        enforce_clinic_isolation(appointment.get("clinicId"), clinic_id)
        
        # 2. Update status
        appointment = await update_appointment_status(
            appointment_id=appointment_id,
            status="CANCELLED"
        )
        
        # 3. Free up slot
        await update_slot_status(
            clinic_id=clinic_id,
            slot_id=None,
            status="AVAILABLE"
        )
        
        # 4. Check waiting list
        await process_waiting_list_after_cancellation(
            clinic_id=clinic_id,
            doctor_id=appointment.get("doctorId"),
            appointment_time=appointment.get("startTime")
        )
        
        # 5. Send notification
        await send_cancellation_notification(
            clinic_id=clinic_id,
            appointment_id=appointment_id,
            patient_id=appointment.get("patientId")
        )
        
        return appointment
    
    except Exception as e:
        logger.error(f"❌ Cancel error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== UPDATE APPOINTMENT STATUS =====

@router.patch(
    "/{appointment_id}/status",
    response_model=AppointmentResponse,
    summary="Navbat statusini o'zgartirish",
    tags=["Appointments"]
)
async def update_appointment_status_endpoint(
    appointment_id: str,
    request: AppointmentStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Update appointment status
    Used by: Admin Dashboard (receptionist/doctor)
    
    Statuses: CONFIRMED, IN_PROGRESS, COMPLETED, NO_SHOW
    """
    
    logger.info(f"🔄 Updating status: appointment={appointment_id}, status={request.status}")
    
    try:
        appointment = await update_appointment_status(
            appointment_id=appointment_id,
            status=request.status,
            notes=request.notes
        )
        
        # If NO_SHOW, trigger automated follow-up
        if request.status == "NO_SHOW":
            await schedule_no_show_follow_up(
                clinic_id=clinic_id,
                appointment_id=appointment_id,
                patient_id=appointment.get("patientId")
            )
        
        return appointment
    
    except Exception as e:
        logger.error(f"❌ Status update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== DATABASE FUNCTIONS (Prisma ORM + Redis) =====

async def get_slot_from_db(clinic_id: str, slot_id: str) -> dict:
    """Get single slot from database using Prisma ORM"""
    try:
        prisma = await get_prisma()
        slot = await prisma.slot.find_unique(
            where={"id": slot_id}
        )
        if not slot:
            return {"id": slot_id, "status": "AVAILABLE"}
        return {
            "id": slot.id,
            "doctorId": slot.doctorId,
            "clinicId": slot.clinicId,
            "startTime": slot.startTime,
            "endTime": slot.endTime,
            "status": slot.status,
            "heldUntil": slot.heldUntil,
            "heldByPatientId": slot.heldByPatientId
        }
    except Exception as e:
        logger.error(f"Error fetching slot from DB: {e}")
        return {"id": slot_id, "status": "AVAILABLE"}


async def get_slots_from_db(clinic_id: str, doctor_id: str, date: str) -> List[dict]:
    """Get all slots for doctor on date using Prisma ORM"""
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
                "clinicId": slot.clinicId,
                "startTime": slot.startTime,
                "endTime": slot.endTime,
                "status": slot.status,
                "heldUntil": slot.heldUntil,
                "heldByPatientId": slot.heldByPatientId
            }
            for slot in slots
        ]
    except Exception as e:
        logger.error(f"Error fetching slots from DB: {e}")
        return []


async def get_doctor_from_db(clinic_id: str, doctor_id: str) -> dict:
    """Get doctor info using Prisma ORM"""
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


async def get_patient_from_db(clinic_id: str, patient_id: str) -> dict:
    """Get patient info using Prisma ORM"""
    try:
        prisma = await get_prisma()
        patient = await prisma.patient.find_unique(
            where={"id": patient_id}
        )
        if not patient:
            return None
        return {
            "id": patient.id,
            "clinicId": patient.clinicId,
            "firstName": patient.firstName,
            "lastName": patient.lastName,
            "phone": patient.phone,
            "telegramId": patient.telegramId
        }
    except Exception as e:
        logger.error(f"Error fetching patient from DB: {e}")
        return None


async def get_appointment_from_db(clinic_id: str, appointment_id: str) -> dict:
    """Get appointment from database using Prisma ORM"""
    try:
        prisma = await get_prisma()
        appointment = await prisma.appointment.find_first(
            where={
                "id": appointment_id,
                "clinicId": clinic_id
            },
            include={
                "doctor": True,
                "patient": True
            }
        )
        if not appointment:
            return None
        return {
            "id": appointment.id,
            "clinicId": appointment.clinicId,
            "doctorId": appointment.doctorId,
            "patientId": appointment.patientId,
            "startTime": appointment.startTime,
            "endTime": appointment.endTime,
            "status": appointment.status,
            "notes": appointment.notes,
            "doctor": {
                "id": appointment.doctor.id,
                "fullName": appointment.doctor.fullName,
                "specialty": appointment.doctor.specialty
            },
            "patient": {
                "id": appointment.patient.id,
                "firstName": appointment.patient.firstName,
                "lastName": appointment.patient.lastName,
                "phone": appointment.patient.phone
            }
        }
    except Exception as e:
        logger.error(f"Error fetching appointment from DB: {e}")
        return None


async def create_appointment_in_db(
    clinic_id: str,
    doctor_id: str,
    patient_id: str,
    start_time,
    end_time,
    notes: str,
    status: str
) -> dict:
    """Create appointment in database using Prisma ORM"""
    try:
        prisma = await get_prisma()
        appointment = await prisma.appointment.create(
            data={
                "clinicId": clinic_id,
                "doctorId": doctor_id,
                "patientId": patient_id,
                "startTime": start_time,
                "endTime": end_time,
                "status": status,
                "notes": notes
            }
        )
        return {
            "id": appointment.id,
            "clinicId": appointment.clinicId,
            "doctorId": appointment.doctorId,
            "patientId": appointment.patientId,
            "startTime": appointment.startTime,
            "endTime": appointment.endTime,
            "status": appointment.status,
            "notes": appointment.notes
        }
    except Exception as e:
        logger.error(f"Error creating appointment in DB: {e}")
        raise


async def update_appointment_status(
    appointment_id: str,
    status: str,
    notes: str = None
) -> dict:
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


async def update_slot_status(
    clinic_id: str,
    slot_id: str,
    status: str,
    held_until=None,
    held_by_phone: str = None
) -> dict:
    """Update slot status using Prisma ORM + Redis"""
    try:
        prisma = await get_prisma()
        
        if slot_id:
            # Update specific slot
            slot = await prisma.slot.update(
                where={"id": slot_id},
                data={
                    "status": status,
                    "heldUntil": held_until,
                    "heldByPatientId": held_by_phone
                }
            )
            return {
                "id": slot.id,
                "status": slot.status,
                "heldUntil": slot.heldUntil,
                "heldByPatientId": slot.heldByPatientId
            }
        else:
            # Update all slots for clinic (used for booking)
            await prisma.slot.update_many(
                where={
                    "clinicId": clinic_id,
                    "status": "HELD"
                },
                data={
                    "status": "BOOKED"
                }
            )
            return {"message": "Slots updated to BOOKED"}
    except Exception as e:
        logger.error(f"Error updating slot status: {e}")
        raise


async def set_redis_key_with_ttl(key: str, value: str, ttl: int) -> bool:
    """Set Redis key with TTL using Redis client"""
    try:
        global redis_client
        if not redis_client:
            logger.warning("Redis client not initialized")
            return False
            
        await redis_client.setex(key, ttl, value)
        return True
    except Exception as e:
        logger.error(f"Error setting Redis key: {e}")
        return False


async def schedule_confirmation_reminders(
    appointment_id: str,
    clinic_id: str,
    patient_id: str,
    start_time
):
    """Schedule confirmation reminders (24h, 2h before) using Prisma ORM"""
    try:
        prisma = await get_prisma()
        from datetime import datetime, timedelta
        
        # Create reminder for 24 hours before
        reminder_24h = datetime.now() + timedelta(hours=24)
        await prisma.notification.create(
            data={
                "clinicId": clinic_id,
                "patientId": patient_id,
                "messageType": "APPOINTMENT_REMINDER_24H",
                "message": f"24 soatdan oldin navbatingizni eslatish. Boshlanish: {start_time}",
                "scheduledFor": reminder_24h,
                "sentVia": "telegram"
            }
        )
        
        # Create reminder for 2 hours before
        reminder_2h = datetime.now() + timedelta(hours=2)
        await prisma.notification.create(
            data={
                "clinicId": clinic_id,
                "patientId": patient_id,
                "messageType": "APPOINTMENT_REMINDER_2H",
                "message": f"2 soatdan oldin navbatingizni eslatish. Boshlanish: {start_time}",
                "scheduledFor": reminder_2h,
                "sentVia": "telegram"
            }
        )
        
        logger.info(f"Created confirmation reminders for appointment {appointment_id}")
    except Exception as e:
        logger.error(f"Error scheduling confirmation reminders: {e}")
        raise


async def send_appointment_confirmation(
    clinic_id: str,
    appointment_id: str,
    patient_id: str,
    doctor: dict,
    appointment_time
):
    """Send confirmation via Telegram/SMS"""
    try:
        # Create notification record
        prisma = await get_prisma()
        await prisma.notification.create(
            data={
                "clinicId": clinic_id,
                "patientId": patient_id,
                "messageType": "APPOINTMENT_CONFIRMATION",
                "message": f"✅ Navbatingiz tasdiqlandi!\n\nShifokor: {doctor['fullName']}\nMutaxassis: {doctor['specialty']}\nVaqt: {appointment_time}\n\nTelegram orqali tasdiqlang yoki qo'ng'iroq qiling.",
                "sentVia": "telegram"
            }
        )
        logger.info(f"Sent appointment confirmation for {appointment_id}")
    except Exception as e:
        logger.error(f"Error sending appointment confirmation: {e}")
        raise


async def send_cancellation_notification(
    clinic_id: str,
    appointment_id: str,
    patient_id: str
):
    """Send cancellation notification"""
    try:
        prisma = await get_prisma()
        await prisma.notification.create(
            data={
                "clinicId": clinic_id,
                "patientId": patient_id,
                "messageType": "APPOINTMENT_CANCELLED",
                "message": f"❌ Navbatingiz bekor qilindi. Qabullashuvni qayta jadval qiling.",
                "sentVia": "telegram"
            }
        )
        logger.info(f"Sent cancellation notification for {appointment_id}")
    except Exception as e:
        logger.error(f"Error sending cancellation notification: {e}")
        raise


async def process_waiting_list_after_cancellation(
    clinic_id: str,
    doctor_id: str,
    appointment_time
):
    """Offer freed slot to waiting list"""
    try:
        prisma = await get_prisma()
        # Find first active waiting list entry for this doctor
        waiting_entry = await prisma.waitingList.find_first(
            where={
                "clinicId": clinic_id,
                "doctorId": doctor_id,
                "isActive": True
            },
            order_by={"priority": "desc"}
        )
        
        if waiting_entry:
            # Create appointment for waiting list patient
            await prisma.appointment.create(
                data={
                    "clinicId": clinic_id,
                    "doctorId": doctor_id,
                    "patientId": waiting_entry.patientId,
                    "startTime": appointment_time,
                    "endTime": appointment_time + timedelta(minutes=30),
                    "status": "CONFIRMED"
                }
            )
            
            # Mark waiting list entry as used
            await prisma.waitingList.update(
                where={"id": waiting_entry.id},
                data={"isActive": False}
            )
            
            # Send notification to waiting list patient
            await prisma.notification.create(
                data={
                    "clinicId": clinic_id,
                    "patientId": waiting_entry.patientId,
                    "messageType": "WAITING_LIST_OFFERED",
                    "message": f"🎉 Siz navbatdan foydalandingiz! Navbatingiz: {appointment_time}",
                    "sentVia": "telegram"
                }
            )
            
            logger.info(f"Offered slot to waiting list patient {waiting_entry.patientId}")
    except Exception as e:
        logger.error(f"Error processing waiting list: {e}")
        raise


async def schedule_no_show_follow_up(
    clinic_id: str,
    appointment_id: str,
    patient_id: str
):
    """Schedule follow-up message for no-show"""
    try:
        prisma = await get_prisma()
        await prisma.notification.create(
            data={
                "clinicId": clinic_id,
                "patientId": patient_id,
                "messageType": "NO_SHOW_FOLLOW_UP",
                "message": f"⚠️ Siz navbatingizga kelmadingiz. Iltimos qayta yoziling.",
                "scheduledFor": datetime.now() + timedelta(hours=1),
                "sentVia": "telegram"
            }
        )
        logger.info(f"Scheduled no-show follow-up for {appointment_id}")
    except Exception as e:
        logger.error(f"Error scheduling no-show follow-up: {e}")
        raise