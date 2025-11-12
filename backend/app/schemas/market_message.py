from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MarketMessageCreate(BaseModel):
    message: str


class MarketMessageResponse(BaseModel):
    id: int
    market_id: int
    user_id: int
    username: str
    message: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

