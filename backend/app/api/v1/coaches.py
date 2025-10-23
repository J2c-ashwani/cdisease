from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.core.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class CoachApplicationRequest(BaseModel):
    name: str
    email: str
    phone: str
    qualification: str
    years_experience: int
    bio: str
    languages: List[str]
    consultation_fee: int
    diseases: List[str]  # List of condition IDs
    profile_image: Optional[str] = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400"


@router.post("/apply")
async def apply_as_coach(
    application: CoachApplicationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Apply to become a coach/professional
    User must be logged in and will be linked to their user account
    """
    try:
        # Check if user already has a coach profile
        existing = await db.coaches.find_one({"user_id": current_user["id"]})
        if existing:
            raise HTTPException(
                status_code=400,
                detail="You already have a coach profile. Please contact admin to update."
            )
        
        # Validate consultation fee
        if application.consultation_fee < 100:
            raise HTTPException(status_code=400, detail="Minimum consultation fee is ₹100")
        
        if application.consultation_fee > 10000:
            raise HTTPException(status_code=400, detail="Maximum consultation fee is ₹10,000")
        
        # Create coach profile
        coach_id = str(uuid.uuid4())
        coach = {
            "id": coach_id,
            "user_id": current_user["id"],
            "name": application.name,
            "email": application.email,
            "phone": application.phone,
            "qualification": application.qualification,
            "years_experience": application.years_experience,
            "bio": application.bio,
            "languages": application.languages,
            "consultation_fee": application.consultation_fee,
            "diseases": application.diseases,
            "profile_image": application.profile_image,
            "rating": 5.0,
            "total_consultations": 0,
            "status": "pending",  # ✅ Pending admin approval
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.coaches.insert_one(coach)
        
        logger.info(f"New coach application: {coach_id} by user {current_user['id']}")
        
        return {
            "message": "Application submitted successfully! Admin will review your profile.",
            "coach_id": coach_id,
            "status": "pending"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting coach application: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_all_coaches(
    disease_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: approved, pending, rejected"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all coaches (public endpoint)
    Filters: disease_id, status
    By default, only returns approved coaches
    """
    try:
        query = {}
        
        # Default to approved unless specifically requesting others
        if status:
            query["status"] = status
        else:
            query["status"] = "approved"
        
        if disease_id:
            query["diseases"] = disease_id
        
        coaches = await db.coaches.find(
            query,
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(length=limit)
        
        total_count = await db.coaches.count_documents(query)
        
        return {
            "coaches": coaches,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error fetching coaches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{coach_id}")
async def get_coach_details(
    coach_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get detailed information about a specific coach"""
    try:
        coach = await db.coaches.find_one(
            {"id": coach_id, "status": "approved"},
            {"_id": 0}
        )
        
        if not coach:
            raise HTTPException(status_code=404, detail="Coach not found or not approved")
        
        # Get coach statistics
        total_appointments = await db.appointments.count_documents({
            "professional_id": coach_id
        })
        
        completed_appointments = await db.appointments.count_documents({
            "professional_id": coach_id,
            "status": "completed"
        })
        
        coach["total_appointments"] = total_appointments
        coach["completed_appointments"] = completed_appointments
        
        return coach
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching coach details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my/profile")
async def get_my_coach_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get current user's coach profile"""
    try:
        coach = await db.coaches.find_one(
            {"user_id": current_user["id"]},
            {"_id": 0}
        )
        
        if not coach:
            return {
                "has_profile": False,
                "message": "No coach profile found. Apply to become a coach!"
            }
        
        return {
            "has_profile": True,
            "profile": coach
        }
    
    except Exception as e:
        logger.error(f"Error fetching coach profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))
