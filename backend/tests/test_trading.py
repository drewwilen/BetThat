"""
Basic tests for trading logic
"""
import pytest
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.order import Order, OrderSide, OrderType, OrderStatus
from app.models.market import Market, MarketStatus, MarketType
from app.models.market_outcome import MarketOutcome, OutcomeStatus
from app.models.user import User
from app.models.community import Community
from app.services.trading import place_order, match_order
from app.services.token import update_token_balance


@pytest.fixture
def sample_community(db: Session):
    """Create a sample community for testing"""
    # Create admin user first
    admin = User(
        email="admin@test.com",
        username="admin",
        password_hash="hashed",
        token_balance=Decimal("1000.00")
    )
    db.add(admin)
    db.flush()
    
    community = Community(
        name="Test Community",
        description="Test description",
        is_public=True,
        admin_id=admin.id,
        invite_code="TEST123"
    )
    db.add(community)
    db.commit()
    return community


@pytest.fixture
def sample_market(db: Session, sample_community):
    """Create a sample market for testing"""
    # Create a user to be the creator
    creator = User(
        email="creator@test.com",
        username="creator",
        password_hash="hashed",
        token_balance=Decimal("1000.00")
    )
    db.add(creator)
    db.flush()
    
    market = Market(
        title="Test Market",
        description="Test description",
        community_id=sample_community.id,
        creator_id=creator.id,
        market_type=MarketType.YES_NO,
        status=MarketStatus.ACTIVE,
        resolution_deadline="2024-12-31T00:00:00Z",
        outcomes=["default"]
    )
    db.add(market)
    db.flush()
    
    # Create MarketOutcome entry
    market_outcome = MarketOutcome(
        market_id=market.id,
        name="default",
        status=OutcomeStatus.ACTIVE
    )
    db.add(market_outcome)
    db.commit()
    return market


@pytest.fixture
def sample_users(db: Session):
    """Create sample users for testing"""
    user1 = User(
        email="user1@test.com",
        username="user1",
        password_hash="hashed",
        token_balance=Decimal("1000.00")
    )
    user2 = User(
        email="user2@test.com",
        username="user2",
        password_hash="hashed",
        token_balance=Decimal("1000.00")
    )
    db.add(user1)
    db.add(user2)
    db.commit()
    return user1, user2


def test_cash_conservation(db: Session, sample_market, sample_users):
    """Test that cash is conserved when trades execute"""
    user1, user2 = sample_users
    
    # Create a buy YES order from user1
    order1 = Order(
        market_id=sample_market.id,
        user_id=user1.id,
        side=OrderSide.BUY,
        outcome_name="default",
        outcome="yes",
        price=Decimal("0.50"),
        quantity=Decimal("100.00"),
        order_type=OrderType.LIMIT,
        status=OrderStatus.PENDING
    )
    db.add(order1)
    db.commit()
    
    # Create a buy NO order from user2 (matches YES)
    order2 = Order(
        market_id=sample_market.id,
        user_id=user2.id,
        side=OrderSide.BUY,
        outcome_name="default",
        outcome="no",
        price=Decimal("0.50"),  # Should match YES at 0.50
        quantity=Decimal("100.00"),
        order_type=OrderType.LIMIT,
        status=OrderStatus.PENDING
    )
    db.add(order2)
    db.commit()
    
    # Add order2 to orderbook first
    from app.services.orderbook import add_order_to_orderbook
    add_order_to_orderbook(
        sample_market.id, "default", "no", "buy",
        Decimal("0.50"), Decimal("100.00"), order2.id
    )
    
    # Execute order1 - should match with order2
    initial_balance_user1 = user1.token_balance
    initial_balance_user2 = user2.token_balance
    total_initial = initial_balance_user1 + initial_balance_user2
    
    trades = place_order(db, order1)
    
    # Refresh users
    db.refresh(user1)
    db.refresh(user2)
    
    # Check that total cash is conserved (within rounding)
    total_final = user1.token_balance + user2.token_balance
    cash_used = total_initial - total_final
    
    # Cash used should equal quantity (both users pay for their outcomes)
    assert abs(float(cash_used) - 100.0) < 0.01, f"Cash conservation violated: {cash_used} vs 100.0"


def test_price_constraint(db: Session, sample_market, sample_users):
    """Test that YES price + NO price = 1"""
    user1, user2 = sample_users
    
    # Create YES order at 0.65
    order_yes = Order(
        market_id=sample_market.id,
        user_id=user1.id,
        side=OrderSide.BUY,
        outcome_name="default",
        outcome="yes",
        price=Decimal("0.65"),
        quantity=Decimal("100.00"),
        order_type=OrderType.LIMIT,
        status=OrderStatus.PENDING
    )
    
    # Create NO order at 0.35 (should match)
    order_no = Order(
        market_id=sample_market.id,
        user_id=user2.id,
        side=OrderSide.BUY,
        outcome_name="default",
        outcome="no",
        price=Decimal("0.35"),
        quantity=Decimal("100.00"),
        order_type=OrderType.LIMIT,
        status=OrderStatus.PENDING
    )
    
    db.add(order_no)
    db.commit()
    
    # Add NO order to orderbook
    from app.services.orderbook import add_order_to_orderbook
    add_order_to_orderbook(
        sample_market.id, "default", "no", "buy",
        Decimal("0.35"), Decimal("100.00"), order_no.id
    )
    
    # YES order should match at implied price (1 - 0.35 = 0.65)
    trades = place_order(db, order_yes)
    
    assert len(trades) == 1, "Should have one trade"
    trade = trades[0]
    
    # Trade price should be 0.65 (from YES order)
    assert abs(float(trade.price) - 0.65) < 0.0001, f"Trade price should be 0.65, got {trade.price}"


def test_position_closing(db: Session, sample_market, sample_users):
    """Test that buying opposite outcome closes existing position"""
    user1, user2 = sample_users
    
    # First, create a position for user1: 100 YES at 0.50
    from app.models.position import Position
    position = Position(
        user_id=user1.id,
        market_id=sample_market.id,
        outcome_name="default",
        outcome="yes",
        quantity=Decimal("100.00"),
        average_price=Decimal("0.50"),
        total_cost=Decimal("50.00")
    )
    db.add(position)
    db.commit()
    
    # Create YES order from user2 (user1 will match against this when buying NO)
    # In buy-only model, to buy NO, user1 matches against user2's YES order
    order_yes = Order(
        market_id=sample_market.id,
        user_id=user2.id,
        side=OrderSide.BUY,
        outcome_name="default",
        outcome="yes",
        price=Decimal("0.50"),
        quantity=Decimal("50.00"),
        order_type=OrderType.LIMIT,
        status=OrderStatus.PENDING
    )
    db.add(order_yes)
    db.commit()
    
    # Add YES order to orderbook (user1's NO order will match against this)
    from app.services.orderbook import add_order_to_orderbook
    add_order_to_orderbook(
        sample_market.id, "default", "yes", "buy",
        Decimal("0.50"), Decimal("50.00"), order_yes.id
    )
    
    # User1 buys NO (should match against user2's YES order, closing 50 YES, creating 50 NO)
    order_no = Order(
        market_id=sample_market.id,
        user_id=user1.id,
        side=OrderSide.BUY,
        outcome_name="default",
        outcome="no",
        price=Decimal("0.50"),  # Implied price: 1 - 0.50 = 0.50
        quantity=Decimal("50.00"),
        order_type=OrderType.LIMIT,
        status=OrderStatus.PENDING
    )
    
    trades = place_order(db, order_no)
    
    assert len(trades) == 1, "Should have one trade"
    
    # Check positions - refresh position first
    db.refresh(position)
    yes_position = db.query(Position).filter(
        Position.user_id == user1.id,
        Position.market_id == sample_market.id,
        Position.outcome_name == "default",
        Position.outcome == "yes"
    ).first()
    
    no_position = db.query(Position).filter(
        Position.user_id == user1.id,
        Position.market_id == sample_market.id,
        Position.outcome_name == "default",
        Position.outcome == "no"
    ).first()
    
    # YES position should be reduced to 50 (100 - 50)
    assert yes_position is not None, "YES position should still exist"
    assert abs(float(yes_position.quantity) - 50.0) < 0.01, f"YES position should be 50, got {yes_position.quantity}"
    
    # NO position should be created with 50
    assert no_position is not None, "NO position should be created"
    assert abs(float(no_position.quantity) - 50.0) < 0.01, f"NO position should be 50, got {no_position.quantity}"

