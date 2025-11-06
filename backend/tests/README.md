# Testing

## Setup

Tests require a test database. The test suite will attempt to create `betthat_test` database automatically, but you may need to create it manually using Docker:

```bash
# Option 1: Using Docker (recommended)
docker compose exec postgres psql -U postgres -c "CREATE DATABASE betthat_test;"

# Option 2: If psql is installed locally
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE betthat_test;"
```

The tests will try to create it automatically, but if that fails, use one of the commands above.

## Running Tests

```bash
cd backend
source venv/bin/activate  # or activate your virtual environment
pytest tests/ -v
```

## Test Structure

- `tests/conftest.py` - Test fixtures and configuration
- `tests/test_trading.py` - Trading logic tests

## Test Coverage

Current tests cover:
- Cash conservation (trades don't create/destroy money)
- Price constraint enforcement (YES + NO = 1)
- Position closing when buying opposite outcome


