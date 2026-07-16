# ONGC Portal - Setup and Run Guide

## ✅ Changes Completed

All backend enhancements have been implemented. Here's what was done:

### Backend Files Modified/Created:
1. `/backend/alembic/versions/0006_add_enhanced_features.py` - Database migration
2. `/backend/app/models/base.py` - Updated models with new fields
3. `/backend/app/routes/fund_management.py` - Enhanced with new features
4. `/backend/app/routes/hse_certificates.py` - Enhanced with validity tracking
5. `/backend/app/routes/hse_audits.py` - Enhanced with pending actions
6. `/backend/app/routes/progress_reports.py` - Complete rewrite with versioning, sharing, image upload

## 🚀 Step-by-Step Setup

### 1. Start PostgreSQL Database

**Option A: If using local PostgreSQL**
```bash
# Start PostgreSQL service (macOS with Homebrew)
brew services start postgresql@14

# OR using pg_ctl
pg_ctl -D /usr/local/var/postgres start
```

**Option B: If using Docker**
```bash
# Start Docker container (if you have docker-compose)
cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal"
docker-compose up -d db
```

**Option C: Create database manually (if doesn't exist)**
```bash
# Connect to postgres
psql postgres

# In psql:
CREATE DATABASE ongc_db;
CREATE USER ongc_user WITH PASSWORD 'ongc_pass';
GRANT ALL PRIVILEGES ON DATABASE ongc_db TO ongc_user;
\q
```

### 2. Run Database Migration

```bash
cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend"

# Run the migration
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade 0005 -> 0006, add enhanced features for fund management, hse, and progress reports
```

### 3. Start Backend Server

```bash
# From backend directory
cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend"

# Option A: Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Option B: If you have a start script
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API Docs available at: `http://localhost:8000/docs`

### 4. Start Frontend

```bash
# Open a new terminal
cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal"

# Install dependencies (if not done already)
npm install

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:5173` (or the port shown in terminal)

## 🧪 Testing New Features

### Test Fund Management Enhancements

1. **API Testing (using curl or Postman)**

```bash
# Get month-end summary
curl http://localhost:8000/api/fund-management/month-end-summary

# Create a fund record with new fields
curl -X POST http://localhost:8000/api/fund-management/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "head=Office Equipment" \
  -F "allocated=100000" \
  -F "spent=45000" \
  -F "fy=2026-27" \
  -F "month=January" \
  -F "expense_type=Store" \
  -F "audited_statement=Q1-2026"

# Get expense categories
curl http://localhost:8000/api/fund-management/expense-categories
```

2. **Excel Upload Testing**
- Create an Excel file with columns: Head, Allocated, Spent, FY, Month, Expense Type
- Upload via Swagger docs or Postman to `/api/fund-management/upload-excel/preview`
- Then import via `/api/fund-management/upload-excel/import`

### Test HSE Certificates

```bash
# Create a certificate
curl -X POST http://localhost:8000/api/hse-certificates/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Safety Certificate" \
  -F "issued_to=ABC Contractor" \
  -F "issue_date=2026-01-01" \
  -F "expiry_date=2026-12-31" \
  -F "certificate_number=CERT-2026-001" \
  -F "issuing_authority=ONGC Safety Board"

# Get expiring certificates
curl http://localhost:8000/api/hse-certificates/expiring-certificates?days_threshold=90
```

### Test HSE Audits

```bash
# Create an audit observation
curl -X POST http://localhost:8000/api/hse-audits/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "observation=Improper PPE usage observed" \
  -F "action_taken_report=Training conducted" \
  -F "responsible_person=John Doe" \
  -F "due_date=2026-08-01" \
  -F "status=Open" \
  -F "pending_action=true" \
  -F "action_priority=High"

# Get pending actions summary
curl http://localhost:8000/api/hse-audits/pending-actions-summary

# Get only pending items
curl http://localhost:8000/api/hse-audits/?pending_only=true
```

### Test Progress Reports

```bash
# Upload a JPG progress report
curl -X POST http://localhost:8000/api/progress-reports/upload-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/report.jpg" \
  -F "project_name=Mumbai Offshore" \
  -F "report_period=June 2026" \
  -F "year=2026" \
  -F "section=Operations" \
  -F "subject=Progress" \
  -F "category=Monthly" \
  -F "auto_delete=true"

# Generate share link
curl -X POST http://localhost:8000/api/progress-reports/{id}/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "expire_days=7"

# Access shared report (no auth needed)
curl http://localhost:8000/api/progress-reports/shared/{TOKEN}

# Get reports by period
curl http://localhost:8000/api/progress-reports/by-period?period_type=monthly
```

## 📱 Frontend Integration (TODO)

The backend is ready. To complete the integration, update these frontend files:

### 1. Update API Client
**File: `/src/api.js`**

Add these methods:
```javascript
// Fund Management
getFundMonthEndSummary: async (fy, month) => {
  const params = new URLSearchParams();
  if (fy) params.append('fy', fy);
  if (month) params.append('month', month);
  const res = await fetch(`${BASE_URL}/fund-management/month-end-summary?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
},

exportFundManagement: async (filters) => {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${BASE_URL}/fund-management/export-excel?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const blob = await res.blob();
  return blob;
},

// HSE Certificates
getExpiringCertificates: async (days = 90) => {
  const res = await fetch(`${BASE_URL}/hse-certificates/expiring-certificates?days_threshold=${days}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
},

// HSE Audits
getPendingActionsSummary: async () => {
  const res = await fetch(`${BASE_URL}/hse-audits/pending-actions-summary`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
},

// Progress Reports
uploadReportImage: async (formData) => {
  const res = await fetch(`${BASE_URL}/progress-reports/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
},

generateShareLink: async (id, expireDays = 7) => {
  const formData = new FormData();
  formData.append('expire_days', expireDays);
  const res = await fetch(`${BASE_URL}/progress-reports/${id}/share`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  return res.json();
},

getSharedReport: async (token) => {
  const res = await fetch(`${BASE_URL}/progress-reports/shared/${token}`);
  return res.json();
},

getReportsByPeriod: async (periodType = 'monthly') => {
  const res = await fetch(`${BASE_URL}/progress-reports/by-period?period_type=${periodType}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
},
```

### 2. Update Components

See `IMPLEMENTATION_SUMMARY.md` for detailed component update requirements.

## 🐛 Troubleshooting

### Database Connection Error
```
could not translate host name "db" to address
```
**Solution:** Start PostgreSQL service (see Step 1 above)

### Migration Error: "Column already exists"
```bash
# If migration fails because columns exist, mark it as run:
alembic stamp 0006
```

### Frontend Can't Connect to Backend
1. Check backend is running: `curl http://localhost:8000/`
2. Check CORS settings in `/backend/app/main.py`
3. Verify frontend API URL in `/src/api.js`

### Excel Upload Failing
1. Check file size (max 1GB)
2. Verify column names match synonyms
3. Test with preview endpoint first
4. Check browser console for errors

### Images Not Uploading
1. Verify UPLOAD_DIR exists and has write permissions:
   ```bash
   mkdir -p /Users/ruchatejaskumargandhi/Downloads/Myuploads/progress_reports
   chmod 755 /Users/ruchatejaskumargandhi/Downloads/Myuploads
   ```
2. Check max file size (50MB for images)

## 📊 Database Schema Changes

The migration adds these columns:

**fund_management table:**
- audited_statement VARCHAR(255)
- expense_type VARCHAR(50)
- month_end_summary TEXT

**progress_reports table:**
- report_image_path VARCHAR(500)
- report_period VARCHAR(50)
- version INTEGER (default 1)
- parent_version_id INTEGER
- report_name VARCHAR(255)
- share_token VARCHAR(100)
- share_expires_at TIMESTAMP WITH TIME ZONE
- auto_delete_at TIMESTAMP WITH TIME ZONE

**hse_certificates table:**
- certificate_number VARCHAR(100)
- issuing_authority VARCHAR(255)
- validity_days INTEGER

**hse_audits table:**
- pending_action BOOLEAN (default TRUE)
- action_priority VARCHAR(20)
- closure_date DATE

## 🎯 Next Steps

1. ✅ Backend complete
2. ✅ Migration file created
3. ⏳ Run migration (requires database to be running)
4. ⏳ Update frontend components
5. ⏳ Test all features end-to-end
6. ⏳ Deploy to production

## 📞 Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review `IMPLEMENTATION_SUMMARY.md` for feature details
3. Check backend logs in terminal
4. Test API endpoints via Swagger docs: http://localhost:8000/docs
