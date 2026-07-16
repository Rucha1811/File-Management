import psycopg2

conn = psycopg2.connect("host=localhost port=5433 dbname=ongc_db user=ongc_user password=ongc_pass")
cur = conn.cursor()

# 1. Modify fund_management table
print("Adding columns to fund_management...")
ALTER_QUERIES = [
    "ALTER TABLE fund_management ADD COLUMN IF NOT EXISTS fy VARCHAR(50);",
    "ALTER TABLE fund_management ADD COLUMN IF NOT EXISTS month VARCHAR(50);",
    "ALTER TABLE fund_management ADD COLUMN IF NOT EXISTS project VARCHAR(255);",
    "ALTER TABLE fund_management ADD COLUMN IF NOT EXISTS category VARCHAR(50);",
    "ALTER TABLE fund_management ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0;"
]

for q in ALTER_QUERIES:
    try:
        cur.execute(q)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error executing {q}: {e}")

# 2. Create hse_certificates table
print("Creating hse_certificates...")
cur.execute("""
CREATE TABLE IF NOT EXISTS hse_certificates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    issued_to VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(50),
    dynamic_fields TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
""")
conn.commit()

# 3. Create hse_audits table
print("Creating hse_audits...")
cur.execute("""
CREATE TABLE IF NOT EXISTS hse_audits (
    id SERIAL PRIMARY KEY,
    audit_date DATE,
    observation TEXT,
    action_taken_report TEXT,
    responsible_person VARCHAR(255),
    due_date DATE,
    status VARCHAR(50),
    dynamic_fields TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
""")
conn.commit()

print("Migration completed successfully!")
cur.close()
conn.close()
