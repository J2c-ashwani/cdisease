"""Add more conditions to the database"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

async def add_conditions():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.getenv('DB_NAME', 'coaching_marketplace')]
    
    print("🌱 Adding more conditions...")
    
    # New conditions to add
    new_conditions = [
        {
            "id": "thyroid",
            "name": "Thyroid Disorders",
            "slug": "thyroid-disorders",
            "description": "Conditions affecting thyroid hormone production including hypothyroidism and hyperthyroidism",
            "category": "Endocrine",
            "icon": "🦋",
            "color": "bg-purple-100 text-purple-800",
            "common_symptoms": ["Fatigue", "Weight changes", "Hair loss", "Mood swings"],
            "is_active": True,
            "display_order": 4
        },
        {
            "id": "obesity",
            "name": "Obesity & Weight Management",
            "slug": "obesity-weight-management",
            "description": "Comprehensive weight management for chronic obesity and metabolic syndrome",
            "category": "Metabolic",
            "icon": "⚖️",
            "color": "bg-orange-100 text-orange-800",
            "common_symptoms": ["Excess weight", "Low energy", "Joint pain", "Sleep apnea"],
            "is_active": True,
            "display_order": 5
        },
        {
            "id": "heart_disease",
            "name": "Heart Disease",
            "slug": "heart-disease",
            "description": "Cardiovascular conditions including coronary artery disease and heart failure",
            "category": "Cardiovascular",
            "icon": "❤️",
            "color": "bg-red-100 text-red-800",
            "common_symptoms": ["Chest pain", "Shortness of breath", "Fatigue", "Palpitations"],
            "is_active": True,
            "display_order": 6
        },
        {
            "id": "arthritis",
            "name": "Arthritis & Joint Pain",
            "slug": "arthritis-joint-pain",
            "description": "Chronic inflammatory joint conditions including rheumatoid and osteoarthritis",
            "category": "Musculoskeletal",
            "icon": "🦴",
            "color": "bg-yellow-100 text-yellow-800",
            "common_symptoms": ["Joint pain", "Stiffness", "Swelling", "Limited mobility"],
            "is_active": True,
            "display_order": 7
        },
        {
            "id": "endometriosis",
            "name": "Endometriosis",
            "slug": "endometriosis",
            "description": "Condition where tissue similar to uterine lining grows outside the uterus",
            "category": "Women's Health",
            "icon": "🌺",
            "color": "bg-pink-100 text-pink-800",
            "common_symptoms": ["Pelvic pain", "Painful periods", "Heavy bleeding", "Infertility"],
            "is_active": True,
            "display_order": 8
        },
        {
            "id": "menopause",
            "name": "Menopause Management",
            "slug": "menopause-management",
            "description": "Support and management for menopausal symptoms and hormonal changes",
            "category": "Women's Health",
            "icon": "🌸",
            "color": "bg-pink-100 text-pink-800",
            "common_symptoms": ["Hot flashes", "Night sweats", "Mood changes", "Sleep issues"],
            "is_active": True,
            "display_order": 9
        },
        {
            "id": "ibs",
            "name": "IBS & Digestive Issues",
            "slug": "ibs-digestive-issues",
            "description": "Irritable Bowel Syndrome and chronic digestive disorders",
            "category": "Digestive",
            "icon": "🫀",
            "color": "bg-green-100 text-green-800",
            "common_symptoms": ["Abdominal pain", "Bloating", "Diarrhea", "Constipation"],
            "is_active": True,
            "display_order": 10
        }
    ]
    
    # Insert new conditions
    result = await db.conditions.insert_many(new_conditions)
    print(f"✅ Added {len(new_conditions)} new conditions")
    
    # Print all conditions
    all_conditions = await db.conditions.find({"is_active": True}).sort("display_order", 1).to_list(length=100)
    print(f"\n📋 Total conditions in database: {len(all_conditions)}")
    for condition in all_conditions:
        print(f"  {condition['icon']} {condition['name']} - {condition['category']}")
    
    # Now add coaches for the new conditions
    print("\n👨‍⚕️ Adding coaches for new conditions...")
    
    # Get existing coach users
    coach_users = await db.users.find({"user_type": "coach"}).to_list(length=10)
    if len(coach_users) >= 2:
        sarah_id = coach_users[0]["id"]
        raj_id = coach_users[1]["id"]
        
        # Update existing coaches to specialize in more conditions
        await db.coaches.update_one(
            {"user_id": sarah_id},
            {"$set": {
                "specializations": ["pcos", "diabetes", "thyroid", "obesity", "endometriosis", "menopause"]
            }}
        )
        
        await db.coaches.update_one(
            {"user_id": raj_id},
            {"$set": {
                "specializations": ["diabetes", "hypertension", "heart_disease", "obesity", "arthritis", "ibs"]
            }}
        )
        
        print("✅ Updated coach specializations")
    
    # Add chat questions for new conditions
    print("\n💬 Adding chat questions for new conditions...")
    
    new_questions = [
        # Thyroid questions
        {
            "id": "thyroid_q1",
            "condition_id": "thyroid",
            "question_text": "Have you been diagnosed with thyroid issues?",
            "question_type": "multiple_choice",
            "options": ["Hypothyroidism", "Hyperthyroidism", "Not yet diagnosed", "Under investigation"],
            "order": 1,
            "is_required": True
        },
        {
            "id": "thyroid_q2",
            "condition_id": "thyroid",
            "question_text": "Are you currently on thyroid medication?",
            "question_type": "multiple_choice",
            "options": ["Yes, levothyroxine", "Yes, other medication", "No medication", "Just started"],
            "order": 2,
            "is_required": True
        },
        {
            "id": "thyroid_q3",
            "condition_id": "thyroid",
            "question_text": "What's your primary concern?",
            "question_type": "multiple_choice",
            "options": ["Weight management", "Energy levels", "Hair loss", "Mood swings"],
            "order": 3,
            "is_required": True
        },
        
        # Obesity questions
        {
            "id": "obesity_q1",
            "condition_id": "obesity",
            "question_text": "What is your primary weight loss goal?",
            "question_type": "multiple_choice",
            "options": ["Lose 5-10 kg", "Lose 10-20 kg", "Lose 20+ kg", "Maintain current weight"],
            "order": 1,
            "is_required": True
        },
        {
            "id": "obesity_q2",
            "condition_id": "obesity",
            "question_text": "Have you tried weight loss programs before?",
            "question_type": "multiple_choice",
            "options": ["Yes, multiple times", "Yes, once or twice", "No, first time", "Currently on a program"],
            "order": 2,
            "is_required": True
        },
        {
            "id": "obesity_q3",
            "condition_id": "obesity",
            "question_text": "What's your biggest challenge?",
            "question_type": "multiple_choice",
            "options": ["Diet control", "Exercise motivation", "Emotional eating", "Medical conditions"],
            "order": 3,
            "is_required": True
        },
        
        # Heart Disease questions
        {
            "id": "heart_q1",
            "condition_id": "heart_disease",
            "question_text": "What heart condition do you have?",
            "question_type": "multiple_choice",
            "options": ["Coronary artery disease", "Heart failure", "Arrhythmia", "High cholesterol"],
            "order": 1,
            "is_required": True
        },
        {
            "id": "heart_q2",
            "condition_id": "heart_disease",
            "question_text": "Are you on cardiac medication?",
            "question_type": "multiple_choice",
            "options": ["Yes, blood thinners", "Yes, beta blockers", "Yes, statins", "No medication"],
            "order": 2,
            "is_required": True
        },
        {
            "id": "heart_q3",
            "condition_id": "heart_disease",
            "question_text": "What lifestyle support do you need?",
            "question_type": "multiple_choice",
            "options": ["Diet planning", "Exercise guidance", "Stress management", "All of the above"],
            "order": 3,
            "is_required": True
        }
    ]
    
    await db.chat_questions.insert_many(new_questions)
    print(f"✅ Added {len(new_questions)} chat questions")
    
    print("\n🎉 Successfully added more conditions!")
    client.close()

if __name__ == "__main__":
    asyncio.run(add_conditions())
