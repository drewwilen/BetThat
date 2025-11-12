from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict
from .user import UserResponse
from .market_outcome import MarketOutcomeResponse


class MarketCreate(BaseModel):
    community_id: int
    title: str
    description: Optional[str] = None
    resolution_deadline: datetime
    outcomes: Optional[List[str]] = None  # List of outcome names, defaults to ["default"] for legacy
    image_url: Optional[str] = None  # URL for market thumbnail/image
    outcome_images: Optional[Dict[str, str]] = None  # Map of outcome_name -> image_url


class MarketResponse(BaseModel):
    id: int
    community_id: int
    creator_id: int
    title: str
    description: Optional[str]
    market_type: str
    resolution_deadline: datetime
    status: str
    resolution_outcome: Optional[str]
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime
    outcomes: Optional[List[str]] = None  # List of outcome names (for backward compat)
    outcomes_detailed: Optional[List[MarketOutcomeResponse]] = None  # Full outcome details
    is_admin: Optional[bool] = False  # Whether current user is admin (not from DB)
    community_name: Optional[str] = None  # Community name (not from DB directly)
    community_image_url: Optional[str] = None  # Community image URL (not from DB directly)
    last_traded_prices: Optional[dict] = None  # {"yes": 0.65, "no": 0.35} or None
    image_url: Optional[str] = None  # URL for market thumbnail/image
    upvotes: Optional[int] = 0  # Number of upvotes
    downvotes: Optional[int] = 0  # Number of downvotes

    class Config:
        from_attributes = True


class MarketResolve(BaseModel):
    outcome: str  # "yes" or "no"

