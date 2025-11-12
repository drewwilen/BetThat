# BetThat 2.0 - Complete Build Specification

## Project Overview

BetThat is a social prediction market platform where users trade on outcomes of real-world events. The platform combines the mechanics of prediction markets with social features, community building, and gamification. Users can create communities, set up markets, trade YES/NO contracts, and compete on leaderboards.

**Core Philosophy**: Make prediction markets accessible to non-traders through intuitive UI, clear payoff displays, and social engagement.

---

## Current Feature Set (MVP - Keep All)

### 1. User Authentication & Management
- Email/password registration and login
- JWT-based authentication
- User profiles with token balances
- Token balance tracking (starting balance: 1000 tokens)

### 2. Communities
- **Public and Private Communities**: Users can create public communities or private ones with invite codes
- **Community Management**: 
  - Admins can edit community name, description, and image
  - Admins can delete communities (cascades to markets)
  - Community images/logos
- **Membership System**: Users join via invite codes
- **Community Pages**: Display all markets in a community

### 3. Markets
- **Market Creation**: 
  - Title, description, resolution deadline
  - Market images/thumbnails
  - Multiple outcomes support (e.g., "Team A", "Team B", "Team C")
  - Outcome-specific images (e.g., team logos)
- **Market Types**: YES/NO markets (can have multiple named outcomes)
- **Market Resolution**: 
  - Per-outcome resolution (each outcome resolves independently as YES or NO)
  - Admin-only resolution
  - Automatic payout distribution
- **Market Display**:
  - Image fallback: Market image → Community image → No image
  - Community tags linking to community pages
  - Status indicators (active/resolved)

### 4. Trading Engine (Core - Keep Intuitive Design)
- **Buy-Only Model**: Users can only "buy" YES or NO contracts
  - Buying NO automatically matches against YES orders (and vice versa)
  - Price constraint: YES price + NO price = 1.0
  - Positions automatically close when buying opposite outcome
- **Order Types**:
  - **Market Orders**: Execute immediately at best available price (default)
  - **Limit Orders**: Execute at specified price or better
- **Whole Number Contracts**: Only allow buying whole numbers of contracts
- **Orderbook Display**:
  - Side-by-side YES/NO orderbooks
  - Shows asks (from opposite outcome, inverted) and bids
  - Visual depth bars
  - Last traded price display
  - User's own orders highlighted with cancel buttons
- **Position Display**:
  - Clear breakdown: "You own X contracts", "You paid $Y", "If YES wins: +$Z"
  - Visual indicators for buying more vs. selling (reducing position)
  - Position summary above order form
- **Trade Confirmation**: Shows estimated price, cost, and potential payout before execution
- **Input Modes**: Toggle between "$" (dollars) and "Contracts" with real-time conversion

### 5. Portfolio Management
- **Portfolio View**: 
  - Per-market positions
  - Overall portfolio summary
  - Shows: Market, Last traded price, Outcome, Contracts, Avg price, Cost, Payout if right, Market value, Total return
- **Position Tracking**:
  - Tracks positions per market/outcome/side
  - Calculates average price, total cost, current value, profit/loss
  - Mark-to-market valuation using last traded price or mid-price
- **Portfolio Filters**:
  - Search by market name, outcome name
  - Filter by side (Yes/No), status (Active/Resolved)
  - Sort by various criteria
- **Visual Indicators**:
  - Last traded price with up/down arrows comparing to average price
  - Color coding: Green for profits, Red for losses
  - Outcome name color coding for multi-outcome markets

### 6. Trade History
- **User Trade History**: Shows all trades for a given outcome
- **Trade Details**: 
  - Side (BUY YES/NO)
  - Price (as percentage)
  - Quantity (contracts)
  - Profit/payout for resolved markets
  - Color coding by outcome

### 7. Order Management
- **Order Cancellation**: Users can cancel their own pending orders
- **Order Display**: User's orders highlighted in orderbook with cancel buttons

### 8. Images & Media
- **Market Images**: Thumbnail images for markets
- **Outcome Images**: Individual images for each outcome (e.g., team logos)
- **Community Images**: Logos/images for communities
- **Image Fallback**: Market → Community → None

---

## New Features to Add

### 1. Karma & Leaderboards
- **Karma System**: 
  - Points earned from successful trades, market creation, community engagement
  - Display karma on user profiles
- **Leaderboards**:
  - Global leaderboards: Most trades, Most profit, Highest karma
  - Community-specific leaderboards
  - Time-based filters (all-time, weekly, monthly)
  - Rankings with badges/achievements

### 2. Social Feed
- **Market Feed**: 
  - Scrollable feed of all markets
  - Upvote/downvote markets
  - Sort by: Newest, Most upvoted, Trending, Ending soon
  - Market cards with images, community tags, vote counts
- **Market Discovery**: 
  - Featured markets
  - Trending markets (based on votes and trading activity)
  - Personalized recommendations

### 3. Market Chat & Sharing
- **Market Chat**: 
  - Real-time chat per market
  - Users can discuss predictions, share insights
  - Message threading/replies
- **Confirmation Slips**: 
  - Shareable "trade slips" showing user's position
  - Visual cards showing: Market, Position, Potential payout
  - Social sharing (copy link, share to feed)
  - "I bet X on Y" format

### 4. Community-Specific Tokens/Coins
- **Token Types**: 
  - Each community can have its own token (e.g., "Cornell Coins", "Fantasy League Tokens")
  - Global tokens still exist for cross-community markets
- **Token Management**:
  - Admins can distribute tokens to users
  - Token allocation system for market creators
  - Token balance per community displayed
- **Use Cases**:
  - Track real-world money separately
  - Community-specific competitions
  - Token gifting/rewards

### 5. Enhanced Admin System
- **Community Admins**: 
  - Multiple admins per community
  - Admin roles/permissions (full admin, moderator)
  - Admin assignment UI
- **Market Admins**: 
  - Market creators can assign co-admins
  - Co-admins can resolve markets
  - Admin management interface
- **Admin Actions**:
  - Edit/delete communities and markets
  - Resolve markets
  - Distribute tokens
  - Moderate content

### 5.5. Authentication Enhancements
- **Email Domain Restriction**: 
  - Communities can restrict membership to specific email domains (e.g., @cornell.edu)
  - Domain verification system
- **Invite Code System**: 
  - Already exists, enhance with:
    - One-time use codes
    - Expiring codes
    - Code generation with custom patterns

---

## Technical Architecture

### Backend (FastAPI + PostgreSQL + Redis)

#### Core Services
- **Trading Engine**: Order matching, position tracking, settlement
- **Orderbook Service**: Redis-based orderbook management
- **Position Service**: Position calculations, mark-to-market valuation
- **Token Service**: Token balance management, transfers
- **Notification Service**: Real-time updates via WebSockets

#### Database Schema (Key Tables)
```
users
  - id, email, username, password_hash
  - token_balance (global)
  - karma, total_trades, win_rate
  - created_at

communities
  - id, name, description, is_public
  - admin_id, invite_code
  - image_url, email_domain_restriction
  - created_at

community_members
  - id, user_id, community_id, role (admin/member)
  - joined_at

community_tokens
  - id, community_id, name, symbol
  - total_supply, created_at

user_community_tokens
  - id, user_id, community_id, token_id
  - balance

markets
  - id, community_id, creator_id
  - title, description, market_type
  - resolution_deadline, status
  - outcomes (JSON), image_url
  - created_at

market_outcomes
  - id, market_id, name
  - status, resolution_outcome
  - image_url, resolved_by, resolved_at

orders
  - id, market_id, user_id
  - outcome_name, outcome (yes/no)
  - price, quantity, order_type
  - status, created_at

trades
  - id, market_id, buyer_id, seller_id
  - outcome_name, outcome, price, quantity
  - executed_at

positions
  - id, user_id, market_id
  - outcome_name, outcome
  - quantity, average_price, total_cost

market_votes
  - id, market_id, user_id
  - vote_type (upvote/downvote)
  - created_at

market_chat
  - id, market_id, user_id
  - message, parent_id (for threading)
  - created_at

leaderboard_entries
  - id, user_id, community_id (nullable)
  - metric_type, value, period
  - updated_at
```

#### API Endpoints (Key Routes)
```
/auth/
  POST /register
  POST /login
  GET /me

/communities/
  GET / (list with filters)
  POST / (create)
  GET /{id}
  PUT /{id} (admin only)
  DELETE /{id} (admin only)
  POST /join
  POST /{id}/admins (assign admin)
  GET /{id}/leaderboard

/markets/
  GET / (list with filters, votes, sorting)
  POST / (create)
  GET /{id}
  POST /{id}/vote (upvote/downvote)
  POST /{id}/resolve (admin only)
  GET /{id}/chat
  POST /{id}/chat

/trading/
  POST /orders (create order)
  POST /orders/{id}/cancel
  GET /markets/{id}/orderbook
  GET /markets/{id}/trades
  GET /markets/{id}/my-trades

/portfolio/
  GET /positions
  GET /markets/{id}/positions
  GET /summary

/tokens/
  GET /balances
  POST /distribute (admin only)
  GET /communities/{id}/tokens

/leaderboards/
  GET /global
  GET /communities/{id}
  GET /users/{id}/stats
```

### Frontend (React + TypeScript + Vite)

#### Key Components
- **Trading Components**:
  - `Orderbook`: Side-by-side YES/NO display with asks/bids
  - `OrderForm`: Market/limit order form with position display
  - `TradeConfirmation`: Pre-trade confirmation modal
  - `TradeHistory`: User trade history

- **Market Components**:
  - `MarketCard`: Feed card with image, votes, community tag
  - `MarketDetail`: Full market page with trading, chat, admin actions
  - `MarketChat`: Real-time chat component
  - `ConfirmationSlip`: Shareable position card

- **Community Components**:
  - `CommunityCard`: Community display with image
  - `CommunityDetail`: Community page with markets, members, leaderboard
  - `AdminPanel`: Admin management interface

- **Social Components**:
  - `Feed`: Scrollable market feed with sorting/filtering
  - `Leaderboard`: Rankings display
  - `VoteButton`: Upvote/downvote component

- **Portfolio Components**:
  - `PortfolioTable`: Positions table with filters/sorting
  - `PortfolioSummary`: Cash, locked bets, total value

#### State Management
- Zustand stores for:
  - Auth (user, token)
  - Markets (feed, filters, sorting)
  - Trading (orderbooks, positions)
  - Communities (list, current)

#### WebSocket Integration
- Real-time orderbook updates
- Trade notifications
- Chat messages
- Leaderboard updates

---

## Design Principles (Critical to Maintain)

### 1. Intuitive Trading Experience
- **Buy-Only Model**: Users only "buy" YES or NO - no confusing sell orders
- **Clear Position Display**: 
  - "You own X contracts"
  - "You paid $Y"
  - "If YES wins: +$Z"
- **Visual Feedback**: 
  - Buttons show "Buy More" vs "Sell" based on position
  - Color coding (green YES, red NO)
  - Last traded prices displayed prominently

### 2. Non-Trader Friendly
- **Percentage Display**: Prices shown as percentages (65% not 0.65)
- **Dollar Input Mode**: Default to dollar input with contract conversion
- **Clear Payoffs**: Show net profit, not just gross payout
- **Simple Language**: "If YES wins" not "If outcome resolves to true"

### 3. Visual Clarity
- **Side-by-Side Orderbooks**: See YES and NO prices simultaneously
- **Image Fallbacks**: Always show something visual (market → community → none)
- **Status Indicators**: Clear active/resolved badges
- **Position Summary**: Always visible above order form

### 4. Social Engagement
- **Feed First**: Make discovery easy
- **Voting**: One-click upvote/downvote
- **Sharing**: Easy confirmation slip sharing
- **Leaderboards**: Visible rankings drive competition

---

## Key Implementation Details

### Trading Engine Logic
```python
# Price Constraint: YES + NO = 1.0
# When matching orders:
# - Buy YES at price p matches Buy NO at price (1-p)
# - Both users pay their respective prices
# - Positions update automatically
# - If user has opposite position, it closes first

# Position Closing:
# - Buying NO when holding YES reduces YES position
# - If fully closed, new NO position created
# - Cost basis adjusted proportionally
```

### Token System
```python
# Global tokens: Used across all markets
# Community tokens: Specific to community
# Balance tracking: Per token type
# Distribution: Admin can allocate tokens to users
# Trading: Markets can specify which token they use
```

### Leaderboard Calculation
```python
# Metrics:
# - Total trades (count)
# - Total profit (sum of P&L)
# - Win rate (resolved positions)
# - Karma (from votes, successful trades, market creation)
# 
# Periods: All-time, Weekly, Monthly
# Scope: Global or Community-specific
```

### Feed Algorithm
```python
# Sorting options:
# - Newest: Order by created_at DESC
# - Most upvoted: Order by (upvotes - downvotes) DESC
# - Trending: Weighted by votes + recent trading activity
# - Ending soon: Order by resolution_deadline ASC
```

---

## Testing Requirements

### Backend Tests
- Trading engine: Cash conservation, price constraints, position closing
- Token transfers: Balance accuracy, distribution logic
- Market resolution: Payout calculations, position updates
- Leaderboard: Metric calculations, period filtering

### Frontend Tests
- Trading flows: Order placement, position updates
- Feed: Sorting, filtering, voting
- Portfolio: Calculations, display logic

---

## Deployment Considerations

### Environment Variables
```
DATABASE_URL
REDIS_URL
SECRET_KEY
CORS_ORIGINS
```

### Docker Setup
- PostgreSQL container
- Redis container
- Backend service
- Frontend build

### Database Migrations
- Alembic for schema changes
- Seed data for initial setup

---

## Success Criteria

1. **Trading Experience**: Users can place trades in < 3 clicks
2. **Position Clarity**: Users understand their positions without explanation
3. **Social Engagement**: Users vote and share markets regularly
4. **Performance**: Orderbook updates in < 100ms
5. **Scalability**: Supports 1000+ concurrent users

---

## Build Instructions

1. **Setup Backend**:
   - FastAPI application structure
   - PostgreSQL database with migrations
   - Redis for orderbook
   - WebSocket support for real-time updates

2. **Setup Frontend**:
   - React + TypeScript + Vite
   - Tailwind CSS for styling
   - Zustand for state management
   - WebSocket client for real-time updates

3. **Implement Core Trading**:
   - Buy-only trading engine
   - Orderbook management
   - Position tracking
   - Portfolio display

4. **Add Social Features**:
   - Feed with voting
   - Market chat
   - Leaderboards
   - Confirmation slips

5. **Enhance Communities**:
   - Community tokens
   - Admin management
   - Email domain restrictions

6. **Polish & Test**:
   - UI/UX refinements
   - Comprehensive testing
   - Performance optimization

---

## Notes for Implementation

- **Keep the buy-only model**: It's intuitive and works beautifully
- **Maintain visual clarity**: Images, colors, clear labels
- **Prioritize mobile**: Responsive design is critical
- **Real-time updates**: WebSockets for orderbook, chat, leaderboards
- **Error handling**: Clear error messages, graceful degradation
- **Accessibility**: Keyboard navigation, screen reader support

---

This specification captures the essence of BetThat while providing a clear roadmap for building an enhanced, scalable version. The core trading experience should remain the star, with social features enhancing engagement without complicating the core flow.



