from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import HSEAudit, User
from app.auth.deps import get_current_user
from datetime import date as date_type, datetime
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

COLUMN_SYNONYMS = {
    'audit_date': ['audit date', 'audit_date', 'date of audit', 'date', 'audited on'],
    'observation': ['observation', 'obs', 'findings', 'issue', 'details', 'desc'],
    'action_taken_report': ['action taken report', 'atr', 'action taken', 'action_taken', 'resolution', 'corrective action'],
    'responsible_person': ['responsible person', 'responsible_person', 'by', 'assignee', 'owner', 'responsible'],
    'due_date': ['due date', 'due_date', 'target date', 'deadline'],
    'status': ['status', 'state'],
    'action_priority': ['action priority', 'priority', 'urgency'],
    'closure_date': ['closure date', 'closure_date', 'closed on', 'completion date'],
    'audit_type': ['audit type', 'audit_type', 'type', 'area', 'category', 'scope'],
    'department': ['department', 'dept', 'section', 'division'],
}

def _norm_hdr(s):
    s = s.strip().lower()
    s = re.sub(r'\s+', ' ', s)
    for field, syns in COLUMN_SYNONYMS.items():
        for syn in syns:
            if s == syn or s.startswith(syn):
                return field
    return None

async def _scope_query(db, user, section=None):
    role_name = user.role.name if user.role else "viewer"
    q = select(HSEAudit).order_by(HSEAudit.created_at.desc())
    if role_name == "admin":
        return q
    if role_name == "ops_manager":
        mu = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
        managed_ids = {user.id} | {row[0] for row in mu}
        q = q.where(HSEAudit.created_by.in_(managed_ids))
        return q
    q = q.where(HSEAudit.created_by == user.id)
    return q

@router.get("/")
async def list_items(
    pending_only: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = await _scope_query(db, user)
    if pending_only:
        q = q.where(HSEAudit.pending_action == True)
    result = await db.execute(q)
    items = result.scalars().all()
    out = []
    from datetime import date as date_cls
    today = date_cls.today()
    for x in items:
        d = {"id": x.id}
        if x.dynamic_fields:
            try:
                df = json.loads(x.dynamic_fields)
                d.update(df)
                d["dynamic_fields"] = x.dynamic_fields
            except:
                d["dynamic_fields"] = x.dynamic_fields
        else:
            d["dynamic_fields"] = None

        # Calculate overdue status
        is_overdue = False
        days_overdue = None
        if x.pending_action and x.due_date:
            days_overdue = (today - x.due_date).days
            is_overdue = days_overdue > 0

        d.update({
            "audit_date": str(x.audit_date) if x.audit_date else None,
            "observation": x.observation,
            "action_taken_report": x.action_taken_report,
            "responsible_person": x.responsible_person,
            "due_date": str(x.due_date) if x.due_date else None,
            "status": x.status,
            "pending_action": x.pending_action,
            "action_priority": x.action_priority,
            "closure_date": str(x.closure_date) if x.closure_date else None,
            "audit_type": x.audit_type,
            "department": x.department,
            "is_overdue": is_overdue,
            "days_overdue": days_overdue if is_overdue else None,
        })
        out.append(d)
    return out

@router.post("/create", status_code=201)
async def create_item(
    dynamic_fields: str = Form(None),
    audit_date: str = Form(None),
    observation: str = Form(...),
    action_taken_report: str = Form(None),
    responsible_person: str = Form(None),
    due_date: str = Form(None),
    status: str = Form(None),
    pending_action: bool = Form(True),
    action_priority: str = Form(None),
    closure_date: str = Form(None),
    audit_type: str = Form(None),
    department: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Auto-set pending_action to False if status is Closed
    if status and status.lower() == "closed":
        pending_action = False
    
    obj = HSEAudit(
        dynamic_fields=dynamic_fields,
        audit_date=date_type.fromisoformat(audit_date) if audit_date else None,
        observation=observation,
        action_taken_report=action_taken_report,
        responsible_person=responsible_person,
        due_date=date_type.fromisoformat(due_date) if due_date else None,
        status=status,
        pending_action=pending_action,
        action_priority=action_priority,
        closure_date=date_type.fromisoformat(closure_date) if closure_date else None,
        audit_type=audit_type,
        department=department,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "HSE Audit record created"}

@router.put("/{item_id}")
async def update_item(
    item_id: int,
    dynamic_fields: str = Form(None),
    audit_date: str = Form(None),
    observation: str = Form(None),
    action_taken_report: str = Form(None),
    responsible_person: str = Form(None),
    due_date: str = Form(None),
    status: str = Form(None),
    pending_action: bool = Form(None),
    action_priority: str = Form(None),
    closure_date: str = Form(None),
    audit_type: str = Form(None),
    department: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(HSEAudit).where(HSEAudit.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "HSE Audit record not found")
    if audit_date is not None:
        obj.audit_date = date_type.fromisoformat(audit_date) if audit_date else None
    if observation is not None:
        obj.observation = observation
    if action_taken_report is not None:
        obj.action_taken_report = action_taken_report
    if responsible_person is not None:
        obj.responsible_person = responsible_person
    if due_date is not None:
        obj.due_date = date_type.fromisoformat(due_date) if due_date else None
    if status is not None:
        obj.status = status
        # Auto-set pending_action if status is Closed
        if status.lower() == "closed":
            obj.pending_action = False
            if not obj.closure_date:
                from datetime import date as date_cls
                obj.closure_date = date_cls.today()
    if pending_action is not None:
        obj.pending_action = pending_action
    if action_priority is not None:
        obj.action_priority = action_priority
    if closure_date is not None:
        obj.closure_date = date_type.fromisoformat(closure_date) if closure_date else None
    if audit_type is not None:
        obj.audit_type = audit_type
    if department is not None:
        obj.department = department
    if dynamic_fields is not None:
        obj.dynamic_fields = dynamic_fields
    await db.commit()
    return {"success": True}

@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(HSEAudit).where(HSEAudit.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "HSE Audit record not found")
    await db.delete(obj)
    await db.commit()
    return {"success": True}

@router.post("/upload-excel/preview")
async def excel_preview(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(403, "Not enough permissions")
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx files are supported")
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    sheets = wb.sheetnames
    if sheet_name and sheet_name in sheets:
        ws = wb[sheet_name]
    else:
        ws = wb.active
        sheet_name = ws.title
    headers = [c.value for c in ws[1] if c.value]
    auto_mapping = {}
    unmapped = []
    for h in headers:
        field = _norm_hdr(h)
        if field:
            auto_mapping[h] = field
        else:
            unmapped.append(h)
    preview = []
    for r in range(2, min(7, ws.max_row + 1)):
        row_data = {}
        for ci, c in enumerate(ws[r]):
            if ci < len(headers):
                val = c.value
                if isinstance(val, (datetime, date_type)):
                    row_data[headers[ci]] = val.strftime('%Y-%m-%d')
                else:
                    row_data[headers[ci]] = str(val) if val is not None else ""
        if any(row_data.values()):
            preview.append(row_data)
    title_header = next((k for k,v in auto_mapping.items() if v=="observation"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(HSEAudit.observation))
        existing = set(row[0] for row in result if row[0])
        col_idx = headers.index(title_header)
        for r in range(2, ws.max_row + 1):
            val = ws.cell(row=r, column=col_idx + 1).value
            if val and str(val).strip() in existing:
                dup_rows += 1
    wb.close()
    return {
        "auto": len(unmapped) == 0,
        "sheet_name": sheet_name,
        "sheets": sheets,
        "columns": headers,
        "row_count": max(0, ws.max_row - 1),
        "preview": preview,
        "auto_mapping": auto_mapping,
        "unmapped": unmapped,
        "duplicate_count": dup_rows,
    }

@router.post("/upload-excel/import", status_code=201)
async def excel_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    conflict: str = Form("skip"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(403, "Not enough permissions")
    mapping_dict = json.loads(mapping)
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    if sheet_name and sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
    else:
        ws = wb.active
    headers = [c.value for c in ws[1] if c.value]
    col_idx = {h: i for i, h in enumerate(headers)}
    fixed_fields = {"audit_date", "observation", "action_taken_report", "responsible_person", "due_date", "status", "audit_type", "department"}
    title_header = next((k for k,v in mapping_dict.items() if v=="observation"), None)
    existing_obs = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(HSEAudit.observation))
        existing_obs = set(row[0] for row in result if row[0])
    imported = 0
    skipped = 0
    for r in range(2, ws.max_row + 1):
        row_data = {}
        dynamic_vals = {}
        has_data = False
        for col_name, field_name in mapping_dict.items():
            if col_name not in col_idx:
                continue
            val = ws.cell(row=r, column=col_idx[col_name] + 1).value
            if val is None:
                continue
            if field_name in fixed_fields:
                if isinstance(val, (datetime, date_type)):
                    row_data[field_name] = val.date() if isinstance(val, datetime) else val
                elif field_name in ("audit_date", "due_date") and isinstance(val, str):
                    try:
                        row_data[field_name] = date_type.fromisoformat(val.split(' ')[0])
                    except:
                        row_data[field_name] = None
                else:
                    row_data[field_name] = str(val).strip() if isinstance(val, str) else val
                has_data = True
            else:
                if isinstance(val, (datetime, date_type)):
                    dynamic_vals[field_name] = val.strftime('%Y-%m-%d')
                else:
                    dynamic_vals[field_name] = str(val).strip() if isinstance(val, str) else val
                has_data = True
        if not has_data:
            continue
        item_obs = row_data.get("observation")
        if not item_obs:
            continue
        if item_obs in existing_obs:
            skipped += 1
            continue
        obj = HSEAudit(
            audit_date=row_data.get("audit_date"),
            observation=item_obs,
            action_taken_report=row_data.get("action_taken_report"),
            responsible_person=row_data.get("responsible_person"),
            due_date=row_data.get("due_date"),
            status=row_data.get("status", "Open"),
            audit_type=row_data.get("audit_type"),
            department=row_data.get("department"),
            dynamic_fields=json.dumps(dynamic_vals) if dynamic_vals else None,
            created_by=user.id,
        )
        db.add(obj)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} records imported, {skipped} duplicates skipped"}


@router.get("/pending-actions-summary")
async def pending_actions_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get summary of pending audit actions with priority breakdown."""
    from datetime import date as date_cls
    today = date_cls.today()
    
    q = await _scope_query(db, user)
    q = q.where(HSEAudit.pending_action == True)
    result = await db.execute(q)
    items = result.scalars().all()
    
    total_pending = len(items)
    overdue = []
    due_soon = []
    by_priority = {"High": 0, "Medium": 0, "Low": 0, "Unspecified": 0}
    
    for x in items:
        priority = x.action_priority or "Unspecified"
        by_priority[priority] = by_priority.get(priority, 0) + 1
        
        if x.due_date:
            days_until_due = (x.due_date - today).days
            item_data = {
                "id": x.id,
                "observation": x.observation,
                "responsible_person": x.responsible_person,
                "due_date": str(x.due_date),
                "priority": priority,
                "audit_type": x.audit_type,
                "department": x.department,
            }
            if days_until_due < 0:
                item_data["days_overdue"] = -days_until_due
                overdue.append(item_data)
            elif days_until_due <= 7:
                item_data["days_until_due"] = days_until_due
                due_soon.append(item_data)
    
    return {
        "total_pending": total_pending,
        "overdue_count": len(overdue),
        "due_soon_count": len(due_soon),
        "by_priority": by_priority,
        "overdue_items": overdue,
        "due_soon_items": due_soon,
    }
