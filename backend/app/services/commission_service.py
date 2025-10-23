from app.core.config import settings
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class CommissionService:
    """
    Handle all commission calculations for the marketplace
    User pays: Consultation Fee + Platform Fee
    Coach receives: Consultation Fee - Commission
    Platform earns: Commission + Platform Fee
    """
    
    @staticmethod
    def calculate_booking_amounts(consultation_fee: int) -> Dict[str, int]:
        """
        Calculate all amounts for a booking
        
        Example:
        - Coach fee: ₹800
        - Commission (25%): ₹200
        - Platform fee: ₹50
        - Total user pays: ₹850
        - Coach receives: ₹600
        - Platform earns: ₹250
        """
        platform_fee = settings.PLATFORM_FEE_PER_BOOKING
        commission_rate = settings.PLATFORM_COMMISSION_RATE
        
        # Calculate commission from consultation fee
        commission_amount = int(consultation_fee * commission_rate)
        
        # Coach receives consultation fee minus commission
        coach_payout = consultation_fee - commission_amount
        
        # Total user pays
        total_amount = consultation_fee + platform_fee
        
        # Your total earnings
        platform_earnings = commission_amount + platform_fee
        
        logger.info(f"💰 Booking calculation: Fee={consultation_fee}, Commission={commission_amount}, Platform={platform_fee}, Total={total_amount}")
        
        return {
            "consultation_fee": consultation_fee,
            "platform_fee": platform_fee,
            "commission_amount": commission_amount,
            "commission_rate": commission_rate,
            "coach_payout_amount": coach_payout,
            "total_amount": total_amount,
            "platform_earnings": platform_earnings
        }
    
    @staticmethod
    def calculate_refund(
        total_amount: int,
        hours_before_appointment: int,
        platform_fee: int
    ) -> Dict[str, int]:
        """
        Calculate refund based on cancellation policy
        
        Policy:
        - 24+ hours before: Full refund minus platform fee
        - 12-24 hours: 50% refund
        - Less than 12 hours: No refund
        """
        if hours_before_appointment >= 24:
            refund_percentage = 1.0
            refund_amount = total_amount - platform_fee  # Keep platform fee
        elif hours_before_appointment >= 12:
            refund_percentage = 0.5
            refund_amount = int(total_amount * refund_percentage)
        else:
            refund_percentage = 0.0
            refund_amount = 0
        
        logger.info(f"💸 Refund calculation: Hours={hours_before_appointment}, Refund={refund_amount} ({refund_percentage*100}%)")
        
        return {
            "refund_amount": refund_amount,
            "refund_percentage": refund_percentage,
            "platform_retains": total_amount - refund_amount
        }

commission_service = CommissionService()