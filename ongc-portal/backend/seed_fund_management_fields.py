"""Seed Form Builder field configs for FundManagement page + add missing DB columns."""
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

# Add dynamic_fields column to fund_management table
cur.execute("""
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fund_management' AND column_name='dynamic_fields') THEN
            ALTER TABLE fund_management ADD COLUMN dynamic_fields TEXT;
        END IF;
    END $$;
""")

page = "FundManagement"

# Delete existing field configs for this page
cur.execute("DELETE FROM lookups WHERE page = %s AND type LIKE '_field.%%'", (page,))

fields = [
    ("head",      "Head",               "text",   1),
    ("allocated", "Allocated (₹ Cr)",   "number", 2),
    ("spent",     "Spent (₹ Cr)",       "number", 3),
    ("remaining", "Remaining (₹ Cr)",   "number", 4),
]

for field_name, label, field_type, sort_order in fields:
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        (f"_field.{field_name}", field_name, label, field_type, sort_order, page),
    )

conn.commit()
cur.close()
conn.close()
print(f"Seeded {len(fields)} fields for {page} page + missing columns added")
