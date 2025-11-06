# BetThat Documentation

## Table of Contents
1. [Overview](#overview)
2. [How Prediction Markets Work](#how-prediction-markets-work)
3. [Trading Model](#trading-model)
4. [User Guide](#user-guide)
5. [Technical Architecture](#technical-architecture)
6. [API Reference](#api-reference)
7. [Testing](#testing)

---

## Overview

BetThat is a prediction market platform where users can trade on the outcomes of events. Users buy contracts that pay $1 if their predicted outcome occurs, and $0 otherwise.

### Key Concepts

- **Market**: A question or event with multiple possible outcomes (e.g., "Will Team A win?")
- **Outcome**: A specific result within a market (e.g., "Team A", "Team B")
- **Contract**: A share that pays $1 if the outcome occurs, $0 otherwise
- **Price**: The probability (0-1) that an outcome will occur, determined by supply and demand
- **Position**: Your holdings in a specific outcome

---

## How Prediction Markets Work

### Basic Mechanics

1. **Market Creation**: An admin creates a market with a question and possible outcomes
2. **Trading**: Users buy contracts on outcomes they think will happen
3. **Price Discovery**: Prices reflect the market's collective probability assessment
4. **Resolution**: An admin resolves the market, determining which outcome occurred
5. **Payout**: Users holding winning contracts receive $1 per contract

### Example

Market: "Will it rain tomorrow?"
- YES contracts: Currently trading at 70% ($0.70)
- NO contracts: Currently trading at 30% ($0.30)

If you buy 10 YES contracts at $0.70:
- **Cost**: $7.00
- **If YES wins**: You get $10.00 (profit: $3.00)
- **If NO wins**: You get $0.00 (loss: $7.00)

---

## Trading Model

### Buy-Only Model

BetThat uses a **buy-only** trading model where:

1. **All orders are "buy" orders** - Users only buy YES or NO contracts
2. **No direct selling** - To "sell", you buy the opposite outcome
3. **Automatic position closing** - Buying the opposite outcome automatically reduces your existing position

### Price Constraint

The fundamental rule: **YES price + NO price = 1**

- If YES is trading at 60%, NO must be at 40%
- This ensures prices always sum to 100% probability
- When you buy YES, you match against someone buying NO (and vice versa)

### How Trades Execute

**Example: Buying YES**

1. You place a "Buy YES" order
2. The system matches you against someone who placed a "Buy NO" order
3. The trade executes at the agreed price
4. You pay: `quantity × YES_price`
5. They pay: `quantity × NO_price`
6. Total cash used: `quantity × (YES_price + NO_price) = quantity × 1 = quantity`

**Position Management:**

- If you have 100 YES contracts and buy 50 NO contracts:
  - Your YES position reduces to 50
  - Your NO position becomes 50
  - This is equivalent to "selling" 50 YES contracts

---

## User Guide

### Creating a Market

1. Navigate to a Community
2. Click "Create Market"
3. Enter:
   - Title (the question)
   - Description
   - Resolution deadline
   - Outcomes (e.g., "Team A", "Team B", "Team C")
4. Submit

### Placing Orders

#### Market Orders (Default)

- **What it is**: Execute immediately at the best available price
- **When to use**: When you want to trade right away
- **Requirements**: Someone must have placed an order on the opposite side
- **Example**: To buy YES, someone must have placed a NO order

**UI Display:**
- Shows estimated price prominently
- Indicates if market order is available
- Shows what you'll pay and what you'll get

#### Limit Orders

- **What it is**: Set a maximum price you're willing to pay
- **When to use**: When you want a specific price
- **How it works**: Order sits in the orderbook until matched

### Understanding Your Position

Your position shows:

- **You own**: X contracts of YES/NO
- **You paid**: $X.XX (total cost)
- **If YES wins**: +$X.XX (what you get)
- **If NO wins**: $0.00 (what you get)

### Portfolio View

The portfolio shows:

- All your positions across all markets
- Current value (mark-to-market)
- Profit/loss
- Payout if right
- Filtering and sorting options

---

## Technical Architecture

### Backend (Python/FastAPI)

**Core Components:**

1. **Trading Engine** (`app/services/trading.py`)
   - Order matching logic
   - Trade execution
   - Position updates

2. **Orderbook** (`app/services/orderbook.py`)
   - Redis-based orderbook storage
   - Price discovery
   - Best price calculation

3. **Position Management** (`app/services/positions.py`)
   - Position tracking
   - Value calculation
   - Payout distribution

4. **Token Management** (`app/services/token.py`)
   - User balance tracking
   - Cash conservation enforcement

**Database Schema:**

- `markets`: Market information
- `market_outcomes`: Individual outcomes within markets
- `orders`: Pending and filled orders
- `trades`: Executed trades
- `positions`: User holdings
- `users`: User accounts and balances

**Key Models:**

```python
# Market has multiple outcomes
Market
  - outcomes: JSON list of outcome names
  - market_outcomes: Relationship to MarketOutcome table

# Each outcome can be traded independently
MarketOutcome
  - name: "Team A", "Team B", etc.
  - status: ACTIVE or RESOLVED
  - resolution_outcome: YES or NO (when resolved)

# Orders are always "buy" orders
Order
  - side: Always "buy"
  - outcome: "yes" or "no"
  - outcome_name: Which outcome (e.g., "Team A")
  - price: 0-1
  - quantity: Number of contracts

# Positions track user holdings
Position
  - outcome_name: Which outcome
  - outcome: "yes" or "no"
  - quantity: Number of contracts (always positive)
  - average_price: Weighted average price paid
  - total_cost: Total amount invested
```

### Frontend (React/TypeScript)

**Key Components:**

1. **OrderForm**: Place orders with $/contracts toggle
2. **Orderbook**: Real-time orderbook display (YES/NO side-by-side)
3. **TradeHistory**: User's trade history
4. **Portfolio**: Position overview and management

**State Management:**

- Zustand for auth state
- React hooks for component state
- WebSocket for real-time updates

### Real-Time Updates

**WebSocket Flow:**

1. User connects to `/ws/{market_id}?token={jwt}`
2. Receives initial orderbook state
3. Receives updates when:
   - Orders are placed
   - Orders are filled
   - Orders are cancelled
4. Frontend updates UI in real-time

**Orderbook Updates:**

- When a trade executes, both YES and NO orderbooks update
- Updates broadcast to all connected clients
- Ensures consistent view across users

---

## API Reference

### Authentication

All endpoints require JWT authentication via `Authorization: Bearer {token}` header.

### Markets

**List Markets**
```
GET /api/v1/markets/
```

**Get Market**
```
GET /api/v1/markets/{market_id}
```

**Create Market**
```
POST /api/v1/markets/
Body: {
  "title": "Will it rain?",
  "description": "...",
  "outcomes": ["yes", "no"],
  "resolution_deadline": "2024-12-31T00:00:00Z",
  "community_id": 1
}
```

**Resolve Outcome**
```
POST /api/v1/markets/{market_id}/outcomes/{outcome_name}/resolve
Body: {
  "outcome": "yes" | "no"
}
```

### Trading

**Place Order**
```
POST /api/v1/trading/orders
Body: {
  "market_id": 1,
  "outcome_name": "default",
  "outcome": "yes" | "no",
  "side": "buy",  // Always "buy"
  "quantity": 10.0,
  "price": 0.65,  // Required for limit orders
  "order_type": "market" | "limit"
}
```

**Get Orderbook**
```
GET /api/v1/trading/markets/{market_id}/orderbook?outcome_name=default&outcome=yes
```

**Cancel Order**
```
POST /api/v1/trading/orders/{order_id}/cancel
```

**Get Trade History**
```
GET /api/v1/trading/markets/{market_id}/my-trades?outcome_name=default
```

### Portfolio

**Get Positions**
```
GET /api/v1/portfolio/positions
GET /api/v1/portfolio/positions/{market_id}  // For specific market
```

**Get Portfolio Summary**
```
GET /api/v1/portfolio/summary
```

---

## Trading Logic Deep Dive

### Order Matching

**Matching Rules:**

1. YES orders match against NO orders
2. Price constraint: `YES_price + NO_price = 1`
3. Trade executes at the order's specified price
4. Both users pay for their respective outcomes

**Example Match:**

- User A: Buy 100 YES @ $0.60
- User B: Buy 100 NO @ $0.40 (in orderbook)

Match executes:
- User A pays: $60.00 (gets 100 YES)
- User B pays: $40.00 (gets 100 NO)
- Total cash: $100.00 ✓ (conserved)

### Position Updates

**When Buying:**

1. Check if user has opposite position
2. If yes, reduce opposite position first
3. Then add to same outcome position
4. Update average price (weighted average)

**Example:**

User has 100 YES @ $0.50, buys 50 NO @ $0.40:
- YES position: 100 - 50 = 50 contracts
- NO position: 0 + 50 = 50 contracts
- Average prices recalculated

### Cash Conservation

**Critical Rule:** Total cash in system must be conserved

- When trade executes: `cash_used = quantity × 1.0`
- Both users pay: `user1_pays + user2_pays = quantity`
- Rounded to 2 decimal places to match database precision

**Implementation:**

```python
order_user_cost = round(quantity * price, 2)
opposite_user_cost = round(quantity, 2) - order_user_cost
# Ensures: order_user_cost + opposite_user_cost = quantity exactly
```

### Market Resolution

**Process:**

1. Admin resolves specific outcome (e.g., "Team A" as YES)
2. System finds all positions for that outcome
3. Distributes payouts:
   - YES holders: `quantity × $1.00`
   - NO holders: `$0.00`
4. Updates user token balances
5. Marks outcome as RESOLVED

**Multiple Outcomes:**

- Each outcome resolves independently
- "Team A" can be YES while "Team B" is still ACTIVE
- Users can have positions in multiple outcomes

---

## Testing

### Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Test Coverage

Tests verify:

1. **Cash Conservation**: Trades don't create/destroy money
2. **Price Constraint**: YES + NO = 1
3. **Position Closing**: Buying opposite reduces existing position

### Test Database

Tests use a separate `betthat_test` database:
- Created automatically by test fixtures
- Cleaned up after each test
- Can be created manually: `docker compose exec postgres psql -U postgres -c "CREATE DATABASE betthat_test;"`

---

## Common Questions

### Why can't I sell directly?

The buy-only model simplifies the system:
- No need to track "short" positions separately
- Buying opposite automatically closes positions
- Ensures all positions are fully collateralized

### How are prices determined?

Prices come from the orderbook:
- Best available price from opposite side
- Market orders use implied price: `1 - opposite_price`
- Limit orders use your specified price

### What happens if no one wants to trade?

- Market orders won't execute (you'll see a warning)
- Limit orders sit in the orderbook
- Prices reflect supply/demand

### Can I have both YES and NO positions?

Yes, but they offset each other:
- If you have 100 YES and 50 NO, net position is 50 YES
- Buying more NO reduces your YES position
- You can't have both increase simultaneously

### How is profit calculated?

**For Active Positions:**
- Current value = `quantity × market_price`
- Profit = `current_value - total_cost`

**For Resolved Positions:**
- If you win: `payout = quantity × $1.00`
- If you lose: `payout = $0.00`
- Profit = `payout - total_cost`

---

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 16+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start services
docker compose up -d

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Backend (`.env`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/betthat
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
SECRET_KEY=your-secret-key
```

---

## Architecture Decisions

### Why Buy-Only Model?

1. **Simplicity**: No need to track short positions
2. **Safety**: All positions are fully collateralized
3. **Intuitive**: Users think "I'm buying YES" not "I'm selling NO"

### Why Redis for Orderbook?

1. **Speed**: In-memory operations are fast
2. **Sorted Sets**: Perfect for price-time priority
3. **Real-time**: Easy to broadcast updates

### Why Separate MarketOutcome Table?

1. **Flexibility**: Multiple outcomes per market
2. **Independent Resolution**: Each outcome resolves separately
3. **Scalability**: Easy to add outcome-specific features

---

## Future Enhancements

Potential improvements:

1. **Graphs**: Trading history charts (1h, 1d, 1w)
2. **Images**: Market and outcome images
3. **Notifications**: Email/WebSocket notifications
4. **Mobile App**: React Native mobile app
5. **Advanced Orders**: Stop-loss, take-profit
6. **Market Making**: Automated liquidity provision

---

## Support

For issues or questions:
- Check the codebase comments
- Review test files for usage examples
- Examine API endpoints for request/response formats

---

**Last Updated**: 2024

