from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.commission_service import commission_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class BookingCreate(BaseModel):
    chat_session_id: str
    scheduled_datetime: str

@router.post("/")
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create booking after chat completion
    Calculate commission automatically
    """
    # Get chat session
    session = await db.chat_sessions.find_one({
        "id": booking_data.chat_session_id,
        "user_id": current_user["id"],
        "status": "completed"
    })
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found or not completed"
        )
    
    # Get coach
    coach = await db.coaches.find_one({"id": session["coach_id"]})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    
    # Calculate all amounts using commission service
    amounts = commission_service.calculate_booking_amounts(
        consultation_fee=coach["consultation_fee"]
    )
    
    # Create booking
    booking = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "coach_id": session["coach_id"],
        "condition_id": session["condition_id"],
        "chat_session_id": session["id"],
        "scheduled_datetime": booking_data.scheduled_datetime,
        "duration_minutes": 45,
        
        # Pricing breakdown
        "consultation_fee": amounts["consultation_fee"],
        "platform_fee": amounts["platform_fee"],
        "commission_amount": amounts["commission_amount"],
        "coach_payout_amount": amounts["coach_payout_amount"],
        "total_amount": amounts["total_amount"],
        
        # Status
        "booking_status": "pending_payment",
        "payment_status": "pending",
        
        # Timestamps
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.bookings.insert_one(booking)
    
    return {
        "booking_id": booking["id"],
        "payment_required": True,
        "payment_details": {
            "consultation_fee": amounts["consultation_fee"],
            "platform_fee": amounts["platform_fee"],
            "total_amount": amounts["total_amount"],
            "breakdown": f"Coach Fee: ₹{amounts['consultation_fee']} + Platform Fee: ₹{amounts['platform_fee']}"
        }
    }

@router.get("/")
async def get_my_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all user bookings"""
    bookings = await db.bookings.find({
        "user_id": current_user["id"]
    }).sort("created_at", -1).to_list(length=100)
    
    return bookings
