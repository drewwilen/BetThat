from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MarketVoteCreate(BaseModel):
    vote_type: str  # "upvote" or "downvote"


class MarketVoteResponse(BaseModel):
    id: int
    market_id: int
    user_id: int
    vote_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarketVoteSummary(BaseModel):
    upvotes: int
    downvotes: int
    user_vote: Optional[str] = None  # "upvote", "downvote", or None

    class Config:
        from_attributes = True

