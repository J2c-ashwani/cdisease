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
            {"_id": 0}
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
        {"_id": 0}
    )
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    return condition


@router.get("/{condition_id}/coaches")
async def get_coaches_for_condition(
    condition_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all coaches for a specific condition"""
    try:
        # Changed from specializations to diseases to match coach data
        coaches = await db.coaches.find(
            {"diseases": condition_id},  # ← KEY FIX: Changed from specializations
            {"_id": 0}
        ).to_list(length=100)
        
        logger.info(f"Found {len(coaches)} coaches for condition: {condition_id}")
        
        # Return coaches array directly (they already have all needed fields)
        return coaches
    
    except Exception as e:
        logger.error(f"Error fetching coaches for {condition_id}: {e}")
        return []
