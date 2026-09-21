"""
Admin Dashboard Routes (Live Queue, Real-time Monitoring)
For: Clinic Reception Staff, Doctors, Administrators

Features:
- Real-time queue status (Kanban board style)
- Action buttons: Start Session, No-Show, Chat Takeover
- WebSocket support for live updates
- Performance metrics
"""

import logging
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket

from app.core.security import (
    get_current_user,
    get_clinic_id_from_request,
    check_role
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ===== LIVE QUEUE DASHBOARD =====

@router.get(
    "/queue",
    summary="Live navbat paneli (Kanban board)",
    tags=["Admin Dashboard"]
)
async def get_live_queue(
    current_user: dict = Depends(check_role(["CLINIC_ADMIN", "RECEPTIONIST", "DOCTOR"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Get current queue status organized by:
    1. Pending (Kutilmoqda)
    2. In Progress (Qabulda)
    3. Completed (Bajarildi)
    4. No Show (Kelmadi)
    """
    
    logger.info(f"📊 Fetching live queue for clinic: {clinic_id}")
    
    try:
        appointments = await get_appointments_by_status(clinic_id)
        
        return {
            "timestamp": datetime.utcnow(),
            "pending": appointments.get("PENDING", []),
            "in_progress": appointments.get("IN_PROGRESS", []),
            "completed": appointments.get("COMPLETED", []),
            "no_show": appointments.get("NO_SHOW", []),
            "total": len(appointments)
        }
    
    except Exception as e:
        logger.error(f"❌ Error fetching queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== START SESSION (Qabulni Boshlash) =====

@router.post(
    "/queue/{appointment_id}/start",
    summary="Qabulni boshlash",
    tags=["Admin Dashboard"]
)
async def start_appointment_session(
    appointment_id: str,
    display_on_screen: bool = True,
    current_user: dict = Depends(check_role(["RECEPTIONIST", "DOCTOR"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Start appointment session
    
    Actions:
    1. Change status to IN_PROGRESS
    2. Display patient number on clinic display screen
    3. Update dashboard in real-time (WebSocket)
    """
    
    logger.info(f"▶️ Starting session: {appointment_id}")
    
    try:
        appointment = await get_appointment_from_db(clinic_id, appointment_id)
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Update status
        appointment = await update_appointment_status(
            appointment_id=appointment_id,
            status="IN_PROGRESS"
        )
        
        # Send to clinic display (if enabled)
        if display_on_screen:
            await send_to_clinic_display(
                clinic_id=clinic_id,
                patient_number=appointment.get("queue_number"),
                doctor_name=appointment.get("doctor", {}).get("fullName")
            )
        
        # Broadcast via WebSocket
        await broadcast_queue_update(clinic_id, "appointment_started", appointment)
        
        return appointment
    
    except Exception as e:
        logger.error(f"❌ Start session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== MARK NO-SHOW =====

@router.post(
    "/queue/{appointment_id}/no-show",
    summary="Bemor kelmadi (No-Show)",
    tags=["Admin Dashboard"]
)
async def mark_no_show(
    appointment_id: str,
    reason: str = None,
    current_user: dict = Depends(check_role(["RECEPTIONIST", "DOCTOR"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Mark appointment as No-Show
    
    Actions:
    1. Change status to NO_SHOW
    2. Free up the slot
    3. Trigger automated AI follow-up message
    4. Save to no-show statistics
    """
    
    logger.info(f"❌ No-show marked: {appointment_id}")
    
    try:
        appointment = await get_appointment_from_db(clinic_id, appointment_id)
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Update status
        appointment = await update_appointment_status(
            appointment_id=appointment_id,
            status="NO_SHOW",
            notes=f"No-show: {reason}" if reason else "No-show"
        )
        
        # Free up slot
        await free_up_slot(
            clinic_id=clinic_id,
            start_time=appointment.get("startTime")
        )
        
        # Schedule automated follow-up
        follow_up_message = "Navbatingizga kelmadingiz. Iltimos, qayta yoziling yoki murojat qiling."
        await schedule_ai_follow_up(
            patient_id=appointment.get("patientId"),
            message=follow_up_message,
            appointment_id=appointment_id
        )
        
        # Broadcast update
        await broadcast_queue_update(clinic_id, "no_show_marked", appointment)
        
        return {
            "appointment": appointment,
            "message": "No-show recorded, patient will receive follow-up message"
        }
    
    except Exception as e:
        logger.error(f"❌ No-show error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== CHAT TAKEOVER (Manual Intervention) =====

@router.post(
    "/queue/{appointment_id}/takeover",
    summary="AI ni o'chirib, qo'lga olish",
    tags=["Admin Dashboard"]
)
async def takeover_patient_chat(
    appointment_id: str,
    current_user: dict = Depends(check_role(["RECEPTIONIST"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Take over AI chat - pause AI responses and open direct messaging interface
    
    Flow:
    1. Disable AI responses for this patient
    2. Open real-time chat interface (WebSocket)
    3. Staff can send direct messages via Telegram
    4. When done, enable AI again
    """
    
    logger.info(f"👤 Takeover chat: {appointment_id}")
    
    try:
        # Pause AI for this patient
        await disable_ai_for_appointment(appointment_id)
        
        # Get chat interface URL/token
        chat_session = await create_manual_chat_session(
            appointment_id=appointment_id,
            user_id=current_user.get("user_id")
        )
        
        return {
            "status": "takeover_active",
            "chat_session_id": chat_session.get("id"),
            "message": "AI paused, you can now chat directly with patient"
        }
    
    except Exception as e:
        logger.error(f"❌ Takeover error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== CANCEL APPOINTMENT =====

@router.post(
    "/queue/{appointment_id}/cancel",
    summary="Navbatni bekor qilish",
    tags=["Admin Dashboard"]
)
async def cancel_from_dashboard(
    appointment_id: str,
    reason: str = None,
    current_user: dict = Depends(check_role(["RECEPTIONIST", "CLINIC_ADMIN"])),
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Cancel appointment from dashboard
    """
    
    logger.info(f"🚫 Cancelling from dashboard: {appointment_id}")
    
    try:
        appointment = await update_appointment_status(
            appointment_id=appointment_id,
            status="CANCELLED",
            notes=f"Cancelled: {reason}" if reason else "Cancelled by staff"
        )
        
        # Free up slot
        await free_up_slot(
            clinic_id=clinic_id,
            start_time=appointment.get("startTime")
        )
        
        # Notify patient
        await send_cancellation_notification(
            patient_id=appointment.get("patientId"),
            reason=reason
        )
        
        # Broadcast
        await broadcast_queue_update(clinic_id, "appointment_cancelled", appointment)
        
        return appointment
    
    except Exception as e:
        logger.error(f"❌ Cancel error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ANALYTICS & METRICS =====

@router.get(
    "/analytics",
    summary="Navbat statistikasi (Today)",
    tags=["Admin Dashboard"]
)
async def get_daily_analytics(
    clinic_id: str = Depends(get_clinic_id_from_request)
):
    """
    Get daily metrics:
    - Total appointments today
    - Completed appointments
    - No-show rate
    - Average wait time
    - Peak hours
    """
    
    logger.info(f"📈 Getting analytics for clinic: {clinic_id}")
    
    try:
        analytics = await calculate_daily_analytics(clinic_id)
        
        return analytics
    
    except Exception as e:
        logger.error(f"❌ Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== WEBSOCKET FOR REAL-TIME UPDATES =====

@router.websocket("/ws/queue/{clinic_id}")
async def websocket_queue_updates(websocket: WebSocket, clinic_id: str):
    """
    WebSocket connection for live queue updates
    
    Messages:
    - queue_update: Appointment status changed
    - new_appointment: New appointment arrived
    - appointment_completed: Appointment finished
    """
    
    await websocket.accept()
    logger.info(f"🔌 WebSocket connected for clinic: {clinic_id}")
    
    try:
        while True:
            # Wait for messages from queue broker
            message = await get_next_queue_event(clinic_id)
            
            if message:
                await websocket.send_json(message)
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()

# ===== DATABASE STUBS =====

async def get_appointments_by_status(clinic_id: str) -> dict:
    """Get appointments organized by status"""
    # TODO: Query Prisma GROUP BY status
    return {
        "PENDING": [],
        "IN_PROGRESS": [],
        "COMPLETED": [],
        "NO_SHOW": []
    }

async def get_appointment_from_db(clinic_id: str, appointment_id: str) -> dict:
    """Get appointment"""
    # TODO: Query Prisma
    return None

async def update_appointment_status(
    appointment_id: str,
    status: str,
    notes: str = None
) -> dict:
    """Update appointment status"""
    # TODO: Update Prisma
    return {"id": appointment_id, "status": status}

async def free_up_slot(clinic_id: str, start_time):
    """Free up time slot"""
    # TODO: Update slot status
    pass

async def schedule_ai_follow_up(
    patient_id: str,
    message: str,
    appointment_id: str
):
    """Schedule follow-up message"""
    # TODO: Create Notification
    pass

async def disable_ai_for_appointment(appointment_id: str):
    """Disable AI for this patient"""
    # TODO: Set flag in Redis
    pass

async def create_manual_chat_session(
    appointment_id: str,
    user_id: str
) -> dict:
    """Create manual chat session"""
    # TODO: Create session in Redis/DB
    return {"id": "chat-session-1"}

async def send_cancellation_notification(patient_id: str, reason: str = None):
    """Send cancellation notification"""
    # TODO: Create Notification
    pass

async def broadcast_queue_update(clinic_id: str, event_type: str, data: dict):
    """Broadcast to WebSocket clients"""
    # TODO: Publish to Queue (Redis pub/sub or BullMQ)
    pass

async def get_next_queue_event(clinic_id: str) -> dict:
    """Get next queue event from broker"""
    # TODO: Wait for next event
    return None

async def calculate_daily_analytics(clinic_id: str) -> dict:
    """Calculate daily metrics"""
    # TODO: Query today's appointments
    return {
        "total_appointments": 0,
        "completed": 0,
        "no_show_rate": 0,
        "average_wait_time_minutes": 0
    }

async def send_to_clinic_display(clinic_id: str, patient_number: str, doctor_name: str):
    """Send patient number to clinic display screen"""
    # TODO: Send to clinic display system (MQTT, HTTP, etc.)
    pass
