import redis
import json
from decimal import Decimal
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from ..core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)


def get_orderbook_key(market_id: int, outcome_name: str, outcome: str, side: str) -> str:
    """Generate Redis key for orderbook
    outcome_name: e.g., "Team A", "Team B", or "default" for legacy
    outcome: "yes" or "no" - the side on the outcome_name
    side: "buy" or "sell"
    """
    return f"orderbook:{market_id}:{outcome_name}:{outcome}:{side}"


def add_order_to_orderbook(market_id: int, outcome_name: str, outcome: str, side: str, price: Decimal, quantity: Decimal, order_id: int):
    """Add order to orderbook in Redis"""
    key = get_orderbook_key(market_id, outcome_name, outcome, side)
    # Use sorted set: score is price, value is order_id:quantity
    # For buy orders: use negative price for descending order (highest first)
    # For sell orders: use positive price for ascending order (lowest first)
    if side == "buy":
        score = float(price) * -1  # Negative for descending
    else:
        score = float(price)
    
    value = f"{order_id}:{quantity}"
    redis_client.zadd(key, {value: score})


def remove_order_from_orderbook(market_id: int, outcome_name: str, outcome: str, side: str, order_id: int):
    """Remove order from orderbook"""
    key = get_orderbook_key(market_id, outcome_name, outcome, side)
    # Find and remove the order
    orders = redis_client.zrange(key, 0, -1)
    for order in orders:
        if order.startswith(f"{order_id}:"):
            redis_client.zrem(key, order)
            break


def update_order_in_orderbook(market_id: int, outcome_name: str, outcome: str, side: str, order_id: int, new_quantity: Decimal):
    """Update order quantity in orderbook"""
    key = get_orderbook_key(market_id, outcome_name, outcome, side)
    # Find the order and get its score (price) before removing
    orders_with_scores = redis_client.zrange(key, 0, -1, withscores=True)
    for order_str, score in orders_with_scores:
        if order_str.startswith(f"{order_id}:"):
            # Get the price from the score
            redis_client.zrem(key, order_str)
            # Re-add with new quantity but same price (score)
            value = f"{order_id}:{new_quantity}"
            redis_client.zadd(key, {value: score})
            break


def get_orderbook(market_id: int, outcome_name: str, outcome: str, limit: int = 20, db: Session = None) -> Dict:
    """Get orderbook for a market outcome with order and user information"""
    from ..models.order import Order
    
    buy_key = get_orderbook_key(market_id, outcome_name, outcome, "buy")
    sell_key = get_orderbook_key(market_id, outcome_name, outcome, "sell")
    
    # Get buy orders (highest price first - already negative in score)
    buy_orders = redis_client.zrange(buy_key, 0, limit - 1, withscores=True)
    # Get sell orders (lowest price first)
    sell_orders = redis_client.zrange(sell_key, 0, limit - 1, withscores=True)
    
    def parse_orders(orders, side):
        result = []
        for order_str, score in orders:
            # Split by colon - format is "order_id:quantity"
            parts = order_str.split(":")
            if len(parts) != 2:
                continue  # Skip invalid entries
            order_id_str, quantity_str = parts
            try:
                order_id = int(order_id_str)
                quantity = Decimal(quantity_str)
            except (ValueError, TypeError):
                continue  # Skip invalid entries
            
            if side == "buy":
                price = Decimal(abs(score))  # Convert back from negative
            else:
                price = Decimal(score)
            
            # Get user_id from database if db session provided
            user_id = None
            if db:
                order = db.query(Order).filter(Order.id == order_id).first()
                if order:
                    user_id = order.user_id
            
            result.append({
                "price": price,
                "quantity": quantity,
                "order_id": order_id,
                "user_id": user_id
            })
        return result
    
    buys = parse_orders(buy_orders, "buy")
    sells = parse_orders(sell_orders, "sell")
    
    return {"buys": buys, "sells": sells}


def get_best_price(market_id: int, outcome_name: str, outcome: str, side: str) -> Decimal:
    """Get best available price for a side"""
    key = get_orderbook_key(market_id, outcome_name, outcome, side)
    if side == "buy":
        # Highest buy price (first in sorted set with negative scores)
        orders = redis_client.zrange(key, 0, 0, withscores=True)
    else:
        # Lowest sell price (first in sorted set)
        orders = redis_client.zrange(key, 0, 0, withscores=True)
    
    if not orders:
        return None
    
    _, score = orders[0]
    if side == "buy":
        return Decimal(abs(score))
    else:
        return Decimal(score)

