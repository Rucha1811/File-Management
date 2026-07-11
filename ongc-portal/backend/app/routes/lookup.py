from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete as sa_delete, distinct, func
from app.database import get_db
from app.models.base import Lookup, User
from app.auth.deps import get_current_user

router = APIRouter()

@router.get("/pages")
async def list_pages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await db.execute(select(distinct(Lookup.page)).where(Lookup.page.isnot(None)).order_by(Lookup.page))
    pages = [row[0] for row in result.all() if row[0]]
    return pages

@router.get("/types")
async def list_types(
    page: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    q = select(distinct(Lookup.type))
    if page:
        q = q.where(Lookup.page == page)
    q = q.where(Lookup.type.not_like("_%"))
    q = q.order_by(Lookup.type)
    result = await db.execute(q)
    types = [row[0] for row in result.all() if row[0]]
    return types

@router.get("/{lookup_type}")
async def get_lookups(
    lookup_type: str,
    page: str = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Lookup).where(Lookup.type == lookup_type, Lookup.is_active == True)
    if page:
        q = q.where(Lookup.page == page)
    q = q.order_by(Lookup.sort_order, Lookup.value)
    result = await db.execute(q)
    return [{"id": r.id, "value": r.value} for r in result.scalars().all()]


@router.get("/{lookup_type}/all")
async def get_all_lookups(
    lookup_type: str,
    page: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    q = select(Lookup).where(Lookup.type == lookup_type)
    if page:
        q = q.where(Lookup.page == page)
    q = q.order_by(Lookup.sort_order, Lookup.value)
    result = await db.execute(q)
    return [{"id": r.id, "value": r.value, "sort_order": r.sort_order, "is_active": r.is_active, "page": r.page} for r in result.scalars().all()]


@router.post("/{lookup_type}")
async def add_lookup(
    lookup_type: str,
    value: str = Body(...),
    sort_order: int = Body(0),
    page: str = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    lookup = Lookup(type=lookup_type, value=value, sort_order=sort_order, page=page)
    db.add(lookup)
    await db.commit()
    await db.refresh(lookup)
    return {"id": lookup.id, "value": lookup.value, "type": lookup.type, "page": lookup.page}


@router.put("/{lookup_type}/{lookup_id}")
async def update_lookup(
    lookup_type: str,
    lookup_id: int,
    value: str = Body(None),
    sort_order: int = Body(None),
    is_active: bool = Body(None),
    page: str = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await db.execute(select(Lookup).where(Lookup.id == lookup_id, Lookup.type == lookup_type))
    lookup = result.scalar_one_or_none()
    if not lookup:
        raise HTTPException(status_code=404, detail="Lookup not found")
    if value is not None:
        lookup.value = value
    if sort_order is not None:
        lookup.sort_order = sort_order
    if is_active is not None:
        lookup.is_active = is_active
    if page is not None:
        lookup.page = page
    await db.commit()
    return {"id": lookup.id, "value": lookup.value, "is_active": lookup.is_active, "page": lookup.page}


@router.get("/{page}/fields")
async def list_page_fields(
    page: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefix = f"_field."
    result = await db.execute(
        select(Lookup)
        .where(Lookup.page == page, Lookup.type.startswith(prefix))
        .order_by(Lookup.sort_order, Lookup.id)
    )
    return [{"id": r.id, "field_name": r.value, "label": r.label, "field_type": r.field_type, "sort_order": r.sort_order} for r in result.scalars().all()]


@router.post("/{page}/fields", status_code=201)
async def add_page_field(
    page: str,
    field_name: str = Body(...),
    label: str = Body(...),
    field_type: str = Body("text"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    max_order = await db.execute(
        select(func.coalesce(func.max(Lookup.sort_order), -1))
        .where(Lookup.page == page, Lookup.type.startswith("_field."))
    )
    next_order = max_order.scalar() + 1
    lookup = Lookup(type=f"_field.{field_name}", page=page, value=field_name, label=label, field_type=field_type, sort_order=next_order, is_active=True)
    db.add(lookup)
    await db.commit()
    await db.refresh(lookup)
    return {"id": lookup.id, "field_name": field_name, "label": label, "field_type": field_type, "sort_order": lookup.sort_order}


@router.put("/{page}/fields/{field_id}")
async def update_page_field(
    page: str,
    field_id: int,
    label: str = Body(None),
    field_type: str = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await db.execute(select(Lookup).where(Lookup.id == field_id, Lookup.page == page))
    lookup = result.scalar_one_or_none()
    if not lookup:
        raise HTTPException(status_code=404, detail="Field not found")
    if label is not None:
        lookup.label = label
    if field_type is not None:
        lookup.field_type = field_type
    await db.commit()
    return {"id": lookup.id, "label": lookup.label, "field_type": lookup.field_type}


@router.put("/{page}/fields/{field_id}/reorder")
async def reorder_page_field(
    page: str,
    field_id: int,
    direction: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    if direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction must be 'up' or 'down'")
    all_fields = await db.execute(
        select(Lookup).where(Lookup.page == page, Lookup.type.startswith("_field."))
        .order_by(Lookup.sort_order, Lookup.id)
    )
    all_fields = all_fields.scalars().all()
    idx = next((i for i, f in enumerate(all_fields) if f.id == field_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Field not found")
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if swap_idx < 0 or swap_idx >= len(all_fields):
        raise HTTPException(status_code=400, detail=f"Cannot move {direction} — already at edge")
    target = all_fields[swap_idx]
    target.sort_order, all_fields[idx].sort_order = all_fields[idx].sort_order, target.sort_order
    await db.commit()
    return {"reordered": True}

@router.delete("/{page}/fields/{field_id}")
async def delete_page_field(
    page: str,
    field_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await db.execute(select(Lookup).where(Lookup.id == field_id, Lookup.page == page))
    lookup = result.scalar_one_or_none()
    if not lookup:
        raise HTTPException(status_code=404, detail="Field not found")
    field_name = lookup.value
    await db.execute(sa_delete(Lookup).where(Lookup.id == field_id))
    await db.execute(sa_delete(Lookup).where(Lookup.type == field_name, Lookup.page == page))
    await db.commit()
    return {"deleted": True}


@router.delete("/{lookup_type}/{lookup_id}")
async def delete_lookup(
    lookup_type: str,
    lookup_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    await db.execute(sa_delete(Lookup).where(Lookup.id == lookup_id, Lookup.type == lookup_type))
    await db.commit()
    return {"deleted": True}
