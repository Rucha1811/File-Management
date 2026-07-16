"""add enhanced features for fund management, hse, and progress reports

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to fund_management table
    op.add_column('fund_management', sa.Column('audited_statement', sa.String(255), nullable=True))
    op.add_column('fund_management', sa.Column('expense_type', sa.String(50), nullable=True))
    op.add_column('fund_management', sa.Column('month_end_summary', sa.Text, nullable=True))
    
    # Add new columns to progress_reports table  
    op.add_column('progress_reports', sa.Column('report_image_path', sa.String(500), nullable=True))
    op.add_column('progress_reports', sa.Column('report_period', sa.String(50), nullable=True))
    op.add_column('progress_reports', sa.Column('version', sa.Integer, default=1))
    op.add_column('progress_reports', sa.Column('parent_version_id', sa.Integer, nullable=True))
    op.add_column('progress_reports', sa.Column('report_name', sa.String(255), nullable=True))
    op.add_column('progress_reports', sa.Column('share_token', sa.String(100), nullable=True))
    op.add_column('progress_reports', sa.Column('share_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('progress_reports', sa.Column('auto_delete_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add new columns to hse_certificates table
    op.add_column('hse_certificates', sa.Column('certificate_number', sa.String(100), nullable=True))
    op.add_column('hse_certificates', sa.Column('issuing_authority', sa.String(255), nullable=True))
    op.add_column('hse_certificates', sa.Column('validity_days', sa.Integer, nullable=True))
    
    # Add new columns to hse_audits table
    op.add_column('hse_audits', sa.Column('pending_action', sa.Boolean, default=True))
    op.add_column('hse_audits', sa.Column('action_priority', sa.String(20), nullable=True))
    op.add_column('hse_audits', sa.Column('closure_date', sa.Date, nullable=True))


def downgrade():
    # Remove columns from fund_management
    op.drop_column('fund_management', 'audited_statement')
    op.drop_column('fund_management', 'expense_type')
    op.drop_column('fund_management', 'month_end_summary')
    
    # Remove columns from progress_reports
    op.drop_column('progress_reports', 'report_image_path')
    op.drop_column('progress_reports', 'report_period')
    op.drop_column('progress_reports', 'version')
    op.drop_column('progress_reports', 'parent_version_id')
    op.drop_column('progress_reports', 'report_name')
    op.drop_column('progress_reports', 'share_token')
    op.drop_column('progress_reports', 'share_expires_at')
    op.drop_column('progress_reports', 'auto_delete_at')
    
    # Remove columns from hse_certificates
    op.drop_column('hse_certificates', 'certificate_number')
    op.drop_column('hse_certificates', 'issuing_authority')
    op.drop_column('hse_certificates', 'validity_days')
    
    # Remove columns from hse_audits
    op.drop_column('hse_audits', 'pending_action')
    op.drop_column('hse_audits', 'action_priority')
    op.drop_column('hse_audits', 'closure_date')
