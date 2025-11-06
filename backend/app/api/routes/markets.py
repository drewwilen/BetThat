from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from decimal import Decimal
from ...core.database import get_db
from ...api.dependencies import get_current_user
from ...models.user import User
from ...models.market import Market, MarketStatus, MarketType
from ...models.market_outcome import MarketOutcome, OutcomeStatus
from ...models.community import Community, CommunityMember
from ...schemas.market import MarketCreate, MarketResponse, MarketResolve
from ...schemas.market_outcome import MarketOutcomeResolve

router = APIRouter()


@router.post("/", response_model=MarketResponse, status_code=status.HTTP_201_CREATED)
def create_market(
    market_data: MarketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user is member of community
    membership = db.query(CommunityMember).filter(
        CommunityMember.user_id == current_user.id,
        CommunityMember.community_id == market_data.community_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this community to create markets"
        )
    
    # Verify community exists
    community = db.query(Community).filter(Community.id == market_data.community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Determine outcomes - use provided list or default to ["default"] for legacy
    # Filter out empty strings if outcomes are provided
    if market_data.outcomes:
        outcome_names = [outcome for outcome in market_data.outcomes if outcome and outcome.strip()]
        # If all outcomes were empty, default to ["default"]
        if not outcome_names:
            outcome_names = ["default"]
    else:
        outcome_names = ["default"]
    
    # Create market
    market = Market(
        community_id=market_data.community_id,
        creator_id=current_user.id,
        title=market_data.title,
        description=market_data.description,
        market_type=MarketType.YES_NO,
        resolution_deadline=market_data.resolution_deadline,
        outcomes=outcome_names  # Store as JSON for backward compatibility
    )
    db.add(market)
    db.flush()  # Flush to get market.id
    
    # Create MarketOutcome entries for each outcome name
    for outcome_name in outcome_names:
        market_outcome = MarketOutcome(
            market_id=market.id,
            name=outcome_name,
            status=OutcomeStatus.ACTIVE
        )
        db.add(market_outcome)
    
    db.commit()
    db.refresh(market)
    
    return market


@router.get("/", response_model=List[MarketResponse])
def list_markets(
    community_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Market)
    if community_id:
        query = query.filter(Market.community_id == community_id)
    markets = query.order_by(Market.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add community names to response
    result = []
    for market in markets:
        community = db.query(Community).filter(Community.id == market.community_id).first()
        market_dict = {
            "id": market.id,
            "community_id": market.community_id,
            "creator_id": market.creator_id,
            "title": market.title,
            "description": market.description,
            "market_type": market.market_type.value if hasattr(market.market_type, 'value') else market.market_type,
            "resolution_deadline": market.resolution_deadline,
            "status": market.status.value if hasattr(market.status, 'value') else market.status,
            "resolution_outcome": market.resolution_outcome,
            "resolved_by": market.resolved_by,
            "resolved_at": market.resolved_at,
            "created_at": market.created_at,
            "is_admin": False,
            "community_name": community.name if community else None,
            "outcomes": market.outcomes if market.outcomes else ["default"]  # Include outcomes list
        }
        result.append(market_dict)
    
    return result


@router.get("/{market_id}", response_model=MarketResponse)
def get_market(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ...models.community import CommunityMember
    
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    # Check if user is admin (will be added to response if needed)
    is_admin = False
    if current_user:
        membership = db.query(CommunityMember).filter(
            CommunityMember.user_id == current_user.id,
            CommunityMember.community_id == market.community_id,
            CommunityMember.role == "admin"
        ).first()
        is_admin = membership is not None
    
    # Get community name
    community = db.query(Community).filter(Community.id == market.community_id).first()
    
    # Get MarketOutcome entries
    market_outcomes = db.query(MarketOutcome).filter(MarketOutcome.market_id == market_id).all()
    
    # Get last traded prices for YES and NO outcomes
    # Since YES + NO = 1, we can calculate one from the other
    from ...models.trade import Trade
    from sqlalchemy import desc
    
    # Get the most recent trade (regardless of outcome_name or outcome)
    # When a trade happens, it involves both YES and NO at prices that sum to 1
    last_trade = db.query(Trade).filter(
        Trade.market_id == market_id
    ).order_by(desc(Trade.executed_at)).first()
    
    last_traded_prices = {
        "yes": None,
        "no": None
    }
    
    if last_trade:
        trade_price = float(last_trade.price)
        if last_trade.outcome == "yes":
            # YES traded at price p, so NO = 1 - p
            last_traded_prices["yes"] = trade_price
            last_traded_prices["no"] = 1.0 - trade_price
        else:
            # NO traded at price p, so YES = 1 - p
            last_traded_prices["no"] = trade_price
            last_traded_prices["yes"] = 1.0 - trade_price
    
    # Add is_admin and community_name to response
    market_dict = {
        "id": market.id,
        "community_id": market.community_id,
        "creator_id": market.creator_id,
        "title": market.title,
        "description": market.description,
        "market_type": market.market_type.value if hasattr(market.market_type, 'value') else market.market_type,
        "resolution_deadline": market.resolution_deadline,
        "status": market.status.value if hasattr(market.status, 'value') else market.status,
        "resolution_outcome": market.resolution_outcome,
        "resolved_by": market.resolved_by,
        "resolved_at": market.resolved_at,
        "created_at": market.created_at,
        "is_admin": is_admin,
        "community_name": community.name if community else None,
        "outcomes": market.outcomes if market.outcomes else ["default"],  # Include outcomes list
        "outcomes_detailed": market_outcomes,  # Include full outcome details
        "last_traded_prices": last_traded_prices  # Last traded prices for YES/NO
    }
    return market_dict


@router.post("/{market_id}/resolve", response_model=MarketResponse)
def resolve_market(
    market_id: int,
    resolve_data: MarketResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve entire market (legacy - for backward compatibility)"""
    # For legacy markets with only "default" outcome, this works as before
    # For new markets with multiple outcomes, use resolve_outcome endpoint instead
    return resolve_market_outcome(market_id, "default", resolve_data, current_user, db)


@router.post("/{market_id}/outcomes/{outcome_name}/resolve", response_model=MarketResponse)
def resolve_market_outcome(
    market_id: int,
    outcome_name: str,
    resolve_data: MarketOutcomeResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a specific outcome within a market"""
    from datetime import datetime
    from ...models.market_outcome import OutcomeStatus, OutcomeResolution
    from ...services.token import update_token_balance
    from ...models.position import Position
    
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    if market.status != MarketStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Market is not active"
        )
    
    # Check if user is admin of the community
    membership = db.query(CommunityMember).filter(
        CommunityMember.user_id == current_user.id,
        CommunityMember.community_id == market.community_id,
        CommunityMember.role == "admin"
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only community admins can resolve markets"
        )
    
    if resolve_data.outcome not in ["yes", "no"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outcome must be 'yes' or 'no'"
        )
    
    # Get or create the MarketOutcome entry
    market_outcome = db.query(MarketOutcome).filter(
        MarketOutcome.market_id == market_id,
        MarketOutcome.name == outcome_name
    ).first()
    
    if not market_outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outcome '{outcome_name}' not found for this market"
        )
    
    if market_outcome.status == OutcomeStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Outcome '{outcome_name}' is already resolved"
        )
    
    # Resolve the specific outcome
    market_outcome.status = OutcomeStatus.RESOLVED
    market_outcome.resolution_outcome = OutcomeResolution(resolve_data.outcome)
    market_outcome.resolved_by = current_user.id
    market_outcome.resolved_at = datetime.utcnow()
    
    # Distribute payouts to users with positions matching this outcome_name
    positions = db.query(Position).filter(
        Position.market_id == market_id,
        Position.outcome_name == outcome_name
    ).all()
    
    for position in positions:
        # Handle both long (positive quantity) and short (negative quantity) positions
        if position.outcome == resolve_data.outcome:
            # Outcome matches the position
            if position.quantity > 0:
                # Long position: user bought shares, outcome matches
                # They paid price * quantity, now get full value: quantity * 1.0
                payout = position.quantity * Decimal("1.0")
                update_token_balance(db, position.user_id, payout)
            else:
                # Short position: user sold shares, outcome matches what they sold
                # They already received price * abs(quantity) when selling
                # But now they must pay out the full value to the buyer
                payout_owed = abs(position.quantity) * Decimal("1.0")
                update_token_balance(db, position.user_id, -payout_owed)
        else:
            # Outcome does NOT match the position
            if position.quantity > 0:
                # Long position: user bought shares, outcome doesn't match
                # They paid price * quantity, get nothing back
                pass
            else:
                # Short position: user sold shares, outcome doesn't match
                # They already received price * abs(quantity) when selling
                # They keep it (no payout needed since buyer gets nothing)
                pass
    
    db.commit()
    db.refresh(market)
    
    return market

