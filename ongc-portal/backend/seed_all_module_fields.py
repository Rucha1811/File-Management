"""Seed Form Builder field configs for all module pages + add dynamic_fields columns."""
import psycopg2

conn = psycopg2.connect("host=localhost port=5433 dbname=ongc_db user=ongc_user password=ongc_pass")
cur = conn.cursor()

# Add missing columns to lookups table
cur.execute("""
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lookups' AND column_name='page') THEN
            ALTER TABLE lookups ADD COLUMN page VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lookups' AND column_name='label') THEN
            ALTER TABLE lookups ADD COLUMN label VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lookups' AND column_name='field_type') THEN
            ALTER TABLE lookups ADD COLUMN field_type VARCHAR(20) DEFAULT 'text';
        END IF;
    END $$;
""")

# Add dynamic_fields column to each module table
TABLES = [
    "highlights", "technical_reports", "progress_reports", "manpower_status",
    "contract_status", "data_processing_items", "regional_lab_equipment",
    "reporting_appraisals", "pending_issues", "hse_incidents", "awp_items",
    "fund_management",
]
for tbl in TABLES:
    cur.execute(f"""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='{tbl}' AND column_name='dynamic_fields') THEN
                ALTER TABLE {tbl} ADD COLUMN dynamic_fields TEXT;
            END IF;
        END $$;
    """)

# Page field definitions: (page_name, field_name, label, field_type, sort_order)
ALL_FIELDS = [
    # PendingIssues
    ("PendingIssues", "description", "Description", "text", 1),
    ("PendingIssues", "raised_by", "Raised By", "text", 2),
    ("PendingIssues", "date", "Date", "date", 3),
    ("PendingIssues", "edc", "Expected Completion", "date", 4),
    ("PendingIssues", "status", "Status", "text", 5),
    # HSE
    ("HSE", "date", "Date", "date", 1),
    ("HSE", "incident_type", "Incident Type", "text", 2),
    ("HSE", "location", "Location", "text", 3),
    ("HSE", "description", "Description", "textarea", 4),
    ("HSE", "action_taken", "Action Taken", "textarea", 5),
    # ProgressReport
    ("ProgressReport", "project_name", "Project", "text", 1),
    ("ProgressReport", "block", "Block", "text", 2),
    ("ProgressReport", "total", "Total", "number", 3),
    ("ProgressReport", "completed", "Completed", "number", 4),
    ("ProgressReport", "coverage", "Coverage", "text", 5),
    ("ProgressReport", "status", "Status", "text", 6),
    # ContractStatus
    ("ContractStatus", "contract", "Contract", "text", 1),
    ("ContractStatus", "vendor", "Vendor", "text", 2),
    ("ContractStatus", "value", "Value", "text", 3),
    ("ContractStatus", "award_date", "Award Date", "date", 4),
    ("ContractStatus", "completion_date", "Completion Date", "date", 5),
    ("ContractStatus", "status", "Status", "text", 6),
    # ManpowerStatus
    ("ManpowerStatus", "category", "Category", "text", 1),
    ("ManpowerStatus", "total", "Total", "number", 2),
    ("ManpowerStatus", "deployed", "Deployed", "number", 3),
    ("ManpowerStatus", "on_leave", "On Leave", "number", 4),
    ("ManpowerStatus", "training", "Training", "number", 5),
    # DataProcessing
    ("DataProcessing", "project", "Project", "text", 1),
    ("DataProcessing", "volume", "Volume", "number", 2),
    ("DataProcessing", "unit", "Unit", "text", 3),
    ("DataProcessing", "progress", "Progress %", "number", 4),
    ("DataProcessing", "status", "Status", "text", 5),
    ("DataProcessing", "due_date", "Due Date", "date", 6),
    # RegionalLab
    ("RegionalLab", "equipment", "Equipment", "text", 1),
    ("RegionalLab", "status", "Status", "text", 2),
    ("RegionalLab", "last_calibration", "Last Calibration", "date", 3),
    ("RegionalLab", "next_due", "Next Due", "text", 4),
    # ReportingAppraisals
    ("ReportingAppraisals", "period", "Period", "text", 1),
    ("ReportingAppraisals", "submitted", "Submitted Date", "date", 2),
    ("ReportingAppraisals", "by", "By", "text", 3),
    ("ReportingAppraisals", "status", "Status", "text", 4),
    # TechnicalReports
    ("TechnicalReports", "title", "Title", "text", 1),
    ("TechnicalReports", "category", "Category", "text", 2),
    ("TechnicalReports", "author", "Author", "text", 3),
    ("TechnicalReports", "status", "Status", "text", 4),
    # Highlights
    ("Highlights", "title", "Title", "text", 1),
    ("Highlights", "description", "Description", "textarea", 2),
    ("Highlights", "author", "Author", "text", 3),
    # AWP
    ("AWP", "Activity", "Activity", "text", 1),
    ("AWP", "Target", "Target", "text", 2),
    ("AWP", "Achieved", "Achieved", "text", 3),
    ("AWP", "Progress %", "Progress %", "text", 4),
    ("AWP", "Deadline", "Deadline", "date", 5),
    ("AWP", "Status", "Status", "select", 6),
    ("AWP", "Assigned To", "Assigned To", "text", 7),
    ("AWP", "Remarks", "Remarks", "textarea", 8),
]

for page, field_name, label, field_type, sort_order in ALL_FIELDS:
    cur.execute(
        "DELETE FROM lookups WHERE page = %s AND type = %s",
        (page, f"_field.{field_name}"),
    )
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        (f"_field.{field_name}", field_name, label, field_type, sort_order, page),
    )

# Seed AWP Status lookup options
AWP_STATUSES = ["On Track", "At Risk", "Completed", "Critical"]
for s in AWP_STATUSES:
    cur.execute("DELETE FROM lookups WHERE page = 'AWP' AND type = '_option.Status' AND value = %s", (s,))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        ("_option.Status", s, s, "select", AWP_STATUSES.index(s) + 1, "AWP"),
    )

conn.commit()
cur.close()
conn.close()

pages = set(p for p, _, _, _, _ in ALL_FIELDS)
print(f"Seeded fields for {len(pages)} pages: {', '.join(sorted(pages))}")
