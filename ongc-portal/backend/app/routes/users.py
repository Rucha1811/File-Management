from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.base import User, Role, SectionConfig
from app.auth.deps import get_current_user
from app.auth.security import hash_password

router = APIRouter()

# ── Section Config endpoints ──

@router.get("/section-config")
async def list_section_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    res = await db.execute(select(SectionConfig))
    configs = res.scalars().all()
    return [
        {
            "id": c.id,
            "section": c.section,
            "user_category": c.user_category,
            "ops_manager_id": c.ops_manager_id,
            "location": c.location,
        }
        for c in configs
    ]

@router.get("/derive")
async def derive_fields(
    section: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await derive_from_section(db, section)
    return result


async def derive_from_section(db: AsyncSession, section: str) -> dict:
    result = {"section": section, "user_category": None, "ops_manager_id": None, "location": None}
    if not section:
        return result
    q = select(SectionConfig).where(SectionConfig.section == section)
    res = await db.execute(q)
    cfg = res.scalar_one_or_none()
    if cfg:
        result["user_category"] = cfg.user_category
        result["ops_manager_id"] = cfg.ops_manager_id
        result["location"] = cfg.location
    return result


@router.get("/public")
async def list_users_public(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.role), selectinload(User.ops_manager))
    )
    users = result.scalars().all()
    return [
        {
            "cpf": u.cpf,
            "name": u.name,
            "area": u.area,
            "role": u.role.name if u.role else "viewer",
            "user_category": u.user_category,
            "ops_manager_name": u.ops_manager.name if u.ops_manager else None,
        }
        for u in users if u.is_active
    ]

@router.get("/")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(User).options(selectinload(User.role), selectinload(User.ops_manager))
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "cpf": u.cpf,
            "name": u.name,
            "designation": u.designation,
            "section": u.section,
            "level": u.level,
            "is_active": u.is_active,
            "role": u.role.name if u.role else "viewer",
            "role_name": u.role.name if u.role else "viewer",
            "area": u.area,
            "user_category": u.user_category,
            "ops_manager_id": u.ops_manager_id,
            "ops_manager_name": u.ops_manager.name if u.ops_manager else None,
        }
        for u in users
    ]


@router.post("/create")
async def create_user(
    cpf: str = Body(...),
    password: str = Body(...),
    name: str = Body(None),
    designation: str = Body(None),
    section: str = Body(None),
    role_name: str = Body("viewer"),
    area: str = Body(None),
    user_category: str = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")

    res = await db.execute(select(User).where(User.cpf == cpf))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="CPF already exists")

    ROLE_MAP = {"admin":1, "ops_manager":2, "data_creator":3, "viewer":4}
    role_id = ROLE_MAP.get(role_name, 4)

    res = await db.execute(select(Role).where(Role.id == role_id))
    role = res.scalar_one_or_none()
    if not role:
        role = Role(id=role_id, name=role_name, description=f"Role {role_name}")
        db.add(role)
        await db.commit()
        await db.refresh(role)

    # Auto-derive from section
    derived = await derive_from_section(db, section)
    user_category = derived["user_category"] if user_category is None else user_category
    ops_manager_id = derived["ops_manager_id"]
    if not area and derived.get("location"):
        area = derived["location"]

    user = User(
        cpf=cpf,
        password_hash=hash_password(password),
        name=name or f"Employee {cpf}",
        designation=designation,
        section=section,
        area=area,
        user_category=user_category,
        ops_manager_id=ops_manager_id,
        level=0,
        is_active=True,
        role_id=role_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "cpf": user.cpf,
        "name": user.name,
        "role": role.name,
        "section": user.section,
        "area": user.area,
        "user_category": user.user_category,
        "ops_manager_id": user.ops_manager_id,
    }


@router.put("/{user_id}/role")
async def update_user_role(
    user_id: int,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change roles")

    res = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role and user.role.name == "admin":
        raise HTTPException(status_code=403, detail="Admin user's role cannot be changed")

    role_name = payload.get("role_name", "viewer")

    ROLE_MAP = {"admin":1, "ops_manager":2, "data_creator":3, "viewer":4}
    role_id = ROLE_MAP.get(role_name, 4)

    res = await db.execute(select(Role).where(Role.id == role_id))
    role = res.scalar_one_or_none()
    if not role:
        role = Role(id=role_id, name=role_name, description=f"Role {role_name}")
        db.add(role)
        await db.commit()
        await db.refresh(role)

    user.role_id = role_id
    await db.commit()
    await db.refresh(user)

    return {"id": user.id, "cpf": user.cpf, "name": user.name, "role": role.name}


@router.put("/{user_id}/profile")
async def update_user_profile(
    user_id: int,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update profiles")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changed_section = "section" in payload and payload["section"] != user.section
    if changed_section:
        derived = await derive_from_section(db, payload["section"])
        payload.setdefault("user_category", derived["user_category"])
        payload.setdefault("ops_manager_id", derived["ops_manager_id"])

    for field in ("section", "designation", "area", "user_category", "ops_manager_id"):
        if field in payload:
            setattr(user, field, payload[field])
    await db.commit()
    await db.refresh(user)

    return {"id": user.id, "cpf": user.cpf, "name": user.name, "section": user.section, "area": user.area, "user_category": user.user_category, "ops_manager_id": user.ops_manager_id}
