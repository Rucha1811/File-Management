from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func as sa_func
from app.database import get_db
from app.models.base import FundManagement, User
from app.auth.deps import get_current_user
import json, openpyxl, re
from io import BytesIO
from typing import Optional

router = APIRouter()

COLUMN_SYNONYMS = {
    'head': ['head', 'budget head', 'expense head', 'item'],
    'allocated': ['allocated', 'budget', 'allocation', 'approved'],
    'spent': ['spent', 'expenditure', 'utilized', 'actual'],
    'remaining': ['remaining', 'balance', 'left', 'unspent'],
    'fy': ['fy', 'financial year', 'year'],
    'month': ['month', 'period'],
    'project': ['project', 'project name', 'project_name'],
    'category': ['category', 'expense category', 'type'],
    'amount': ['amount', 'value', 'spent amount', 'spent_amount'],
    'audited_statement': ['audited statement', 'audited_statement', 'audit statement', 'audit'],
    'expense_type': ['expense type', 'expense_type', 'expenditure type'],
    'month_end_summary': ['month end summary', 'month_end_summary', 'monthly summary', 'summary'],
}

EXPENSE_CATEGORIES = ["Store", "Spare", "Contractual", "General", "Administrative", "Maintenance", "Other"]

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
    q = select(FundManagement).order_by(FundManagement.created_at.desc())
    if role_name == "admin":
        return q
    if role_name == "ops_manager":
        mu = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
        managed_ids = {user.id} | {row[0] for row in mu}
        q = q.where(FundManagement.created_by.in_(managed_ids))
        return q
    q = q.where(FundManagement.created_by == user.id)
    return q

def _serialize(x):
    d = {"id": x.id}
    if x.dynamic_fields:
        try:
            df = json.loads(x.dynamic_fields)
            d.update(df)
            d["dynamic_fields"] = x.dynamic_fields
        except Exception:
            d["dynamic_fields"] = x.dynamic_fields
    else:
        d["dynamic_fields"] = None
    d.update({
        "head": x.head,
        "allocated": x.allocated,
        "spent": x.spent,
        "remaining": x.remaining,
        "fy": x.fy,
        "month": x.month,
        "project": x.project,
        "category": x.category,
        "amount": x.amount,
        "audited_statement": x.audited_statement,
        "expense_type": x.expense_type,
        "month_end_summary": x.month_end_summary,
        "created_at": str(x.created_at) if x.created_at else None,
    })
    return d

@router.get("/")
async def list_items(
    section: str = None,
    fy: str = None,
    month: str = None,
    project: str = None,
    category: str = None,
    expense_type: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = await _scope_query(db, user, section)
    if fy:
        q = q.where(FundManagement.fy == fy)
    if month:
        q = q.where(FundManagement.month == month)
    if project:
        q = q.where(FundManagement.project == project)
    if category:
        q = q.where(FundManagement.category == category)
    if expense_type:
        q = q.where(FundManagement.expense_type == expense_type)
    result = await db.execute(q)
    items = result.scalars().all()
    return [_serialize(x) for x in items]

@router.get("/month-end-summary")
async def month_end_summary(
    fy: str = None,
    month: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get month-end expenditure summary grouped by category."""
    q = await _scope_query(db, user)
    if fy:
        q = q.where(FundManagement.fy == fy)
    if month:
        q = q.where(FundManagement.month == month)
    result = await db.execute(q)
    items = result.scalars().all()

    summary = {}
    total_allocated = 0.0
    total_spent = 0.0
    total_remaining = 0.0

    for x in items:
        cat = x.category or "Uncategorized"
        if cat not in summary:
            summary[cat] = {"category": cat, "allocated": 0.0, "spent": 0.0, "remaining": 0.0, "count": 0}
        summary[cat]["allocated"] += x.allocated or 0
        summary[cat]["spent"] += x.spent or 0
        summary[cat]["remaining"] += x.remaining or 0
        summary[cat]["count"] += 1
        total_allocated += x.allocated or 0
        total_spent += x.spent or 0
        total_remaining += x.remaining or 0

    # Group by expense_type (Store/Spare/Contractual)
    by_expense_type = {}
    for x in items:
        et = x.expense_type or "Other"
        if et not in by_expense_type:
            by_expense_type[et] = {"expense_type": et, "allocated": 0.0, "spent": 0.0, "count": 0}
        by_expense_type[et]["allocated"] += x.allocated or 0
        by_expense_type[et]["spent"] += x.spent or 0
        by_expense_type[et]["count"] += 1

    # FY-wise summary
    fy_summary = {}
    for x in items:
        fy_key = x.fy or "Unknown"
        if fy_key not in fy_summary:
            fy_summary[fy_key] = {"fy": fy_key, "allocated": 0.0, "spent": 0.0, "remaining": 0.0}
        fy_summary[fy_key]["allocated"] += x.allocated or 0
        fy_summary[fy_key]["spent"] += x.spent or 0
        fy_summary[fy_key]["remaining"] += x.remaining or 0

    # Month-wise summary
    month_summary = {}
    for x in items:
        m_key = x.month or "Unknown"
        if m_key not in month_summary:
            month_summary[m_key] = {"month": m_key, "allocated": 0.0, "spent": 0.0, "count": 0}
        month_summary[m_key]["allocated"] += x.allocated or 0
        month_summary[m_key]["spent"] += x.spent or 0
        month_summary[m_key]["count"] += 1

    # Project-wise summary
    project_summary = {}
    for x in items:
        p_key = x.project or "Unassigned"
        if p_key not in project_summary:
            project_summary[p_key] = {"project": p_key, "allocated": 0.0, "spent": 0.0, "count": 0}
        project_summary[p_key]["allocated"] += x.allocated or 0
        project_summary[p_key]["spent"] += x.spent or 0
        project_summary[p_key]["count"] += 1

    return {
        "total": {"allocated": total_allocated, "spent": total_spent, "remaining": total_remaining},
        "by_category": list(summary.values()),
        "by_expense_type": list(by_expense_type.values()),
        "by_fy": list(fy_summary.values()),
        "by_month": list(month_summary.values()),
        "by_project": list(project_summary.values()),
        "expense_categories": EXPENSE_CATEGORIES,
    }

@router.get("/expense-categories")
async def get_expense_categories():
    return {"categories": EXPENSE_CATEGORIES}

@router.post("/create", status_code=201)
async def create_item(
    dynamic_fields: str = Form(None),
    head: str = Form(...),
    allocated: float = Form(0),
    spent: float = Form(0),
    remaining: float = Form(0),
    fy: str = Form(None),
    month: str = Form(None),
    project: str = Form(None),
    category: str = Form(None),
    amount: float = Form(0),
    audited_statement: str = Form(None),
    expense_type: str = Form(None),
    month_end_summary: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    # Auto-calculate remaining if not provided
    if remaining == 0 and allocated > 0:
        remaining = allocated - spent
    obj = FundManagement(
        head=head,
        allocated=allocated,
        spent=spent,
        remaining=remaining,
        fy=fy,
        month=month,
        project=project,
        category=category,
        amount=amount,
        audited_statement=audited_statement,
        expense_type=expense_type,
        month_end_summary=month_end_summary,
        dynamic_fields=dynamic_fields,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "fund management created"}

@router.put("/{item_id}")
async def update_item(
    item_id: int,
    dynamic_fields: str = Form(None),
    head: str = Form(None),
    allocated: float = Form(None),
    spent: float = Form(None),
    remaining: float = Form(None),
    fy: str = Form(None),
    month: str = Form(None),
    project: str = Form(None),
    category: str = Form(None),
    amount: float = Form(None),
    audited_statement: str = Form(None),
    expense_type: str = Form(None),
    month_end_summary: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(FundManagement).where(FundManagement.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "fund management not found")
    if dynamic_fields is not None:
        obj.dynamic_fields = dynamic_fields
    if head is not None:
        obj.head = head
    if allocated is not None:
        obj.allocated = allocated
    if spent is not None:
        obj.spent = spent
    if remaining is not None:
        obj.remaining = remaining
    if fy is not None:
        obj.fy = fy
    if month is not None:
        obj.month = month
    if project is not None:
        obj.project = project
    if category is not None:
        obj.category = category
    if amount is not None:
        obj.amount = amount
    if audited_statement is not None:
        obj.audited_statement = audited_statement
    if expense_type is not None:
        obj.expense_type = expense_type
    if month_end_summary is not None:
        obj.month_end_summary = month_end_summary
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
    result = await db.execute(select(FundManagement).where(FundManagement.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "fund management not found")
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
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only .xlsx/.xls files are supported")
    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    except Exception as e:
        raise HTTPException(400, f"Could not read Excel file: {e}")
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
        field = _norm_hdr(str(h))
        if field:
            auto_mapping[h] = field
        else:
            unmapped.append(h)
    preview = []
    for r in range(2, min(7, ws.max_row + 1)):
        row_data = {}
        for ci, c in enumerate(ws[r]):
            if ci < len(headers):
                row_data[str(headers[ci])] = str(c.value) if c.value is not None else ""
        if any(row_data.values()):
            preview.append(row_data)
    title_header = next((k for k, v in auto_mapping.items() if v == "head"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(FundManagement.head))
        existing = {row[0] for row in result if row[0]}
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
        "expense_categories": EXPENSE_CATEGORIES,
    }

@router.post("/upload-excel/import", status_code=201)
async def excel_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    conflict: str = Form("skip"),
    default_fy: str = Form(None),
    default_month: str = Form(None),
    default_expense_type: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(403, "Not enough permissions")
    mapping_dict = json.loads(mapping)
    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    except Exception as e:
        raise HTTPException(400, f"Could not read Excel file: {e}")
    if sheet_name and sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
    else:
        ws = wb.active
    headers = [c.value for c in ws[1] if c.value]
    col_idx = {h: i for i, h in enumerate(headers)}
    fixed_fields = {"allocated", "head", "remaining", "spent", "fy", "month", "project",
                    "category", "amount", "audited_statement", "expense_type", "month_end_summary"}
    title_header = next((k for k, v in mapping_dict.items() if v == "head"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(FundManagement.head))
        existing_names = {row[0] for row in result if row[0]}
    imported = 0
    skipped = 0
    updated = 0
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
                row_data[field_name] = str(val).strip() if isinstance(val, str) else val
                has_data = True
            else:
                dynamic_vals[field_name] = str(val).strip() if isinstance(val, str) else val
                has_data = True
        if not has_data:
            continue
        item_name = row_data.get("head", f"Imported-{r}")

        def safe_float(v, default=0.0):
            try:
                return float(v)
            except Exception:
                return default

        allocated_val = safe_float(row_data.get("allocated", 0))
        spent_val = safe_float(row_data.get("spent", 0))
        remaining_val = safe_float(row_data.get("remaining", 0))
        amount_val = safe_float(row_data.get("amount", 0))
        # Auto-calc remaining if not provided
        if remaining_val == 0 and allocated_val > 0:
            remaining_val = allocated_val - spent_val

        if item_name in existing_names:
            if conflict == "skip":
                skipped += 1
                continue
            elif conflict == "update":
                result = await db.execute(
                    select(FundManagement).where(FundManagement.head == item_name)
                )
                obj = result.scalar_one_or_none()
                if obj:
                    obj.allocated = allocated_val
                    obj.spent = spent_val
                    obj.remaining = remaining_val
                    obj.amount = amount_val
                    obj.fy = row_data.get("fy") or default_fy or obj.fy
                    obj.month = row_data.get("month") or default_month or obj.month
                    obj.project = row_data.get("project") or obj.project
                    obj.category = row_data.get("category") or obj.category
                    obj.expense_type = row_data.get("expense_type") or default_expense_type or obj.expense_type
                    obj.audited_statement = row_data.get("audited_statement") or obj.audited_statement
                    obj.month_end_summary = row_data.get("month_end_summary") or obj.month_end_summary
                    updated += 1
                    continue
                else:
                    skipped += 1
                    continue

        obj = FundManagement(
            head=item_name,
            allocated=allocated_val,
            spent=spent_val,
            remaining=remaining_val,
            fy=row_data.get("fy") or default_fy,
            month=row_data.get("month") or default_month,
            project=row_data.get("project"),
            category=row_data.get("category"),
            amount=amount_val,
            audited_statement=row_data.get("audited_statement"),
            expense_type=row_data.get("expense_type") or default_expense_type,
            month_end_summary=row_data.get("month_end_summary"),
            dynamic_fields=json.dumps(dynamic_vals) if dynamic_vals else None,
            created_by=user.id,
        )
        db.add(obj)
        imported += 1
    await db.commit()
    wb.close()
    msg = f"{imported} records imported"
    if updated:
        msg += f", {updated} updated"
    if skipped:
        msg += f", {skipped} duplicates skipped"
    return {"imported": imported, "skipped": skipped, "updated": updated, "msg": msg}

@router.get("/export-excel")
async def export_excel(
    fy: str = None,
    month: str = None,
    project: str = None,
    category: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export fund management records to Excel."""
    q = await _scope_query(db, user)
    if fy:
        q = q.where(FundManagement.fy == fy)
    if month:
        q = q.where(FundManagement.month == month)
    if project:
        q = q.where(FundManagement.project == project)
    if category:
        q = q.where(FundManagement.category == category)
    result = await db.execute(q)
    items = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Fund Management"
    headers = ["ID", "Head", "FY", "Month", "Project", "Category", "Expense Type",
               "Allocated", "Spent", "Remaining", "Amount", "Audited Statement", "Created At"]
    ws.append(headers)
    for x in items:
        ws.append([
            x.id, x.head, x.fy, x.month, x.project, x.category, x.expense_type,
            x.allocated, x.spent, x.remaining, x.amount, x.audited_statement,
            str(x.created_at) if x.created_at else "",
        ])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=fund_management_export.xlsx"},
    )
