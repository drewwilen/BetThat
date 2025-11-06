from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional, List, Tuple
from ..models.order import Order, OrderStatus, OrderSide
from ..models.trade import Trade
from ..models.market import Market, MarketStatus
from ..models.position import Position
from .orderbook import (
    add_order_to_orderbook, remove_order_from_orderbook,
    update_order_in_orderbook, get_best_price, get_orderbook_key
)
from .token import update_token_balance, has_sufficient_balance
from .positions import update_position
import redis
from ..core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)


def match_order(db: Session, order: Order) -> List[Trade]:
    """
    Match an order against the orderbook and execute trades.
    NEW MODEL: All orders are BUY orders. "Buy YES" matches against "Buy NO" with price constraint.
    Price constraint: if YES is at price p, NO must be at price (1-p).
    """
    if order.status != OrderStatus.PENDING:
        return []
    
    # In buy-only model, all orders are BUY orders
    if order.side != OrderSide.BUY:
        return []  # Should not happen, but safety check
    
    trades = []
    remaining_quantity = order.quantity - order.filled_quantity
    
    # Determine opposite outcome (YES matches NO, NO matches YES)
    opposite_outcome = "no" if order.outcome == "yes" else "yes"
    
    # Get the opposite outcome's orderbook (all orders are "buy" in new model)
    opposite_key = get_orderbook_key(order.market_id, order.outcome_name, opposite_outcome, "buy")
    
    # Get matching orders from opposite outcome's orderbook
    # All orders are "buy" orders, stored with negative scores (highest price first)
    matching_orders = redis_client.zrange(opposite_key, 0, -1, withscores=True)
    
    for order_str, score in matching_orders:
        if remaining_quantity <= 0:
            break
        
        # Split by colon - format is "order_id:quantity"
        parts = order_str.split(":")
        if len(parts) != 2:
            continue  # Skip invalid entries
        order_id_str, quantity_str = parts
        try:
            opposite_order_id = int(order_id_str)
            opposite_quantity = Decimal(quantity_str)
        except (ValueError, TypeError):
            continue  # Skip invalid entries
        
        # Get price from score (buy orders use negative scores, so convert back)
        opposite_price = Decimal(abs(score))
        
        # Calculate implied price for the order's outcome
        # If opposite is NO at price p, then YES is at price (1-p)
        # If opposite is YES at price p, then NO is at price (1-p)
        implied_price = Decimal("1.0") - opposite_price
        
        # For limit orders: validate price constraint
        if order.order_type.value == "limit":
            # For YES orders: order.price should match (1 - opposite_price)
            # For NO orders: order.price should match (1 - opposite_price)
            # Allow small tolerance for floating point precision
            price_tolerance = Decimal("0.0001")
            if abs(order.price - implied_price) > price_tolerance:
                continue  # Price doesn't match constraint, skip this order
        
        # Get opposite order from database
        opposite_order = db.query(Order).filter(Order.id == opposite_order_id).first()
        if not opposite_order or opposite_order.status != OrderStatus.PENDING:
            continue
        
        # Validate opposite order matches expected outcome and outcome_name
        if (opposite_order.outcome_name != order.outcome_name or 
            opposite_order.outcome != opposite_outcome or
            opposite_order.side != OrderSide.BUY):
            continue  # Skip if mismatch
        
        # Execute trade
        trade_quantity = min(remaining_quantity, opposite_quantity)
        
        # Trade price: use the price from the order's outcome perspective
        # If order is "Buy YES at implied_price", trade executes at implied_price
        # The opposite order is "Buy NO at opposite_price", where implied_price + opposite_price = 1
        trade_price = implied_price  # Use the price from the incoming order's perspective
        
        # Create trade record
        # In the new model: one user buys YES, the other buys NO (both are buyers)
        # For Trade model, we need buyer_id and seller_id, but conceptually:
        # - order.user_id is buying their outcome (YES or NO)
        # - opposite_order.user_id is buying the opposite outcome
        buyer_id = order.user_id  # Buying their outcome
        seller_id = opposite_order.user_id  # Buying opposite outcome (receives tokens conceptually)
        
        trade = Trade(
            market_id=order.market_id,
            buyer_id=buyer_id,
            seller_id=seller_id,
            outcome_name=order.outcome_name,
            outcome=order.outcome,  # The outcome being traded
            price=trade_price,
            quantity=trade_quantity
        )
        db.add(trade)
        trades.append(trade)
        
        # Update token balances
        # Order user pays: trade_price * quantity (for their outcome)
        # Opposite order user pays: (1 - trade_price) * quantity (for their outcome)
        # Both pay for their respective outcomes
        
        # Order user pays for their outcome
        # Round to avoid precision issues (database uses 2 decimal places)
        order_user_cost = Decimal(str(round(float(trade_price * trade_quantity), 2)))
        update_token_balance(db, buyer_id, -order_user_cost)
        
        # Opposite order user pays for their outcome (1 - price)
        opposite_price_actual = Decimal("1.0") - trade_price
        # Calculate opposite cost and ensure total equals exactly trade_quantity
        # This ensures cash conservation: p*q + (1-p)*q = q exactly
        opposite_user_cost = Decimal(str(round(float(trade_quantity), 2))) - order_user_cost
        # Ensure it's positive and rounded to 2 decimal places
        opposite_user_cost = Decimal(str(round(float(opposite_user_cost), 2)))
        update_token_balance(db, seller_id, -opposite_user_cost)
        
        # Update positions
        # Check if users have opposite positions that should be closed
        # Order user: check if they have opposite outcome position
        opposite_position = db.query(Position).filter(
            Position.user_id == buyer_id,
            Position.market_id == order.market_id,
            Position.outcome_name == order.outcome_name,
            Position.outcome == opposite_outcome
        ).first()
        
        if opposite_position and opposite_position.quantity > 0:
            # User has opposite position, reduce it (closing position)
            close_amount = min(trade_quantity, opposite_position.quantity)
            # Calculate cost per unit before modifying quantity
            cost_per_unit = opposite_position.total_cost / opposite_position.quantity
            opposite_position.quantity -= close_amount
            # Adjust cost basis proportionally
            opposite_position.total_cost -= close_amount * cost_per_unit
            if opposite_position.quantity <= 0:
                db.delete(opposite_position)
            else:
                # Update average price
                if opposite_position.quantity > 0:
                    opposite_position.average_price = opposite_position.total_cost / opposite_position.quantity
            
            # Always create/update position for the outcome being bought
            # Even if we fully closed the opposite position, we still bought this outcome
            update_position(db, buyer_id, order.market_id, order.outcome_name, order.outcome, trade_quantity, trade_price)
        else:
            # No opposite position, just add to same outcome
            update_position(db, buyer_id, order.market_id, order.outcome_name, order.outcome, trade_quantity, trade_price)
        
        # Opposite order user: check if they have opposite outcome position
        opposite_position_other = db.query(Position).filter(
            Position.user_id == seller_id,
            Position.market_id == order.market_id,
            Position.outcome_name == order.outcome_name,
            Position.outcome == order.outcome  # Opposite of their order's outcome
        ).first()
        
        if opposite_position_other and opposite_position_other.quantity > 0:
            # User has opposite position, reduce it (closing position)
            close_amount = min(trade_quantity, opposite_position_other.quantity)
            # Calculate cost per unit before modifying quantity
            cost_per_unit = opposite_position_other.total_cost / opposite_position_other.quantity
            opposite_position_other.quantity -= close_amount
            # Adjust cost basis proportionally
            opposite_position_other.total_cost -= close_amount * cost_per_unit
            if opposite_position_other.quantity <= 0:
                db.delete(opposite_position_other)
            else:
                # Update average price
                if opposite_position_other.quantity > 0:
                    opposite_position_other.average_price = opposite_position_other.total_cost / opposite_position_other.quantity
            remaining_to_add = trade_quantity - close_amount
            if remaining_to_add > 0:
                # Add remaining quantity to same outcome position
                update_position(db, seller_id, order.market_id, order.outcome_name, opposite_outcome, remaining_to_add, opposite_price_actual)
        else:
            # No opposite position, just add to same outcome
            update_position(db, seller_id, order.market_id, order.outcome_name, opposite_outcome, trade_quantity, opposite_price_actual)
        
        # Update order quantities
        order.filled_quantity += trade_quantity
        opposite_order.filled_quantity += trade_quantity
        
        # Update or remove opposite order
        if opposite_order.filled_quantity >= opposite_order.quantity:
            opposite_order.status = OrderStatus.FILLED
            remove_order_from_orderbook(order.market_id, order.outcome_name, opposite_outcome, "buy", opposite_order_id)
        else:
            new_quantity = opposite_order.quantity - opposite_order.filled_quantity
            update_order_in_orderbook(order.market_id, order.outcome_name, opposite_outcome, "buy", opposite_order_id, new_quantity)
        
        remaining_quantity -= trade_quantity
    
    # Update order status
    if order.filled_quantity >= order.quantity:
        order.status = OrderStatus.FILLED
        remove_order_from_orderbook(order.market_id, order.outcome_name, order.outcome, "buy", order.id)
    elif order.filled_quantity > 0:
        order.status = OrderStatus.PARTIALLY_FILLED
        new_quantity = order.quantity - order.filled_quantity
        update_order_in_orderbook(order.market_id, order.outcome_name, order.outcome, "buy", order.id, new_quantity)
    
    db.commit()
    
    # Note: WebSocket broadcasts are handled by the API layer
    # after trade execution to properly handle async context
    
    return trades


def place_order(db: Session, order: Order) -> List[Trade]:
    """
    Place an order and match it against existing orders.
    Returns list of executed trades.
    """
    # Validate market is active
    market = db.query(Market).filter(Market.id == order.market_id).first()
    if not market or market.status != MarketStatus.ACTIVE:
        raise ValueError("Market is not active")
    
    # Check if outcome is resolved (cannot trade on resolved outcomes)
    from ..models.market_outcome import MarketOutcome, OutcomeStatus
    market_outcome = db.query(MarketOutcome).filter(
        MarketOutcome.market_id == order.market_id,
        MarketOutcome.name == order.outcome_name
    ).first()
    
    if market_outcome and market_outcome.status == OutcomeStatus.RESOLVED:
        raise ValueError(f"Cannot trade on resolved outcome '{order.outcome_name}'. This outcome has already been resolved.")
    
    # For market orders, check if there are matching orders available
    # In buy-only model: match against opposite outcome
    if order.order_type.value == "market":
        opposite_outcome = "no" if order.outcome == "yes" else "yes"
        # Get best price for opposite outcome (all are "buy" orders now)
        best_opposite_price = get_best_price(order.market_id, order.outcome_name, opposite_outcome, "buy")
        if not best_opposite_price:
            raise ValueError("No matching orders available for market order")
        # Calculate implied price for this outcome: if opposite is at p, this is at (1-p)
        implied_price = Decimal("1.0") - best_opposite_price
        # Set price for balance check (will be used during matching)
        order.price = implied_price
    
    # Check sufficient balance for buy orders (after price is set for market orders)
    # In buy-only model, all orders are buy orders
    total_cost = order.price * order.quantity
    if not has_sufficient_balance(db, order.user_id, total_cost):
        raise ValueError("Insufficient token balance")
    
    # Add order to database
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Match the order first (market orders match immediately, limit orders may match partially)
    trades = match_order(db, order)
    
    # Add to orderbook only if limit order and not fully filled
    # All orders go to "buy" side of their outcome
    if order.order_type.value == "limit" and order.status == OrderStatus.PENDING:
        add_order_to_orderbook(
            order.market_id,
            order.outcome_name,
            order.outcome,
            "buy",  # All orders are "buy" in new model
            order.price,
            order.quantity - order.filled_quantity,  # Only add remaining quantity
            order.id
        )
    
    return trades
