from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import HSECertificate, User
from app.auth.deps import get_current_user
from datetime import date as date_type, datetime
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

COLUMN_SYNONYMS = {
    'name': ['name', 'certificate name', 'cert name', 'title', 'document name'],
    'issued_to': ['issued to', 'issued_to', 'to', 'contractor', 'holder'],
    'issue_date': ['issue date', 'issue_date', 'date of issue', 'issued on', 'start date'],
    'expiry_date': ['expiry date', 'expiry_date', 'date of expiry', 'expires on', 'expiry', 'valid till', 'end date'],
    'status': ['status', 'validity', 'state'],
    'certificate_number': ['certificate number', 'cert number', 'cert no', 'certificate no', 'cert_number'],
    'issuing_authority': ['issuing authority', 'issuing_authority', 'authority', 'issuer'],
    'certificate_type': ['certificate type', 'cert type', 'cert_type', 'type', 'category'],
    'department': ['department', 'dept', 'section', 'division'],
    'notes': ['notes', 'remarks', 'comments', 'remark'],
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
    q = select(HSECertificate).order_by(HSECertificate.created_at.desc())
    if role_name == "admin":
        return q
    if role_name == "ops_manager":
        mu = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
        managed_ids = {user.id} | {row[0] for row in mu}
        q = q.where(HSECertificate.created_by.in_(managed_ids))
        return q
    q = q.where(HSECertificate.created_by == user.id)
    return q

@router.get("/")
async def list_items(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = await _scope_query(db, user)
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

        # Calculate validity status
        expiry_status = "Valid"
        days_remaining = None
        if x.expiry_date:
            days_remaining = (x.expiry_date - today).days
            if days_remaining < 0:
                expiry_status = "Expired"
            elif days_remaining <= 30:
                expiry_status = "Expiring Soon"
            elif days_remaining <= 90:
                expiry_status = "Warning"

        d.update({
            "name": x.name,
            "issued_to": x.issued_to,
            "issue_date": str(x.issue_date) if x.issue_date else None,
            "expiry_date": str(x.expiry_date) if x.expiry_date else None,
            "status": x.status,
            "certificate_number": x.certificate_number,
            "issuing_authority": x.issuing_authority,
            "validity_days": x.validity_days,
            "certificate_type": x.certificate_type,
            "department": x.department,
            "notes": x.notes,
            "days_remaining": days_remaining,
            "expiry_status": expiry_status,
        })
        out.append(d)
    return out

@router.post("/create", status_code=201)
async def create_item(
    dynamic_fields: str = Form(None),
    name: str = Form(...),
    issued_to: str = Form(None),
    issue_date: str = Form(None),
    expiry_date: str = Form(None),
    status: str = Form(None),
    certificate_number: str = Form(None),
    issuing_authority: str = Form(None),
    validity_days: int = Form(None),
    certificate_type: str = Form(None),
    department: str = Form(None),
    notes: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    issue_dt = date_type.fromisoformat(issue_date) if issue_date else None
    expiry_dt = date_type.fromisoformat(expiry_date) if expiry_date else None

    # Auto-calculate validity_days if dates provided
    if not validity_days and issue_dt and expiry_dt:
        validity_days = (expiry_dt - issue_dt).days

    obj = HSECertificate(
        dynamic_fields=dynamic_fields,
        name=name,
        issued_to=issued_to,
        issue_date=issue_dt,
        expiry_date=expiry_dt,
        status=status,
        certificate_number=certificate_number,
        issuing_authority=issuing_authority,
        validity_days=validity_days,
        certificate_type=certificate_type,
        department=department,
        notes=notes,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "HSE Certificate created"}

@router.put("/{item_id}")
async def update_item(
    item_id: int,
    dynamic_fields: str = Form(None),
    name: str = Form(None),
    issued_to: str = Form(None),
    issue_date: str = Form(None),
    expiry_date: str = Form(None),
    status: str = Form(None),
    certificate_number: str = Form(None),
    issuing_authority: str = Form(None),
    validity_days: int = Form(None),
    certificate_type: str = Form(None),
    department: str = Form(None),
    notes: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(HSECertificate).where(HSECertificate.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "HSE Certificate not found")
    if name is not None:
        obj.name = name
    if issued_to is not None:
        obj.issued_to = issued_to
    if issue_date is not None:
        obj.issue_date = date_type.fromisoformat(issue_date) if issue_date else None
    if expiry_date is not None:
        obj.expiry_date = date_type.fromisoformat(expiry_date) if expiry_date else None
    if status is not None:
        obj.status = status
    if certificate_number is not None:
        obj.certificate_number = certificate_number
    if issuing_authority is not None:
        obj.issuing_authority = issuing_authority
    if validity_days is not None:
        obj.validity_days = validity_days
    if certificate_type is not None:
        obj.certificate_type = certificate_type
    if department is not None:
        obj.department = department
    if notes is not None:
        obj.notes = notes
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
    result = await db.execute(select(HSECertificate).where(HSECertificate.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "HSE Certificate not found")
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
    title_header = next((k for k,v in auto_mapping.items() if v=="name"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(HSECertificate.name))
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
    fixed_fields = {"name", "issued_to", "issue_date", "expiry_date", "status", "certificate_number", "issuing_authority", "certificate_type", "department", "notes"}
    title_header = next((k for k,v in mapping_dict.items() if v=="name"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(HSECertificate.name))
        existing_names = set(row[0] for row in result if row[0])
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
                elif field_name in ("issue_date", "expiry_date") and isinstance(val, str):
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
        item_name = row_data.get("name")
        if not item_name:
            continue
        if item_name in existing_names:
            skipped += 1
            continue
        obj = HSECertificate(
            name=item_name,
            issued_to=row_data.get("issued_to"),
            issue_date=row_data.get("issue_date"),
            expiry_date=row_data.get("expiry_date"),
            status=row_data.get("status", "Valid"),
            certificate_number=row_data.get("certificate_number"),
            issuing_authority=row_data.get("issuing_authority"),
            certificate_type=row_data.get("certificate_type"),
            department=row_data.get("department"),
            notes=row_data.get("notes"),
            dynamic_fields=json.dumps(dynamic_vals) if dynamic_vals else None,
            created_by=user.id,
        )
        db.add(obj)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} records imported, {skipped} duplicates skipped"}


@router.get("/expiring-certificates")
async def get_expiring_certificates(
    days_threshold: int = 90,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get certificates that are expiring soon or already expired."""
    from datetime import date as date_cls, timedelta
    today = date_cls.today()
    threshold_date = today + timedelta(days=days_threshold)
    
    q = await _scope_query(db, user)
    q = q.where(HSECertificate.expiry_date.isnot(None))
    result = await db.execute(q)
    items = result.scalars().all()
    
    expired = []
    expiring_soon = []
    warning = []
    
    for x in items:
        days_remaining = (x.expiry_date - today).days
        cert_data = {
            "id": x.id,
            "name": x.name,
            "issued_to": x.issued_to,
            "certificate_number": x.certificate_number,
            "expiry_date": str(x.expiry_date),
            "days_remaining": days_remaining,
        }
        if days_remaining < 0:
            expired.append(cert_data)
        elif days_remaining <= 30:
            expiring_soon.append(cert_data)
        elif days_remaining <= 90:
            warning.append(cert_data)
    
    return {
        "expired": expired,
        "expiring_soon": expiring_soon,
        "warning": warning,
        "total_expiring": len(expired) + len(expiring_soon) + len(warning),
    }
