from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MarketOutcomeResponse(BaseModel):
    id: int
    market_id: int
    name: str
    status: str
    resolution_outcome: Optional[str]
    image_url: Optional[str]
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class MarketOutcomeResolve(BaseModel):
    outcome: str  # "yes" or "no" - the resolution for this specific outcome_name

