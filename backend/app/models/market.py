from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum, func, JSON
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class MarketType(str, enum.Enum):
    YES_NO = "yes_no"
    MULTIPLE_CHOICE = "multiple_choice"


class MarketStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Market(Base):
    __tablename__ = "markets"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False, index=True)
    description = Column(String)
    market_type = Column(SQLEnum(MarketType), default=MarketType.YES_NO, nullable=False)
    resolution_deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(MarketStatus), default=MarketStatus.ACTIVE, nullable=False)
    resolution_outcome = Column(String, nullable=True)  # "yes" or "no" for yes/no markets
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    outcomes = Column(JSON, nullable=False, default=lambda: ["yes", "no"])  # List of outcome options
    image_url = Column(String, nullable=True)  # URL for market thumbnail/image

    # Relationships
    community = relationship("Community", back_populates="markets")
    creator = relationship("User", foreign_keys=[creator_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    orders = relationship("Order", back_populates="market", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="market", cascade="all, delete-orphan")
    positions = relationship("Position", back_populates="market", cascade="all, delete-orphan")
    market_outcomes = relationship("MarketOutcome", back_populates="market", cascade="all, delete-orphan")

