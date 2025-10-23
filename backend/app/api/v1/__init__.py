from fastapi import APIRouter
from app.api.v1 import auth, conditions, chat, appointments, admin, professional, coaches

api_router = APIRouter()

# Public routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(conditions.router, prefix="/conditions", tags=["Conditions"])
api_router.include_router(coaches.router, prefix="/coaches", tags=["Coaches"])  # ✅ Added back

# Patient routes
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])

# Professional dashboard routes
api_router.include_router(professional.router, prefix="/professional", tags=["Professional Dashboard"])

# Admin dashboard routes
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
