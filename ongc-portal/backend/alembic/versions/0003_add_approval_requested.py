"""Add approval_requested columns to acquisition_targets

Revision ID: 0003
Revises:
Create Date: 2026-07-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002_add_approval_to_targets"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("acquisition_targets", sa.Column("approval_requested", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("acquisition_targets", sa.Column("approval_requested_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))


def downgrade():
    op.drop_column("acquisition_targets", "approval_requested")
    op.drop_column("acquisition_targets", "approval_requested_by")
