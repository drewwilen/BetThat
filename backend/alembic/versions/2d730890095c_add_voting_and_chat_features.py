"""add_voting_and_chat_features

Revision ID: 2d730890095c
Revises: 71f372c1e025
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2d730890095c'
down_revision = '71f372c1e025'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Create market_votes table if missing
    if 'market_votes' not in tables:
        op.create_table(
            'market_votes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('market_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('vote_type', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['market_id'], ['markets.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('market_id', 'user_id', name='unique_market_user_vote')
        )
    existing_indexes = inspector.get_indexes('market_votes') if 'market_votes' in tables else []
    if not any(idx['name'] == op.f('ix_market_votes_id') for idx in existing_indexes):
        op.create_index(op.f('ix_market_votes_id'), 'market_votes', ['id'], unique=False)
    
    # Create market_messages table if missing
    if 'market_messages' not in tables:
        op.create_table(
            'market_messages',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('market_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['market_id'], ['markets.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    existing_indexes = inspector.get_indexes('market_messages') if 'market_messages' in tables else []
    if not any(idx['name'] == op.f('ix_market_messages_id') for idx in existing_indexes):
        op.create_index(op.f('ix_market_messages_id'), 'market_messages', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_market_messages_id'), table_name='market_messages')
    op.drop_table('market_messages')
    op.drop_index(op.f('ix_market_votes_id'), table_name='market_votes')
    op.drop_table('market_votes')
