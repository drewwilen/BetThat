from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal


class PositionResponse(BaseModel):
    id: int
    user_id: int
    market_id: int
    outcome_name: str  # e.g., "Team A", "Team B", or "default"
    outcome: str  # "yes" or "no"
    quantity: Decimal
    average_price: Decimal
    total_cost: Decimal
    current_value: Optional[Decimal] = None
    profit_loss: Optional[Decimal] = None
    payout: Optional[Decimal] = None
    payout_if_right: Optional[Decimal] = None  # What they'd get if position wins
    last_traded_price: Optional[Decimal] = None  # Last trade price on the marketplace
    last_traded: Optional[datetime] = None  # Last trade time for this position
    updated_at: datetime
    market: Optional[Dict[str, Any]] = None  # Market info (id, title, status, resolution_outcome)

    class Config:
        from_attributes = True


class PortfolioSummary(BaseModel):
    total_positions: int
    total_current_value: Decimal
    total_profit_loss: Decimal
    total_invested: Decimal
    available_cash: Decimal
    locked_in_bets: Decimal
    total_value: Decimal

