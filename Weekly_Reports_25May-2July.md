WEEKLY REPORT-1

Completed Tasks:

1. KPI / Targets / AWP Module — Export Crash Fix
The stage2Export() function in KPITargetsAWP.jsx was being called twice (for yearly and monthly exports) without any error handling. If either export failed (e.g. backend returned 500 or network error), the entire page would crash with an uncaught promise rejection. Wrapped both stage2Export() calls inside try/catch blocks so failures are caught silently without crashing the UI.

2. GroupedBar Chart — Value Label Clipping
The grouped bar chart component used for KPI/Targets visualization had value labels rendered at 9px font size. Labels near the top of bars were clipping/overlapping the SVG container boundary, making values unreadable. Increased font size from 9px to 11px and added paddingTop: 20 to the chart container to give labels breathing room above the bars.

3. Sidebar — "Requests" Menu Item Removed
The "Requests" page was listed as a sidebar navigation item but its functionality was already handled via a dedicated button in the top-right header area. Having it in both places caused confusion and UX inconsistency. Deleted the entry from the MENU array in App.jsx.

4. Notifications Persistence Bug (Critical)
Root Cause: The Notification database record was being created (db.add(Notification(...))) after the final db.commit() call in 4 different API endpoints — create, approve-ops, approve-admin, and reject. Since SQLAlchemy's commit() persists all pending changes, calling db.add() after commit() meant the Notification object was never saved to the database. Impact: Zero notifications were ever persisted since this feature was built — users never received any notification about request status changes. Fix: Moved db.add(Notification(...)) to occur before the final db.commit() in all 4 endpoints. Also fixed the admin query from the incorrect User.role.has(name="admin") pattern to an explicit join(Role, ...).where(Role.name == "admin") join query.

5. Frontend Request Creation — Success Toast Timing
The handleCreate function in Requests.jsx used .catch() chained after a .then(), but the success toast was placed inside .then() before the actual API call completed. This meant the "Request created successfully" toast appeared even when the API call failed. Converted the .then().catch() chain to a proper try/catch with async/await. The success toast now only fires when the API call completes without throwing.

6. Notification Bell — UI Redesign
Previously, notifications were listed as a simple text link labeled "Notifications" in the header. This was low-visibility and users frequently missed new notifications. Replaced the text link with a visually prominent bell icon, added a red badge showing the unread count, and applied a highlighted background when unread notifications exist.

7. Request Notifications — Progressive Scoping
Previously, all notifications for a request were sent to all users at every stage causing notification fatigue. Implemented progressive notification delivery: On Create → only the assigned ops_manager receives notification. On Ops Approve → only all admin users receive notification. On Admin Approve → only the requester and the ops_manager who reviewed it receive notification. On Reject → only the requester receives notification.

Plans for next week:

Fix embedding "Failed to fetch" bug, implement sidebar section-based filtering, add uploader information to Share Knowledge module.

References:

backend/app/routes/requests.py, src/components/modules/KPITargetsAWP.jsx, src/components/shared/Charts.jsx, src/App.jsx, src/components/modules/Requests.jsx

Signature of External Guide Signature of Internal Guide

================================================================================

WEEKLY REPORT-2

Completed Tasks:

8. Embedding Search — "Failed to Fetch" Bug (Critical)
Symptom: When performing semantic search on the file records page, the browser console showed "Failed to fetch" with no additional error details. Root Cause: The generate_embedding() function in the backend returns a Python list (e.g. [0.123, -0.456, ...]), but the embedding column in the database is defined as Text type. SQLAlchemy/asyncpg cannot serialize a Python list directly into a Text column. Impact: Every semantic search or file upload that triggered embedding generation would cause a silent 500 Internal Server Error. Fix: At backend/app/routes/files.py line 273, wrapped the embedding with json.dumps(generate_embedding(search_text)) to serialize the list as a JSON string before storing it in the Text column.

9. Sidebar — Section-Based Menu Filtering
All sidebar menu items were shown to every user regardless of their assigned section/department. For example, a user in REL would see "Data Processing (RCC)" menu items and vice versa. Added a MENU.filter() callback in App.jsx at line 1819 that checks the user's section field. For non-admin/non-ops_manager roles, section-specific items only appear if the user's section matches. Generic section codes (e.g. "GP") are matched as prefixes to specific area codes (e.g. "GP-03").

10. Share Knowledge — Uploader Information Display
The Knowledge Base listing only showed the file name and category, not who uploaded it. This made it difficult to know the source/authority of shared knowledge items. Backend Fix: Modified list_knowledge endpoint to eager-load the creator relationship and return creator_name, creator_designation, and creator_section fields. Frontend Fix: Added 3 new columns to the knowledge table — "Uploaded By", "Designation", and "Department".

11. Projects Module — Data Creator & Viewer Access
Previously, only admin and ops_manager roles could access the Projects module from the sidebar. Data creators and viewers working on field projects had no way to view project data. Fixes: Added "data_creator" and "viewer" to the roles array for the Projects menu item in App.jsx. Rewrote _match_section() in projects.py — new logic splits both the section and area by "-" separator and compares prefixes (e.g. "GP" matches "GP-03", "GP-05", etc.). Added a section-based 403 check in get_project() — non-admin users can only view projects where their section/area matches the project's section.

12. Projects Module — Upload Form Hidden for Non-Admin
Data creators and viewers could previously see the file upload form in the project detail view, even though the backend would reject their upload with a 403 error. Changed the conditional from role !== "viewer" to role === "admin" || role === "ops_manager" so only admin/ops_manager see the upload form (data_creator upload was added later in Week 6).

13. Lookup Model — Extended for Form Builder
The existing Lookup model only had type, value, sort_order, and is_active columns — insufficient for storing form field definitions. Added 3 new columns to the lookups table: page (VARCHAR 50) — associates fields with a specific page/module; label (VARCHAR 100) — human-readable display label for the field; field_type (VARCHAR 20) — type of field (text or select). Existing data was preserved; new columns are nullable.

14. Lookup Backend — Rewritten with New Endpoints
The old lookup API only supported basic CRUD on lookup types/values without page awareness. New endpoints added: GET /api/lookup/pages — returns list of distinct page names; GET /api/lookup/types?page= — returns types filtered by page, excluding internal types; GET/POST/PUT/DELETE /api/lookup/{page}/fields — full CRUD for per-page form fields. DELETE cascades to delete all dropdown values for that field. All endpoints protected behind admin role check.

Plans for next week:

Rewrite MiniUpload to fetch fields from database, update all module files using MiniUpload, add field reordering in Settings, build the per-page Form Builder in Settings UI.

References:

backend/app/routes/files.py line 273, backend/app/routes/knowledge.py, backend/app/routes/projects.py, backend/app/routes/lookup.py, backend/app/models/base.py, src/App.jsx, src/components/modules/ShareKnowledge.jsx, src/components/ProjectCreation.jsx

Signature of External Guide Signature of Internal Guide

================================================================================

WEEKLY REPORT-3

Completed Tasks:

15. Settings UI — Page-Based Form Builder
The old Settings page had hardcoded tabs for managing lookup values without any form builder concept. Rewrote the entire Settings component with a unified Form Builder interface with 3 sections: Page Selector — dropdown to choose which page/module to configure; Field Management — add new fields (name, label, type), edit existing fields (label, type), delete fields, with visual badges showing "text" or "dropdown" type; Dropdown Value Management — for select-type fields, manage individual dropdown options (add, edit, delete). All dropdown values are now stored entirely in the database — nothing is hardcoded.

16. Pages Seeded in Database
16 pages seeded into the lookups table using _page_marker sentinel entries so they appear in the page list even when empty: Dashboard, File Records, Reports, Progress Report, Manpower Status, Contract Status, Fund Management, Pending Issues, Highlights, Technical Reports, Operations, Data Processing, Regional Electronics Lab, Reporting/Appraisals, SharePoint, AWP, Share Knowledge, Projects, System.

17. MiniUpload Component — Rewritten for DB-Driven Fields
The old MiniUpload.jsx accepted a hardcoded fields prop like fields={{title:"Report Title",author:"Author",category:"Category"}} and rendered all as text inputs. This defeated the purpose of the Form Builder. New behavior: Accepts a page prop instead of fields. On mount, calls api.listPageFields(page) to fetch field definitions from the database. For each field, checks field_type — "text" renders a text input, "select" renders a dropdown and fetches options. Submits all dynamic field values along with the file upload. Falls back to section as page name if no page prop is provided.

18. Module Files Updated — 4 Components
Updated all 4 modules that use MiniUpload to pass page instead of fields: ProgressReport.jsx — page="Progress Report"; ContractStatus.jsx — page="Contract Status" (renamed from "Contract / Tendering Status" due to URL encoding issues); Highlights.jsx — page="Highlights"; TechnicalReports.jsx — page="Technical Reports".

19. Page Name URL Compatibility Fix
Two page names contained forward slashes (/) which broke FastAPI's URL path routing. "Contract / Tendering Status" — the / was interpreted as a path separator. "Reporting / Appraisals" — same issue. Renamed in the database to "Contract Status" and "Reporting Appraisals" respectively.

20. Fields Seeded for 12 Pages
Created appropriate fields and dropdown options for every page: Progress Report (4 fields including priority dropdown), Contract Status (5 fields including contract_type and status dropdowns), Highlights (3 fields with category dropdown), Technical Reports (4 fields with category dropdown), Manpower Status (4 fields with status dropdown), Fund Management (4 fields with status dropdown), HSE (4 fields with incident_type and severity dropdowns), Operations (4 fields with operation_type dropdown), Data Processing (4 fields with data_type and status dropdowns), Regional Electronics Lab (4 fields with test_type and result dropdowns), Reporting Appraisals (4 fields with report_type dropdown), AWP (4 fields with training_type dropdown).

Plans for next week:

Add field reordering (sort_order) with UI controls, grant data_creator access to Sensitive files, allow data_creator to upload project files, show full uploader details everywhere.

References:

src/App.jsx, src/components/shared/MiniUpload.jsx, src/components/modules/ProgressReport.jsx, src/components/modules/ContractStatus.jsx, src/components/modules/Highlights.jsx, src/components/modules/TechnicalReports.jsx

Signature of External Guide Signature of Internal Guide

================================================================================

WEEKLY REPORT-4

Completed Tasks:

21. Field Reordering — sort_order Support
Fields in the Form Builder were displayed in creation order with no way to rearrange them. Added auto-assignment — when a new field is added, sort_order is automatically computed as max(sort_order) + 1 for that page. Added reorder endpoint PUT /api/lookup/{page}/fields/{id}/reorder?direction=up|down — swaps the field's sort_order with its neighbor. Normalized all existing fields' sort_orders to 0, 1, 2, ... per page. Updated list_page_fields to return sort_order in the response.

22. Reordering UI — Up/Down Buttons in Settings
Each field in the Form Builder list now has an up button to move up and a down button to move down, swapping with the field above or below. Added visual position indicator showing #1, #2, etc. Buttons remain functional at all positions (first field can't move up, last can't move down — endpoint returns appropriate error).

23. Data Creator — Access to Sensitive Files
Previously, data_creator role could only see "General / Available for All" files (same as viewer). Ops Managers could see "Sensitive / Internal Use" but data creators could not. Added "data_creator" to the get_accessible_classifications() function at backend/app/routes/files.py line 31, alongside "ops_manager". Data creators now automatically see both "General / Available for All" AND "Sensitive / Internal Use" files.

24. Data Creator — Project File Upload
Data creators working on field projects needed to upload project documents but the backend rejected them. Backend Fix in projects.py line 321: Added "data_creator" to the allowed roles list for POST /{project_id}/upload. Frontend Fix in ProjectCreation.jsx line 706: Added "data_creator" to the conditional that shows the file upload form.

25. Full Uploader Details — Everywhere
The file API (file_to_dict() in files.py) now returns 5 additional uploader fields: uploaded_by_cpf (uploader's CPF number), uploaded_by_designation (uploader's job designation), uploaded_by_section (uploader's department/section), uploaded_by_area (uploader's area of operation), uploaded_by_category (uploader's business category). Tooltips added — hovering over "Uploaded By" in any file table shows all details in a tooltip. File Details Panel shows 6 uploader rows: Name, Designation, Section, Area, Category, CPF. Updated normalizeFile() in App.jsx to include all new fields. Applied tooltips to Admin dashboard recent activity table and Ops Manager pending approvals table.

Plans for next week (Future Scope):

Comprehensive user manual and project report documentation, add bulk file operations (multi-select, batch approve/reject), implement file versioning (track document revisions), add email notifications for pending approvals, build advanced search with saved searches and filters, implement data export (Excel/CSV) for all module tables, add role-based dashboard customization, performance optimization (code-splitting, lazy loading).

References:

backend/app/routes/files.py, backend/app/routes/lookup.py, backend/app/routes/projects.py, src/App.jsx, src/components/ProjectCreation.jsx

Signature of External Guide Signature of Internal Guide
