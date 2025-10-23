from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid
import logging
import secrets

router = APIRouter()
logger = logging.getLogger(__name__)

class AppointmentCreate(BaseModel):
    professional_id: str
    disease_id: str
    chat_session_id: str
    scheduled_time: str

class PaymentCreate(BaseModel):
    appointment_id: str
    amount: float

def generate_meeting_link(appointment_id: str) -> str:
    """Generate a unique meeting link for the appointment"""
    meeting_token = secrets.token_urlsafe(16)
    return f"https://meet.healthconsult.com/{meeting_token}"

@router.post("")
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new appointment"""
    try:
        # Verify chat session exists
        session = await db.chat_sessions.find_one({
            "id": appointment_data.chat_session_id,
            "user_id": current_user["id"]
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Verify coach exists
        coach = await db.coaches.find_one({"id": appointment_data.professional_id})
        if not coach:
            raise HTTPException(status_code=404, detail="Coach not found")
        
        appointment_id = str(uuid.uuid4())
        
        # ✅ Generate meeting link
        meeting_link = generate_meeting_link(appointment_id)
        
        # Create appointment
        appointment = {
            "id": appointment_id,
            "user_id": current_user["id"],
            "professional_id": appointment_data.professional_id,
            "professional_name": coach.get("name", "Unknown"),
            "disease_id": appointment_data.disease_id,
            "chat_session_id": appointment_data.chat_session_id,
            "scheduled_time": appointment_data.scheduled_time,
            "status": "scheduled",
            "payment_status": "pending",
            "consultation_fee": coach["consultation_fee"],
            "meeting_link": meeting_link,  # ✅ Add meeting link
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.appointments.insert_one(appointment)
        
        logger.info(f"Appointment created: {appointment['id']}")
        
        return {
            "id": appointment["id"],
            "scheduled_time": appointment["scheduled_time"],
            "consultation_fee": appointment["consultation_fee"],
            "meeting_link": meeting_link,  # ✅ Return meeting link
            "status": appointment["status"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_appointments(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all appointments for current user"""
    try:
        appointments = await db.appointments.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("scheduled_time", -1).to_list(length=100)
        
        return appointments
    
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{appointment_id}")
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get specific appointment"""
    try:
        appointment = await db.appointments.find_one(
            {
                "id": appointment_id,
                "user_id": current_user["id"]
            },
            {"_id": 0}
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        return appointment
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment/mock")
async def mock_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mock payment processing"""
    try:
        # Verify appointment exists
        appointment = await db.appointments.find_one({
            "id": payment_data.appointment_id,
            "user_id": current_user["id"]
        })
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Update appointment payment status
        await db.appointments.update_one(
            {"id": payment_data.appointment_id},
            {
                "$set": {
                    "payment_status": "paid",
                    "payment_amount": payment_data.amount,
                    "payment_date": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"Payment processed for appointment: {payment_data.appointment_id}")
        
        return {
            "status": "success",
            "message": "Payment processed successfully",
            "appointment_id": payment_data.appointment_id,
            "meeting_link": appointment.get("meeting_link")  # ✅ Return meeting link
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
