from pydantic import BaseModel, Field
from typing import List
import uuid

class Condition(BaseModel):
    """Health conditions that users can get coaching for"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "PCOS", "Type 2 Diabetes", etc.
    slug: str  # "pcos", "type-2-diabetes"
    description: str
    category: str  # "Women's Health", "Metabolic", etc.
    icon: str  # Emoji or icon identifier
    color: str  # Tailwind color class
    common_symptoms: List[str]
    
    # SEO & Marketing
    meta_description: str = ""
    keywords: List[str] = Field(default_factory=list)
    
    # Stats
    total_coaches: int = Field(default=0, ge=0)
    total_consultations: int = Field(default=0, ge=0)
    avg_rating: float = Field(default=0.0, ge=0, le=5)
    
    # Display
    is_active: bool = Field(default=True)
    display_order: int = Field(default=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "PCOS",
                "slug": "pcos",
                "description": "Polycystic Ovary Syndrome - hormonal disorder affecting women",
                "category": "Women's Health",
                "icon": "🫧",
                "color": "bg-pink-100 text-pink-800",
                "common_symptoms": ["Irregular periods", "Weight gain", "Acne"]
            }
        }
EOF

# Update user model
cat > ~/cdisease/backend/app/models/user.py << 'EOF'
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class UserType(str, Enum):
    CLIENT = "client"  # People seeking coaching
    COACH = "coach"    # Lifestyle coaches
    ADMIN = "admin"    # Platform admins

class User(BaseModel):
    """User model for both clients and coaches"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password: str  # Hashed
    name: str
    phone: Optional[str] = None
    user_type: UserType = Field(default=UserType.CLIENT)
    
    # Profile
    profile_image: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    
    # Client-specific
    health_goals: List[str] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)  # Condition IDs
    
    # Account status
    is_active: bool = Field(default=True)
    is_email_verified: bool = Field(default=False)
    is_phone_verified: bool = Field(default=False)
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "name": "John Doe",
                "phone": "+919876543210",
                "user_type": "client",
                "health_goals": ["weight_loss", "better_diet"],
                "conditions": ["pcos"]
            }
        }