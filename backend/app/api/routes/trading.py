from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from ...core.database import get_db
from ...api.dependencies import get_current_user
from ...models.user import User
from ...models.order import Order, OrderSide, OrderType, OrderStatus
from ...models.market import Market, MarketStatus
from ...models.trade import Trade
from ...schemas.order import OrderCreate, OrderResponse, OrderBookResponse, OrderBookEntry
from ...schemas.trade import TradeResponse
from ...services.trading import place_order
from ...services.orderbook import get_orderbook, get_best_price
from ...api.websocket import manager

router = APIRouter()


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate market exists and is active
    market = db.query(Market).filter(Market.id == order_data.market_id).first()
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
    
    # Validate outcome_name - default to "default" for legacy markets
    outcome_name = getattr(order_data, 'outcome_name', 'default') or 'default'
    
    # Validate outcome
    if order_data.outcome not in ["yes", "no"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outcome must be 'yes' or 'no'"
        )
    
    # Check if outcome is resolved (cannot trade on resolved outcomes)
    from ...models.market_outcome import MarketOutcome, OutcomeStatus
    market_outcome = db.query(MarketOutcome).filter(
        MarketOutcome.market_id == order_data.market_id,
        MarketOutcome.name == outcome_name
    ).first()
    
    if market_outcome and market_outcome.status == OutcomeStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot trade on resolved outcome '{outcome_name}'. This outcome has already been resolved."
        )
    
    # Default side to "buy" if not provided (new buy-only model)
    side = getattr(order_data, 'side', 'buy') or 'buy'
    if side != "buy":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Only "buy" orders are allowed. To sell, buy the opposite outcome (e.g., buy NO to sell YES).'
        )
    
    # Validate order type
    if order_data.order_type not in ["limit", "market"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order type must be 'limit' or 'market'"
        )
    
    # For market orders, get best price first (price will be set later)
    # For limit orders, validate price
    if order_data.order_type == "limit":
        if not order_data.price or order_data.price <= 0 or order_data.price > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price must be between 0 and 1 (exclusive of 0)"
            )
        price = order_data.price
    else:
        # Market order - price will be determined from orderbook
        price = Decimal(0)  # Temporary, will be set in place_order
    
    # Create order (always BUY in new model)
    order = Order(
        market_id=order_data.market_id,
        user_id=current_user.id,
        side=OrderSide.BUY,  # Always BUY in buy-only model
        outcome_name=outcome_name,
        outcome=order_data.outcome,
        price=price,
        quantity=order_data.quantity,
        order_type=OrderType(order_data.order_type)
    )
    
    try:
        trades = place_order(db, order)
        db.refresh(order)
        
        # Broadcast orderbook updates via WebSocket (wrap in try-except to not fail the request)
        try:
            if trades:
                # When a trade happens, update both YES and NO orderbooks (since they match against each other)
                await manager.broadcast_orderbook_update(order.market_id, order.outcome_name, order.outcome)
                # Also update the opposite outcome's orderbook
                opposite_outcome = "no" if order.outcome == "yes" else "yes"
                await manager.broadcast_orderbook_update(order.market_id, order.outcome_name, opposite_outcome)
                
                for trade in trades:
                    trade_data = {
                        "outcome_name": trade.outcome_name,
                        "outcome": trade.outcome,
                        "price": float(trade.price),
                        "quantity": float(trade.quantity),
                        "executed_at": trade.executed_at.isoformat(),
                    }
                    await manager.broadcast_trade(order.market_id, trade_data)
            else:
                # Even if no trades, broadcast orderbook update for new order
                await manager.broadcast_orderbook_update(order.market_id, order.outcome_name, order.outcome)
        except Exception as ws_error:
            # Log WebSocket errors but don't fail the request
            print(f"WebSocket broadcast error: {ws_error}")
        
        return order
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unexpected error in create_order: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    return order


@router.get("/orders", response_model=List[OrderResponse])
def get_user_orders(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this order"
        )
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled"
        )
    
    # Remove from orderbook
    from ...services.orderbook import remove_order_from_orderbook
    remove_order_from_orderbook(order.market_id, order.outcome_name, order.outcome, order.side.value, order.id)
    
    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    
    # Broadcast orderbook update
    await manager.broadcast_orderbook_update(order.market_id, order.outcome_name, order.outcome)
    
    return order


@router.get("/markets/{market_id}/orderbook", response_model=OrderBookResponse)
def get_market_orderbook(
    market_id: int,
    outcome_name: str = Query("default", description="Outcome name (e.g., 'Team A', 'default')"),  # Default for legacy markets
    outcome: str = Query("yes", description="Outcome side: 'yes' or 'no'"),  # "yes" or "no"
    db: Session = Depends(get_db)
):
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found"
        )
    
    if outcome not in ["yes", "no"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outcome must be 'yes' or 'no'"
        )
    
    orderbook_data = get_orderbook(market_id, outcome_name, outcome, db=db)
    
    buys = [OrderBookEntry(
        price=entry["price"],
        quantity=entry["quantity"],
        order_id=entry["order_id"],
        user_id=entry["user_id"]
    ) for entry in orderbook_data["buys"]]
    sells = [OrderBookEntry(
        price=entry["price"],
        quantity=entry["quantity"],
        order_id=entry["order_id"],
        user_id=entry["user_id"]
    ) for entry in orderbook_data["sells"]]
    
    return OrderBookResponse(
        market_id=market_id,
        outcome_name=outcome_name,
        outcome=outcome,
        buys=buys,
        sells=sells
    )


@router.get("/markets/{market_id}/trades", response_model=List[TradeResponse])
def get_market_trades(
    market_id: int,
    outcome: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Trade).filter(Trade.market_id == market_id)
    if outcome:
        query = query.filter(Trade.outcome == outcome)
    
    trades = query.order_by(Trade.executed_at.desc()).offset(skip).limit(limit).all()
    return trades


@router.get("/markets/{market_id}/my-trades", response_model=List[dict])
def get_my_market_trades(
    market_id: int,
    outcome: str = None,
    outcome_name: str = Query(None, description="Filter by outcome name (e.g., 'Team A', 'default')"),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get trades for current user with side and profit information"""
    query = db.query(Trade).filter(
        Trade.market_id == market_id,
        ((Trade.buyer_id == current_user.id) | (Trade.seller_id == current_user.id))
    )
    if outcome:
        query = query.filter(Trade.outcome == outcome)
    if outcome_name:
        query = query.filter(Trade.outcome_name == outcome_name)
    
    trades = query.order_by(Trade.executed_at.desc()).offset(skip).limit(limit).all()
    market = db.query(Market).filter(Market.id == market_id).first()
    
    result = []
    for trade in trades:
        # In buy-only model: both users are buying
        # buyer_id bought the trade.outcome (YES or NO)
        # seller_id bought the opposite outcome
        is_buyer = trade.buyer_id == current_user.id
        if is_buyer:
            # User bought the trade.outcome
            user_outcome = trade.outcome  # YES or NO
            side = "buy"
            user_price = float(trade.price)
        else:
            # User bought the opposite outcome
            user_outcome = "no" if trade.outcome == "yes" else "yes"
            side = "buy"  # Always "buy" in new model
            # Calculate the price they paid (1 - trade price)
            user_price = 1.0 - float(trade.price)
        
        price = float(trade.price)
        quantity = float(trade.quantity)
        
        # Calculate profit/payout based on user's actual outcome
        profit = None
        payout = None
        
        # Check if this specific outcome is resolved (new model)
        from ...models.market_outcome import MarketOutcome, OutcomeStatus
        market_outcome = db.query(MarketOutcome).filter(
            MarketOutcome.market_id == market_id,
            MarketOutcome.name == trade.outcome_name
        ).first()
        
        is_resolved = False
        resolution_outcome = None
        
        if market_outcome and market_outcome.status == OutcomeStatus.RESOLVED:
            is_resolved = True
            resolution_outcome = market_outcome.resolution_outcome.value if hasattr(market_outcome.resolution_outcome, 'value') else market_outcome.resolution_outcome
        elif market and market.status == MarketStatus.RESOLVED:
            # Legacy: entire market resolved
            is_resolved = True
            resolution_outcome = market.resolution_outcome
        
        if is_resolved and resolution_outcome:
            # Outcome resolved - calculate actual payout
            if resolution_outcome == user_outcome:
                # User's outcome won
                payout = quantity * 1.0  # Full payout
                profit = payout - (user_price * quantity)
            else:
                # User's outcome lost
                payout = 0
                profit = -(user_price * quantity)  # Lost everything
        
        result.append({
            "id": trade.id,
            "market_id": trade.market_id,
            "side": side,  # Always "buy" in new model
            "outcome": user_outcome,  # The outcome the user actually bought (YES or NO)
            "price": user_price,  # The price the user actually paid
            "quantity": trade.quantity,
            "executed_at": trade.executed_at.isoformat(),
            "profit": profit,
            "payout": payout,
            "market_resolved": is_resolved,
            "resolution_outcome": resolution_outcome
        })
    
    return result

