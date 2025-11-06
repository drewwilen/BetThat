from sqlalchemy.orm import Session
from decimal import Decimal
from ..models.user import User


def update_token_balance(db: Session, user_id: int, amount: Decimal):
    """Update user's token balance
    Note: token_balance is Numeric(20, 2) which rounds to 2 decimal places.
    We round the amount to avoid precision issues.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        # Round to 2 decimal places to match database precision
        rounded_amount = round(amount, 2)
        user.token_balance += rounded_amount
        db.commit()
        db.refresh(user)
        return user.token_balance
    return None


def has_sufficient_balance(db: Session, user_id: int, required_amount: Decimal) -> bool:
    """Check if user has sufficient token balance"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    return user.token_balance >= required_amount


def get_token_balance(db: Session, user_id: int) -> Decimal:
    """Get user's current token balance"""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user.token_balance
    return Decimal(0)

