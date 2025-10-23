from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import verify_token
from app.core.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """Get current authenticated user from JWT token"""
    # Verify token
    payload = verify_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user from database
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "password": 0}  # Exclude password
    )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


async def get_current_patient(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure current user is a patient"""
    if current_user.get("user_type") != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can access this resource"
        )
    return current_user


async def get_current_coach(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure current user is a coach"""
    if current_user.get("user_type") != "coach":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches can access this resource"
        )
    return current_user


# ============================================
# NEW: ADMIN & PROFESSIONAL ROLE CHECKS
# ============================================

async def get_current_professional(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure current user is a professional"""
    if current_user.get("user_type") != "professional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can access this resource"
        )
    return current_user


async def get_current_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure current user is an admin"""
    # Check if user is admin by user_type or is_admin flag
    if current_user.get("user_type") != "admin" and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_current_professional_or_coach(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure current user is either a professional or coach"""
    user_type = current_user.get("user_type")
    if user_type not in ["professional", "coach"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional or coach access required"
        )
    return current_user
