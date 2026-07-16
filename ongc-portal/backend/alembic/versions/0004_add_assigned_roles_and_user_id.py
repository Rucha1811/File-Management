"""Add assigned_roles to report_templates, user_id to report_submissions."""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("report_templates", sa.Column("assigned_roles", sa.Text(), server_default="[]", nullable=True))
    op.add_column("report_submissions", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.create_foreign_key("fk_report_submissions_user_id", "report_submissions", "users", ["user_id"], ["id"])

def downgrade():
    op.drop_constraint("fk_report_submissions_user_id", "report_submissions", type_="foreignkey")
    op.drop_column("report_submissions", "user_id")
    op.drop_column("report_templates", "assigned_roles")
