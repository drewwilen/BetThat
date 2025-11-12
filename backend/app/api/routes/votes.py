from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ...core.database import get_db
from ...api.dependencies import get_current_user
from ...models.user import User
from ...models.market import Market
from ...models.market_vote import MarketVote
from ...schemas.market_vote import MarketVoteCreate, MarketVoteResponse, MarketVoteSummary

router = APIRouter()


@router.post("/markets/{market_id}/vote", response_model=MarketVoteResponse)
def vote_market(
    market_id: int,
    vote_data: MarketVoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vote on a market (upvote or downvote)"""
    if vote_data.vote_type not in ["upvote", "downvote"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="vote_type must be 'upvote' or 'downvote'"
        )
    
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    # Check if user already voted
    existing_vote = db.query(MarketVote).filter(
        MarketVote.market_id == market_id,
        MarketVote.user_id == current_user.id
    ).first()
    
    if existing_vote:
        # Update existing vote
        if existing_vote.vote_type == vote_data.vote_type:
            # Same vote, remove it (toggle off)
            db.delete(existing_vote)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_200_OK,
                detail="Vote removed"
            )
        else:
            # Change vote type
            existing_vote.vote_type = vote_data.vote_type
            db.commit()
            db.refresh(existing_vote)
            return existing_vote
    else:
        # Create new vote
        vote = MarketVote(
            market_id=market_id,
            user_id=current_user.id,
            vote_type=vote_data.vote_type
        )
        db.add(vote)
        db.commit()
        db.refresh(vote)
        return vote


@router.get("/markets/{market_id}/votes", response_model=MarketVoteSummary)
def get_market_votes(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vote summary for a market"""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    # Count upvotes and downvotes
    upvotes = db.query(func.count(MarketVote.id)).filter(
        MarketVote.market_id == market_id,
        MarketVote.vote_type == "upvote"
    ).scalar() or 0
    
    downvotes = db.query(func.count(MarketVote.id)).filter(
        MarketVote.market_id == market_id,
        MarketVote.vote_type == "downvote"
    ).scalar() or 0
    
    # Get user's vote if any
    user_vote = db.query(MarketVote).filter(
        MarketVote.market_id == market_id,
        MarketVote.user_id == current_user.id
    ).first()
    
    return MarketVoteSummary(
        upvotes=upvotes,
        downvotes=downvotes,
        user_vote=user_vote.vote_type if user_vote else None
    )

