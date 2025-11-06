from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from ..models.position import Position
from ..models.market import Market, MarketStatus


def update_position(db: Session, user_id: int, market_id: int, outcome_name: str, outcome: str, quantity_delta: Decimal, price: Decimal):
    """
    Update user position after a trade.
    NEW MODEL: All positions are positive (buy-only model).
    quantity_delta is always positive (we're always buying).
    """
    position = db.query(Position).filter(
        Position.user_id == user_id,
        Position.market_id == market_id,
        Position.outcome_name == outcome_name,
        Position.outcome == outcome
    ).first()
    
    if not position:
        # Create new position (quantity_delta should be positive)
        if quantity_delta <= 0:
            raise ValueError("Cannot create position with non-positive quantity")
        position = Position(
            user_id=user_id,
            market_id=market_id,
            outcome_name=outcome_name,
            outcome=outcome,
            quantity=quantity_delta,
            average_price=price,
            total_cost=quantity_delta * price
        )
        db.add(position)
    else:
        # Update existing position (quantity_delta should be positive)
        if quantity_delta <= 0:
            raise ValueError("Cannot update position with non-positive quantity_delta")
        
        old_quantity = position.quantity
        old_cost = position.total_cost
        
        # Always add (buying more)
        new_quantity = old_quantity + quantity_delta
        new_cost = quantity_delta * price
        position.total_cost = old_cost + new_cost
        
        # Calculate weighted average price
        if new_quantity > 0:
            position.average_price = position.total_cost / new_quantity
        else:
            position.average_price = price
        
        position.quantity = new_quantity
    
    db.commit()
    return position


def get_user_position(db: Session, user_id: int, market_id: int, outcome_name: str, outcome: str) -> Optional[Position]:
    """Get user's position for a specific market outcome"""
    return db.query(Position).filter(
        Position.user_id == user_id,
        Position.market_id == market_id,
        Position.outcome_name == outcome_name,
        Position.outcome == outcome
    ).first()


def get_user_positions(db: Session, user_id: int, market_id: Optional[int] = None):
    """Get all positions for a user, optionally filtered by market"""
    query = db.query(Position).filter(Position.user_id == user_id)
    if market_id:
        query = query.filter(Position.market_id == market_id)
    return query.all()


def calculate_position_value(db: Session, position: Position) -> dict:
    """
    Calculate current value and profit/loss for a position
    Returns: {current_value, profit_loss, payout (if resolved)}
    """
    from ..models.market_outcome import MarketOutcome, OutcomeStatus
    
    market = db.query(Market).filter(Market.id == position.market_id).first()
    if not market:
        return {"current_value": Decimal(0), "profit_loss": Decimal(0), "payout": None}
    
    quantity = position.quantity
    avg_price = position.average_price
    cost_basis = position.total_cost
    
    # Check if this specific outcome is resolved
    market_outcome = db.query(MarketOutcome).filter(
        MarketOutcome.market_id == position.market_id,
        MarketOutcome.name == position.outcome_name
    ).first()
    
    # Determine if resolved: either market is resolved (legacy) or this outcome is resolved
    is_resolved = False
    resolution_outcome = None
    
    if market.status == MarketStatus.RESOLVED:
        # Legacy: entire market resolved
        is_resolved = True
        resolution_outcome = market.resolution_outcome
    elif market_outcome and market_outcome.status == OutcomeStatus.RESOLVED:
        # New: specific outcome resolved
        is_resolved = True
        resolution_outcome = market_outcome.resolution_outcome.value if hasattr(market_outcome.resolution_outcome, 'value') else market_outcome.resolution_outcome
    
    if is_resolved:
        # Outcome is resolved - calculate payout
        if resolution_outcome == position.outcome:
            # Outcome matches position
            if quantity > 0:
                # Long position: payout is quantity * 1.0 (full value)
                payout = quantity * Decimal("1.0")
            else:
                # Short position: they sold, outcome matches, so they owe full value
                # They already received price * abs(quantity) when selling
                # Net payout: they received price*abs(qty) but owe 1.0*abs(qty)
                # So payout = -(1.0 - price) * abs(quantity) = price*abs(qty) - 1.0*abs(qty)
                # Actually, for display: what they get net = price*abs(qty) - 1.0*abs(qty)
                payout = cost_basis - (abs(quantity) * Decimal("1.0"))  # Negative payout
        else:
            # Outcome does NOT match position
            if quantity > 0:
                # Long position: lost everything, payout is 0
                payout = Decimal(0)
            else:
                # Short position: they sold, outcome doesn't match, they keep what they received
                # They received price * abs(quantity) = -cost_basis (since cost_basis is negative for shorts)
                payout = abs(cost_basis)  # Positive payout (what they received)
        
        # Profit/loss calculation
        # For long: profit = payout - cost_basis
        # For short: profit = payout - cost_basis (cost_basis is negative, payout is what they keep)
        profit_loss = payout - cost_basis
        return {
            "current_value": abs(payout) if quantity < 0 else payout,
            "profit_loss": profit_loss,
            "payout": payout
        }
    else:
        # Market is active - calculate current value based on market price
        # IMPORTANT: Use the same price for both long and short positions to avoid double-counting
        # Use last traded price if available, otherwise calculate mid-price from orderbook
        from .orderbook import get_best_price
        from ..models.trade import Trade
        from sqlalchemy import desc
        
        # Try to get last traded price first (most accurate, single price)
        last_trade = db.query(Trade).filter(
            Trade.market_id == position.market_id,
            Trade.outcome_name == position.outcome_name,
            Trade.outcome == position.outcome
        ).order_by(desc(Trade.executed_at)).first()
        
        if last_trade:
            # Use last traded price for both sides (ensures positions cancel out)
            market_price = last_trade.price
        else:
            # Fallback: calculate mid-price from orderbook
            best_buy = get_best_price(position.market_id, position.outcome_name, position.outcome, "buy")
            best_sell = get_best_price(position.market_id, position.outcome_name, position.outcome, "sell")
            
            if best_buy and best_sell:
                # Mid-price
                market_price = (best_buy + best_sell) / Decimal("2")
            elif best_buy:
                market_price = best_buy
            elif best_sell:
                market_price = best_sell
            else:
                # No market data, use average price as fallback
                market_price = avg_price
        
        # Calculate position value using the same market_price for both long and short
        if quantity > 0:
            # Long position - value is quantity * market_price
            current_value = quantity * market_price
            # Profit = current value - cost (cost is positive for longs)
            profit_loss = current_value - cost_basis
        else:
            # Short position - value is negative (liability)
            # For shorts: quantity is negative, cost_basis is negative (money received)
            # Current value = -abs(quantity) * market_price (what you'd owe to close)
            current_value = -(abs(quantity) * market_price)
            # Profit = money received - money needed to close
            # cost_basis = -83.05, current_value = -78.75
            # profit = -78.75 - (-83.05) = -78.75 + 83.05 = 4.30 ✓
            profit_loss = current_value - cost_basis
        return {
            "current_value": current_value,
            "profit_loss": profit_loss,
            "payout": None
        }

