import asyncio, json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.config import settings
from app.models.base import Base, ContractSummary, User

DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

BUDGET_DATA = {
    "rows": [
        {"budgetHead": "Capital", "be": 38.58, "re": 74.31, "utilization": 2.47, "pendingBalance": 73.76, "utilPct1": 0.35, "utilPct2": 0.89, "prRaised": 192.10, "poPlaced": 198.49, "materialReceived": None, "remarks": "Ongoing procurement"},
        {"budgetHead": "Stores", "be": 15.20, "re": 22.50, "utilization": 8.90, "pendingBalance": 13.60, "utilPct1": 1.56, "utilPct2": 2.34, "prRaised": 45.80, "poPlaced": 38.20, "materialReceived": 12.40, "remarks": "Inventory maintained"},
        {"budgetHead": "Spares", "be": 8.75, "re": 12.30, "utilization": 5.60, "pendingBalance": 6.70, "utilPct1": 0.85, "utilPct2": 1.12, "prRaised": 28.50, "poPlaced": 22.10, "materialReceived": 8.30, "remarks": ""},
        {"budgetHead": "Contractual", "be": 42.00, "re": 65.80, "utilization": 18.40, "pendingBalance": 47.40, "utilPct1": 2.10, "utilPct2": 3.45, "prRaised": 156.30, "poPlaced": 142.60, "materialReceived": 52.10, "remarks": "Multiple active contracts"},
    ]
}

ACQ_DATA = {
    "sections": ["GP-03", "GP-06", "GP-15", "GP-16", "GP-26", "GP-61", "GP-81", "NLW", "CB-ONHP-2022/1"],
    "rows": [
        {"sno": 1, "particulars": "Staff", "values": [438.06, 920.57, 156.36, 124.14, 638.25, 424.96, 365.80, 212.58, 199.00], "total": 3479.72},
        {"sno": 2, "particulars": "Stores & spares", "values": [185.20, 412.80, 65.30, 52.10, 298.40, 186.50, 154.60, 98.20, 87.50], "total": 1540.60},
        {"sno": 3, "particulars": "Other Contractuals", "values": [320.50, 685.30, 112.40, 89.60, 445.20, 312.80, 256.40, 165.30, 142.60], "total": 2530.10},
        {"sno": 4, "particulars": "Insurance", "values": [42.80, 95.60, 15.20, 12.40, 62.50, 41.30, 35.60, 22.80, 18.90], "total": 347.10},
        {"sno": 5, "particulars": "Light,Power,Fuel,Water", "values": [156.40, 325.60, 52.80, 41.20, 212.50, 148.60, 124.30, 78.50, 65.20], "total": 1205.10},
        {"sno": 6, "particulars": "Other Comp. Income", "values": [0, 0, 0, 0, 0, 0, 0, 0, 0], "total": 0},
        {"sno": 7, "particulars": "Others", "values": [65.20, 142.80, 24.50, 18.60, 98.40, 62.30, 52.10, 32.40, 28.50], "total": 524.80},
        {"sno": 8, "particulars": "Dep", "values": [28.40, 62.50, 10.80, 8.60, 42.30, 28.10, 22.40, 15.20, 12.80], "total": 231.10},
        {"sno": 9, "particulars": "Total", "values": [1236.56, 2645.17, 437.36, 346.64, 1797.55, 1204.56, 1011.20, 624.98, 554.50], "total": 9858.52},
    ]
}


async def seed():
    async with AsyncSessionLocal() as db:
        admin = await db.execute(select(User).where(User.cpf == "100001"))
        admin = admin.scalar_one_or_none()
        created_by = admin.id if admin else None

        for fy in ("2024-25", "2025-26"):
            for stype, sdata in [("budget_utilization", BUDGET_DATA), ("acquisition_cost", ACQ_DATA)]:
                r = await db.execute(
                    select(ContractSummary).where(
                        ContractSummary.summary_type == stype,
                        ContractSummary.financial_year == fy,
                    )
                )
                if r.scalar_one_or_none():
                    print(f"  {stype} / {fy} — already exists, skipping")
                    continue
                obj = ContractSummary(
                    summary_type=stype,
                    financial_year=fy,
                    data=json.dumps(sdata),
                    created_by=created_by,
                )
                db.add(obj)
                print(f"  {stype} / {fy} — seeded")

        await db.commit()
        print("\n✅ Contract summary demo data seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
