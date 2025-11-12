from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.database import get_db
from ...api.dependencies import get_current_user
from ...models.user import User
from ...models.market import Market
from ...models.market_message import MarketMessage
from ...schemas.market_message import MarketMessageCreate, MarketMessageResponse

router = APIRouter()


@router.post("/markets/{market_id}/messages", response_model=MarketMessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    market_id: int,
    message_data: MarketMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a chat message for a market"""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    if not message_data.message or not message_data.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )
    
    message = MarketMessage(
        market_id=market_id,
        user_id=current_user.id,
        message=message_data.message.strip()
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Return with username
    return {
        "id": message.id,
        "market_id": message.market_id,
        "user_id": message.user_id,
        "username": current_user.username,
        "message": message.message,
        "created_at": message.created_at,
        "updated_at": message.updated_at
    }


@router.get("/markets/{market_id}/messages", response_model=List[MarketMessageResponse])
def get_messages(
    market_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat messages for a market"""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    messages = db.query(MarketMessage).filter(
        MarketMessage.market_id == market_id
    ).order_by(MarketMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    # Reverse to show oldest first (most recent at bottom)
    messages = list(reversed(messages))
    
    result = []
    for message in messages:
        user = db.query(User).filter(User.id == message.user_id).first()
        result.append({
            "id": message.id,
            "market_id": message.market_id,
            "user_id": message.user_id,
            "username": user.username if user else "Unknown",
            "message": message.message,
            "created_at": message.created_at,
            "updated_at": message.updated_at
        })
    
    return result

