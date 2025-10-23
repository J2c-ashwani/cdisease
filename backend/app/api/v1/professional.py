from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.dependencies import get_current_professional_or_coach
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class UpdateFeeRequest(BaseModel):
    consultation_fee: int


@router.get("/dashboard/stats")
async def get_professional_stats(
    professional: dict = Depends(get_current_professional_or_coach),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get professional dashboard statistics"""
    try:
        # Get coach profile (professionals are stored in coaches collection)
        coach = await db.coaches.find_one({"user_id": professional["id"]})
        if not coach:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        coach_id = coach["id"]
        
        # Total appointments
        total_appointments = await db.appointments.count_documents({
            "professional_id": coach_id
        })
        
        # Completed appointments
        completed = await db.appointments.count_documents({
            "professional_id": coach_id,
            "status": "completed"
        })
        
        # Upcoming appointments
        upcoming = await db.appointments.count_documents({
            "professional_id": coach_id,
            "status": "scheduled",
            "scheduled_time": {"$gte": datetime.now(timezone.utc).isoformat()}
        })
        
        # Total earnings
        paid_appointments = await db.appointments.find({
            "professional_id": coach_id,
            "payment_status": "paid"
        }).to_list(length=None)
        
        total_earnings = sum(apt.get("consultation_fee", 0) for apt in paid_appointments)
        platform_commission = total_earnings * 0.15  # 15% platform fee
        net_earnings = total_earnings - platform_commission
        
        # This month earnings
        first_day_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
        
        this_month_appointments = await db.appointments.find({
            "professional_id": coach_id,
            "payment_status": "paid",
            "created_at": {"$gte": first_day_month.isoformat()}
        }).to_list(length=None)
        
        earnings_this_month = sum(apt.get("consultation_fee", 0) for apt in this_month_appointments)
        commission_this_month = earnings_this_month * 0.15
        net_earnings_this_month = earnings_this_month - commission_this_month
        
        return {
            "total_appointments": total_appointments,
            "completed_appointments": completed,
            "upcoming_appointments": upcoming,
            "total_earnings": total_earnings,
            "net_earnings": net_earnings,
            "platform_commission": platform_commission,
            "earnings_this_month": earnings_this_month,
            "net_earnings_this_month": net_earnings_this_month,
            "commission_this_month": commission_this_month,
            "consultation_fee": coach.get("consultation_fee", 0),
            "professional_name": coach.get("name", "Unknown"),
            "professional_email": coach.get("email", "")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching professional stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointments")
async def get_professional_appointments(
    professional: dict = Depends(get_current_professional_or_coach),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all appointments for professional"""
    try:
        # Get coach profile
        coach = await db.coaches.find_one({"user_id": professional["id"]})
        if not coach:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        appointments = await db.appointments.find(
            {"professional_id": coach["id"]},
            {"_id": 0}
        ).sort("scheduled_time", -1).to_list(length=100)
        
        # Enrich appointments with patient names
        for apt in appointments:
            patient = await db.users.find_one(
                {"id": apt.get("user_id")},
                {"_id": 0, "name": 1, "email": 1}
            )
            if patient:
                apt["patient_name"] = patient.get("name", "Unknown")
                apt["patient_email"] = patient.get("email", "")
        
        return appointments
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointments/upcoming")
async def get_upcoming_appointments(
    professional: dict = Depends(get_current_professional_or_coach),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get only upcoming appointments"""
    try:
        coach = await db.coaches.find_one({"user_id": professional["id"]})
        if not coach:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        now = datetime.now(timezone.utc).isoformat()
        
        appointments = await db.appointments.find(
            {
                "professional_id": coach["id"],
                "status": "scheduled",
                "scheduled_time": {"$gte": now}
            },
            {"_id": 0}
        ).sort("scheduled_time", 1).to_list(length=50)
        
        # Enrich with patient info
        for apt in appointments:
            patient = await db.users.find_one(
                {"id": apt.get("user_id")},
                {"_id": 0, "name": 1, "email": 1, "phone": 1}
            )
            if patient:
                apt["patient_name"] = patient.get("name", "Unknown")
                apt["patient_email"] = patient.get("email", "")
                apt["patient_phone"] = patient.get("phone", "")
        
        return appointments
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching upcoming appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointments/{appointment_id}/chat-history")
async def get_patient_chat_history(
    appointment_id: str,
    professional: dict = Depends(get_current_professional_or_coach),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get patient's chat history for an appointment"""
    try:
        # Get appointment
        appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Verify this professional owns the appointment
        coach = await db.coaches.find_one({"user_id": professional["id"]})
        if not coach or appointment["professional_id"] != coach["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this chat history")
        
        # Get chat session
        session = await db.chat_sessions.find_one(
            {"id": appointment["chat_session_id"]},
            {"_id": 0}
        )
        
        if not session:
            return {
                "message": "No chat history found",
                "answers": []
            }
        
        # Get patient info
        patient = await db.users.find_one(
            {"id": session.get("user_id")},
            {"_id": 0, "name": 1, "email": 1}
        )
        
        return {
            "patient_name": patient.get("name", "Unknown") if patient else "Unknown",
            "patient_email": patient.get("email", "") if patient else "",
            "disease_id": session.get("disease_id"),
            "started_at": session.get("started_at"),
            "completed_at": session.get("completed_at"),
            "answers": session.get("answers", [])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile/fee")
async def update_consultation_fee(
    request: UpdateFeeRequest,
    professional: dict = Depends(get_current_professional_or_coach),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update professional's consultation fee"""
    try:
        if request.consultation_fee < 100:
            raise HTTPException(status_code=400, detail="Consultation fee must be at least ₹100")
        
        if request.consultation_fee > 10000:
            raise HTTPException(status_code=400, detail="Consultation fee cannot exceed ₹10,000")
        
        coach = await db.coaches.find_one({"user_id": professional["id"]})
        if not coach:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        await db.coaches.update_one(
            {"user_id": professional["id"]},
            {
                "$set": {
                    "consultation_fee": request.consultation_fee,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "message": "Consultation fee updated successfully",
            "consultation_fee": request.consultation_fee
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating consultation fee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile")
async def get_professional_profile(
    professional: dict = Depends(get_current_professional_or_coach),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get professional's profile"""
    try:
        coach = await db.coaches.find_one(
            {"user_id": professional["id"]},
            {"_id": 0}
        )
        
        if not coach:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        return coach
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
