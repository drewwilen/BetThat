# BetThat - Developer Guide

## Architecture Overview

### System Components

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI    │────▶│ PostgreSQL  │
│  Frontend   │     │   Backend    │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
     │                    │
     │                    │
     └────────────────────┼─────────────┐
                          │             │
                    ┌─────▼─────┐  ┌───▼────┐
                    │   Redis   │  │WebSocket│
                    │ Orderbook │  │ Updates │
                    └───────────┘  └─────────┘
```

### Data Flow

**Trading Flow:**
1. User places order → Frontend → API
2. Backend validates → Checks balance → Matches order
3. Trade executes → Updates positions → Updates balances
4. WebSocket broadcasts → All clients update

**Orderbook Flow:**
1. Order placed → Added to Redis sorted set
2. Order matched → Removed/updated in Redis
3. WebSocket broadcast → Frontend updates UI

### Key Design Decisions

#### Buy-Only Model

**Why?**
- Simplifies position tracking (no shorts)
- Ensures full collateralization
- More intuitive for users

**How it works:**
- All orders are "buy" orders
- To "sell", buy the opposite outcome
- System automatically closes positions

#### Price Constraint

**Rule:** `YES_price + NO_price = 1`

**Enforcement:**
- Matching only occurs when prices satisfy constraint
- Market orders use implied price: `1 - opposite_price`
- Ensures probabilities sum to 100%

#### Cash Conservation

**Critical:** Total cash must be conserved

**Implementation:**
```python
# When trade executes:
user1_pays = round(quantity * price1, 2)
user2_pays = round(quantity * price2, 2)
assert user1_pays + user2_pays == quantity  # Always true
```

### Database Schema

**Core Tables:**

```sql
markets
  - id, title, description
  - outcomes: JSON array of outcome names
  - status: active/resolved/closed

market_outcomes
  - market_id, name (e.g., "Team A")
  - status: active/resolved
  - resolution_outcome: yes/no (when resolved)

orders
  - market_id, user_id
  - outcome_name, outcome (yes/no)
  - side: always "buy"
  - price, quantity
  - status: pending/filled/cancelled

trades
  - market_id, buyer_id, seller_id
  - outcome_name, outcome
  - price, quantity
  - executed_at

positions
  - user_id, market_id
  - outcome_name, outcome
  - quantity (always positive)
  - average_price, total_cost

users
  - id, email, username
  - token_balance (available cash)
```

### Service Layer

**trading.py** - Core trading logic
- `match_order()`: Matches orders against orderbook
- `place_order()`: Validates and executes orders
- Handles position updates and cash transfers

**orderbook.py** - Orderbook management
- Redis sorted sets for price-time priority
- Keys: `orderbook:{market_id}:{outcome_name}:{outcome}:{side}`
- Scores: Negative price (for descending order)

**positions.py** - Position tracking
- `update_position()`: Updates user holdings
- `calculate_position_value()`: Mark-to-market valuation
- Handles position closing when buying opposite

**token.py** - Balance management
- `update_token_balance()`: Updates user cash
- Rounds to 2 decimal places (database precision)
- Ensures cash conservation

### Frontend Architecture

**Component Structure:**

```
App
├── Layout
│   ├── Navigation
│   └── User Info
├── Routes
│   ├── Home
│   ├── Markets
│   ├── MarketDetail
│   │   ├── Orderbook (YES/NO side-by-side)
│   │   ├── OrderForm
│   │   └── TradeHistory
│   ├── Communities
│   ├── CommunityDetail
│   └── Portfolio
└── Services
    ├── api.ts (Axios instance)
    └── websocket.ts (WebSocket client)
```

**State Management:**

- **Auth**: Zustand store (`authStore.ts`)
- **Component State**: React hooks
- **Real-time**: WebSocket subscriptions

**Key Patterns:**

1. **WebSocket Connection**: One per market page
2. **Orderbook Updates**: Both YES/NO update simultaneously
3. **Position Display**: Shows dollars, not percentages
4. **Market Orders**: Default, with clear availability indicators

### Error Handling

**Backend:**
- Validation errors return 400 with details
- Database errors return 500 with logs
- WebSocket errors logged but don't fail requests

**Frontend:**
- API errors shown in UI
- WebSocket errors handled gracefully
- Automatic reconnection on disconnect

### Security

**Authentication:**
- JWT tokens in localStorage
- Tokens in Authorization header
- WebSocket tokens in query params

**Validation:**
- Pydantic schemas for request validation
- SQLAlchemy constraints for data integrity
- Balance checks before trades

### Performance Considerations

**Orderbook:**
- Redis for fast lookups
- Sorted sets for price-time priority
- Minimal database queries

**WebSocket:**
- Broadcast only to relevant clients
- Efficient message serialization
- Connection pooling

**Database:**
- Indexed foreign keys
- Efficient queries with joins
- Connection pooling

### Testing Strategy

**Unit Tests:**
- Trading logic (cash conservation, price constraints)
- Position updates
- Order matching

**Integration Tests:**
- API endpoints
- Database operations
- WebSocket updates

**Test Database:**
- Separate `betthat_test` database
- Created/destroyed per test
- Ensures isolation

### Deployment Considerations

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `SECRET_KEY`: JWT signing key

**Scaling:**
- Stateless backend (horizontal scaling)
- Redis for shared orderbook state
- WebSocket connection management per instance

**Monitoring:**
- Log trading activity
- Track orderbook depth
- Monitor cash conservation

---

## Common Issues & Solutions

### Issue: Money Disappearing

**Cause:** Rounding errors in cash calculations

**Solution:** 
- Round to 2 decimal places consistently
- Use `round(quantity, 2) - order_cost` for opposite cost
- Ensures exact cash conservation

### Issue: Orderbook Not Updating

**Cause:** WebSocket connection issues

**Solution:**
- Check WebSocket connection status
- Verify token is valid
- Ensure backend is broadcasting updates

### Issue: Market Orders Failing

**Cause:** No matching orders on opposite side

**Solution:**
- UI shows warning when unavailable
- Use limit order instead
- Wait for opposite side order

### Issue: Position Not Closing

**Cause:** Bug in position update logic

**Solution:**
- Always create position for outcome being bought
- Even when fully closing opposite position
- See `trading.py` line 168

---

## Contributing

When adding features:

1. **Update Tests**: Add tests for new logic
2. **Update Docs**: Document new features
3. **Follow Patterns**: Match existing code style
4. **Cash Conservation**: Always verify in tests
5. **Price Constraint**: Enforce YES + NO = 1

---

For more details, see [DOCUMENTATION.md](./DOCUMENTATION.md)

