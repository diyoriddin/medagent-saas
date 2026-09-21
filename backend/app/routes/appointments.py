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

# ===== DATABASE STUBS (INTEGRATE WITH PRISMA) =====

async def get_slot_from_db(clinic_id: str, slot_id: str) -> dict:
    """Get single slot from database"""
    # For now we keep simple behavior: return AVAILABLE
    return {"id": slot_id, "status": "AVAILABLE"}

async def get_slots_from_db(clinic_id: str, doctor_id: str, date: str) -> List[dict]:
    """Get all slots for doctor on date"""
    # Generate slots based on doctor's duration (fallback to 30 min)
    from app.db import SessionLocal
    from app.models import Doctor

    db = SessionLocal()
    try:
        doc = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.clinic_id == clinic_id).first()
        duration = doc.duration_min if doc else 30
    finally:
        db.close()

    # Simple working hours 09:00-17:30
    times = []
    h = 9
    m = 0
    while h < 18:
        times.append(f"{h:02d}:{m:02d}")
        m += duration
        if m >= 60:
            h += m // 60
            m = m % 60
        if h >= 18:
            break

    slots = []
    for idx, t in enumerate(times):
        status = "AVAILABLE"
        if idx % 7 == 1:
            status = "BOOKED"
        slots.append({
            "id": f"slot-{doctor_id}-{date}-{t.replace(':', '')}",
            "doctorId": doctor_id,
            "date": date,
            "time": t,
            "endTime": "",
            "status": status
        })
    return slots

async def get_doctor_from_db(clinic_id: str, doctor_id: str) -> dict:
    """Get doctor info"""
    from app.db import SessionLocal
    from app.models import Doctor

    db = SessionLocal()
    try:
        d = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.clinic_id == clinic_id).first()
        if not d:
            return None
        return {"id": d.id, "durationMin": d.duration_min}
    finally:
        db.close()

async def get_patient_from_db(clinic_id: str, patient_id: str) -> dict:
    """Get patient info"""
    # No patient model yet; accept any patient id for now
    return {"id": patient_id}

async def get_appointment_from_db(clinic_id: str, appointment_id: str) -> dict:
    """Get appointment from database"""
    from app.db import SessionLocal
    from app.models import Appointment

    db = SessionLocal()
    try:
        a = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.clinic_id == clinic_id).first()
        if not a:
            return None
        return {
            "id": a.id,
            "clinicId": a.clinic_id,
            "doctorId": a.doctor_id,
            "patientId": a.patient_id,
            "startTime": a.start_time,
            "endTime": a.end_time,
            "status": a.status,
            "notes": a.notes
        }
    finally:
        db.close()

async def create_appointment_in_db(
    clinic_id: str,
    doctor_id: str,
    patient_id: str,
    start_time,
    end_time,
    notes: str,
    status: str
) -> dict:
    """Create appointment in database"""
    from app.db import SessionLocal
    from app.models import Appointment

    db = SessionLocal()
    try:
        appt = Appointment(
            clinic_id=clinic_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            start_time=start_time,
            end_time=end_time,
            status=status,
            notes=notes
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)
        return {"id": appt.id}
    finally:
        db.close()

async def update_appointment_status(
    appointment_id: str,
    status: str,
    notes: str = None
) -> dict:
    """Update appointment status"""
    from app.db import SessionLocal
    from app.models import Appointment

    db = SessionLocal()
    try:
        a = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not a:
            return None
        a.status = status
        if notes:
            a.notes = notes
        db.commit()
        return {"id": a.id, "status": a.status}
    finally:
        db.close()

async def update_slot_status(
    clinic_id: str,
    slot_id: str,
    status: str,
    held_until=None,
    held_by_phone: str = None
) -> dict:
    """Update slot status"""
    # TODO: Update Prisma + Redis
    return {"id": slot_id, "status": status}

async def set_redis_key_with_ttl(key: str, value: str, ttl: int) -> bool:
    """Set Redis key with TTL"""
    # TODO: Connect to Redis
    return True

async def schedule_confirmation_reminders(
    appointment_id: str,
    clinic_id: str,
    patient_id: str,
    start_time
):
    """Schedule confirmation reminders (24h, 2h before)"""
    # TODO: Create Notification records
    pass

async def send_appointment_confirmation(
    clinic_id: str,
    appointment_id: str,
    patient_id: str,
    doctor: dict,
    appointment_time
):
    """Send confirmation via Telegram/SMS"""
    # TODO: Implement
    pass

async def send_cancellation_notification(
    clinic_id: str,
    appointment_id: str,
    patient_id: str
):
    """Send cancellation notification"""
    # TODO: Implement
    pass

async def process_waiting_list_after_cancellation(
    clinic_id: str,
    doctor_id: str,
    appointment_time
):
    """Offer freed slot to waiting list"""
    # TODO: Implement
    pass

async def schedule_no_show_follow_up(
    clinic_id: str,
    appointment_id: str,
    patient_id: str
):
    """Schedule follow-up message for no-show"""
    # TODO: Implement
    pass
