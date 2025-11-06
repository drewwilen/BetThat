"""
Pytest configuration and fixtures for trading tests
"""
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.core.config import settings

# Create a test database engine
TEST_DATABASE_URL = settings.DATABASE_URL.replace("betthat", "betthat_test")
# Extract connection params for creating test DB
admin_db_url = settings.DATABASE_URL.rsplit("/", 1)[0] + "/postgres"  # Connect to postgres DB
admin_engine = create_engine(admin_db_url, isolation_level="AUTOCOMMIT")


@pytest.fixture(scope="function")
def db():
    """Create a test database session"""
    # Create test database if it doesn't exist
    test_db_name = "betthat_test"
    try:
        with admin_engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{test_db_name}'"))
            if result.fetchone() is None:
                conn.execute(text(f"CREATE DATABASE {test_db_name}"))
    except Exception as e:
        print(f"Warning: Could not create test database: {e}")
        print("Make sure PostgreSQL is running (docker compose up -d)")
        print(f"Or create manually: docker compose exec postgres psql -U postgres -c 'CREATE DATABASE {test_db_name};'")
        raise
    
    # Now connect to the test database
    test_engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestSession()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()



