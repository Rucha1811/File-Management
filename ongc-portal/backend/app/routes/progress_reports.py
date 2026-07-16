from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.database import get_db
from app.models.base import ProgressReport, User
from app.auth.deps import get_current_user
from app.config import settings
from datetime import date as date_type, datetime, timezone, timedelta
import json, openpyxl, re, os, secrets
from io import BytesIO

router = APIRouter()

COLUMN_SYNONYMS = {
    'project_name': ['project name', 'project', 'name', 'area', 'project_name'],
    'block': ['block', 'tectonic block', 'basin'],
    'total': ['total', 'target', 'planned', 'total km²', 'total volume'],
    'completed': ['completed', 'achieved', 'done', 'completed km²'],
    'coverage': ['coverage', '%', 'percentage', 'progress %'],
    'status': ['status', 'current status', 'remarks'],
    'report_period': ['period', 'report period', 'month', 'quarter', 'year'],
    'report_name': ['report name', 'report_name', 'name', 'title'],
}

# Standard naming convention: ProjectName_YYYY_Section_Subject_Category_SeqNo
def generate_report_name(project_name: str, year: str, section: str, subject: str,
                          category: str, seq_no: str = None) -> str:
    parts = [
        project_name.replace(" ", ""),
        year or str(datetime.utcnow().year),
        section or "Progress",
        subject or "Report",
        category or "Monthly",
    ]
    if seq_no:
        parts.append(seq_no)
    return "_".join(p for p in parts if p)

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
    q = select(ProgressReport).order_by(ProgressReport.created_at.desc())
    if role_name == "admin":
        return q
    if role_name == "ops_manager":
        mu = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
        managed_ids = {user.id} | {row[0] for row in mu}
        q = q.where(ProgressReport.created_by.in_(managed_ids))
        return q
    q = q.where(ProgressReport.created_by == user.id)
    return q

def _serialize(x, base_url: str = ""):
    d = {"id": x.id}
    if x.dynamic_fields:
        try:
            df = json.loads(x.dynamic_fields)
            d.update(df)
            d["dynamic_fields"] = x.dynamic_fields
        except Exception:
            d["dynamic_fields"] = x.dynamic_fields
    else:
        d.update({
            "project_name": x.project_name,
            "block": x.block,
            "total": x.total,
            "completed": x.completed,
            "coverage": x.coverage,
            "status": x.status,
        })
    d.update({
        "id": x.id,
        "project_name": x.project_name,
        "report_period": x.report_period,
        "version": x.version or 1,
        "parent_version_id": x.parent_version_id,
        "report_name": x.report_name,
        "has_image": bool(x.report_image_path and os.path.exists(x.report_image_path)),
        "share_token": x.share_token,
        "share_expires_at": str(x.share_expires_at) if x.share_expires_at else None,
        "auto_delete_at": str(x.auto_delete_at) if x.auto_delete_at else None,
        "created_at": str(x.created_at) if x.created_at else None,
        "status": x.status,
    })
    if x.report_image_path and os.path.exists(x.report_image_path):
        d["image_url"] = f"/api/progress-reports/{x.id}/image"
    else:
        d["image_url"] = None
    return d

async def _cleanup_expired_reports(db: AsyncSession):
    """Delete reports that have passed their auto_delete_at date."""
    now = datetime.now(timezone.utc)
    q = select(ProgressReport).where(
        ProgressReport.auto_delete_at.isnot(None),
        ProgressReport.auto_delete_at <= now,
    )
    result = await db.execute(q)
    items = result.scalars().all()
    for x in items:
        if x.report_image_path and os.path.exists(x.report_image_path):
            try:
                os.remove(x.report_image_path)
            except Exception:
                pass
        await db.delete(x)
    if items:
        await db.commit()

@router.get("/")
async def list_items(
    section: str = None,
    period: str = None,
    project_name: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Cleanup expired on each list call
    await _cleanup_expired_reports(db)

    q = await _scope_query(db, user, section)
    # Only show latest versions (no parent set) for current progress reports
    q = q.where(ProgressReport.parent_version_id.is_(None))
    if period:
        q = q.where(ProgressReport.report_period == period)
    if project_name:
        q = q.where(ProgressReport.project_name.ilike(f"%{project_name}%"))
    result = await db.execute(q)
    items = result.scalars().all()
    return [_serialize(x) for x in items]

@router.get("/all-versions")
async def list_all_versions(
    project_name: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all versions including old versions, filtered by project."""
    q = await _scope_query(db, user)
    if project_name:
        q = q.where(ProgressReport.project_name.ilike(f"%{project_name}%"))
    result = await db.execute(q)
    items = result.scalars().all()
    return [_serialize(x) for x in items]

@router.get("/by-period")
async def list_by_period(
    period_type: str = "monthly",  # monthly, quarterly, yearly
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Group reports by period (month/quarter/year)."""
    await _cleanup_expired_reports(db)
    q = await _scope_query(db, user)
    result = await db.execute(q)
    items = result.scalars().all()
    
    grouped = {}
    for x in items:
        period_key = x.report_period or "Unknown"
        if period_type == "quarterly" and x.report_period:
            # Convert month to quarter
            try:
                month_num = datetime.strptime(x.report_period, "%B %Y").month
                year = x.report_period.split()[-1]
                quarter = f"Q{(month_num - 1) // 3 + 1} {year}"
                period_key = quarter
            except Exception:
                pass
        elif period_type == "yearly" and x.report_period:
            try:
                year = x.report_period.split()[-1]
                period_key = year
            except Exception:
                pass
        
        if period_key not in grouped:
            grouped[period_key] = []
        grouped[period_key].append(_serialize(x))
    
    return {"period_type": period_type, "groups": grouped}

@router.get("/{item_id}")
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(ProgressReport).where(ProgressReport.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "progress report not found")
    return _serialize(obj)

@router.get("/{item_id}/image")
async def get_report_image(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Serve the uploaded JPG image for a progress report."""
    result = await db.execute(select(ProgressReport).where(ProgressReport.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj or not obj.report_image_path:
        raise HTTPException(404, "Image not found")
    if not os.path.exists(obj.report_image_path):
        raise HTTPException(404, "Image file not found on disk")
    return FileResponse(obj.report_image_path, media_type="image/jpeg")

@router.get("/shared/{share_token}")
async def get_shared_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public access via share token (no auth required)."""
    result = await db.execute(
        select(ProgressReport).where(ProgressReport.share_token == share_token)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Shared report not found")
    now = datetime.now(timezone.utc)
    if obj.share_expires_at and obj.share_expires_at < now:
        raise HTTPException(410, "Share link has expired")
    return _serialize(obj)

@router.post("/create", status_code=201)
async def create_item(
    dynamic_fields: str = Form(None),
    project_name: str = Form(None),
    block: str = Form(None),
    total: float = Form(0),
    completed: float = Form(0),
    coverage: str = Form(None),
    status: str = Form(None),
    report_period: str = Form(None),
    report_name: str = Form(None),
    auto_delete: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    auto_delete_at = None
    if auto_delete:
        auto_delete_at = datetime.now(timezone.utc) + timedelta(days=15)
    
    obj = ProgressReport(
        dynamic_fields=dynamic_fields,
        project_name=project_name,
        block=block,
        total=total,
        completed=completed,
        coverage=coverage,
        status=status,
        report_period=report_period,
        version=1,
        report_name=report_name,
        auto_delete_at=auto_delete_at,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "progress report created"}

@router.post("/upload-image", status_code=201)
async def upload_report_image(
    file: UploadFile = File(...),
    project_name: str = Form(...),
    report_period: str = Form(None),
    report_name: str = Form(None),
    block: str = Form(None),
    status: str = Form("In Progress"),
    auto_delete: bool = Form(True),
    version_of: int = Form(None),
    year: str = Form(None),
    section: str = Form(None),
    subject: str = Form(None),
    category: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a JPG image as a progress report. No OCR processing done."""
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate file type (JPG/PNG/GIF allowed)
    allowed_ext = {"jpg", "jpeg", "png", "gif", "bmp", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(400, f"Image files only (.jpg, .jpeg, .png, .gif). Got: .{ext}")
    
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:  # 50MB limit for images
        raise HTTPException(413, "Image file too large (max 50MB)")
    
    # Generate standard report name if not provided
    if not report_name:
        report_name = generate_report_name(
            project_name=project_name,
            year=year or str(datetime.utcnow().year),
            section=section or "",
            subject=subject or "Progress",
            category=category or "Monthly",
        )
    
    # Save image to disk
    upload_dir = os.path.join(settings.UPLOAD_DIR, "progress_reports", project_name.replace(" ", "_"))
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = re.sub(r'[^\w\-_.]', '_', file.filename)
    img_path = os.path.join(upload_dir, f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{safe_name}")
    with open(img_path, "wb") as fh:
        fh.write(contents)
    
    # Handle versioning
    parent_version_id = None
    new_version = 1
    
    if version_of:
        # Get the original report
        res = await db.execute(select(ProgressReport).where(ProgressReport.id == version_of))
        original = res.scalar_one_or_none()
        if original:
            # Mark original as old version by setting parent_version_id to itself initially
            # New version will replace it in listing
            parent_version_id = version_of
            # Find highest version for this project
            res2 = await db.execute(
                select(ProgressReport).where(
                    ProgressReport.project_name == project_name
                ).order_by(ProgressReport.version.desc())
            )
            existing_versions = res2.scalars().all()
            max_ver = max((x.version or 1) for x in existing_versions) if existing_versions else 1
            new_version = max_ver + 1
    else:
        # Check if there's an existing report for this project+period to replace
        q_existing = select(ProgressReport).where(
            ProgressReport.project_name == project_name,
            ProgressReport.parent_version_id.is_(None),
        )
        if report_period:
            q_existing = q_existing.where(ProgressReport.report_period == report_period)
        res = await db.execute(q_existing)
        existing = res.scalars().all()
        if existing:
            # Archive existing as old versions
            for ex in existing:
                ex.parent_version_id = ex.id  # self-ref marks it as archived
            new_version = (max(x.version or 1 for x in existing)) + 1
    
    auto_delete_at = None
    if auto_delete:
        auto_delete_at = datetime.now(timezone.utc) + timedelta(days=15)
    
    obj = ProgressReport(
        project_name=project_name,
        block=block,
        total=0,
        completed=0,
        status=status,
        report_image_path=img_path,
        report_period=report_period,
        version=new_version,
        parent_version_id=parent_version_id,
        report_name=report_name,
        auto_delete_at=auto_delete_at,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {
        "id": obj.id,
        "msg": "Progress report image uploaded",
        "report_name": obj.report_name,
        "version": obj.version,
        "image_url": f"/api/progress-reports/{obj.id}/image",
        "auto_delete_at": str(obj.auto_delete_at) if obj.auto_delete_at else None,
    }

@router.post("/{item_id}/share")
async def generate_share_link(
    item_id: int,
    expire_days: int = Form(7),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a shareable link for a progress report."""
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(403, "Not enough permissions")
    
    result = await db.execute(select(ProgressReport).where(ProgressReport.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Progress report not found")
    
    token = secrets.token_urlsafe(24)
    obj.share_token = token
    obj.share_expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)
    await db.commit()
    
    return {
        "share_token": token,
        "share_url": f"/api/progress-reports/shared/{token}",
        "expires_at": str(obj.share_expires_at),
    }

@router.delete("/{item_id}/share")
async def revoke_share_link(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Revoke the share link for a report."""
    result = await db.execute(select(ProgressReport).where(ProgressReport.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Progress report not found")
    obj.share_token = None
    obj.share_expires_at = None
    await db.commit()
    return {"success": True}

@router.put("/{item_id}")
async def update_item(
    item_id: int,
    dynamic_fields: str = Form(None),
    project_name: str = Form(None),
    block: str = Form(None),
    total: float = Form(None),
    completed: float = Form(None),
    coverage: str = Form(None),
    status: str = Form(None),
    report_period: str = Form(None),
    report_name: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(ProgressReport).where(ProgressReport.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "progress report not found")
    if project_name is not None:
        obj.project_name = project_name
    if block is not None:
        obj.block = block
    if total is not None:
        obj.total = total
    if completed is not None:
        obj.completed = completed
    if coverage is not None:
        obj.coverage = coverage
    if status is not None:
        obj.status = status
    if report_period is not None:
        obj.report_period = report_period
    if report_name is not None:
        obj.report_name = report_name
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
    result = await db.execute(select(ProgressReport).where(ProgressReport.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "progress report not found")
    # Delete image file if exists
    if obj.report_image_path and os.path.exists(obj.report_image_path):
        try:
            os.remove(obj.report_image_path)
        except Exception:
            pass
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
    title_header = next((k for k, v in auto_mapping.items() if v == "project_name"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(ProgressReport.project_name))
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
    fixed_fields = {"block", "completed", "coverage", "project_name", "status", "total", "report_period", "report_name"}
    title_header = next((k for k, v in mapping_dict.items() if v == "project_name"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(ProgressReport.project_name))
        existing_names = {row[0] for row in result if row[0]}
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
                row_data[field_name] = str(val).strip() if isinstance(val, str) else val
                has_data = True
            else:
                dynamic_vals[field_name] = str(val).strip() if isinstance(val, str) else val
                has_data = True
        if not has_data:
            continue
        item_name = row_data.get("project_name", f"Imported-{r}")
        if item_name in existing_names:
            skipped += 1
            continue
        obj = ProgressReport(
            project_name=row_data.get("project_name"),
            block=row_data.get("block"),
            total=row_data.get("total"),
            completed=row_data.get("completed"),
            coverage=row_data.get("coverage"),
            status=row_data.get("status"),
            report_period=row_data.get("report_period"),
            report_name=row_data.get("report_name"),
            version=1,
            dynamic_fields=json.dumps(dynamic_vals) if dynamic_vals else None,
            created_by=user.id,
        )
        db.add(obj)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} records imported, {skipped} duplicates skipped"}
