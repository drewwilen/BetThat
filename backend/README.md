# BetThat Backend

FastAPI backend for the BetThat social prediction market platform.

## Setup

1. Create a virtual environment:
```bash
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

   **Note:** If port 5432 is already in use, the docker-compose.yml uses port 5433 instead. The default DATABASE_URL uses port 5433.

5. Run database migrations:
```bash
alembic upgrade head
```

6. Start the server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── api/
│   │   ├── routes/          # API endpoints
│   │   └── websocket.py     # WebSocket handlers
│   ├── services/            # Business logic
│   └── core/                # Configuration and utilities
└── alembic/                 # Database migrations
```

