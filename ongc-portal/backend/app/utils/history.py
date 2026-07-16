"""
History tracking utility for audit trail.
Tracks all changes to fund management, HSE, and progress report records.
"""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect
from app.models.base import (
    FundManagementHistory, HSECertificateHistory,
    HSEAuditHistory, ProgressReportHistory
)

HISTORY_MODEL_MAP = {
    "FundManagement": FundManagementHistory,
    "HSECertificate": HSECertificateHistory,
    "HSEAudit": HSEAuditHistory,
    "ProgressReport": ProgressReportHistory,
}

FOREIGN_KEY_MAP = {
    "FundManagement": "fund_id",
    "HSECertificate": "certificate_id",
    "HSEAudit": "audit_id",
    "ProgressReport": "report_id",
}


async def log_create(db: AsyncSession, obj, user_id: int):
    """Log creation of a record."""
    model_name = obj.__class__.__name__
    if model_name not in HISTORY_MODEL_MAP:
        return
    
    history_model = HISTORY_MODEL_MAP[model_name]
    fk_field = FOREIGN_KEY_MAP[model_name]
    
    # Get all field values as dict
    state = inspect(obj)
    changes = {}
    for attr in state.attrs:
        if attr.key not in ["id", "created_at", "updated_at", "deleted_at"]:
            value = getattr(obj, attr.key, None)
            if value is not None:
                # Convert to string for storage
                if isinstance(value, (int, float, bool)):
                    changes[attr.key] = str(value)
                elif hasattr(value, "isoformat"):  # date/datetime
                    changes[attr.key] = value.isoformat()
                else:
                    changes[attr.key] = str(value)
    
    history = history_model(
        **{fk_field: obj.id},
        changed_by=user_id,
        action="create",
        changes_json=json.dumps(changes)
    )
    db.add(history)


async def log_update(db: AsyncSession, obj, user_id: int, old_values: dict = None):
    """Log update of a record."""
    model_name = obj.__class__.__name__
    if model_name not in HISTORY_MODEL_MAP:
        return
    
    history_model = HISTORY_MODEL_MAP[model_name]
    fk_field = FOREIGN_KEY_MAP[model_name]
    
    # Get current values
    state = inspect(obj)
    changes = {}
    for attr in state.attrs:
        if attr.key in ["id", "created_at", "updated_at", "deleted_at"]:
            continue
        
        new_value = getattr(obj, attr.key, None)
        old_value = old_values.get(attr.key) if old_values else None
        
        # Only log if value changed
        if str(old_value) != str(new_value):
            changes[attr.key] = {
                "old": str(old_value) if old_value is not None else None,
                "new": str(new_value) if new_value is not None else None
            }
            
            # Log individual field change
            history = history_model(
                **{fk_field: obj.id},
                changed_by=user_id,
                action="update",
                field_name=attr.key,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None
            )
            db.add(history)
    
    # Log overall change summary
    if changes:
        history = history_model(
            **{fk_field: obj.id},
            changed_by=user_id,
            action="update",
            changes_json=json.dumps(changes)
        )
        db.add(history)


async def log_delete(db: AsyncSession, obj, user_id: int):
    """Log deletion of a record."""
    model_name = obj.__class__.__name__
    if model_name not in HISTORY_MODEL_MAP:
        return
    
    history_model = HISTORY_MODEL_MAP[model_name]
    fk_field = FOREIGN_KEY_MAP[model_name]
    
    # Get all field values before deletion
    state = inspect(obj)
    snapshot = {}
    for attr in state.attrs:
        if attr.key not in ["created_at", "updated_at", "deleted_at"]:
            value = getattr(obj, attr.key, None)
            if value is not None:
                if isinstance(value, (int, float, bool)):
                    snapshot[attr.key] = str(value)
                elif hasattr(value, "isoformat"):
                    snapshot[attr.key] = value.isoformat()
                else:
                    snapshot[attr.key] = str(value)
    
    history = history_model(
        **{fk_field: obj.id},
        changed_by=user_id,
        action="delete",
        changes_json=json.dumps(snapshot)
    )
    db.add(history)


async def get_history(db: AsyncSession, model_name: str, record_id: int):
    """Get full history for a record."""
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    
    if model_name not in HISTORY_MODEL_MAP:
        return []
    
    history_model = HISTORY_MODEL_MAP[model_name]
    fk_field = FOREIGN_KEY_MAP[model_name]
    
    result = await db.execute(
        select(history_model)
        .where(getattr(history_model, fk_field) == record_id)
        .options(selectinload(history_model.user))
        .order_by(history_model.changed_at.desc())
    )
    items = result.scalars().all()
    
    history_list = []
    for item in items:
        entry = {
            "id": item.id,
            "action": item.action,
            "changed_by": item.user.name if item.user else "Unknown",
            "changed_by_id": item.changed_by,
            "changed_at": str(item.changed_at) if item.changed_at else None,
            "field_name": item.field_name,
            "old_value": item.old_value,
            "new_value": item.new_value,
        }
        
        # Parse changes_json if available
        if item.changes_json:
            try:
                entry["changes"] = json.loads(item.changes_json)
            except:
                entry["changes"] = None
        
        history_list.append(entry)
    
    return history_list


def get_old_values(obj) -> dict:
    """Get current values of an object before modification."""
    state = inspect(obj)
    old_values = {}
    for attr in state.attrs:
        if attr.key not in ["created_at", "updated_at", "deleted_at"]:
            value = getattr(obj, attr.key, None)
            old_values[attr.key] = value
    return old_values
