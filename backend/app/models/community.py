from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    is_public = Column(Boolean, default=True, nullable=False)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email_domain = Column(String, nullable=True)  # For future email-based access
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    image_url = Column(String, nullable=True)  # URL for community image/logo

    # Relationships
    admin = relationship("User", back_populates="created_communities")
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")
    markets = relationship("Market", back_populates="community", cascade="all, delete-orphan")


class CommunityMember(Base):
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False)
    role = Column(String, default="member", nullable=False)  # member or admin
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="community_memberships")
    community = relationship("Community", back_populates="members")

