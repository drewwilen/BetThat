# BetThat 2.0 - One-Shot Build Prompt

You are building **BetThat 2.0**, a social prediction market platform. This is a complete rebuild with enhanced features. Follow this specification exactly.

## Core Concept

BetThat is a prediction market platform where users trade YES/NO contracts on real-world outcomes. The key innovation is a **buy-only trading model** that's intuitive for non-traders: users only "buy" YES or NO contracts, and buying the opposite outcome automatically closes existing positions. Prices always sum to 1.0 (YES price + NO price = 1.0).

## Tech Stack

- **Backend**: FastAPI (Python), PostgreSQL, Redis (for orderbook)
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, Zustand
- **Real-time**: WebSockets for orderbook, trades, chat
- **Auth**: JWT tokens

## Critical Trading Model (DO NOT CHANGE)

### Buy-Only System
- Users can ONLY "buy" YES or NO contracts (no sell orders)
- Buying NO matches against YES buy orders (and vice versa)
- Price constraint: `p_yes + p_no = 1.0` (always)
- When user buys opposite outcome:
  1. First closes existing opposite position (if any)
  2. Then creates/updates position for bought outcome
- Whole numbers only (no fractional contracts)

### Order Types
- **Market Orders** (default): Execute immediately at best available price
- **Limit Orders**: Execute at specified price or better

### Position Display (Critical UX)
Always show:
- "You own: X [OUTCOME] contracts"
- "You paid: $Y"
- "If [OUTCOME] wins: +$Z"
- "If [OPPOSITE] wins: $0.00"

Visual indicators:
- Green for YES, Red for NO
- Gray buttons when you own that position
- "SELL" text when selecting opposite outcome
- Last traded prices shown as percentages (65% not 0.65)

## Required Features

### 1. User System
- Email/password auth with JWT
- User profiles with token balances
- Karma system (points from trades, market creation, votes)
- Starting balance: 1000 tokens

### 2. Communities
- Public and private communities
- Invite codes for private communities
- Email domain restrictions (e.g., @cornell.edu only)
- Community images/logos
- Multiple admins per community
- Admin can edit/delete community

### 3. Markets
- Create markets with title, description, deadline
- Market images (fallback: market → community → none)
- Multiple outcomes support (e.g., "Team A", "Team B")
- Outcome-specific images
- Per-outcome resolution (each resolves independently as YES/NO)
- Admin-only resolution with payout distribution

### 4. Trading Interface (Core Feature)
- **Side-by-side orderbooks**: YES and NO displayed simultaneously
- **Orderbook shows**:
  - Bids: Buy orders for that outcome (sorted descending)
  - Asks: Inverted buy orders from opposite outcome (sorted descending)
  - Last traded price (as percentage)
  - User's own orders highlighted with cancel buttons
- **Order form**:
  - YES/NO toggle (shows last traded %)
  - Position summary above form
  - Quantity input (toggle $ or contracts)
  - Market/limit order toggle
  - Estimated price display for market orders
  - Potential payout breakdown
  - Confirmation modal before execution
- **Trade history**: All user trades for outcome, shows profit/payout

### 5. Portfolio
- Per-market and overall portfolio views
- Shows: Market, Last traded, Outcome, Contracts, Avg price, Cost, Payout if right, Market value, Total return
- Filters: Market name, outcome name, side (Yes/No), status (Active/Resolved)
- Sort by various criteria
- Visual indicators: Up/down arrows comparing last traded to average price

### 6. Social Feed (NEW)
- Scrollable feed of all markets
- Upvote/downvote markets (one vote per user)
- Sort by: Newest, Most upvoted, Trending, Ending soon
- Market cards show: Image, title, community tag, vote counts, trading activity
- Trending algorithm: Weighted by votes + recent trading activity + recency

### 7. Market Chat (NEW)
- Real-time chat per market
- Message threading/replies
- WebSocket for instant updates
- Pagination for message history

### 8. Confirmation Slips (NEW)
- Shareable "trade slips" showing user's position
- Format: "I bet X contracts on [Market]"
- Shows: Market, Position, Potential payout, Image
- Copy link functionality
- Display on feed/profile

### 9. Leaderboards (NEW)
- **Global leaderboards**:
  - Most trades (count)
  - Most profit (sum of P&L)
  - Highest karma
- **Community leaderboards**: Same metrics per community
- **Time filters**: All-time, Weekly, Monthly
- Rankings with badges/achievements
- Pre-calculated, cached, updated incrementally

### 10. Community Tokens (NEW)
- Each community can have its own token (e.g., "Cornell Coins")
- Global tokens still exist for cross-community markets
- Admins can distribute tokens to users
- Token balance per community displayed
- Markets can specify which token they use

### 11. Enhanced Admin System (NEW)
- Multiple admins per community
- Market creators can assign co-admins
- Admin roles: Full admin, Moderator
- Admin UI for:
  - Editing/deleting communities and markets
  - Resolving markets
  - Distributing tokens
  - Managing members

## Database Schema (Key Tables)

```sql
users (id, email, username, password_hash, token_balance, karma, total_trades, win_rate)
communities (id, name, description, is_public, admin_id, invite_code, image_url, email_domain_restriction)
community_members (id, user_id, community_id, role)
community_tokens (id, community_id, name, symbol, total_supply)
user_community_tokens (id, user_id, community_id, token_id, balance)
markets (id, community_id, creator_id, title, description, market_type, resolution_deadline, status, outcomes, image_url)
market_outcomes (id, market_id, name, status, resolution_outcome, image_url, resolved_by, resolved_at)
orders (id, market_id, user_id, outcome_name, outcome, price, quantity, order_type, status)
trades (id, market_id, buyer_id, seller_id, outcome_name, outcome, price, quantity, executed_at)
positions (id, user_id, market_id, outcome_name, outcome, quantity, average_price, total_cost)
market_votes (id, market_id, user_id, vote_type, created_at)
market_chat (id, market_id, user_id, message, parent_id, created_at)
leaderboard_entries (id, user_id, community_id, metric_type, value, period, updated_at)
```

## API Endpoints (Key Routes)

```
POST /auth/register
POST /auth/login
GET /auth/me

GET /communities/ (with filters)
POST /communities/
GET /communities/{id}
PUT /communities/{id} (admin)
DELETE /communities/{id} (admin)
POST /communities/join
POST /communities/{id}/admins
GET /communities/{id}/leaderboard

GET /markets/ (with filters, votes, sorting)
POST /markets/
GET /markets/{id}
POST /markets/{id}/vote
POST /markets/{id}/resolve (admin)
GET /markets/{id}/chat
POST /markets/{id}/chat

POST /trading/orders
POST /trading/orders/{id}/cancel
GET /trading/markets/{id}/orderbook
GET /trading/markets/{id}/trades
GET /trading/markets/{id}/my-trades

GET /portfolio/positions
GET /portfolio/markets/{id}/positions
GET /portfolio/summary

POST /tokens/distribute (admin)
GET /tokens/balances
GET /tokens/communities/{id}/tokens

GET /leaderboards/global
GET /leaderboards/communities/{id}
GET /leaderboards/users/{id}/stats
```

## Frontend Structure

```
src/
├── components/
│   ├── Trading/ (Orderbook, OrderForm, TradeConfirmation, TradeHistory, ConfirmationSlip)
│   ├── Market/ (MarketCard, MarketDetail, MarketChat, VoteButton)
│   ├── Community/ (CommunityCard, CommunityDetail, AdminPanel)
│   ├── Social/ (Feed, Leaderboard)
│   └── Portfolio/ (PortfolioTable, PortfolioSummary)
├── pages/ (Markets, MarketDetail, Communities, CommunityDetail, Portfolio, Leaderboard)
├── store/ (authStore, marketStore, tradingStore)
└── services/ (api.ts, websocket.ts)
```

## Critical Implementation Details

### Trading Engine Logic
```python
# When matching orders:
# 1. User buys YES at price p
# 2. System finds matching NO buy order at price (1-p)
# 3. Both users pay their prices
# 4. If buyer has NO position, close it first
# 5. Create/update YES position for buyer
# 6. Create/update NO position for seller
# 7. Update token balances
# 8. Broadcast orderbook updates for both YES and NO
```

### Orderbook Display
```typescript
// YES Orderbook:
// - Bids: Buy YES orders (highest first)
// - Asks: Inverted NO buy orders (1 - NO_price, highest first)

// NO Orderbook:
// - Bids: Buy NO orders (highest first)
// - Asks: Inverted YES buy orders (1 - YES_price, highest first)
```

### Feed Algorithm
```python
trending_score = (
    (upvotes - downvotes) * 2 +
    recent_trades_count * 1.5 +
    time_decay_factor
)
```

### Leaderboard Metrics
- Total trades: Count of all trades
- Total profit: Sum of (payout - cost) for resolved positions
- Win rate: (Winning positions / Total resolved) * 100
- Karma: successful_trades*10 + market_creations*50 + upvotes*5 - downvotes*2

## UX Requirements (Non-Negotiable)

1. **Prices as percentages**: Always show 65% not 0.65
2. **Dollar input default**: Users enter dollars, see contract conversion
3. **Clear position display**: "You own X contracts, paid $Y, could win $Z"
4. **Visual feedback**: Green YES, Red NO, Gray for owned positions
5. **Side-by-side orderbooks**: See YES and NO simultaneously
6. **Last traded prices**: Always visible, sum to 100%
7. **Mobile responsive**: Works perfectly on mobile devices

## Performance Requirements

- Orderbook updates: < 100ms via WebSocket
- Feed pagination: 20 items per page
- Leaderboard caching: Pre-calculated, updated incrementally
- Image optimization: Lazy loading, error handling
- Database indexes: On all foreign keys and frequently queried fields

## Security Requirements

- JWT authentication for all protected routes
- Admin checks on all admin actions
- Balance validation before trade execution
- Rate limiting on chat and voting
- Email domain verification for restricted communities
- Input validation on all user inputs

## Testing Requirements

- Backend: Trading engine tests (cash conservation, price constraints)
- Backend: Token transfer tests
- Backend: Market resolution tests
- Frontend: Trading flow tests
- Frontend: Feed interaction tests

## Build Order

1. Setup: Database, Redis, FastAPI, React
2. Core: Auth, Users, Communities, Markets
3. Trading: Order matching, orderbook, positions
4. Portfolio: Position tracking, display
5. Social: Feed, voting, chat
6. Leaderboards: Metrics, rankings
7. Tokens: Community tokens, distribution
8. Admin: Enhanced admin features
9. Polish: UI/UX refinements, testing

## Success Criteria

- Users can place trades in < 3 clicks
- Users understand positions without explanation
- Feed drives discovery and engagement
- Leaderboards create competition
- Platform handles 1000+ concurrent users

---

**Remember**: The buy-only trading model is the core innovation. Keep it simple, intuitive, and visually clear. Everything else enhances this core experience.

Build this step by step, test thoroughly, and maintain the intuitive UX that makes prediction markets accessible to everyone.



