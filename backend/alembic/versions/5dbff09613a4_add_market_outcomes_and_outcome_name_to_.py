"""add_market_outcomes_and_outcome_name_to_tables

Revision ID: 5dbff09613a4
Revises: 7dc14b2cf8a2
Create Date: 2025-11-05 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

# revision identifiers, used by Alembic.
revision = '5dbff09613a4'
down_revision = '7dc14b2cf8a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types (check if they exist first)
    conn = op.get_bind()
    
    # Check if enum types exist
    result = conn.execute(sa.text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outcomestatus')"))
    if not result.scalar():
        outcome_status_enum = pg.ENUM('ACTIVE', 'RESOLVED', name='outcomestatus', create_type=True)
        outcome_status_enum.create(conn)
    
    result = conn.execute(sa.text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outcomeresolution')"))
    if not result.scalar():
        outcome_resolution_enum = pg.ENUM('YES', 'NO', name='outcomeresolution', create_type=True)
        outcome_resolution_enum.create(conn)
    
    # Get the enum types for use in table creation
    outcome_status_enum = pg.ENUM('ACTIVE', 'RESOLVED', name='outcomestatus', create_type=False)
    outcome_resolution_enum = pg.ENUM('YES', 'NO', name='outcomeresolution', create_type=False)
    
    # Check if market_outcomes table exists
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'market_outcomes' not in tables:
        # Create market_outcomes table
        op.create_table(
            'market_outcomes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('market_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('status', outcome_status_enum, nullable=False, server_default='ACTIVE'),
            sa.Column('resolution_outcome', outcome_resolution_enum, nullable=True),
            sa.Column('image_url', sa.String(), nullable=True),
            sa.Column('resolved_by', sa.Integer(), nullable=True),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['market_id'], ['markets.id'], ),
            sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_market_outcomes_id'), 'market_outcomes', ['id'], unique=False)
        op.create_index(op.f('ix_market_outcomes_market_id'), 'market_outcomes', ['market_id'], unique=False)
        
        # Create unique constraint for market_id + name
        try:
            op.create_unique_constraint('uq_market_outcomes_market_name', 'market_outcomes', ['market_id', 'name'])
        except:
            pass  # Constraint might already exist
    
    # Add outcome_name columns to orders, trades, positions (check if they exist first)
    inspector = sa.inspect(conn)
    
    # Check and add outcome_name to orders
    orders_columns = [col['name'] for col in inspector.get_columns('orders')]
    if 'outcome_name' not in orders_columns:
        op.add_column('orders', sa.Column('outcome_name', sa.String(), nullable=True))
    
    # Check and add outcome_name to trades
    trades_columns = [col['name'] for col in inspector.get_columns('trades')]
    if 'outcome_name' not in trades_columns:
        op.add_column('trades', sa.Column('outcome_name', sa.String(), nullable=True))
    
    # Check and add outcome_name to positions
    positions_columns = [col['name'] for col in inspector.get_columns('positions')]
    if 'outcome_name' not in positions_columns:
        op.add_column('positions', sa.Column('outcome_name', sa.String(), nullable=True))
    
    # Migrate existing data: set outcome_name="default" for all existing records
    op.execute("UPDATE orders SET outcome_name = 'default' WHERE outcome_name IS NULL")
    op.execute("UPDATE trades SET outcome_name = 'default' WHERE outcome_name IS NULL")
    op.execute("UPDATE positions SET outcome_name = 'default' WHERE outcome_name IS NULL")
    
    # Create MarketOutcome entries for existing markets
    # For each market, create a "default" outcome if it doesn't have outcomes defined
    op.execute("""
        INSERT INTO market_outcomes (market_id, name, status, created_at)
        SELECT DISTINCT m.id, 'default', 'ACTIVE'::outcomestatus, m.created_at
        FROM markets m
        WHERE NOT EXISTS (
            SELECT 1 FROM market_outcomes mo WHERE mo.market_id = m.id
        )
    """)
    
    # Now make outcome_name NOT NULL
    op.alter_column('orders', 'outcome_name', nullable=False)
    op.alter_column('trades', 'outcome_name', nullable=False)
    op.alter_column('positions', 'outcome_name', nullable=False)
    
    # Drop old unique constraint on positions and create new one
    op.drop_constraint('unique_user_market_outcome', 'positions', type_='unique')
    op.create_unique_constraint('unique_user_market_outcome_side', 'positions', ['user_id', 'market_id', 'outcome_name', 'outcome'])
    
    # Add indexes for better query performance
    op.create_index('ix_orders_market_outcome', 'orders', ['market_id', 'outcome_name', 'outcome'], unique=False)
    op.create_index('ix_trades_market_outcome', 'trades', ['market_id', 'outcome_name', 'outcome'], unique=False)
    op.create_index('ix_positions_market_outcome', 'positions', ['market_id', 'outcome_name', 'outcome'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_positions_market_outcome', table_name='positions')
    op.drop_index('ix_trades_market_outcome', table_name='trades')
    op.drop_index('ix_orders_market_outcome', table_name='orders')
    
    # Restore old unique constraint
    op.drop_constraint('unique_user_market_outcome_side', 'positions', type_='unique')
    op.create_unique_constraint('unique_user_market_outcome', 'positions', ['user_id', 'market_id', 'outcome'])
    
    # Drop outcome_name columns
    op.drop_column('positions', 'outcome_name')
    op.drop_column('trades', 'outcome_name')
    op.drop_column('orders', 'outcome_name')
    
    # Drop market_outcomes table
    op.drop_index(op.f('ix_market_outcomes_market_id'), table_name='market_outcomes')
    op.drop_index(op.f('ix_market_outcomes_id'), table_name='market_outcomes')
    op.drop_table('market_outcomes')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS outcomeresolution')
    op.execute('DROP TYPE IF EXISTS outcomestatus')
