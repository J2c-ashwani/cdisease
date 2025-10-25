from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
import logging


router = APIRouter()
logger = logging.getLogger(__name__)


# ✅ 1. Root endpoint (no params) - FIRST
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


# ✅ 2. Specific sub-routes BEFORE generic catch-all
@router.get("/{condition_id}/professionals")
async def get_professionals_by_condition(
    condition_id: str,
    professional_type: Optional[str] = Query(
        "nutritionist", 
        regex="^(nutritionist|fitness|yoga)$",
        description="Filter by professional type: nutritionist, fitness, or yoga"
    ),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get professionals filtered by type"""
    try:
        query = {
            "diseases": condition_id,
            "status": "approved"
        }
        
        if professional_type and professional_type != "all":
            query["professional_type"] = professional_type
        
        professionals = await db.coaches.find(
            query,
            {"_id": 0}
        ).to_list(length=100)
        
        logger.info(f"Found {len(professionals)} {professional_type} professionals for {condition_id}")
        
        return {
            "professionals": professionals,
            "count": len(professionals),
            "type": professional_type,
            "condition_id": condition_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching professionals: {e}")
        return {
            "professionals": [], 
            "count": 0, 
            "type": professional_type,
            "condition_id": condition_id
        }


@router.get("/{condition_id}/coaches")
async def get_coaches_for_condition(
    condition_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all coaches for a specific condition (legacy endpoint)"""
    try:
        coaches = await db.coaches.find(
            {"diseases": condition_id, "status": "approved"},
            {"_id": 0}
        ).to_list(length=100)
        
        logger.info(f"Found {len(coaches)} coaches for condition: {condition_id}")
        
        return coaches
    
    except Exception as e:
        logger.error(f"Error fetching coaches for {condition_id}: {e}")
        return []


@router.get("/{condition_id}/nutritionists")
async def get_nutritionists_for_condition(
    condition_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get nutritionists for a specific condition"""
    try:
        nutritionists = await db.coaches.find(
            {
                "diseases": condition_id,
                "professional_type": "nutritionist",
                "status": "approved"
            },
            {"_id": 0}
        ).to_list(length=100)
        
        logger.info(f"Found {len(nutritionists)} nutritionists for {condition_id}")
        
        return nutritionists
    
    except Exception as e:
        logger.error(f"Error fetching nutritionists: {e}")
        return []


@router.get("/{condition_id}/trainers")
async def get_trainers_for_condition(
    condition_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get fitness trainers for a specific condition"""
    try:
        trainers = await db.coaches.find(
            {
                "diseases": condition_id,
                "professional_type": "fitness",
                "status": "approved"
            },
            {"_id": 0}
        ).to_list(length=100)
        
        logger.info(f"Found {len(trainers)} fitness trainers for {condition_id}")
        
        return trainers
    
    except Exception as e:
        logger.error(f"Error fetching trainers: {e}")
        return []


# ✅ 3. Generic catch-all route - LAST
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
