from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class CommunityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class CommunityResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_public: bool
    invite_code: str
    admin_id: int
    email_domain: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CommunityMemberResponse(BaseModel):
    id: int
    user_id: int
    community_id: int
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class JoinCommunity(BaseModel):
    invite_code: str

