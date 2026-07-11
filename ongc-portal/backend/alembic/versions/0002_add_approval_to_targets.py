"""Add approved + approved_by to acquisition_targets."""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_approval_to_targets'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('acquisition_targets', sa.Column('approved', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('acquisition_targets', sa.Column('approved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.create_foreign_key('fk_acquisition_targets_approved_by', 'acquisition_targets', 'users', ['approved_by'], ['id'])


def downgrade():
    op.drop_constraint('fk_acquisition_targets_approved_by', 'acquisition_targets', type_='foreignkey')
    op.drop_column('acquisition_targets', 'approved_by')
    op.drop_column('acquisition_targets', 'approved')
