from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import SharedFile, User
from app.auth.deps import get_current_user
from datetime import datetime, timezone

router = APIRouter()

ROLES = ["Public", "Operations", "GP-03 Team", "GP-06 Team", "Admin"]

@router.get("/")
async def list_shared_files(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name if current_user.role else "viewer"
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(SharedFile).where(SharedFile.is_active == True).order_by(SharedFile.shared_at.desc())
    )
    all_files = result.scalars().all()
    files = [f for f in all_files if (now - f.shared_at).total_seconds() < f.expiry_seconds]

    out = []
    for f in files:
        can_access = (f.role == "Public" or
                      (f.role == "Admin" and role_name == "admin") or
                      (f.role == "Operations" and role_name in ["admin", "ops_manager"]) or
                      (f.role in ["GP-03 Team", "GP-06 Team"]) or
                      f.shared_by == current_user.id)
        if not can_access:
            continue
        remaining = f.expiry_seconds - (now - f.shared_at).total_seconds()
        out.append({
            "id": f.id,
            "file_name": f.file_name,
            "file_type": f.file_type,
            "shared_by_name": f.shared_by_name,
            "role": f.role,
            "expiry_seconds": f.expiry_seconds,
            "shared_at": f.shared_at.isoformat() if f.shared_at else None,
            "remaining_seconds": max(0, int(remaining)),
            "download_count": f.download_count,
            "is_active": remaining > 0,
        })
    return out

@router.post("/share")
async def share_file(
    file: UploadFile = File(...),
    role: str = Form("Public"),
    expiry_hours: int = Form(24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Choose from: {', '.join(ROLES)}")
    if expiry_hours < 1 or expiry_hours > 168:
        raise HTTPException(status_code=400, detail="Expiry must be between 1 and 168 hours")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    shared = SharedFile(
        file_name=file.filename or "unnamed",
        file_data=contents,
        file_type=file.content_type or "application/octet-stream",
        shared_by=current_user.id,
        shared_by_name=current_user.name,
        role=role,
        expiry_seconds=expiry_hours * 3600,
    )
    db.add(shared)
    await db.commit()
    await db.refresh(shared)

    return {"success": True, "id": shared.id, "message": f"File shared for {expiry_hours} hours ({role})"}

@router.get("/download/{file_id}")
async def download_shared_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SharedFile).where(SharedFile.id == file_id, SharedFile.is_active == True))
    sf = result.scalar_one_or_none()
    if not sf:
        raise HTTPException(status_code=404, detail="Shared file not found or expired")

    now = datetime.now(timezone.utc)
    if (now - sf.shared_at).total_seconds() > sf.expiry_seconds:
        sf.is_active = False
        await db.commit()
        raise HTTPException(status_code=410, detail="File sharing has expired")

    role_name = current_user.role.name if current_user.role else "viewer"
    can_access = (sf.role == "Public" or
                  (sf.role == "Admin" and role_name == "admin") or
                  (sf.role == "Operations" and role_name in ["admin", "ops_manager"]) or
                  (sf.role in ["GP-03 Team", "GP-06 Team"]) or
                  sf.shared_by == current_user.id)
    if not can_access:
        raise HTTPException(status_code=403, detail="You do not have access to this file")

    sf.download_count = (sf.download_count or 0) + 1
    await db.commit()

    from fastapi.responses import Response
    return Response(
        content=sf.file_data,
        media_type=sf.file_type,
        headers={"Content-Disposition": f'attachment; filename="{sf.file_name}"'},
    )

@router.delete("/{file_id}")
async def delete_shared_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SharedFile).where(SharedFile.id == file_id))
    sf = result.scalar_one_or_none()
    if not sf:
        raise HTTPException(status_code=404, detail="Shared file not found")
    if sf.shared_by != current_user.id:
        role_name = current_user.role.name if current_user.role else ""
        if role_name != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to delete this shared file")

    sf.is_active = False
    await db.commit()
    return {"success": True}
