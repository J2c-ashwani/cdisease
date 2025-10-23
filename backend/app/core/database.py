from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def get_db():
    """Dependency to get database instance"""
    return db.client[settings.DB_NAME]

async def connect_to_mongo():
    """Connect to MongoDB on startup"""
    logger.info("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(settings.MONGO_URL)
    logger.info("✅ Connected to MongoDB successfully!")

async def close_mongo_connection():
    """Close MongoDB connection on shutdown"""
    logger.info("Closing MongoDB connection...")
    db.client.close()
    logger.info("👋 MongoDB connection closed!")
