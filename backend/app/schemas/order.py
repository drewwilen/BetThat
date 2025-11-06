from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


class OrderCreate(BaseModel):
    market_id: int
    side: str = "buy"  # Only "buy" allowed in new model
    outcome_name: str  # e.g., "Team A", "Team B", or "default" for legacy
    outcome: str  # "yes" or "no" - the side on the outcome_name
    price: Optional[Decimal] = None  # Required for limit orders
    quantity: Decimal
    order_type: str  # "limit" or "market"
    
    @field_validator('side')
    @classmethod
    def validate_side(cls, v):
        if v != "buy":
            raise ValueError('Only "buy" orders are allowed. To sell, buy the opposite outcome (e.g., buy NO to sell YES).')
        return v
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be greater than 0')
        # Ensure whole number of contracts
        if v != int(v):
            raise ValueError('Quantity must be a whole number (no fractional contracts)')
        return Decimal(int(v))  # Convert to integer Decimal


class OrderResponse(BaseModel):
    id: int
    market_id: int
    user_id: int
    side: str
    outcome_name: str
    outcome: str
    price: Decimal
    quantity: Decimal
    filled_quantity: Decimal
    order_type: str
    status: str
    created_at: datetime
    filled_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderBookEntry(BaseModel):
    price: Decimal
    quantity: Decimal
    order_id: Optional[int] = None
    user_id: Optional[int] = None


class OrderBookResponse(BaseModel):
    market_id: int
    outcome_name: str
    outcome: str  # "yes" or "no"
    buys: List[OrderBookEntry]
    sells: List[OrderBookEntry]

