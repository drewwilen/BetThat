from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Enum as SQLEnum, func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class OrderType(str, enum.Enum):
    LIMIT = "limit"
    MARKET = "market"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    PARTIALLY_FILLED = "partially_filled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    side = Column(SQLEnum(OrderSide), nullable=False)
    outcome_name = Column(String, nullable=False)  # e.g., "Team A", "Team B", or "default" for legacy
    outcome = Column(String, nullable=False)  # "yes" or "no" - the side on the outcome_name
    price = Column(Numeric(10, 4), nullable=False)  # Price between 0 and 1
    quantity = Column(Numeric(20, 4), nullable=False)
    filled_quantity = Column(Numeric(20, 4), default=0, nullable=False)
    order_type = Column(SQLEnum(OrderType), nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    filled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    market = relationship("Market", back_populates="orders")
    user = relationship("User", back_populates="orders")

