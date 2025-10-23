from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/analytics/overview")
async def get_analytics_overview(
    admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get platform analytics overview"""
    try:
        # Total counts
        total_patients = await db.users.count_documents({"user_type": "patient"})
        total_professionals = await db.coaches.count_documents({})
        total_appointments = await db.appointments.count_documents({})
        completed_appointments = await db.appointments.count_documents({"status": "completed"})
        
        # Revenue calculations
        paid_appointments = await db.appointments.find(
            {"payment_status": "paid"}
        ).to_list(length=None)
        
        total_revenue = sum(apt.get("consultation_fee", 0) for apt in paid_appointments)
        platform_commission = total_revenue * 0.15  # 15% commission
        
        # This month stats
        first_day_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
        
        appointments_this_month = await db.appointments.count_documents({
            "created_at": {"$gte": first_day_month.isoformat()}
        })
        
        revenue_this_month_data = await db.appointments.find({
            "payment_status": "paid",
            "created_at": {"$gte": first_day_month.isoformat()}
        }).to_list(length=None)
        
        revenue_this_month = sum(apt.get("consultation_fee", 0) for apt in revenue_this_month_data)
        
        return {
            "total_patients": total_patients,
            "total_professionals": total_professionals,
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_revenue": total_revenue,
            "platform_commission": platform_commission,
            "appointments_this_month": appointments_this_month,
            "revenue_this_month": revenue_this_month
        }
    
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
async def get_all_users(
    user_type: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all users with filters"""
    try:
        query = {}
        if user_type:
            query["user_type"] = user_type
        
        users = await db.users.find(
            query,
            {"_id": 0, "password": 0}
        ).skip(skip).limit(limit).to_list(length=limit)
        
        total_count = await db.users.count_documents(query)
        
        return {
            "users": users,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professionals")
async def get_all_professionals(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all professionals with filters"""
    try:
        query = {}
        if status:
            query["status"] = status
        
        professionals = await db.coaches.find(
            query,
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(length=limit)
        
        total_count = await db.coaches.count_documents(query)
        
        return {
            "professionals": professionals,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error fetching professionals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments")
async def get_all_appointments(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all appointments"""
    try:
        query = {}
        if status:
            query["status"] = status
        
        appointments = await db.appointments.find(
            query,
            {"_id": 0}
        ).sort("scheduled_time", -1).skip(skip).limit(limit).to_list(length=limit)
        
        total_count = await db.appointments.count_documents(query)
        
        return {
            "appointments": appointments,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/professionals/{professional_id}/status")
async def update_professional_status(
    professional_id: str,
    status: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve or reject professional"""
    try:
        if status not in ["approved", "rejected", "pending"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        result = await db.coaches.update_one(
            {"id": professional_id},
            {
                "$set": {
                    "status": status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Professional not found")
        
        return {"message": f"Professional status updated to {status}"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating professional status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
