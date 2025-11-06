from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from sqlalchemy.orm import relationship
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    token_balance = Column(Numeric(20, 2), default=1000.00, nullable=False)  # Starting balance
    total_trades = Column(Integer, default=0, nullable=False)
    win_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    created_communities = relationship("Community", back_populates="admin")
    community_memberships = relationship("CommunityMember", back_populates="user")
    created_markets = relationship("Market", foreign_keys="Market.creator_id", back_populates="creator")
    resolved_markets = relationship("Market", foreign_keys="Market.resolved_by", back_populates="resolver")
    orders = relationship("Order", back_populates="user")
    buy_trades = relationship("Trade", foreign_keys="Trade.buyer_id", back_populates="buyer")
    sell_trades = relationship("Trade", foreign_keys="Trade.seller_id", back_populates="seller")
    positions = relationship("Position", back_populates="user")

