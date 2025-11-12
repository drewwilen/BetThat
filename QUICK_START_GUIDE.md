# BetThat 2.0 - Quick Start Implementation Guide

## Critical Implementation Patterns

### 1. Buy-Only Trading Model (Core Pattern)

```python
# When user places order:
# - User always "buys" YES or NO
# - System matches against opposite outcome's buy orders
# - Price constraint: p_yes + p_no = 1.0
# - Position logic:
#   1. If user has opposite position → close it first
#   2. Then create/update position for bought outcome
#   3. Update token balance (deduct cost)

# Example: User buys 10 YES at 0.65
# - Matches against someone buying 10 NO at 0.35
# - User pays: 10 * 0.65 = 6.50 tokens
# - Other user pays: 10 * 0.35 = 3.50 tokens
# - Total: 10.00 tokens (conserved)
```

### 2. Orderbook Display Pattern

```typescript
// YES Orderbook:
// - Bids: Buy YES orders (sorted descending)
// - Asks: Inverted NO buy orders (1 - NO_price, sorted descending)

// NO Orderbook:
// - Bids: Buy NO orders (sorted descending)  
// - Asks: Inverted YES buy orders (1 - YES_price, sorted descending)

// Last Traded Price:
// - If YES traded at p, show YES: p%, NO: (1-p)%
// - Always sum to 100%
```

### 3. Position Display Pattern

```typescript
// Always show:
// 1. "You own: X [OUTCOME] contracts"
// 2. "You paid: $Y"
// 3. "If [OUTCOME] wins: +$Z"
// 4. "If [OPPOSITE] wins: $0.00"

// Visual indicators:
// - Green for YES positions
// - Red for NO positions
// - Gray buttons when you own that position
// - "SELL" text when selecting opposite outcome
```

### 4. Feed Algorithm

```python
# Trending Score Calculation:
trending_score = (
    (upvotes - downvotes) * 2 +  # Vote weight
    recent_trades_count * 1.5 +   # Trading activity
    time_decay_factor             # Recency bonus
)

# Sort Options:
# - Newest: created_at DESC
# - Most Upvoted: (upvotes - downvotes) DESC
# - Trending: trending_score DESC
# - Ending Soon: resolution_deadline ASC
```

### 5. Token Distribution Pattern

```python
# Community Token Flow:
# 1. Admin creates market
# 2. Admin allocates tokens to participants
# 3. Market uses community token (not global)
# 4. Trading happens in community tokens
# 5. Leaderboards track community token balances

# Distribution API:
POST /tokens/distribute
{
    "community_id": 1,
    "user_id": 123,
    "amount": 1000,
    "reason": "Market participation"
}
```

### 6. Leaderboard Calculation

```python
# Metrics to Track:
leaderboard_metrics = {
    "total_trades": Count of all trades,
    "total_profit": Sum of (resolved_position_payout - cost),
    "win_rate": (Winning positions / Total resolved positions) * 100,
    "karma": (
        successful_trades * 10 +
        market_creations * 50 +
        received_upvotes * 5 -
        received_downvotes * 2
    )
}

# Period Filtering:
# - All-time: No date filter
# - Weekly: WHERE created_at >= NOW() - INTERVAL '7 days'
# - Monthly: WHERE created_at >= NOW() - INTERVAL '30 days'
```

### 7. Real-Time Updates Pattern

```typescript
// WebSocket Events:
{
    "type": "orderbook_update",
    "market_id": 1,
    "outcome_name": "default",
    "outcome": "yes",
    "buys": [...],
    "sells": [...]
}

{
    "type": "trade",
    "market_id": 1,
    "outcome_name": "default",
    "outcome": "yes",
    "price": 0.65,
    "quantity": 10,
    "executed_at": "..."
}

{
    "type": "chat_message",
    "market_id": 1,
    "user_id": 123,
    "message": "...",
    "created_at": "..."
}
```

### 8. Confirmation Slip Format

```typescript
// Shareable Slip Structure:
{
    "market_title": "Will Team A win?",
    "outcome": "YES",
    "contracts": 10,
    "average_price": 0.65,
    "total_cost": 6.50,
    "potential_payout": 10.00,
    "potential_profit": 3.50,
    "share_url": "/slips/{id}",
    "image": "market_image_url"
}

// Display Format:
// "I bet 10 YES contracts on 'Will Team A win?'"
// "Paid $6.50, could win $10.00 (+$3.50 profit)"
```

---

## Database Schema Highlights

### Key Relationships
```
User → CommunityMember → Community
User → Position → Market → MarketOutcome
User → Order → Market
User → Trade → Market
Market → MarketVote → User
Market → MarketChat → User
Community → CommunityToken → UserCommunityToken
```

### Indexes (Critical for Performance)
```sql
-- Trading queries
CREATE INDEX idx_orders_market_outcome ON orders(market_id, outcome_name, outcome);
CREATE INDEX idx_trades_market_outcome ON trades(market_id, outcome_name, outcome);
CREATE INDEX idx_positions_user_market ON positions(user_id, market_id, outcome_name);

-- Feed queries
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX idx_market_votes_market ON market_votes(market_id, vote_type);

-- Leaderboard queries
CREATE INDEX idx_trades_user_executed ON trades(buyer_id, executed_at);
CREATE INDEX idx_positions_user_resolved ON positions(user_id, ...) WHERE resolved;
```

---

## API Response Patterns

### Market Feed Response
```json
{
    "markets": [
        {
            "id": 1,
            "title": "Will Team A win?",
            "image_url": "...",
            "community_name": "Cornell",
            "community_image_url": "...",
            "upvotes": 42,
            "downvotes": 3,
            "user_vote": "upvote",
            "total_trades": 156,
            "resolution_deadline": "...",
            "status": "active"
        }
    ],
    "total": 100,
    "page": 1,
    "per_page": 20
}
```

### Orderbook Response
```json
{
    "market_id": 1,
    "outcome_name": "default",
    "outcome": "yes",
    "buys": [
        {
            "price": 0.65,
            "quantity": 10,
            "order_id": 123,
            "user_id": 456
        }
    ],
    "sells": [
        {
            "price": 0.66,
            "quantity": 5,
            "order_id": 124,
            "user_id": 789
        }
    ],
    "last_traded_price": 0.65
}
```

---

## Frontend Component Structure

```
src/
├── components/
│   ├── Trading/
│   │   ├── Orderbook.tsx          # Side-by-side YES/NO
│   │   ├── OrderForm.tsx          # Market/limit order form
│   │   ├── TradeConfirmation.tsx # Pre-trade modal
│   │   ├── TradeHistory.tsx       # User trades
│   │   └── ConfirmationSlip.tsx  # Shareable slip
│   ├── Market/
│   │   ├── MarketCard.tsx         # Feed card
│   │   ├── MarketDetail.tsx       # Full market page
│   │   ├── MarketChat.tsx         # Chat component
│   │   └── VoteButton.tsx        # Upvote/downvote
│   ├── Community/
│   │   ├── CommunityCard.tsx
│   │   ├── CommunityDetail.tsx
│   │   └── AdminPanel.tsx
│   ├── Social/
│   │   ├── Feed.tsx               # Market feed
│   │   └── Leaderboard.tsx        # Rankings
│   └── Portfolio/
│       ├── PortfolioTable.tsx
│       └── PortfolioSummary.tsx
├── pages/
│   ├── Markets.tsx                 # All markets feed
│   ├── MarketDetail.tsx
│   ├── Communities.tsx
│   ├── CommunityDetail.tsx
│   ├── Portfolio.tsx
│   └── Leaderboard.tsx
├── store/
│   ├── authStore.ts
│   ├── marketStore.ts
│   └── tradingStore.ts
└── services/
    ├── api.ts
    └── websocket.ts
```

---

## Critical UX Patterns

### 1. Order Form Flow
```
1. User selects YES or NO (shows last traded %)
2. User sees current position (if any)
3. User enters quantity ($ or contracts)
4. System shows estimated price (market orders)
5. System shows potential payout breakdown
6. User confirms → Trade executes
7. Position updates immediately
```

### 2. Feed Interaction Flow
```
1. User scrolls feed
2. Sees market card with image, votes, community
3. Clicks upvote → Instant feedback
4. Clicks market → Goes to detail page
5. Can share confirmation slip → Copy link
```

### 3. Portfolio Understanding Flow
```
1. User views portfolio
2. Sees position: "10 YES @ 65%"
3. Clicks position → See breakdown:
   - You own: 10 contracts
   - You paid: $6.50
   - If YES wins: +$10.00
   - Current value: $6.50 (if market at 65%)
4. Can click market → Go to trading page
```

---

## Performance Considerations

### Backend
- **Orderbook**: Redis for sub-10ms lookups
- **Leaderboards**: Pre-calculated, cached, updated incrementally
- **Feed**: Pagination, efficient sorting indexes
- **Chat**: Message pagination, WebSocket for real-time

### Frontend
- **Orderbook Updates**: Debounced WebSocket updates
- **Feed**: Virtual scrolling for large lists
- **Images**: Lazy loading, error handling
- **State**: Memoized selectors, efficient re-renders

---

## Security Considerations

1. **Trading**: Validate balances before order execution
2. **Admin Actions**: Check permissions on every request
3. **Token Distribution**: Only admins can distribute
4. **Chat**: Rate limiting, content moderation
5. **Voting**: One vote per user per market
6. **Email Domain**: Verify domain on registration/join

---

## Migration Strategy (If Rebuilding)

1. **Phase 1**: Core trading engine (buy-only model)
2. **Phase 2**: Communities and markets
3. **Phase 3**: Portfolio and positions
4. **Phase 4**: Social features (feed, votes, chat)
5. **Phase 5**: Leaderboards and karma
6. **Phase 6**: Community tokens
7. **Phase 7**: Admin enhancements

---

This guide provides the critical patterns and structures needed to rebuild BetThat 2.0 while maintaining the intuitive trading experience that makes it special.



