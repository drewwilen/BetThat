from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.database import Base


class MarketVote(Base):
    __tablename__ = "market_votes"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vote_type = Column(String, nullable=False)  # "upvote" or "downvote"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Ensure one vote per user per market
    __table_args__ = (UniqueConstraint('market_id', 'user_id', name='unique_market_user_vote'),)

    # Relationships
    market = relationship("Market", back_populates="votes")
    user = relationship("User", back_populates="market_votes")

