"""add history tracking and configuration tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-12 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    # Create history tables for audit trail
    op.create_table(
        'fund_management_history',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('fund_id', sa.Integer(), sa.ForeignKey('fund_management.id', ondelete='CASCADE'), nullable=False),
        sa.Column('changed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),  # 'create', 'update', 'delete'
        sa.Column('field_name', sa.String(50), nullable=True),
        sa.Column('old_value', sa.Text, nullable=True),
        sa.Column('new_value', sa.Text, nullable=True),
        sa.Column('changes_json', sa.Text, nullable=True),  # Full snapshot of changes
    )
    
    op.create_table(
        'hse_certificate_history',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('certificate_id', sa.Integer(), sa.ForeignKey('hse_certificates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('changed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('field_name', sa.String(50), nullable=True),
        sa.Column('old_value', sa.Text, nullable=True),
        sa.Column('new_value', sa.Text, nullable=True),
        sa.Column('changes_json', sa.Text, nullable=True),
    )
    
    op.create_table(
        'hse_audit_history',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('audit_id', sa.Integer(), sa.ForeignKey('hse_audits.id', ondelete='CASCADE'), nullable=False),
        sa.Column('changed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('field_name', sa.String(50), nullable=True),
        sa.Column('old_value', sa.Text, nullable=True),
        sa.Column('new_value', sa.Text, nullable=True),
        sa.Column('changes_json', sa.Text, nullable=True),
    )
    
    op.create_table(
        'progress_report_history',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('progress_reports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('changed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('field_name', sa.String(50), nullable=True),
        sa.Column('old_value', sa.Text, nullable=True),
        sa.Column('new_value', sa.Text, nullable=True),
        sa.Column('changes_json', sa.Text, nullable=True),
    )
    
    # Create configuration table for dynamic values (no more hardcoding!)
    op.create_table(
        'system_config',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('category', sa.String(50), nullable=False),  # 'expense_type', 'expense_category', 'month', etc.
        sa.Column('value', sa.String(255), nullable=False),
        sa.Column('display_order', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Create index for faster config lookups
    op.create_index('ix_system_config_category', 'system_config', ['category', 'is_active'])
    
    # Add indexes to history tables for performance
    op.create_index('ix_fund_history_fund_id', 'fund_management_history', ['fund_id'])
    op.create_index('ix_cert_history_cert_id', 'hse_certificate_history', ['certificate_id'])
    op.create_index('ix_audit_history_audit_id', 'hse_audit_history', ['audit_id'])
    op.create_index('ix_report_history_report_id', 'progress_report_history', ['report_id'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_system_config_category', 'system_config')
    op.drop_index('ix_fund_history_fund_id', 'fund_management_history')
    op.drop_index('ix_cert_history_cert_id', 'hse_certificate_history')
    op.drop_index('ix_audit_history_audit_id', 'hse_audit_history')
    op.drop_index('ix_report_history_report_id', 'progress_report_history')
    
    # Drop tables
    op.drop_table('system_config')
    op.drop_table('progress_report_history')
    op.drop_table('hse_audit_history')
    op.drop_table('hse_certificate_history')
    op.drop_table('fund_management_history')
