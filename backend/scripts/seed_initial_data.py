"""Seed initial data for testing"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.security import hash_password

load_dotenv()

async def seed_data():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    
    print("🌱 Seeding database...")
    
    # Clear existing data
    await db.conditions.delete_many({})
    await db.users.delete_many({})
    await db.coaches.delete_many({})
    await db.chat_questions.delete_many({})
    
    # 1. Seed Conditions
    conditions = [
        {
            "id": "pcos",
            "name": "PCOS",
            "slug": "pcos",
            "description": "Polycystic Ovary Syndrome - hormonal disorder affecting women",
            "category": "Women's Health",
            "icon": "🫧",
            "color": "bg-pink-100 text-pink-800",
            "common_symptoms": ["Irregular periods", "Weight gain", "Acne", "Hair loss"],
            "is_active": True,
            "display_order": 1
        },
        {
            "id": "diabetes",
            "name": "Type 2 Diabetes",
            "slug": "type-2-diabetes",
            "description": "Chronic condition affecting blood sugar metabolism",
            "category": "Metabolic",
            "icon": "🩸",
            "color": "bg-red-100 text-red-800",
            "common_symptoms": ["Increased thirst", "Frequent urination", "Fatigue"],
            "is_active": True,
            "display_order": 2
        },
        {
            "id": "hypertension",
            "name": "Hypertension",
            "slug": "hypertension",
            "description": "High blood pressure condition",
            "category": "Cardiovascular",
            "icon": "💓",
            "color": "bg-blue-100 text-blue-800",
            "common_symptoms": ["Headaches", "Shortness of breath", "Dizziness"],
            "is_active": True,
            "display_order": 3
        }
    ]
    
    await db.conditions.insert_many(conditions)
    print(f"✅ Seeded {len(conditions)} conditions")
    
    # 2. Seed Coach Users
    coach_users = [
        {
            "id": str(uuid.uuid4()),
            "email": "sarah@coach.com",
            "password": hash_password("password123"),
            "name": "Dr. Sarah Johnson",
            "phone": "+919876543210",
            "user_type": "coach",
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "email": "raj@coach.com",
            "password": hash_password("password123"),
            "name": "Dr. Raj Patel",
            "phone": "+919876543211",
            "user_type": "coach",
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.users.insert_many(coach_users)
    print(f"✅ Seeded {len(coach_users)} coach users")
    
    # 3. Seed Coach Profiles
    coaches = [
        {
            "id": str(uuid.uuid4()),
            "user_id": coach_users[0]["id"],
            "specializations": ["pcos", "diabetes"],
            "years_experience": 8,
            "languages": ["English", "Hindi"],
            "qualification": "Certified Nutritionist, RD",
            "consultation_fee": 800,
            "profile_image": "https://randomuser.me/api/portraits/women/44.jpg",
            "rating": 4.8,
            "total_consultations": 150,
            "bio": "Specialist in women's health with focus on PCOS and metabolic disorders",
            "status": "approved",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": coach_users[1]["id"],
            "specializations": ["diabetes", "hypertension"],
            "years_experience": 12,
            "languages": ["English", "Hindi", "Tamil"],
            "qualification": "Certified Dietitian, Wellness Coach",
            "consultation_fee": 1000,
            "profile_image": "https://randomuser.me/api/portraits/men/32.jpg",
            "rating": 4.9,
            "total_consultations": 200,
            "bio": "Expert in diabetes management and cardiovascular health",
            "status": "approved",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.coaches.insert_many(coaches)
    print(f"✅ Seeded {len(coaches)} coach profiles")
    
    # 4. Seed Chat Questions for PCOS
    pcos_questions = [
        {
            "id": "pcos_q1",
            "condition_id": "pcos",
            "question_text": "What is your age?",
            "question_type": "multiple_choice",
            "options": ["18-25", "26-30", "31-35", "36-40", "40+"],
            "order": 1,
            "is_required": True
        },
        {
            "id": "pcos_q2",
            "condition_id": "pcos",
            "question_text": "How long have you been experiencing PCOS symptoms?",
            "question_type": "multiple_choice",
            "options": ["Less than 6 months", "6-12 months", "1-2 years", "2+ years"],
            "order": 2,
            "is_required": True
        },
        {
            "id": "pcos_q3",
            "condition_id": "pcos",
            "question_text": "What is your primary health goal?",
            "question_type": "multiple_choice",
            "options": ["Weight loss", "Regulate periods", "Manage symptoms", "Improve fertility"],
            "order": 3,
            "is_required": True
        }
    ]
    
    await db.chat_questions.insert_many(pcos_questions)
    print(f"✅ Seeded {len(pcos_questions)} chat questions")
    
    print("🎉 Database seeding completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
