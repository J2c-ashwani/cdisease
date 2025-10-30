from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid 

router = APIRouter()
logger = logging.getLogger(__name__)

class FeeChangeRequest(BaseModel):
    new_fee: float
    reason: str = ""

@router.get("/dashboard")
async def get_professional_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get professional dashboard data"""
    try:
        professional_id = current_user.get("id")
        
        # Get appointments for this professional
        appointments = await db.appointments.find(
            {"professional_id": professional_id}
        ).sort("scheduled_time", 1).to_list(length=100)
        
        # Calculate stats
        total_appointments = len(appointments)
        
        upcoming = [apt for apt in appointments if apt.get("status") == "scheduled"]
        completed = [apt for apt in appointments if apt.get("status") == "completed"]
        
        # Calculate earnings
        total_earnings = sum(apt.get("consultation_fee", 0) for apt in completed)
        platform_commission = total_earnings * 0.15
        net_earnings = total_earnings - platform_commission
        
        # This month stats
        now = datetime.now(timezone.utc)
        this_month_appointments = [
            apt for apt in appointments 
            if datetime.fromisoformat(apt.get("scheduled_time", "").replace("Z", "+00:00")).month == now.month
        ]
        
        return {
            "total_appointments": total_appointments,
            "upcoming_appointments": len(upcoming),
            "completed_appointments": len(completed),
            "total_earnings": total_earnings,
            "platform_commission": platform_commission,
            "net_earnings": net_earnings,
            "this_month_appointments": len(this_month_appointments),
            "appointments": [
                {
                    "id": apt.get("id"),
                    "user_id": apt.get("user_id"),
                    "scheduled_time": apt.get("scheduled_time"),
                    "status": apt.get("status"),
                    "consultation_fee": apt.get("consultation_fee"),
                    "payment_status": apt.get("payment_status", "pending")
                }
                for apt in upcoming[:10]
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching professional dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments")
async def get_professional_appointments(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all appointments for this professional"""
    try:
        professional_id = current_user.get("id")
        
        appointments = await db.appointments.find(
            {"professional_id": professional_id}
        ).sort("scheduled_time", -1).to_list(length=100)
        
        return {"appointments": appointments}
    
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments/{appointment_id}/chat-history")
async def get_appointment_chat_history(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get chat history for a specific appointment"""
    try:
        # Get appointment
        appointment = await db.appointments.find_one(
            {"id": appointment_id},
            {"_id": 0}
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Verify professional owns this appointment
        coach = await db.coaches.find_one(
            {"user_id": current_user["id"]},
            {"_id": 0}
        )
        if not coach or appointment["professional_id"] != coach["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # ✅ FIX: Get chat session using chat_session_id from appointment
        if not appointment.get("chat_session_id"):
            return {
                "patient_name": "Patient",
                "patient_email": "",
                "created_at": appointment.get("created_at"),
                "answers": []
            }
        
        session = await db.chat_sessions.find_one(
            {"id": appointment["chat_session_id"]},
            {"_id": 0}
        )
        
        if not session:
            return {
                "patient_name": "Patient",
                "patient_email": "",
                "created_at": appointment.get("created_at"),
                "answers": []
            }
        
        # ✅ FIX: Convert answers dict to list format for frontend
        answers_list = []
        if session.get("answers"):
            for question_id, answer in session["answers"].items():
                answers_list.append({
                    "question": question_id.replace("_", " ").title(),
                    "answer": answer
                })
        
        return {
            "patient_name": "Patient",
            "patient_email": "",
            "created_at": session.get("created_at"),
            "answers": answers_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fee-change-request")
async def request_fee_change(
    request_data: FeeChangeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Professional submits fee change request"""
    try:
        professional_id = current_user.get("id")
        
        # Get current fee
        coach = await db.coaches.find_one({"user_id": professional_id})
        current_fee = coach.get("consultation_fee", 500)
        
        # Create fee change request
        fee_request = {
            "id": str(uuid.uuid4()),
            "professional_id": professional_id,
            "professional_name": current_user.get("name"),
            "current_fee": current_fee,
            "requested_fee": request_data.new_fee,
            "reason": request_data.reason,
            "status": "pending",
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_at": None,
            "reviewed_by": None,
            "admin_notes": None
        }
        
        await db.fee_change_requests.insert_one(fee_request)
        
        logger.info(f"Fee change request created: {professional_id} - {current_fee} → {request_data.new_fee}")
        
        return {
            "message": "Fee change request submitted successfully. Waiting for admin approval.",
            "request_id": fee_request["id"],
            "status": "pending"
        }
    
    except Exception as e:
        logger.error(f"Error creating fee change request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fee-change-requests")
async def get_my_fee_requests(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get professional's fee change request history"""
    try:
        professional_id = current_user.get("id")
        
        requests = await db.fee_change_requests.find(
            {"professional_id": professional_id},
            {"_id": 0}
        ).sort("requested_at", -1).to_list(length=50)
        
        return {"requests": requests}
    
    except Exception as e:
        logger.error(f"Error fetching fee requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))
