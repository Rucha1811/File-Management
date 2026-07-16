"""Add section and area columns to report_templates."""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("report_templates", sa.Column("section", sa.String(50), nullable=True))
    op.add_column("report_templates", sa.Column("area", sa.String(50), nullable=True))


def downgrade():
    op.drop_column("report_templates", "area")
    op.drop_column("report_templates", "section")
