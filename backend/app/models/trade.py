from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    outcome_name = Column(String, nullable=False)  # e.g., "Team A", "Team B", or "default" for legacy
    outcome = Column(String, nullable=False)  # "yes" or "no" - the side on the outcome_name
    price = Column(Numeric(10, 4), nullable=False)
    quantity = Column(Numeric(20, 4), nullable=False)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    market = relationship("Market", back_populates="trades")
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="buy_trades")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="sell_trades")

