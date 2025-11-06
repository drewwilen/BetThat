from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List, Set
import json
from decimal import Decimal
from ..services.orderbook import get_orderbook
from ..models.user import User
from ..core.security import decode_access_token
from sqlalchemy.orm import Session
from ..core.database import SessionLocal


class ConnectionManager:
    def __init__(self):
        # Map of market_id -> set of websocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Map of websocket -> user_id
        self.websocket_users: Dict[WebSocket, int] = {}
    
    async def connect(self, websocket: WebSocket, market_id: int, user_id: int):
        # Connection already accepted in websocket_endpoint
        if market_id not in self.active_connections:
            self.active_connections[market_id] = set()
        self.active_connections[market_id].add(websocket)
        self.websocket_users[websocket] = user_id
    
    def disconnect(self, websocket: WebSocket, market_id: int):
        if market_id in self.active_connections:
            self.active_connections[market_id].discard(websocket)
        if websocket in self.websocket_users:
            del self.websocket_users[websocket]
    
    async def broadcast_orderbook_update(self, market_id: int, outcome_name: str, outcome: str):
        """Broadcast orderbook update to all connected clients"""
        if market_id not in self.active_connections:
            return
        
        from ..core.database import SessionLocal
        
        # Get orderbook with user info (need db session for user lookups)
        db = SessionLocal()
        try:
            orderbook_data = get_orderbook(market_id, outcome_name, outcome, db=db)
            
            # Format entries for WebSocket (orderbook_data already has dicts with price, quantity, order_id, user_id)
            message = {
                "type": "orderbook_update",
                "market_id": market_id,
                "outcome_name": outcome_name,
                "outcome": outcome,
                "buys": [
                    {
                        "price": float(entry["price"]),
                        "quantity": float(entry["quantity"]),
                        "order_id": entry.get("order_id"),
                        "user_id": entry.get("user_id")
                    }
                    for entry in orderbook_data["buys"]
                ],
                "sells": [
                    {
                        "price": float(entry["price"]),
                        "quantity": float(entry["quantity"]),
                        "order_id": entry.get("order_id"),
                        "user_id": entry.get("user_id")
                    }
                    for entry in orderbook_data["sells"]
                ]
            }
        finally:
            db.close()
        
        disconnected = []
        for connection in self.active_connections[market_id]:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, market_id)
    
    async def broadcast_trade(self, market_id: int, trade_data: dict):
        """Broadcast trade execution to all connected clients"""
        if market_id not in self.active_connections:
            return
        
        message = {
            "type": "trade",
            "market_id": market_id,
            **trade_data
        }
        
        disconnected = []
        for connection in self.active_connections[market_id]:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn, market_id)


manager = ConnectionManager()


async def get_user_from_token(token: str):
    """Get user from JWT token"""
    payload = decode_access_token(token)
    if not payload:
        return None
    
    db = SessionLocal()
    try:
        email = payload.get("sub")
        if not email:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user
    except Exception as e:
        print(f"Error getting user from token: {e}")
        return None
    finally:
        db.close()


async def websocket_endpoint(websocket: WebSocket, market_id: int, token: str):
    """WebSocket endpoint for real-time orderbook updates"""
    # Accept the connection first
    await websocket.accept()
    
    # Validate token and get user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    
    await manager.connect(websocket, market_id, user.id)
    
    try:
        # Send initial orderbook state (for legacy markets, use "default" outcome_name)
        db = SessionLocal()
        try:
            for outcome in ["yes", "no"]:
                try:
                    orderbook_data = get_orderbook(market_id, "default", outcome, db=db)
                    message = {
                        "type": "orderbook_update",
                        "market_id": market_id,
                        "outcome_name": "default",
                        "outcome": outcome,
                        "buys": [
                            {
                                "price": float(entry["price"]),
                                "quantity": float(entry["quantity"]),
                                "order_id": entry.get("order_id"),
                                "user_id": entry.get("user_id")
                            }
                            for entry in orderbook_data.get("buys", [])
                        ],
                        "sells": [
                            {
                                "price": float(entry["price"]),
                                "quantity": float(entry["quantity"]),
                                "order_id": entry.get("order_id"),
                                "user_id": entry.get("user_id")
                            }
                            for entry in orderbook_data.get("sells", [])
                        ]
                    }
                    await websocket.send_json(message)
                except Exception as e:
                    # Log error but continue with other outcomes
                    print(f"Error sending orderbook for {outcome}: {e}")
                    import traceback
                    traceback.print_exc()
        finally:
            db.close()
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong or other messages if needed
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, market_id)
    except Exception as e:
        # Log any other errors before closing
        print(f"WebSocket error for market {market_id}: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket, market_id)

