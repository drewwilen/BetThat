from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum, func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class OutcomeStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"


class OutcomeResolution(str, enum.Enum):
    YES = "yes"
    NO = "no"


class MarketOutcome(Base):
    __tablename__ = "market_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Team A", "Team B"
    status = Column(SQLEnum(OutcomeStatus), default=OutcomeStatus.ACTIVE, nullable=False)
    resolution_outcome = Column(SQLEnum(OutcomeResolution), nullable=True)  # "yes" or "no" when resolved
    image_url = Column(String, nullable=True)  # URL for outcome image
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    market = relationship("Market", back_populates="market_outcomes")
    resolver = relationship("User", foreign_keys=[resolved_by])

