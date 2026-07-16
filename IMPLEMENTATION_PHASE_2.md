# Implementation Phase 2 - Database-Driven & History Tracking

## What Was Completed

### 1. New Database Tables (Migration 0007)
✅ Created `/backend/alembic/versions/0007_add_history_and_config.py`

**History Tables (Audit Trail):**
- `fund_management_history` - Tracks all fund record changes
- `hse_certificate_history` - Tracks certificate changes
- `hse_audit_history` - Tracks audit changes
- `progress_report_history` - Tracks report changes

**Configuration Table:**
- `system_config` - Dynamic configuration values (NO MORE HARDCODING!)
  - Categories: expense_type, expense_category, month, financial_year, action_priority, audit_status, certificate_status, report_category, report_subject, section
  - Supports: add, update, delete (soft/hard), ordering, descriptions

### 2. New Models
✅ Added to `/backend/app/models/base.py`:
- `FundManagementHistory`
- `HSECertificateHistory`
- `HSEAuditHistory`
- `ProgressReportHistory`
- `SystemConfig`

### 3. System Configuration Management
✅ Created `/backend/app/routes/system_config.py`

**Features:**
- Get all categories: `GET /api/system-config/categories`
- Get category values: `GET /api/system-config/{category}`
- Add value: `POST /api/system-config/{category}/add`
- Update value: `PUT /api/system-config/{config_id}`
- Delete value: `DELETE /api/system-config/{config_id}`
- Seed defaults: `POST /api/system-config/seed-all`
- Seed specific category: `POST /api/system-config/seed-category/{category}`

**Default Categories Pre-Configured:**
- expense_type: Store, Spare, Contractual, General, Administrative, Maintenance, Capital, Operational, Other
- expense_category: Store, Spare, Contractual, Equipment, Services, Supplies, Infrastructure, Other
- month: April - March (fiscal year order)
- financial_year: FY 2026-27 back to FY 2020-21
- action_priority: High, Medium, Low, Critical
- audit_status: Open, In Progress, Closed, Resolved, Pending
- certificate_status: Valid, Expired, Expiring Soon, Suspended, Cancelled
- report_category: Monthly, Quarterly, Half-Yearly, Yearly, Fortnight, Weekly
- report_subject: Progress, Audit, Financial, Technical, Operational, HSE
- section: All GP sections, REL, RCC, HSE, Contracts, Operations, Base Office

### 4. History Tracking Utility
✅ Created `/backend/app/utils/history.py`

**Functions:**
- `log_create(db, obj, user_id)` - Log record creation
- `log_update(db, obj, user_id, old_values)` - Log field updates
- `log_delete(db, obj, user_id)` - Log record deletion
- `get_history(db, model_name, record_id)` - Get full history
- `get_old_values(obj)` - Capture state before changes

### 5. Main App Updated
✅ Updated `/backend/app/main.py`:
- Added `system_config` router
- Route: `/api/system-config`

## What Needs to Be Done

### Step 1: Run Migrations (REQUIRED)
```bash
cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend"
alembic upgrade head
```

### Step 2: Seed Default Configuration
After migration, seed the system with default values:

**Option A: Via API (recommended after backend starts)**
```bash
# Start backend first, then:
curl -X POST "http://localhost:8000/api/system-config/seed-all" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option B: Via Python script (before backend starts)**
Create `/backend/seed_config.py`:
```python
import asyncio
from app.database import get_db
from app.routes.system_config import seed_category, DEFAULT_CONFIG
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def main():
    from app.config import settings
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        for category, values in DEFAULT_CONFIG.items():
            count = await seed_category(db, category, values)
            print(f"Seeded {count} values for {category}")
    
    print("Configuration seeded successfully!")

if __name__ == "__main__":
    asyncio.run(main())
```

Run: `python seed_config.py`

### Step 3: Update Routes to Use System Config

**For Fund Management** (`/backend/app/routes/fund_management.py`):

Replace this:
```python
EXPENSE_CATEGORIES = ["Store", "Spare", "Contractual", "General", "Administrative", "Maintenance", "Other"]
```

With this:
```python
from app.models.base import SystemConfig

async def get_config_values(db: AsyncSession, category: str) -> list:
    """Get active values for a configuration category."""
    result = await db.execute(
        select(SystemConfig.value)
        .where(SystemConfig.category == category, SystemConfig.is_active == True)
        .order_by(SystemConfig.display_order, SystemConfig.value)
    )
    return [row[0] for row in result.all()]

@router.get("/config/{category}")
async def get_fund_config(
    category: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get configuration values for frontend dropdowns."""
    values = await get_config_values(db, category)
    return {"category": category, "values": values}
```

### Step 4: Add History Tracking to All Create/Update/Delete Operations

**Example for Fund Management create:**
```python
from app.utils.history import log_create

@router.post("/create", status_code=201)
async def create_item(...):
    # ... existing code ...
    obj = FundManagement(...)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    
    # ADD THIS:
    await log_create(db, obj, user.id)
    await db.commit()
    
    return {"id": obj.id, "msg": "fund management created"}
```

**Example for update:**
```python
from app.utils.history import log_update, get_old_values

@router.put("/{item_id}")
async def update_item(...):
    result = await db.execute(select(FundManagement).where(FundManagement.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "not found")
    
    # ADD THIS:
    old_values = get_old_values(obj)
    
    # ... update fields ...
    if head is not None:
        obj.head = head
    # etc.
    
    await db.commit()
    
    # ADD THIS:
    await log_update(db, obj, user.id, old_values)
    await db.commit()
    
    return {"success": True}
```

**Example for delete:**
```python
from app.utils.history import log_delete

@router.delete("/{item_id}")
async def delete_item(...):
    result = await db.execute(select(FundManagement).where(FundManagement.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "not found")
    
    # ADD THIS:
    await log_delete(db, obj, user.id)
    await db.commit()
    
    await db.delete(obj)
    await db.commit()
    return {"success": True}
```

### Step 5: Add History Endpoints

Add to each module (fund_management.py, hse_certificates.py, hse_audits.py, progress_reports.py):

```python
from app.utils.history import get_history

@router.get("/{item_id}/history")
async def get_item_history(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get full change history for this record."""
    # Verify record exists and user has access
    result = await db.execute(select(FundManagement).where(FundManagement.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Record not found")
    
    # Check permissions
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        if obj.created_by != user.id:
            raise HTTPException(403, "Not authorized to view history")
    
    history = await get_history(db, "FundManagement", item_id)
    return {"record_id": item_id, "history": history}
```

### Step 6: Fix Frontend Excel Upload Issue

**Problem**: Frontend shows "something sure" error during Excel upload

**Location**: `/src/components/FileUploadForm.jsx` and modules using Excel upload

**Common Causes**:
1. CORS headers missing
2. FormData not constructed properly
3. File size exceeded
4. Backend route expecting different field names

**Fix in Frontend** (`FileUploadForm.jsx` or module components):

```javascript
const handleExcelUpload = async (file) => {
  try {
    // 1. Validate file
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      onToast?.("Only Excel files (.xlsx, .xls) are supported", "error");
      return;
    }
    
    // 2. Check size (max 10MB for Excel)
    if (file.size > 10 * 1024 * 1024) {
      onToast?.("File too large (max 10MB)", "error");
      return;
    }
    
    // 3. Create FormData properly
    const formData = new FormData();
    formData.append('file', file);  // Must match backend parameter name
    formData.append('sheet_name', selectedSheet || '');
    
    // 4. Call preview endpoint first
    setUploading(true);
    const response = await fetch('http://localhost:8000/api/fund-management/upload-excel/preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        // DON'T set Content-Type - let browser set it with boundary
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }
    
    const data = await response.json();
    setPreviewData(data);
    onToast?.("Preview loaded successfully", "success");
    
  } catch (err) {
    console.error("Excel upload error:", err);
    onToast?.(err.message || "Failed to upload Excel file", "error");
  } finally {
    setUploading(false);
  }
};
```

**Fix in Backend** (if needed):
```python
@router.post("/upload-excel/preview")
async def excel_preview(
    file: UploadFile = File(...),  # ← Must match FormData key
    sheet_name: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Add better error handling
    try:
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(400, "Only Excel files (.xlsx, .xls) supported")
        
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(400, "Empty file uploaded")
        
        wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
        # ... rest of code
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Could not read Excel file: {str(e)}")
```

### Step 7: Update Frontend Components to Use Dynamic Config

**In FundManagement.jsx**:

Replace:
```javascript
const EXPENSE_CATEGORIES = ["Store", "Spare", "Contractual", "Other"];
const MONTHS = ["April", "May", ...];
```

With:
```javascript
const [expenseTypes, setExpenseTypes] = useState([]);
const [expenseCategories, setExpenseCategories] = useState([]);
const [months, setMonths] = useState([]);
const [financialYears, setFinancialYears] = useState([]);

useEffect(() => {
  // Load dynamic configs
  api.getSystemConfig('expense_type').then(d => setExpenseTypes(d.values || []));
  api.getSystemConfig('expense_category').then(d => setExpenseCategories(d.values || []));
  api.getSystemConfig('month').then(d => setMonths(d.values || []));
  api.getSystemConfig('financial_year').then(d => setFinancialYears(d.values || []));
}, []);
```

**Add to `/src/api.js`**:
```javascript
getSystemConfig: async (category) => {
  const res = await fetch(`${BASE_URL}/system-config/${category}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
},

addSystemConfig: async (category, value, description = null) => {
  const formData = new FormData();
  formData.append('value', value);
  if (description) formData.append('description', description);
  const res = await fetch(`${BASE_URL}/system-config/${category}/add`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData
  });
  return res.json();
},

getRecordHistory: async (module, recordId) => {
  // module: 'fund-management', 'hse-certificates', 'hse-audits', 'progress-reports'
  const res = await fetch(`${BASE_URL}/${module}/${recordId}/history`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
},
```

### Step 8: Add History Viewer Component

Create `/src/components/HistoryViewer.jsx`:
```javascript
export function HistoryViewer({ module, recordId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecordHistory(module, recordId)
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load history:", err);
        setLoading(false);
      });
  }, [module, recordId]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
      <div style={{ background: "#fff", maxWidth: 800, margin: "50px auto", padding: 20, borderRadius: 8, maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2>Change History</h2>
          <button onClick={onClose}>Close</button>
        </div>
        
        {loading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p>No changes recorded yet.</p>
        ) : (
          <div>
            {history.map((item, i) => (
              <div key={i} style={{ padding: 12, borderBottom: "1px solid #eee", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: item.action === "create" ? "green" : item.action === "delete" ? "red" : "blue" }}>
                  {item.action.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  By: {item.changed_by} | {new Date(item.changed_at).toLocaleString()}
                </div>
                {item.field_name && (
                  <div style={{ marginTop: 4 }}>
                    Field: <strong>{item.field_name}</strong><br/>
                    Old: {item.old_value || "—"}<br/>
                    New: {item.new_value || "—"}
                  </div>
                )}
                {item.changes && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", color: "#0066cc" }}>View All Changes</summary>
                    <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4, fontSize: 11, overflow: "auto" }}>
                      {JSON.stringify(item.changes, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Testing Checklist

### Backend Testing
- [ ] Run migrations successfully
- [ ] Seed system configuration
- [ ] Get config categories: `GET /api/system-config/categories`
- [ ] Get expense types: `GET /api/system-config/expense_type`
- [ ] Add new expense type (admin only)
- [ ] Create fund record - verify history logged
- [ ] Update fund record - verify history logged
- [ ] Delete fund record - verify history logged
- [ ] Get fund record history
- [ ] Repeat for HSE certificates, audits, progress reports

### Frontend Testing
- [ ] Load dropdown values from system config (not hardcoded)
- [ ] Create record - verify it works
- [ ] View history for a record
- [ ] Admin: Add new config value (e.g., new expense type)
- [ ] Verify new value appears in dropdown immediately
- [ ] Test Excel upload - verify no "something sure" error
- [ ] Test with 3 roles: admin, ops_manager, data_creator
- [ ] Verify viewer role can only view, not edit

## Benefits of This Approach

1. **No Hardcoding**: All dropdown values in database
2. **Scalable**: Add 3000 new values without code changes
3. **History Tracking**: Complete audit trail for compliance
4. **Role-Based**: Admin can manage config, others consume
5. **Flexible**: Add new categories anytime
6. **Maintainable**: Change values via API, not code deployment

## Summary

✅ **Completed**:
- Migration for history and config tables
- Models for history and config
- System config management routes
- History tracking utility
- Main app router updates

⏳ **Remaining**:
- Run migration
- Seed configuration
- Update all routes to use system config
- Add history tracking to all CRUD operations
- Fix frontend Excel upload
- Update frontend to use dynamic config
- Add history viewer component
- Test with all 3 roles

**Estimated Time**: 4-6 hours to complete remaining work
