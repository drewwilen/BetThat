from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from decimal import Decimal
from ...core.database import get_db
from ...api.dependencies import get_current_user
from ...models.user import User
from ...services.positions import get_user_positions, calculate_position_value, get_user_position
from ...schemas.position import PositionResponse, PortfolioSummary
from ...models.market import Market
from ...models.trade import Trade

router = APIRouter()


@router.get("/positions", response_model=List[PositionResponse])
def get_positions(
    market_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all positions for the current user, optionally filtered by market"""
    positions = get_user_positions(db, current_user.id, market_id)
    
    # Calculate current values for each position
    result = []
    for position in positions:
        market = db.query(Market).filter(Market.id == position.market_id).first()
        value_info = calculate_position_value(db, position)
        
        # Get last traded price for this market/outcome (not just user's trades)
        last_market_trade = db.query(Trade).filter(
            Trade.market_id == position.market_id,
            Trade.outcome_name == position.outcome_name,
            Trade.outcome == position.outcome
        ).order_by(desc(Trade.executed_at)).first()
        
        # Get last traded time for this specific user's position
        last_user_trade = db.query(Trade).filter(
            Trade.market_id == position.market_id,
            Trade.outcome_name == position.outcome_name,
            Trade.outcome == position.outcome
        ).filter(
            (Trade.buyer_id == current_user.id) | (Trade.seller_id == current_user.id)
        ).order_by(desc(Trade.executed_at)).first()
        
        # Calculate payout if right (what they'd get if their bet is correct)
        payout_if_right = None
        if position.quantity > 0:
            # Long position: if outcome wins, get quantity * 1.0
            payout_if_right = position.quantity * Decimal("1.0")
        elif position.quantity < 0:
            # Short position: if they're right (opposite outcome wins), they keep what they received
            # They already received -cost_basis when selling (since cost_basis is negative)
            # They don't have to pay out anything if they're right
            # So payout_if_right = what they keep = -cost_basis = abs(cost_basis)
            payout_if_right = -position.total_cost  # Since total_cost is negative for shorts
        
        position_dict = {
            "id": position.id,
            "user_id": position.user_id,
            "market_id": position.market_id,
            "outcome_name": position.outcome_name,
            "outcome": position.outcome,
            "quantity": position.quantity,
            "average_price": position.average_price,
            "total_cost": position.total_cost,
            "current_value": value_info["current_value"],
            "profit_loss": value_info["profit_loss"],
            "payout": value_info["payout"],
            "payout_if_right": payout_if_right,
            "last_traded_price": last_market_trade.price if last_market_trade else None,
            "last_traded": last_user_trade.executed_at if last_user_trade else None,
            "updated_at": position.updated_at,
            "market": {
                "id": market.id,
                "title": market.title,
                "status": market.status.value if hasattr(market.status, 'value') else market.status,
                "resolution_outcome": market.resolution_outcome
            } if market else None
        }
        result.append(position_dict)
    
    return result


@router.get("/positions/{market_id}", response_model=List[PositionResponse])
def get_market_positions(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get positions for a specific market"""
    positions = get_user_positions(db, current_user.id, market_id)
    
    result = []
    for position in positions:
        market = db.query(Market).filter(Market.id == position.market_id).first()
        value_info = calculate_position_value(db, position)
        
        # Get last traded price for this market/outcome (not just user's trades)
        last_market_trade = db.query(Trade).filter(
            Trade.market_id == position.market_id,
            Trade.outcome_name == position.outcome_name,
            Trade.outcome == position.outcome
        ).order_by(desc(Trade.executed_at)).first()
        
        # Get last traded time for this specific user's position
        last_user_trade = db.query(Trade).filter(
            Trade.market_id == position.market_id,
            Trade.outcome_name == position.outcome_name,
            Trade.outcome == position.outcome
        ).filter(
            (Trade.buyer_id == current_user.id) | (Trade.seller_id == current_user.id)
        ).order_by(desc(Trade.executed_at)).first()
        
        # Calculate payout if right (what they'd get if their bet is correct)
        payout_if_right = None
        if position.quantity > 0:
            # Long position: if outcome wins, get quantity * 1.0
            payout_if_right = position.quantity * Decimal("1.0")
        elif position.quantity < 0:
            # Short position: if they're right (opposite outcome wins), they keep what they received
            # They already received -cost_basis when selling (since cost_basis is negative)
            # They don't have to pay out anything if they're right
            # So payout_if_right = what they keep = -cost_basis = abs(cost_basis)
            payout_if_right = -position.total_cost  # Since total_cost is negative for shorts
        
        position_dict = {
            "id": position.id,
            "user_id": position.user_id,
            "market_id": position.market_id,
            "outcome_name": position.outcome_name,
            "outcome": position.outcome,
            "quantity": position.quantity,
            "average_price": position.average_price,
            "total_cost": position.total_cost,
            "current_value": value_info["current_value"],
            "profit_loss": value_info["profit_loss"],
            "payout": value_info["payout"],
            "payout_if_right": payout_if_right,
            "last_traded_price": last_market_trade.price if last_market_trade else None,
            "last_traded": last_user_trade.executed_at if last_user_trade else None,
            "updated_at": position.updated_at,
            "market": {
                "id": market.id,
                "title": market.title,
                "status": market.status.value if hasattr(market.status, 'value') else market.status,
                "resolution_outcome": market.resolution_outcome
            } if market else None
        }
        result.append(position_dict)
    
    return result


@router.get("/summary", response_model=PortfolioSummary)
def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio summary (total value, profit/loss, etc.)"""
    from ...models.market import MarketStatus
    from ...models.market_outcome import MarketOutcome, OutcomeStatus
    
    positions = get_user_positions(db, current_user.id)
    
    total_invested = Decimal(0)
    total_current_value = Decimal(0)
    total_profit_loss = Decimal(0)
    locked_in_bets = Decimal(0)  # Value locked in OPEN (unresolved) positions only
    
    for position in positions:
        value_info = calculate_position_value(db, position)
        market = db.query(Market).filter(Market.id == position.market_id).first()
        
        # Check if this specific outcome is resolved
        is_resolved = False
        if market:
            if market.status == MarketStatus.RESOLVED:
                # Legacy: entire market resolved
                is_resolved = True
            else:
                # Check if this specific outcome is resolved
                market_outcome = db.query(MarketOutcome).filter(
                    MarketOutcome.market_id == position.market_id,
                    MarketOutcome.name == position.outcome_name
                ).first()
                if market_outcome and market_outcome.status == OutcomeStatus.RESOLVED:
                    is_resolved = True
        
        total_invested += abs(position.total_cost)
        total_current_value += value_info["current_value"]
        total_profit_loss += value_info["profit_loss"]
        
        # Only count as "locked in bets" if the position's outcome is NOT resolved
        # For resolved outcomes, payouts have already been distributed to cash,
        # so we don't want to double-count them
        if not is_resolved:
            locked_in_bets += value_info["current_value"]
    
    # Available cash is the user's current token balance
    # This already includes payouts from resolved positions
    available_cash = current_user.token_balance
    
    # Total value = available cash + locked in OPEN (unresolved) positions only
    # This ensures we don't double-count: resolved positions' payouts are in cash,
    # and we don't count them in locked_in_bets
    total_value = available_cash + locked_in_bets
    
    return {
        "total_positions": len(positions),
        "total_current_value": total_current_value,
        "total_profit_loss": total_profit_loss,
        "total_invested": total_invested,
        "available_cash": available_cash,
        "locked_in_bets": locked_in_bets,
        "total_value": total_value
    }

