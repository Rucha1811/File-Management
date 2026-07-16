import psycopg2

conn = psycopg2.connect("host=localhost port=5433 dbname=ongc_db user=ongc_user password=ongc_pass")
cur = conn.cursor()

FIELDS = [
    # HSECertificate fields
    ("HSECertificate", "name", "Certificate Name", "text", 1),
    ("HSECertificate", "issued_to", "Issued To", "text", 2),
    ("HSECertificate", "issue_date", "Issue Date", "date", 3),
    ("HSECertificate", "expiry_date", "Expiry Date", "date", 4),
    ("HSECertificate", "status", "Status", "select", 5),

    # HSEAudit fields
    ("HSEAudit", "audit_date", "Audit Date", "date", 1),
    ("HSEAudit", "observation", "Observation (OBS)", "textarea", 2),
    ("HSEAudit", "action_taken_report", "Action Taken Report (ATR)", "textarea", 3),
    ("HSEAudit", "responsible_person", "Responsible Person", "text", 4),
    ("HSEAudit", "due_date", "Due/Target Date", "date", 5),
    ("HSEAudit", "status", "Status", "select", 6)
]

for page, field_name, label, field_type, sort_order in FIELDS:
    cur.execute("DELETE FROM lookups WHERE page = %s AND type = %s", (page, f"_field.{field_name}"))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        (f"_field.{field_name}", field_name, label, field_type, sort_order, page),
    )

# Seed Select options
CERT_STATUSES = ["Valid", "Expired"]
for s in CERT_STATUSES:
    cur.execute("DELETE FROM lookups WHERE page = 'HSECertificate' AND type = '_option.status' AND value = %s", (s,))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        ("_option.status", s, s, "select", CERT_STATUSES.index(s) + 1, "HSECertificate"),
    )

AUDIT_STATUSES = ["Open", "In Progress", "Closed"]
for s in AUDIT_STATUSES:
    cur.execute("DELETE FROM lookups WHERE page = 'HSEAudit' AND type = '_option.status' AND value = %s", (s,))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        ("_option.status", s, s, "select", AUDIT_STATUSES.index(s) + 1, "HSEAudit"),
    )

conn.commit()
print("HSE certificate and audit fields successfully seeded in lookups!")
cur.close()
conn.close()
