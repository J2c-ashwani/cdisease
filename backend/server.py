from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Health Consultation Platform API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    user_type: str = Field(default="patient")  # "patient" or "professional"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    user_type: str = Field(default="patient")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    user_type: str
    created_at: datetime

class Disease(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    icon: str
    color: str
    common_symptoms: List[str]

class Professional(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    specialization: List[str]  # disease IDs they can treat
    years_experience: int
    languages: List[str]
    qualification: str
    consultation_fee: int
    profile_image: str
    rating: float = Field(default=4.5)
    available_slots: List[str] = Field(default_factory=list)
    bio: str

class ChatQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    disease_id: str
    question_text: str
    question_type: str = "multiple_choice"  # or "text", "number"
    options: List[str] = Field(default_factory=list)
    order: int

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    disease_id: str
    professional_id: str
    answers: Dict[str, Any] = Field(default_factory=dict)
    status: str = Field(default="active")  # "active", "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    professional_id: str
    disease_id: str
    chat_session_id: str
    scheduled_time: datetime
    duration_minutes: int = Field(default=30)
    status: str = Field(default="scheduled")  # "scheduled", "completed", "cancelled"
    payment_status: str = Field(default="pending")  # "pending", "paid", "failed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    professional_id: str
    disease_id: str
    chat_session_id: str
    scheduled_time: datetime

class ChatAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str

class PaymentRequest(BaseModel):
    appointment_id: str
    amount: int

# Initialize sample data
async def init_sample_data():
    # Check if data already exists
    if await db.diseases.count_documents({}) > 0:
        return
    
    # Sample diseases
    diseases = [
        {
            "id": str(uuid.uuid4()),
            "name": "PCOS",
            "description": "Polycystic Ovary Syndrome - hormonal disorder affecting women of reproductive age",
            "category": "Women's Health",
            "icon": "🫧",
            "color": "bg-pink-100 text-pink-800",
            "common_symptoms": ["Irregular periods", "Weight gain", "Acne", "Hair loss", "Mood changes"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Type 2 Diabetes", 
            "description": "A chronic condition that affects how your body metabolizes sugar (glucose)",
            "category": "Metabolic",
            "icon": "🩸",
            "color": "bg-red-100 text-red-800",
            "common_symptoms": ["Increased thirst", "Frequent urination", "Weight loss", "Fatigue", "Blurred vision"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hypertension",
            "description": "High blood pressure - a condition in which blood vessels have persistently raised pressure",
            "category": "Cardiovascular", 
            "icon": "💓",
            "color": "bg-blue-100 text-blue-800",
            "common_symptoms": ["Headaches", "Shortness of breath", "Nosebleeds", "Chest pain", "Dizziness"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Thyroid Disorders",
            "description": "Conditions that affect the thyroid gland and hormone production",
            "category": "Endocrine",
            "icon": "🦋",
            "color": "bg-green-100 text-green-800", 
            "common_symptoms": ["Fatigue", "Weight changes", "Mood swings", "Hair changes", "Temperature sensitivity"]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Anxiety & Depression",
            "description": "Mental health conditions affecting mood, thinking, and behavior", 
            "category": "Mental Health",
            "icon": "🧠",
            "color": "bg-purple-100 text-purple-800",
            "common_symptoms": ["Persistent sadness", "Anxiety", "Sleep issues", "Loss of interest", "Concentration problems"]
        }
    ]
    
    await db.diseases.insert_many(diseases)
    
    # Create professional users first
    prof_users = [
        {
            "id": str(uuid.uuid4()),
            "email": "dr.sarah@healthconsult.com",
            "password": hash_password("password123"),
            "name": "Dr. Sarah Johnson",
            "phone": "+1234567890",
            "user_type": "professional",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "email": "dr.raj@healthconsult.com", 
            "password": hash_password("password123"),
            "name": "Dr. Raj Patel",
            "phone": "+1234567891",
            "user_type": "professional",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "email": "dr.emily@healthconsult.com",
            "password": hash_password("password123"),
            "name": "Dr. Emily Chen", 
            "phone": "+1234567892",
            "user_type": "professional",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.users.insert_many(prof_users)
    
    # Sample professionals with correct user_ids
    professionals_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": prof_users[0]["id"],
            "specialization": [diseases[0]["id"], diseases[3]["id"]],  # PCOS, Thyroid
            "years_experience": 8,
            "languages": ["English", "Hindi"],
            "qualification": "MD Gynecology, MBBS",
            "consultation_fee": 500,
            "profile_image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
            "rating": 4.8,
            "bio": "Specialist in women's health with focus on PCOS and hormonal disorders."
        },
        {
            "id": str(uuid.uuid4()), 
            "user_id": prof_users[1]["id"],
            "specialization": [diseases[1]["id"], diseases[2]["id"]],  # Diabetes, Hypertension
            "years_experience": 12,
            "languages": ["English", "Hindi", "Tamil"],
            "qualification": "MD Internal Medicine, MBBS",
            "consultation_fee": 600,
            "profile_image": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
            "rating": 4.9,
            "bio": "Internal medicine expert specializing in diabetes and cardiovascular health."
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": prof_users[2]["id"], 
            "specialization": [diseases[4]["id"]],  # Mental Health
            "years_experience": 6,
            "languages": ["English", "Hindi"],
            "qualification": "MD Psychiatry, MBBS",
            "consultation_fee": 400,
            "profile_image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face",
            "rating": 4.7,
            "bio": "Mental health specialist with expertise in anxiety and depression treatment."
        }
    ]
    
    await db.professionals.insert_many(professionals_data)

# API Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    user_dict = user_data.dict()
    user_dict["password"] = hash_password(user_data.password)
    user = User(**user_dict)
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": UserResponse(**user)}

@api_router.get("/diseases", response_model=List[Disease])
async def get_diseases():
    diseases = await db.diseases.find().to_list(length=None)
    return [Disease(**disease) for disease in diseases]

@api_router.get("/diseases/{disease_id}", response_model=Disease)
async def get_disease(disease_id: str):
    disease = await db.diseases.find_one({"id": disease_id})
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")
    return Disease(**disease)

@api_router.get("/diseases/{disease_id}/professionals")
async def get_professionals_for_disease(disease_id: str):
    professionals = await db.professionals.find({"specialization": disease_id}).to_list(length=None)
    
    result = []
    for prof in professionals:
        # Get user details for the professional
        user = await db.users.find_one({"id": prof["user_id"]})
        if user:
            prof_data = Professional(**prof)
            result.append({
                "id": prof_data.id,
                "name": user["name"],
                "specialization": prof_data.specialization,
                "years_experience": prof_data.years_experience,
                "languages": prof_data.languages,
                "qualification": prof_data.qualification,
                "consultation_fee": prof_data.consultation_fee,
                "profile_image": prof_data.profile_image,
                "rating": prof_data.rating,
                "bio": prof_data.bio
            })
    
    return result

@api_router.post("/chat/start")
async def start_chat_session(professional_id: str, disease_id: str, current_user: User = Depends(get_current_user)):
    # Create new chat session
    session = ChatSession(
        user_id=current_user.id,
        disease_id=disease_id,
        professional_id=professional_id
    )
    
    await db.chat_sessions.insert_one(session.dict())
    
    # Return first question
    questions = [
        {
            "id": "q1",
            "question_text": "What is your age?",
            "question_type": "multiple_choice",
            "options": ["18-25", "26-35", "36-45", "46-55", "55+"]
        },
        {
            "id": "q2", 
            "question_text": "How long have you been experiencing symptoms?",
            "question_type": "multiple_choice",
            "options": ["Less than 1 month", "1-3 months", "3-6 months", "6-12 months", "More than 1 year"]
        },
        {
            "id": "q3",
            "question_text": "Rate your symptom severity (1-10)",
            "question_type": "multiple_choice", 
            "options": ["1-2 (Mild)", "3-4 (Mild-Moderate)", "5-6 (Moderate)", "7-8 (Severe)", "9-10 (Very Severe)"]
        }
    ]
    
    return {"session_id": session.id, "questions": questions}

@api_router.post("/chat/answer")
async def submit_chat_answer(request: ChatAnswerRequest, current_user: User = Depends(get_current_user)):
    session = await db.chat_sessions.find_one({"id": request.session_id, "user_id": current_user.id})
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Update session with answer
    await db.chat_sessions.update_one(
        {"id": request.session_id},
        {"$set": {f"answers.{request.question_id}": request.answer}}
    )
    
    return {"status": "success", "message": "Answer recorded"}

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment_data: AppointmentCreate, current_user: User = Depends(get_current_user)):
    appointment = Appointment(
        user_id=current_user.id,
        **appointment_data.dict()
    )
    
    await db.appointments.insert_one(appointment.dict())
    return appointment

@api_router.get("/appointments")
async def get_user_appointments(current_user: User = Depends(get_current_user)):
    appointments = await db.appointments.find({"user_id": current_user.id}).to_list(length=None)
    return [Appointment(**apt) for apt in appointments]

@api_router.post("/payment/mock")
async def mock_payment(request: PaymentRequest, current_user: User = Depends(get_current_user)):
    # Mock payment - always succeeds
    await db.appointments.update_one(
        {"id": request.appointment_id, "user_id": current_user.id},
        {"$set": {"payment_status": "paid"}}
    )
    
    return {
        "status": "success",
        "payment_id": str(uuid.uuid4()),
        "amount": request.amount,
        "message": "Payment completed successfully"
    }

@api_router.delete("/reset")
async def reset_database():
    """Reset all data for testing purposes"""
    await db.diseases.delete_many({})
    await db.users.delete_many({})
    await db.professionals.delete_many({})
    await db.chat_sessions.delete_many({})
    await db.appointments.delete_many({})
    await init_sample_data()
    return {"message": "Database reset and sample data initialized"}

@api_router.get("/")
async def root():
    return {"message": "Health Consultation Platform API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_sample_data()
    logger.info("Sample data initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()