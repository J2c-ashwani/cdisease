from fastapi import APIRouter
from app.api.v1 import auth, conditions, chat, appointments

api_router = APIRouter()

# Register only working routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(conditions.router, prefix="/conditions", tags=["Conditions"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
