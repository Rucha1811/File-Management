from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.database import get_db
from app.models.base import SystemConfig, User
from app.auth.deps import get_current_user
from typing import List, Optional

router = APIRouter()

# Seed data for initial configuration
DEFAULT_CONFIG = {
    "expense_type": [
        "Store", "Spare", "Contractual", "General", 
        "Administrative", "Maintenance", "Capital", "Operational", "Other"
    ],
    "expense_category": [
        "Store", "Spare", "Contractual", "Equipment", 
        "Services", "Supplies", "Infrastructure", "Other"
    ],
    "month": [
        "April", "May", "June", "July", "August", "September",
        "October", "November", "December", "January", "February", "March"
    ],
    "financial_year": [
        "FY 2026-27", "FY 2025-26", "FY 2024-25", "FY 2023-24",
        "FY 2022-23", "FY 2021-22", "FY 2020-21"
    ],
    "action_priority": ["High", "Medium", "Low", "Critical"],
    "audit_status": ["Open", "In Progress", "Closed", "Resolved", "Pending"],
    "certificate_status": ["Valid", "Expired", "Expiring Soon", "Suspended", "Cancelled"],
    "report_category": ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "Fortnight", "Weekly"],
    "report_subject": ["Progress", "Audit", "Financial", "Technical", "Operational", "HSE"],
    "section": [
        "GP-03", "GP-05", "GP-06", "GP-15", "GP-16", "GP-18", "GP-18V",
        "GP-24", "GP-24V", "GP-25", "GP-26", "GP-26V", "GP-35", "GP-36",
        "GP-61", "GP-81", "GP-82", "GP-85", "REL", "RCC", "HSE", 
        "Contracts", "Operations", "Base Office"
    ],
}

@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get list of all configuration categories."""
    result = await db.execute(
        select(SystemConfig.category).distinct().where(SystemConfig.is_active == True)
    )
    categories = [row[0] for row in result.all()]
    return {"categories": sorted(categories)}

@router.get("/{category}")
async def get_config_values(
    category: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all values for a specific configuration category."""
    result = await db.execute(
        select(SystemConfig)
        .where(SystemConfig.category == category, SystemConfig.is_active == True)
        .order_by(SystemConfig.display_order, SystemConfig.value)
    )
    items = result.scalars().all()
    
    # If category not found and it's in default config, auto-seed it
    if not items and category in DEFAULT_CONFIG:
        await seed_category(db, category, DEFAULT_CONFIG[category])
        result = await db.execute(
            select(SystemConfig)
            .where(SystemConfig.category == category, SystemConfig.is_active == True)
            .order_by(SystemConfig.display_order, SystemConfig.value)
        )
        items = result.scalars().all()
    
    return {
        "category": category,
        "values": [{"id": item.id, "value": item.value, "display_order": item.display_order, "description": item.description} for item in items]
    }

@router.post("/{category}/add")
async def add_config_value(
    category: str,
    value: str = Form(...),
    description: str = Form(None),
    display_order: int = Form(0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Add a new value to a configuration category. Admin only."""
    role_name = user.role.name if user.role else "viewer"
    if role_name != "admin":
        raise HTTPException(403, "Admin access required")
    
    # Check if value already exists
    result = await db.execute(
        select(SystemConfig).where(
            SystemConfig.category == category,
            SystemConfig.value == value
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if not existing.is_active:
            # Reactivate if was disabled
            existing.is_active = True
            await db.commit()
            return {"success": True, "message": "Value reactivated", "id": existing.id}
        raise HTTPException(400, "Value already exists in this category")
    
    # Add new config value
    config = SystemConfig(
        category=category,
        value=value,
        description=description,
        display_order=display_order,
        is_active=True
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    
    return {"success": True, "message": "Config value added", "id": config.id}

@router.put("/{config_id}")
async def update_config_value(
    config_id: int,
    value: str = Form(None),
    description: str = Form(None),
    display_order: int = Form(None),
    is_active: bool = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a configuration value. Admin only."""
    role_name = user.role.name if user.role else "viewer"
    if role_name != "admin":
        raise HTTPException(403, "Admin access required")
    
    result = await db.execute(select(SystemConfig).where(SystemConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(404, "Config value not found")
    
    if value is not None:
        config.value = value
    if description is not None:
        config.description = description
    if display_order is not None:
        config.display_order = display_order
    if is_active is not None:
        config.is_active = is_active
    
    await db.commit()
    return {"success": True, "message": "Config value updated"}

@router.delete("/{config_id}")
async def delete_config_value(
    config_id: int,
    soft: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a configuration value. Admin only. Soft delete by default."""
    role_name = user.role.name if user.role else "viewer"
    if role_name != "admin":
        raise HTTPException(403, "Admin access required")
    
    result = await db.execute(select(SystemConfig).where(SystemConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(404, "Config value not found")
    
    if soft:
        config.is_active = False
        await db.commit()
        return {"success": True, "message": "Config value deactivated"}
    else:
        await db.delete(config)
        await db.commit()
        return {"success": True, "message": "Config value permanently deleted"}

@router.post("/seed-all")
async def seed_all_defaults(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Seed all default configuration values. Admin only, first-time setup."""
    role_name = user.role.name if user.role else "viewer"
    if role_name != "admin":
        raise HTTPException(403, "Admin access required")
    
    seeded = []
    for category, values in DEFAULT_CONFIG.items():
        count = await seed_category(db, category, values)
        if count > 0:
            seeded.append(f"{category}: {count} values")
    
    return {
        "success": True,
        "message": "Default configuration seeded",
        "seeded": seeded
    }

@router.post("/seed-category/{category}")
async def seed_category_endpoint(
    category: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Seed a specific category with default values. Admin only."""
    role_name = user.role.name if user.role else "viewer"
    if role_name != "admin":
        raise HTTPException(403, "Admin access required")
    
    if category not in DEFAULT_CONFIG:
        raise HTTPException(404, f"No default configuration found for category: {category}")
    
    count = await seed_category(db, category, DEFAULT_CONFIG[category])
    return {
        "success": True,
        "message": f"Seeded {count} values for category: {category}"
    }

async def seed_category(db: AsyncSession, category: str, values: List[str]) -> int:
    """Helper function to seed a category with values if they don't exist."""
    # Get existing values
    result = await db.execute(
        select(SystemConfig.value).where(SystemConfig.category == category)
    )
    existing = {row[0] for row in result.all()}
    
    # Add missing values
    count = 0
    for i, value in enumerate(values):
        if value not in existing:
            config = SystemConfig(
                category=category,
                value=value,
                display_order=i,
                is_active=True
            )
            db.add(config)
            count += 1
    
    if count > 0:
        await db.commit()
    
    return count
