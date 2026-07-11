from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.database import get_db
from app.models.base import ContractSummary, User
from app.auth.deps import get_current_user
import json

router = APIRouter()


@router.get("/")
async def list_summaries(
    summary_type: str = Query(None),
    financial_year: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(ContractSummary).order_by(ContractSummary.created_at.desc())
    if summary_type:
        q = q.where(ContractSummary.summary_type == summary_type)
    if financial_year:
        q = q.where(ContractSummary.financial_year == financial_year)
    result = await db.execute(q)
    items = result.scalars().all()
    out = []
    for x in items:
        d = {
            "id": x.id,
            "summary_type": x.summary_type,
            "financial_year": x.financial_year,
            "data": json.loads(x.data) if x.data else {},
            "created_by": x.created_by,
            "created_at": str(x.created_at) if x.created_at else None,
            "updated_at": str(x.updated_at) if x.updated_at else None,
        }
        out.append(d)
    return out


@router.post("/", status_code=201)
async def create_summary(
    summary_type: str = Query(..., description="budget_utilization or acquisition_cost"),
    financial_year: str = Query(..., description="e.g. 2025-26"),
    data: str = Query(..., description="JSON string"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if summary_type not in ("budget_utilization", "acquisition_cost"):
        raise HTTPException(400, "Invalid summary_type")
    try:
        json.loads(data)
    except:
        raise HTTPException(400, "data must be valid JSON")

    obj = ContractSummary(
        summary_type=summary_type,
        financial_year=financial_year,
        data=data,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "created"}


@router.put("/{item_id}")
async def update_summary(
    item_id: int,
    data: str = Query(..., description="JSON string"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    try:
        json.loads(data)
    except:
        raise HTTPException(400, "data must be valid JSON")

    result = await db.execute(select(ContractSummary).where(ContractSummary.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "not found")
    obj.data = data
    await db.commit()
    return {"success": True}


@router.delete("/{item_id}")
async def delete_summary(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(ContractSummary).where(ContractSummary.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "not found")
    await db.delete(obj)
    await db.commit()
    return {"success": True}
