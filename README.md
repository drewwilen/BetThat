# BetThat - Social Prediction Market Platform

A social platform where people trade prediction markets on their everyday lives. Bet with friends on everything from class attendance to fantasy football outcomes.

## 📚 Documentation

- **[Full Documentation](./DOCUMENTATION.md)** - Complete user and technical guide
  - How prediction markets work
  - Trading model and mechanics
  - User guide
  - Technical architecture
  - API reference
  - Testing guide

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Architecture and implementation details
  - System architecture
  - Design decisions
  - Code patterns
  - Common issues & solutions

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: WebSockets

## Features

- Token-based trading system
- Yes/No prediction markets
- Public and private communities with invite codes
- Real-time orderbook and trade updates
- Community-admin market resolution

## Setup

### Prerequisites

- Python 3.9+
- Node.js 16+ (Node.js 18+ recommended for latest features)
- Docker and Docker Compose

### Backend Setup

1. Create a virtual environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start PostgreSQL and Redis:
```bash
docker compose up -d
```

   **Note:** If port 5432 is already in use, the docker-compose.yml uses port 5433 instead. Make sure your `.env` file uses the correct port (5433).

5. Run database migrations:
```bash
alembic upgrade head
```

6. Start the backend server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### Frontend Setup

(TODO: Frontend setup instructions will be added)

## Development

### Running Tests

(TODO: Add test instructions)

### Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

## API Endpoints

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/users/me` - Get current user info
- `GET /api/v1/communities` - List public communities
- `POST /api/v1/communities` - Create a community
- `POST /api/v1/communities/join` - Join a community with invite code
- `GET /api/v1/markets` - List markets
- `POST /api/v1/markets` - Create a market
- `POST /api/v1/trading/orders` - Place an order
- `GET /api/v1/trading/markets/{market_id}/orderbook/{outcome}` - Get orderbook
- `WebSocket /ws/{market_id}` - Real-time orderbook updates

## License

MIT

