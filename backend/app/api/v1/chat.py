from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.core.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str

@router.post("/start")
async def start_chat_session(
    professional_id: str = Query(..., description="Coach/Professional ID"),
    disease_id: str = Query(..., description="Condition/Disease ID"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Start a new MFine-style chat session
    Returns all questions for the condition
    """
    try:
        # Verify condition exists
        condition = await db.conditions.find_one({"id": disease_id})
        if not condition:
            raise HTTPException(status_code=404, detail="Condition not found")
        
        # Verify coach exists and is approved
        coach = await db.coaches.find_one({"id": professional_id, "status": "approved"})
        if not coach:
            raise HTTPException(status_code=404, detail="Coach not found or not available")
        
        # Get questions for this condition
        questions = await db.chat_questions.find(
            {"condition_id": disease_id},
            {"_id": 0}
        ).sort("order", 1).to_list(length=100)
        
        if not questions:
            # If no questions, create default ones
            logger.warning(f"No questions found for condition {disease_id}, using defaults")
            questions = [
                {
                    "id": f"{disease_id}_q1",
                    "condition_id": disease_id,
                    "question_text": "What is your age?",
                    "question_type": "multiple_choice",
                    "options": ["18-25", "26-35", "36-45", "46-55", "55+"],
                    "order": 1,
                    "is_required": True
                },
                {
                    "id": f"{disease_id}_q2",
                    "condition_id": disease_id,
                    "question_text": "How long have you been experiencing symptoms?",
                    "question_type": "multiple_choice",
                    "options": ["Less than 3 months", "3-6 months", "6-12 months", "More than 1 year"],
                    "order": 2,
                    "is_required": True
                },
                {
                    "id": f"{disease_id}_q3",
                    "condition_id": disease_id,
                    "question_text": "What is your primary health goal?",
                    "question_type": "multiple_choice",
                    "options": ["Symptom management", "Weight loss", "Lifestyle improvement", "Medical guidance"],
                    "order": 3,
                    "is_required": True
                }
            ]
            # Save default questions
            await db.chat_questions.insert_many(questions)
        
        # Create chat session
        session = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "condition_id": disease_id,
            "coach_id": professional_id,
            "current_question_index": 0,
            "total_questions": len(questions),
            "answers": {},
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.chat_sessions.insert_one(session)
        
        logger.info(f"Chat session started: {session['id']} for user {current_user['email']}")
        
        # Return session ID and all questions
        return {
            "session_id": session["id"],
            "questions": questions
        }
    
    except Exception as e:
        logger.error(f"Error starting chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/answer")
async def submit_answer(
    answer_data: ChatAnswerRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit answer to a question"""
    try:
        # Get session
        session = await db.chat_sessions.find_one({
            "id": answer_data.session_id,
            "user_id": current_user["id"],
            "status": "active"
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Update session with answer
        result = await db.chat_sessions.update_one(
            {"id": answer_data.session_id},
            {
                "$set": {
                    f"answers.{answer_data.question_id}": answer_data.answer,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Failed to save answer")
        
        logger.info(f"Answer saved for session {answer_data.session_id}")
        
        return {
            "status": "success",
            "message": "Answer recorded successfully"
        }
    
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get chat session details"""
    try:
        session = await db.chat_sessions.find_one(
            {
                "id": session_id,
                "user_id": current_user["id"]
            },
            {"_id": 0}
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return session
    
    except Exception as e:
        logger.error(f"Error fetching session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete")
async def complete_chat_session(
    session_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark chat session as completed"""
    try:
        session = await db.chat_sessions.find_one({
            "id": session_id,
            "user_id": current_user["id"]
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Update session status
        await db.chat_sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Get coach details for payment
        coach = await db.coaches.find_one({"id": session["coach_id"]})
        
        return {
            "session_id": session_id,
            "status": "completed",
            "message": "Chat session completed successfully",
            "coach": {
                "id": coach["id"],
                "consultation_fee": coach["consultation_fee"]
            }
        }
    
    except Exception as e:
        logger.error(f"Error completing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
