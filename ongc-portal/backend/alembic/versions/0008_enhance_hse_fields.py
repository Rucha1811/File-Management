"""enhance HSE tables with severity, status, type, department fields

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    # HSEIncident: add severity and status columns
    op.add_column('hse_incidents', sa.Column('severity', sa.String(20), nullable=True))
    op.add_column('hse_incidents', sa.Column('status', sa.String(50), server_default='Open'))

    # HSECertificate: add certificate_type, department, notes columns
    op.add_column('hse_certificates', sa.Column('certificate_type', sa.String(100), nullable=True))
    op.add_column('hse_certificates', sa.Column('department', sa.String(100), nullable=True))
    op.add_column('hse_certificates', sa.Column('notes', sa.Text, nullable=True))

    # HSEAudit: add audit_type, department columns
    op.add_column('hse_audits', sa.Column('audit_type', sa.String(100), nullable=True))
    op.add_column('hse_audits', sa.Column('department', sa.String(100), nullable=True))


def downgrade():
    op.drop_column('hse_audits', 'department')
    op.drop_column('hse_audits', 'audit_type')
    op.drop_column('hse_certificates', 'notes')
    op.drop_column('hse_certificates', 'department')
    op.drop_column('hse_certificates', 'certificate_type')
    op.drop_column('hse_incidents', 'status')
    op.drop_column('hse_incidents', 'severity')
