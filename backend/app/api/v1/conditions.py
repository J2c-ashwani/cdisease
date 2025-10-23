from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_conditions(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get all available conditions"""
    try:
        conditions = await db.conditions.find(
            {"is_active": True},
            {"_id": 0}  # ✅ EXCLUDE MongoDB's _id field
        ).sort("display_order", 1).to_list(length=100)
        return conditions
    except Exception as e:
        logger.error(f"Error fetching conditions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conditions")

@router.get("/{condition_id}")
async def get_condition(condition_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get single condition details"""
    condition = await db.conditions.find_one(
        {"id": condition_id},
        {"_id": 0}  # ✅ EXCLUDE MongoDB's _id field
    )
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    return condition

@router.get("/{condition_id}/coaches")
async def get_coaches_for_condition(
    condition_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all approved coaches for a specific condition"""
    coaches = await db.coaches.find(
        {"specializations": condition_id, "status": "approved"},
        {"_id": 0}  # ✅ EXCLUDE MongoDB's _id field
    ).to_list(length=100)
    
    result = []
    for coach in coaches:
        user = await db.users.find_one(
            {"id": coach["user_id"]},
            {"_id": 0, "password": 0}  # ✅ EXCLUDE _id and password
        )
        if user:
            result.append({
                "id": coach["id"],
                "name": user["name"],
                "profile_image": coach.get("profile_image"),
                "specializations": coach["specializations"],
                "years_experience": coach["years_experience"],
                "languages": coach["languages"],
                "qualification": coach["qualification"],
                "consultation_fee": coach["consultation_fee"],
                "rating": coach["rating"],
                "total_consultations": coach.get("total_consultations", 0),
                "bio": coach["bio"]
            })
    
    return result
