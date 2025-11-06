from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class TradeResponse(BaseModel):
    id: int
    market_id: int
    buyer_id: int
    seller_id: int
    outcome: str
    price: Decimal
    quantity: Decimal
    executed_at: datetime

    class Config:
        from_attributes = True

