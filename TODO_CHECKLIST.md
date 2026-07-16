# TODO Checklist - ONGC Portal Enhancements

## ✅ COMPLETED

### Backend
- [x] Create database migration (0006_add_enhanced_features.py)
- [x] Update FundManagement model with new fields
- [x] Update ProgressReport model with versioning/sharing
- [x] Update HSECertificate model with validity tracking
- [x] Update HSEAudit model with pending actions
- [x] Implement enhanced fund_management.py routes
- [x] Implement enhanced hse_certificates.py routes
- [x] Implement enhanced hse_audits.py routes
- [x] Complete rewrite of progress_reports.py with all features
- [x] Add month-end summary endpoint
- [x] Add expiring certificates endpoint
- [x] Add pending actions summary endpoint
- [x] Add image upload endpoint for progress reports
- [x] Add share link generation for progress reports
- [x] Add auto-delete cleanup logic

### Frontend
- [x] Update FundManagement.jsx with new fields
- [x] Add audited_statement field to form
- [x] Add expense_type dropdown to form
- [x] Add month_end_summary textarea to form

### Documentation
- [x] Create IMPLEMENTATION_SUMMARY.md
- [x] Create SETUP_AND_RUN_GUIDE.md
- [x] Create FRONTEND_EXAMPLES.md
- [x] Create CHANGES_COMPLETED.md
- [x] Create TODO_CHECKLIST.md

## 🔧 TO DO - HIGH PRIORITY

### Setup & Deployment
- [ ] **Start PostgreSQL database**
  ```bash
  brew services start postgresql@14
  ```

- [ ] **Run database migration**
  ```bash
  cd backend && alembic upgrade head
  ```

- [ ] **Verify upload directory exists and has permissions**
  ```bash
  mkdir -p /Users/ruchatejaskumargandhi/Downloads/Myuploads/progress_reports
  chmod 755 /Users/ruchatejaskumargandhi/Downloads/Myuploads
  ```

- [ ] **Start backend server**
  ```bash
  cd backend && uvicorn app.main:app --reload
  ```

- [ ] **Start frontend server**
  ```bash
  cd ongc-portal && npm run dev
  ```

### Frontend Components to Create

#### HSE Dashboard Component
- [ ] Create `/src/components/modules/HSE.jsx`
- [ ] Implement 3-tab interface (Certificates, Audits, Incidents)
- [ ] Add certificate validity indicators (color-coded)
- [ ] Add expiring certificates alert cards
- [ ] Add pending actions summary dashboard
- [ ] Add priority badges for audits
- [ ] Add overdue warnings
- [ ] Integrate with existing ModuleFilesSection for documents

#### Progress Report Component
- [ ] Update `/src/components/modules/ProgressReport.jsx`
- [ ] Add image upload interface (drag-drop or file button)
- [ ] Add image gallery view with thumbnails
- [ ] Add share button with expiration options dialog
- [ ] Add version history viewer
- [ ] Add period filter dropdown (monthly/quarterly/yearly)
- [ ] Add auto-delete countdown indicator
- [ ] Show standardized naming preview
- [ ] Add public share link display/copy

### API Client Updates
- [ ] Update `/src/api.js` with new methods:
  - [ ] `getFundMonthEndSummary(fy, month)`
  - [ ] `exportFundManagement(filters)`
  - [ ] `getExpiringCertificates(threshold)`
  - [ ] `getPendingActionsSummary()`
  - [ ] `getAuditsFiltered(pendingOnly)`
  - [ ] `uploadReportImage(formData)`
  - [ ] `generateShareLink(id, expireDays)`
  - [ ] `revokeShareLink(id)`
  - [ ] `getSharedReport(token)`
  - [ ] `getReportsByPeriod(periodType)`
  - [ ] `getAllVersions(projectName)`

### Menu/Navigation Updates
- [ ] Add HSE menu item or submenu in App.jsx
- [ ] Link to new HSE Dashboard component
- [ ] Verify Progress Report accessible from Reports menu
- [ ] Test navigation between all modules

## 🧪 TESTING - TO DO

### Backend API Testing (via Swagger: http://localhost:8000/docs)

#### Fund Management
- [ ] Test POST /api/fund-management/create with all new fields
- [ ] Test GET /api/fund-management/month-end-summary
- [ ] Test GET /api/fund-management/expense-categories
- [ ] Test GET /api/fund-management/export-excel
- [ ] Test POST /api/fund-management/upload-excel/preview
- [ ] Test POST /api/fund-management/upload-excel/import
- [ ] Verify filters work (fy, month, project, category, expense_type)

#### HSE Certificates
- [ ] Test POST /api/hse-certificates/create with validity fields
- [ ] Test GET /api/hse-certificates/ (check days_remaining, expiry_status)
- [ ] Test GET /api/hse-certificates/expiring-certificates
- [ ] Verify validity status colors (Expired/Warning/Expiring Soon/Valid)
- [ ] Test Excel upload for certificates

#### HSE Audits
- [ ] Test POST /api/hse-audits/create with pending_action=true
- [ ] Test GET /api/hse-audits/?pending_only=true
- [ ] Test GET /api/hse-audits/pending-actions-summary
- [ ] Test PUT /api/hse-audits/{id} with status=Closed (verify pending_action auto-sets to false)
- [ ] Verify overdue calculation
- [ ] Test Excel upload for audits

#### Progress Reports
- [ ] Test POST /api/progress-reports/upload-image with JPG file
- [ ] Test GET /api/progress-reports/{id}/image (view uploaded image)
- [ ] Test POST /api/progress-reports/{id}/share (generate token)
- [ ] Test GET /api/progress-reports/shared/{token} **without auth**
- [ ] Test DELETE /api/progress-reports/{id}/share (revoke)
- [ ] Test GET /api/progress-reports/by-period?period_type=monthly
- [ ] Test GET /api/progress-reports/all-versions
- [ ] Upload second version for same project (verify old version archived)
- [ ] Wait or manually set auto_delete_at to past date, verify cleanup

### Frontend Testing (after components created)

#### Fund Management
- [ ] Create record with audited_statement
- [ ] Create record with expense_type dropdown
- [ ] Add month_end_summary notes
- [ ] Verify all fields save correctly
- [ ] Test Excel import with sample file
- [ ] Test month-end summary display

#### HSE Dashboard (when created)
- [ ] View certificates tab
- [ ] Check expiring certificates alert cards
- [ ] Verify color-coded status indicators
- [ ] View audits tab
- [ ] Check pending actions summary
- [ ] Verify overdue items highlighted
- [ ] Test priority badges
- [ ] Upload Excel for certificates
- [ ] Upload Excel for audits

#### Progress Reports (when updated)
- [ ] Upload JPG image via drag-drop
- [ ] Upload PNG image via file button
- [ ] View image in gallery
- [ ] Generate share link
- [ ] Copy share link and access in incognito/private window
- [ ] Verify expiration works
- [ ] Upload new version for same project
- [ ] Verify old version archived
- [ ] Check version history
- [ ] Filter by period (monthly/quarterly/yearly)
- [ ] Verify auto-delete countdown displays
- [ ] Test report naming convention

### Integration Testing
- [ ] Test all modules together
- [ ] Verify permissions work correctly (admin/ops_manager/data_creator)
- [ ] Test file upload limits (1GB for files, 50MB for images)
- [ ] Test with multiple users simultaneously
- [ ] Verify database transactions (no data loss)
- [ ] Test Excel upload with large files (100+ rows)

## 🐛 KNOWN ISSUES TO FIX

- [ ] **FileUploadForm Excel Upload Error** (mentioned in requirements)
  - Location: `/src/components/FileUploadForm.jsx`
  - Investigate CORS, FormData construction, error handling
  - Test with sample Excel file
  - Check browser console for errors

- [ ] **Progress Report Auto-Delete Scheduler**
  - Currently runs on each list call
  - Consider adding cron job or background task for production
  - Add admin interface to view/manage auto-delete queue

- [ ] **Share Token Rate Limiting**
  - Consider adding rate limiting for public share endpoints
  - Prevent abuse of share token generation

## 📝 OPTIONAL ENHANCEMENTS (Future)

- [ ] Add email notifications for expiring certificates
- [ ] Add SMS alerts for overdue audit actions
- [ ] Add bulk edit for fund management records
- [ ] Add custom export templates for Excel
- [ ] Add PDF generation for reports
- [ ] Add chart exports as images
- [ ] Add role-based email digest (weekly summary)
- [ ] Add audit trail for all changes
- [ ] Add soft delete for records (recoverable)
- [ ] Add archival feature for old FY data

## 🎯 PRIORITY ORDER

### Week 1 (Essential)
1. Run database migration
2. Start servers and verify backend works
3. Create HSE Dashboard component
4. Update Progress Report component
5. Update API client
6. Basic testing of all features

### Week 2 (Testing & Polish)
1. Comprehensive API testing
2. Frontend integration testing
3. Fix FileUploadForm Excel error
4. Performance testing with large datasets
5. User acceptance testing

### Week 3 (Production Ready)
1. Security audit
2. Add rate limiting
3. Optimize auto-delete mechanism
4. Add monitoring/logging
5. Deployment preparation

## 📊 Progress Tracking

**Overall Completion: ~70%**
- Backend: 100% ✅
- Database Models: 100% ✅
- Migration: 100% ✅ (needs to be run)
- Frontend Core: 40% ⏳ (FundManagement done, HSE and Progress Reports pending)
- API Client: 20% ⏳ (needs new methods)
- Testing: 0% ❌ (pending component completion)
- Documentation: 100% ✅

## 🎉 DONE TODAY

✅ Complete backend implementation for all 3 modules
✅ Database schema updates with migration
✅ Enhanced Fund Management routes with summaries
✅ HSE Certificates with validity tracking
✅ HSE Audits with pending actions
✅ Progress Reports with images, versioning, sharing
✅ Updated FundManagement frontend component
✅ Comprehensive documentation (4 guides)

## 📞 Next Session Focus

1. **Start database and run migration** (5 min)
2. **Test all backend APIs via Swagger** (30 min)
3. **Create HSE Dashboard component** (2 hours)
4. **Update Progress Report component** (2 hours)
5. **Update API client** (30 min)
6. **End-to-end testing** (1 hour)

Total estimated: ~6 hours to complete remaining work

---

**Last Updated**: 2026-07-12
**Status**: Backend Complete, Frontend In Progress
