from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.database import Base


class Position(Base):
    __tablename__ = "positions"
    __table_args__ = (
        UniqueConstraint('user_id', 'market_id', 'outcome_name', 'outcome', name='unique_user_market_outcome_side'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    outcome_name = Column(String, nullable=False)  # e.g., "Team A", "Team B", or "default" for legacy
    outcome = Column(String, nullable=False)  # "yes" or "no" - the side on the outcome_name
    quantity = Column(Numeric(20, 4), default=0, nullable=False)  # Net position (positive = long, negative = short)
    average_price = Column(Numeric(10, 4), nullable=False)  # Average price paid
    total_cost = Column(Numeric(20, 4), default=0, nullable=False)  # Total cost basis
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="positions")
    market = relationship("Market", back_populates="positions")

