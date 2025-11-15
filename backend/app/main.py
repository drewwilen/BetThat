from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine, Base
from .api.routes import auth, users, communities, markets, trading, portfolio, votes, messages
from .api.websocket import websocket_endpoint

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://delightful-meadow-074d6150f.3.azurestaticapps.net",
    ],  # React dev servers + Azure Static Web App
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(communities.router, prefix=f"{settings.API_V1_STR}/communities", tags=["communities"])
app.include_router(markets.router, prefix=f"{settings.API_V1_STR}/markets", tags=["markets"])
app.include_router(trading.router, prefix=f"{settings.API_V1_STR}/trading", tags=["trading"])
app.include_router(portfolio.router, prefix=f"{settings.API_V1_STR}/portfolio", tags=["portfolio"])
app.include_router(votes.router, prefix=f"{settings.API_V1_STR}", tags=["votes"])
app.include_router(messages.router, prefix=f"{settings.API_V1_STR}", tags=["messages"])

# WebSocket endpoint
@app.websocket("/ws/{market_id}")
async def websocket_route(websocket: WebSocket, market_id: int):
    # Get token from query parameters
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    await websocket_endpoint(websocket, market_id, token)


@app.get("/")
def root():
    return {"message": "BetThat API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
