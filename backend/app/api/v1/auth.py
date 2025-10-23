from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    user_type: str = "patient"  # patient or coach

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    user_type: str
    is_active: bool

@router.post("/register")
async def register(
    user_data: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "user_type": user_data.user_type,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user)
    
    # Return user without password
    user.pop("password")
    user.pop("_id", None)
    
    logger.info(f"New user registered: {user_data.email}")
    
    return {
        "message": "User registered successfully",
        "user": user
    }

@router.post("/login")
async def login(
    user_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Login user and return JWT token"""
    # Find user
    user = await db.users.find_one({"email": user_data.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]}
    )
    
    # Return token and user info (without password)
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone", ""),
        "user_type": user["user_type"],
        "is_active": user["is_active"]
    }
    
    logger.info(f"User logged in: {user_data.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me")
async def get_current_user_info(
    current_user: dict = Depends(lambda: {"mock": "user"})
):
    """Get current user information"""
    # This will be properly implemented with get_current_user dependency
    return current_user
