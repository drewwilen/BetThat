from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import secrets
from ...core.database import get_db
from ...api.dependencies import get_current_user
from ...models.user import User
from ...models.community import Community, CommunityMember
from ...schemas.community import CommunityCreate, CommunityResponse, CommunityMemberResponse, JoinCommunity

router = APIRouter()


def generate_invite_code() -> str:
    """Generate a unique invite code"""
    return secrets.token_urlsafe(8).upper()


@router.post("/", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
def create_community(
    community_data: CommunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(Community).filter(Community.invite_code == invite_code).first():
        invite_code = generate_invite_code()
    
    community = Community(
        name=community_data.name,
        description=community_data.description,
        is_public=community_data.is_public,
        invite_code=invite_code,
        admin_id=current_user.id
    )
    db.add(community)
    db.commit()
    db.refresh(community)
    
    # Add creator as admin member
    member = CommunityMember(
        user_id=current_user.id,
        community_id=community.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    
    return community


@router.get("/", response_model=List[CommunityResponse])
def list_communities(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from sqlalchemy import or_
    
    # Get community IDs where user is a member
    member_communities = db.query(CommunityMember.community_id).filter(
        CommunityMember.user_id == current_user.id
    ).all()
    member_community_ids = [m[0] for m in member_communities]
    
    # Get all public communities OR private communities where user is a member
    if member_community_ids:
        communities = db.query(Community).filter(
            or_(
                Community.is_public == True,
                (Community.is_public == False) & (Community.id.in_(member_community_ids))
            )
        ).order_by(Community.created_at.desc()).offset(skip).limit(limit).all()
    else:
        # If user has no memberships, just show public communities
        communities = db.query(Community).filter(
            Community.is_public == True
        ).order_by(Community.created_at.desc()).offset(skip).limit(limit).all()
    
    return communities


@router.get("/{community_id}", response_model=CommunityResponse)
def get_community(community_id: int, db: Session = Depends(get_db)):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    return community


@router.post("/join", response_model=CommunityMemberResponse)
def join_community(
    join_data: JoinCommunity,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    community = db.query(Community).filter(Community.invite_code == join_data.invite_code).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code"
        )
    
    # Check if already a member
    existing = db.query(CommunityMember).filter(
        CommunityMember.user_id == current_user.id,
        CommunityMember.community_id == community.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this community"
        )
    
    member = CommunityMember(
        user_id=current_user.id,
        community_id=community.id,
        role="member"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return member


@router.get("/{community_id}/members", response_model=List[CommunityMemberResponse])
def get_community_members(
    community_id: int,
    db: Session = Depends(get_db)
):
    members = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id
    ).all()
    return members

