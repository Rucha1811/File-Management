import psycopg2

conn = psycopg2.connect("host=localhost port=5433 dbname=ongc_db user=ongc_user password=ongc_pass")
cur = conn.cursor()

FIELDS = [
    # FundManagement fields
    ("FundManagement", "head",      "Budget Head / Item",      "text",     1),
    ("FundManagement", "fy",        "Financial Year (FY)",     "text",     2),
    ("FundManagement", "category",  "Expense Category",        "select",   3),
    ("FundManagement", "allocated", "Allocated (Cr)",           "number",   4),
    ("FundManagement", "spent",     "Spent (Cr)",               "number",   5),
    ("FundManagement", "remaining", "Remaining (Cr)",           "number",   6),
    ("FundManagement", "month",     "Month",                   "select",   7),
    ("FundManagement", "project",   "Project Name",            "text",     8),
    ("FundManagement", "amount",    "Amount (Lakhs)",           "number",   9),
]

for page, field_name, label, field_type, sort_order in FIELDS:
    cur.execute("DELETE FROM lookups WHERE page = %s AND type = %s", (page, f"_field.{field_name}"))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        (f"_field.{field_name}", field_name, label, field_type, sort_order, page),
    )

# Seed Category options
CATEGORIES = ["Store", "Spare", "Contractual", "Other"]
for s in CATEGORIES:
    cur.execute("DELETE FROM lookups WHERE page = 'FundManagement' AND type = '_option.category' AND value = %s", (s,))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        ("_option.category", s, s, "select", CATEGORIES.index(s) + 1, "FundManagement"),
    )

# Seed Month options
MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"]
for i, m in enumerate(MONTHS):
    cur.execute("DELETE FROM lookups WHERE page = 'FundManagement' AND type = '_option.month' AND value = %s", (m,))
    cur.execute(
        "INSERT INTO lookups (type, value, label, field_type, sort_order, is_active, page) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
        ("_option.month", m, m, "select", i + 1, "FundManagement"),
    )

conn.commit()
print("FundManagement fields and options seeded successfully!")
cur.close()
conn.close()
