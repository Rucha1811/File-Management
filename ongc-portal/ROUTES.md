# Data Vision — Complete Route & Schema Documentation

## Database Schema (PostgreSQL)

### models/base.py — 34 tables

| Table | Key Columns | Relationships |
|---|---|---|
| `roles` | id, name (unique), description | → User |
| `users` | id, cpf (unique), password_hash, name, designation, section, area, user_category, ops_manager_id (FK→users), level, is_active, role_id (FK→roles), deleted_at | → Role, → File, → ops_manager (self-ref) |
| `files` | id, file_name, file_type, project_name, sig_number, data_type, section, category, season, block, ml_block, location, classification, contractor_name, status (Pending/Approved/Rejected), uploaded_by (FK→users), upload_date, file_size, file_path, file_data (LargeBinary), doc_type, description, search_text, summary, embedding, dynamic_fields, deleted_at | → uploader(User), → Approval |
| `approvals` | id, file_id (FK→files), action (approved/rejected), action_by (FK→users), action_at, comment | → File |
| `activity_logs` | id, user_id, action, target_type, target_id, timestamp, details | — |
| `notifications` | id, user_id, message, is_read, created_at | — |
| `reports` | id, type, data, generated_at | — |
| `section_config` | id, section (unique), user_category, ops_manager_id (FK→users), location | → ops_manager(User) |
| `lookups` | id, type, value, sort_order, is_active, page, label, field_type | — |
| `user_permissions` | id, user_id, classification, granted_by, granted_at, expires_at | — |
| `projects` | id, project_name, number, survey_type, contractor_name, area_name, section, gp_code, party_chief, year_field_season, start_date, end_date, project_period, target_vs_achievement, survey_objective, xy_coordinates, kml_file_path, survey_grid_params, acquisition_geometry, instrument_parameters, sensor_type, source_parameters, total_cost, per_unit_cost, project_highlights, category, location, project_map_path, status, created_by | → creator(User), → ProjectEvent, → ProjectDocument |
| `project_events` | id, project_id (FK→projects), event_date, description | → Project |
| `project_documents` | id, project_id (FK→projects), file_name, file_path, file_type, category | → Project |
| `targets` | id, title, target_value, unit, section, fiscal_year, description, created_by | → creator(User), → TargetAccomplishment |
| `target_accomplishments` | id, target_id (FK→targets), value, description, recorded_by, recorded_at | → Target, → recorder(User) |
| `highlights` | id, title, description, author, icon, dynamic_fields, created_by | → creator(User) |
| `technical_reports` | id, title, category, author, status, dynamic_fields, created_by | → creator(User) |
| `report_templates` | id, name, description, period_type, sections, assigned_roles, section, area, created_by | → creator(User) |
| `report_periods` | id, template_id (FK→report_templates), label, start_date, end_date, is_open, section_assignments | → ReportTemplate |
| `report_submissions` | id, period_id (FK→report_periods), section_key, assigned_to, user_id, field_values, status, submitted_at | → period, → assignee(User), → submitter(User) |
| `progress_reports` | id, project_name, block, total, completed, coverage, status, report_image_path, report_period, version, parent_version_id, report_name, share_token, share_expires_at, auto_delete_at, dynamic_fields, created_by | → creator(User) |
| `manpower_status` | id, category, total, deployed, on_leave, training, dynamic_fields, created_by | → creator(User) |
| `contract_status` | id, contract, vendor, value, award_date, completion_date, status, fy, month, dynamic_fields, created_by | → creator(User) |
| `fund_management` | id, head, allocated, spent, remaining, fy, month, project, category, amount, audited_statement, expense_type, month_end_summary, dynamic_fields, created_by | → creator(User) |
| `data_processing_items` | id, section, project, volume, unit, progress, status, due_date, dynamic_fields, created_by | → creator(User) |
| `regional_lab_equipment` | id, section, equipment, status, last_calibration, next_due, dynamic_fields, created_by | → creator(User) |
| `reporting_appraisals` | id, section, period, submitted, by, status, dynamic_fields, created_by | → creator(User) |
| `pending_issues` | id, description, raised_by, date, edc, status, dynamic_fields, created_by | → creator(User) |
| `hse_incidents` | id, date, incident_type, location, description, action_taken, severity, status, dynamic_fields, created_by | → creator(User) |
| `awp_items` | id, activity, target, achieved, progress, deadline, status, dynamic_fields, created_by | → creator(User) |
| `requests` | id, user_id, title, description, target_type, status, ops_manager_id, reviewed_by_ops, reviewed_by_admin, ops_comment, admin_comment | → creator(User), → ops_reviewer, → admin_reviewer |
| `knowledge_items` | id, user_id, title, description, file_path, file_name, category, status, reviewed_by_ops, reviewed_by_admin, ops_comment, admin_comment | → creator(User), → ops_reviewer, → admin_reviewer |
| `acquisition_targets` | id, project_name, project_type, financial_year, type (T/A), basin, apr→mar (targets), apr_ach→mar_ach (actuals), total, total_ach, approved, approved_by, approval_requested, approval_requested_by | — |
| `manpower_employees` | id, section, basin, sl_no, cpf_no, name, designation, mobile, level, crc, assignment | — |
| `contract_summaries` | id, summary_type, financial_year, data (Text/JSON), created_by | → creator(User) |
| `target_month_histories` | id, target_id (FK→acquisition_targets), month, field, old_value, new_value, changed_by | → target, → changer(User) |
| `hse_certificates` | id, name, issued_to, issue_date, expiry_date, status, certificate_number, issuing_authority, validity_days, certificate_type, department, notes, dynamic_fields, created_by | → creator(User) |
| `hse_audits` | id, audit_date, observation, action_taken_report, responsible_person, due_date, status, pending_action, action_priority, closure_date, audit_type, department, dynamic_fields, created_by | → creator(User) |
| `shared_files` | id, file_name, file_data (LargeBinary), file_type, shared_by, shared_by_name, role, expiry_seconds, shared_at, is_active, download_count | → sharer(User) |
| `system_config` | id, category, value, display_order, is_active, description | — |
| `fund_management_history` | id, fund_id, changed_by, changed_at, action, field_name, old_value, new_value, changes_json | — |
| `hse_certificate_history` | id, certificate_id, changed_by, changed_at, action, field_name, old_value, new_value, changes_json | — |
| `hse_audit_history` | id, audit_id, changed_by, changed_at, action, field_name, old_value, new_value, changes_json | — |
| `progress_report_history` | id, report_id, changed_by, changed_at, action, field_name, old_value, new_value, changes_json | — |

### models/ai_models.py — 5 tables

| Table | Key Columns | Relationships |
|---|---|---|
| `document_chunks` | id, file_id (FK→files), chunk_index, chunk_text, embedding, metadata (JSON), page_number | — |
| `kg_entities` | id, name, type, properties (JSON) | → KgRelationship |
| `kg_relationships` | id, source_id (FK→kg_entities), target_id (FK→kg_entities), relationship, properties (JSON) | — |
| `ai_audit_logs` | id, user_id, query, response, agent_type, documents_retrieved (ARRAY), sql_query, chart_data (JSON), tokens_used, processing_time_ms | — |

---

## Backend API Routes (35 router files, ~180+ endpoints)

**Auth legend**: 🔓 = no auth | 🔐 = any auth | 👑 = admin only | 👔 = admin/ops_manager | 🧑‍💻 = admin/ops_manager/data_creator

### `GET /` — Health check
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/` | `{"msg": "Data Vision API running."}` | 🔓 |

### `prefix: /api/auth` — Authentication
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login with CPF+password, returns JWT + user object | 🔓 |

### `prefix: /api/users` — User Management
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/users/public` | List active users (cpf, name, area, role, user_category, ops_manager_name) | 🔓 |
| GET | `/api/users/` | List all users with full details | 🔐 |
| POST | `/api/users/create` | Create user (cpf, password, name, designation, section, role_name, area, user_category) | 👑 |
| PUT | `/api/users/{id}/role` | Update user role | 👑 |
| PUT | `/api/users/{id}/profile` | Update user profile | 👑 |
| GET | `/api/users/derive` | Derive fields from section config | 👑 |
| GET | `/api/users/section-config` | List section configs | 👑 |

### `prefix: /api/files` — File Upload & Management
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/files/upload` | Upload file (multipart form with metadata) | 🧑‍💻 |
| GET | `/api/files/` | List files (filtered by role/area/classification) | 🔐 |
| GET | `/api/files/download/{id}` | Download file (token in header or ?token=) | 🔐 |
| GET | `/api/files/view/{id}` | View file inline | 🔐 |
| GET | `/api/files/pdfviewer/{id}` | HTML5 PDF viewer with search highlight | 🔐 |
| GET | `/api/files/search` | Hybrid search (keyword + semantic vector) | 🔐 |
| POST | `/api/files/parse-excel` | Parse Excel/CSV and return metadata | 🔐 |
| PATCH | `/api/files/{id}` | Update file metadata | 👔 |

### `prefix: /api/approvals` — File Approvals
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/approvals/approve/{id}` | Approve file, optionally set classification | 👔 |
| POST | `/api/approvals/reject/{id}` | Reject file with reason | 👔 |

### `prefix: /api/dashboard` — Dashboard Stats
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/dashboard/stats` | File statistics (total, pending, approved, rejected by section/type/classification) | 🔐 |
| GET | `/api/dashboard/module-summary` | Summary counts for all module tables (progressReports, manpowerStatus, contractStatus, fundManagement, dataProcessing, regionalLab, reportingAppraisals, pendingIssues, hseIncidents, awpItems) | 🔐 |

### `prefix: /api/reports` — Reports
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/reports/monthly` | Monthly upload counts (12 months) | 🔐 |
| GET | `/api/reports/user-activity` | Upload counts by user | 🔐 |

### `prefix: /api/notifications` — Notifications
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/notifications/` | List user's notifications | 🔐 |
| POST | `/api/notifications/mark-read/{id}` | Mark one notification as read | 🔐 |
| POST | `/api/notifications/mark-all-read` | Mark all notifications as read | 🔐 |

### `prefix: /api/db` — Database Explorer
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/db/tables` | List all DB tables with rows | 👑 |

### `prefix: /api/lookup` — Dynamic Lookups
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/lookup/types` | List lookup types | 👑 |
| GET | `/api/lookup/pages` | List pages with custom fields | 👑 |
| GET | `/api/lookup/{type}` | Get active lookup values | 🔓 |
| GET | `/api/lookup/{type}/all` | Get all lookup values (incl. inactive) | 👑 |
| POST | `/api/lookup/{type}` | Add lookup value | 👑 |
| PUT | `/api/lookup/{type}/{id}` | Update lookup | 👑 |
| DELETE | `/api/lookup/{type}/{id}` | Delete lookup | 👑 |
| GET | `/api/lookup/{page}/fields` | List dynamic fields for a page | 🔐 |
| POST | `/api/lookup/{page}/fields` | Add dynamic field | 👑 |
| PUT | `/api/lookup/{page}/fields/{id}` | Update dynamic field | 👑 |
| PUT | `/api/lookup/{page}/fields/{id}/reorder` | Reorder field | 👑 |
| DELETE | `/api/lookup/{page}/fields/{id}` | Delete dynamic field | 👑 |

### `prefix: /api/permissions` — User Permissions
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/permissions/` | List all permissions | 👑 |
| POST | `/api/permissions/toggle` | Grant/revoke classification permission (requires admin password) | 👑 |

### `prefix: /api/activity` — Activity Log
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/activity/summary` | Activity summary (week/month) with uploads/approvals/rejections timeline | 🔐 |
| GET | `/api/activity/export` | Export activity as Excel (.xlsx) | 🔐 |

### `prefix: /api/projects` — Project Management
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/projects/excel-fields` | List importable Excel fields | 🔐 |
| GET | `/api/projects/` | List projects | 🔐 |
| GET | `/api/projects/{id}` | Get project detail with events & documents | 🔐 |
| POST | `/api/projects/create` | Create project (multipart form with KML/map upload) | 👔 |
| PATCH | `/api/projects/{id}` | Update project | 👔 |
| POST | `/api/projects/{id}/upload` | Upload file to project | 🧑‍💻 |
| DELETE | `/api/projects/{id}` | Delete project | 👑 |
| POST | `/api/projects/upload-excel/preview` | Preview Excel import | 👔 |
| POST | `/api/projects/upload-excel/import` | Import projects from Excel | 👔 |

### `prefix: /api/targets` — Targets & KPIs
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/targets/excel-fields` | List importable Excel fields | 🔐 |
| GET | `/api/targets/` | List targets with accomplishments | 🔐 |
| POST | `/api/targets/create` | Create target | 🧑‍💻 |
| POST | `/api/targets/{id}/accomplish` | Record accomplishment | 🧑‍💻 |
| DELETE | `/api/targets/{id}` | Delete target | 🧑‍💻 |
| POST | `/api/targets/upload-excel/preview` | Preview target Excel import | 🧑‍💻 |
| POST | `/api/targets/upload-excel/import` | Import targets from Excel | 🧑‍💻 |

### `prefix: /api/highlights` — Highlights
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/highlights/` | List highlights | 🔐 |
| POST | `/api/highlights/create` | Create highlight | 🧑‍💻 |
| PUT | `/api/highlights/{id}` | Update highlight | 🧑‍💻 |
| DELETE | `/api/highlights/{id}` | Delete highlight | 🧑‍💻 |
| POST | `/api/highlights/upload-excel/preview` | Preview Excel import | 🧑‍💻 |
| POST | `/api/highlights/upload-excel/import` | Import highlights from Excel | 🧑‍💻 |

### `prefix: /api/technical-reports` — Technical Reports
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/technical-reports/` | List reports (filter by category) | 🔐 |
| POST | `/api/technical-reports/create` | Create report | 🧑‍💻 |
| PUT | `/api/technical-reports/{id}` | Update report | 🧑‍💻 |
| DELETE | `/api/technical-reports/{id}` | Delete report | 🧑‍💻 |
| POST | `/api/technical-reports/upload-excel/preview` | Preview Excel import | 👔 |
| POST | `/api/technical-reports/upload-excel/import` | Import reports from Excel | 👔 |

### `prefix: /api/report-builder` — Report Builder
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/report-builder/templates` | List report templates | 🔐 |
| POST | `/api/report-builder/templates/create` | Create template | 👔 |
| PUT | `/api/report-builder/templates/{id}` | Update template | 👔 |
| DELETE | `/api/report-builder/templates/{id}` | Delete template | 👔 |
| GET | `/api/report-builder/periods` | List periods | 🔐 |
| POST | `/api/report-builder/periods/create` | Create period | 👔 |
| PUT | `/api/report-builder/periods/{id}` | Update period | 👔 |
| DELETE | `/api/report-builder/periods/{id}` | Delete period | 👔 |
| GET | `/api/report-builder/submissions` | List submissions | 🔐 |
| POST | `/api/report-builder/submissions/save` | Save submission | 🔐 |
| POST | `/api/report-builder/submissions/submit` | Submit | 🧑‍💻 |
| GET | `/api/report-builder/section-status` | Section submission status | 👔 |

### `prefix: /api/progress-reports` — Progress Reports
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/progress-reports/` | List with filtering/sorting/sharing | 🔐 |
| POST | `/api/progress-reports/create` | Create | 🧑‍💻 |
| PUT | `/api/progress-reports/{id}` | Update | 👔 |
| DELETE | `/api/progress-reports/{id}` | Delete | 👔 |
| POST | `/api/progress-reports/{id}/upload-image` | Upload report image | 🧑‍💻 |
| POST | `/api/progress-reports/{id}/version` | Create new version | 🧑‍💻 |
| POST | `/api/progress-reports/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/progress-reports/upload-excel/import` | Import from Excel | 👔 |
| GET | `/api/progress-reports/shared/{token}` | View shared report (public token) | 🔓 |

### `prefix: /api/manpower-status` — Manpower Status
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/manpower-status/` | List | 🔐 |
| POST | `/api/manpower-status/create` | Create | 🧑‍💻 |
| PUT | `/api/manpower-status/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/manpower-status/{id}` | Delete | 🧑‍💻 |
| POST | `/api/manpower-status/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/manpower-status/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/contract-status` — Contract Status
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/contract-status/` | List (filter by fy, month) | 🔐 |
| POST | `/api/contract-status/create` | Create | 🧑‍💻 |
| PUT | `/api/contract-status/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/contract-status/{id}` | Delete | 🧑‍💻 |
| POST | `/api/contract-status/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/contract-status/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/fund-management` — Fund Management
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/fund-management/` | List (filter by fy, month, project) | 🔐 |
| GET | `/api/fund-management/summary` | Aggregated summary | 🔐 |
| GET | `/api/fund-management/export` | Export to Excel | 🔐 |
| POST | `/api/fund-management/create` | Create | 🧑‍💻 |
| PUT | `/api/fund-management/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/fund-management/{id}` | Delete | 🧑‍💻 |
| POST | `/api/fund-management/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/fund-management/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/data-processing` — Data Processing
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/data-processing/` | List | 🔐 |
| POST | `/api/data-processing/create` | Create | 🧑‍💻 |
| PUT | `/api/data-processing/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/data-processing/{id}` | Delete | 🧑‍💻 |
| POST | `/api/data-processing/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/data-processing/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/regional-lab` — Regional Lab Equipment
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/regional-lab/` | List | 🔐 |
| POST | `/api/regional-lab/create` | Create | 🧑‍💻 |
| PUT | `/api/regional-lab/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/regional-lab/{id}` | Delete | 🧑‍💻 |
| POST | `/api/regional-lab/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/regional-lab/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/reporting-appraisals` — Reporting Appraisals
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/reporting-appraisals/` | List | 🔐 |
| POST | `/api/reporting-appraisals/create` | Create | 🧑‍💻 |
| PUT | `/api/reporting-appraisals/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/reporting-appraisals/{id}` | Delete | 🧑‍💻 |
| POST | `/api/reporting-appraisals/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/reporting-appraisals/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/pending-issues` — Pending Issues
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/pending-issues/` | List | 🔐 |
| POST | `/api/pending-issues/create` | Create | 🧑‍💻 |
| PUT | `/api/pending-issues/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/pending-issues/{id}` | Delete | 🧑‍💻 |
| POST | `/api/pending-issues/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/pending-issues/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/hse-incidents` — HSE Incidents
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/hse-incidents/` | List | 🔐 |
| POST | `/api/hse-incidents/create` | Create | 🧑‍💻 |
| PUT | `/api/hse-incidents/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/hse-incidents/{id}` | Delete | 🧑‍💻 |
| POST | `/api/hse-incidents/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/hse-incidents/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/hse-certificates` — HSE Certificates
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/hse-certificates/` | List (with audit history) | 🔐 |
| POST | `/api/hse-certificates/create` | Create | 🧑‍💻 |
| PUT | `/api/hse-certificates/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/hse-certificates/{id}` | Delete | 🧑‍💻 |
| GET | `/api/hse-certificates/{id}/history` | Get change history | 🔐 |
| POST | `/api/hse-certificates/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/hse-certificates/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/hse-audits` — HSE Audits
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/hse-audits/` | List (with history) | 🔐 |
| POST | `/api/hse-audits/create` | Create | 🧑‍💻 |
| PUT | `/api/hse-audits/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/hse-audits/{id}` | Delete | 🧑‍💻 |
| GET | `/api/hse-audits/{id}/history` | Get change history | 🔐 |
| POST | `/api/hse-audits/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/hse-audits/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/awp-items` — AWP Items
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/awp-items/` | List | 🔐 |
| POST | `/api/awp-items/create` | Create | 🧑‍💻 |
| PUT | `/api/awp-items/{id}` | Update | 🧑‍💻 |
| DELETE | `/api/awp-items/{id}` | Delete | 🧑‍💻 |
| POST | `/api/awp-items/upload-excel/preview` | Preview import | 👔 |
| POST | `/api/awp-items/upload-excel/import` | Import from Excel | 👔 |

### `prefix: /api/requests` — Requests
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/requests/` | List | 🔐 |
| POST | `/api/requests/create` | Create | 🔐 |
| PUT | `/api/requests/{id}/review-ops` | Review as Ops Manager | 👔 |
| PUT | `/api/requests/{id}/review-admin` | Review as Admin | 👑 |

### `prefix: /api/knowledge` — Knowledge Items
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/knowledge/` | List | 🔐 |
| POST | `/api/knowledge/create` | Create | 🔐 |
| PUT | `/api/knowledge/{id}/review-ops` | Review as Ops Manager | 👔 |
| PUT | `/api/knowledge/{id}/review-admin` | Review as Admin | 👑 |

### `prefix: /api/stage2` — Stage-II Acquisition Targets
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/stage2/acquisition-targets` | List all acquisition targets | 🔐 |
| POST | `/api/stage2/acquisition-targets/create` | Create | 👔 |
| PUT | `/api/stage2/acquisition-targets/{id}` | Update | 👔 |
| DELETE | `/api/stage2/acquisition-targets/{id}` | Delete | 👔 |
| GET | `/api/stage2/target-month-histories` | Get month-wise change history | 🔐 |

### `prefix: /api/contract-summary` — Contract Summaries
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/contract-summary/` | List | 🔐 |
| POST | `/api/contract-summary/create` | Create | 👔 |
| PUT | `/api/contract-summary/{id}` | Update | 👔 |
| DELETE | `/api/contract-summary/{id}` | Delete | 👔 |

### `prefix: /api/sharepoint` — File Sharing
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/sharepoint/` | List shared files | 🔐 |
| POST | `/api/sharepoint/share` | Share a file (role-based, time-bound) | 🔐 |
| GET | `/api/sharepoint/download/{id}` | Download shared file | 🔐 |
| DELETE | `/api/sharepoint/{id}` | Delete/expire shared file | 🔐 |

### `prefix: /api/system-config` — System Configuration
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/system-config/` | List config by category | 👑 |
| POST | `/api/system-config/create` | Create config entry | 👑 |
| PUT | `/api/system-config/{id}` | Update config | 👑 |
| DELETE | `/api/system-config/{id}` | Delete config | 👑 |

### `prefix: /api/ai` — AI Features
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/ai/index-file/{id}` | Index file for RAG | 👑 |
| GET | `/api/ai/index-status/{id}` | Get chunk count for file | 🔐 |
| GET | `/api/ai/job-status/{id}` | Get background job status | 🔐 |
| POST | `/api/ai/reindex-all` | Re-index all files | 👑 |
| GET | `/api/ai/vector-stats` | Total chunks & files in vector store | 🔐 |
| GET | `/api/ai/knowledge-graph` | Full knowledge graph data | 🔐 |
| GET | `/api/ai/knowledge-graph/entities` | List KG entities | 🔐 |
| GET | `/api/ai/knowledge-graph/relationships` | List KG relationships | 🔐 |
| GET | `/api/ai/knowledge-graph/stats` | KG statistics | 🔐 |
| POST | `/api/ai/sql-query` | Natural language → SQL query | 🔐 |
| POST | `/api/ai/generate-report` | AI report generation | 🔐 |
| GET | `/api/ai/download-report` | Download generated report file | 🔐 |
| POST | `/api/ai/search` | Hybrid/semantic/keyword search | 🔐 |
| GET | `/api/ai/summarize/{id}` | Generate document summary | 🔐 |
| GET | `/api/ai/related/{id}` | Find related documents | 🔐 |
| GET | `/api/ai/audit-log` | AI usage audit log | 👑 |
| GET | `/api/ai/audit-stats` | AI usage statistics | 👑 |

---

## Frontend Pages/Components

**Routing** in `App.jsx` via page state variable. All pages are inline (no React Router):

| Page State | Component | Description |
|---|---|---|
| `null` (login) | `LoginPage` | Login form + dynamic Test Accounts from `/api/users/public` |
| `"dashboard"` | `AdminDashboard` | File stats, by-section/by-type charts, recent activity |
| `"user-dashboard"` | `UserDashboard` | Role-scoped file stats for non-admin users |
| `"smart-dashboard"` | `SmartDashboard` | Overview: module KPIs, BE/RE section, document stats, targets |
| `"analytics"` | `AnalyticalDashboard` | Upload trends, approval/rejection timelines, classification breakdown |
| `"activity"` | `ActivityAnalytics` | Activity summary, pending files, Excel export |
| `"projects"` | inline | Project list CRUD + Excel import |
| `"project_details"` | inline | Project detail with events, documents, file upload |
| `"upload"` | inline | Form-based file upload with metadata |
| `"approvals"` | inline | Pending/approved/rejected files with approve/reject |
| `"search"` | inline | Keyword + semantic search across documents |
| `"targets"` | inline | Targets/KPI CRUD + accomplishments + Excel import |
| `"highlights"` | inline | Highlights CRUD + Excel import |
| `"technical-reports"` | inline | Technical reports CRUD + Excel import |
| `"report-builder"` | inline | Report templates, periods, submissions workflow |
| `"progress-reports"` | inline | Progress reports CRUD + versioning + Excel import |
| `"manpower"` | inline | Manpower status CRUD + Excel import |
| `"contracts"` | inline | Contract status CRUD + Excel import |
| `"funds"` | inline | Fund management CRUD + Excel import/export |
| `"data-processing"` | inline | Data processing CRUD + Excel import |
| `"lab"` | inline | Regional lab equipment CRUD + Excel import |
| `"appraisals"` | inline | Reporting appraisals CRUD + Excel import |
| `"pending-issues"` | inline | Pending issues CRUD + Excel import |
| `"hse-incidents"` | inline | HSE incidents CRUD + Excel import |
| `"hse-certificates"` | inline | HSE certificates CRUD + history + Excel import |
| `"hse-audits"` | inline | HSE audits CRUD + history + Excel import |
| `"awp"` | inline | AWP items CRUD + Excel import |
| `"stage2"` | inline | Acquisition targets monthly target/actual + approval |
| `"contract-summary"` | inline | Contract summaries CRUD |
| `"requests"` | inline | User requests with ops+admin review workflow |
| `"knowledge"` | inline | Knowledge items with review workflow |
| `"sharepoint"` | inline | Role-based time-bound file sharing |
| `"admin"`→`"users"` | inline | User management (list, create, edit) |
| `"admin"`→`"lookups"` | inline | Dynamic lookup value management |
| `"admin"`→`"dynamic-fields"` | inline | Page-specific custom field management |
| `"admin"`→`"section-config"` | inline | Section configuration (category, ops_manager, location) |
| `"admin"`→`"database"` | inline | Database explorer (all tables/rows) |
| `"admin"`→`"permissions"` | inline | Classification permission management |
| `"admin"`→`"ai-audit"` | inline | AI usage audit log viewer |
| `"admin"`→`"system-config"` | inline | System config value management |
| `"reports"` | inline | Monthly upload reports |
| `"files"` | inline | File browser by section/classification |

---

## Deployment Architecture

```
Frontend: Vite + React (port 5173 dev) → static build (dist/)
Backend:  FastAPI + Uvicorn (port 8000)
Database: PostgreSQL with pgvector extension
AI:       Sentence-transformers (embeddings) + OpenAI/LLM (RAG)
```

### Key environment variables (`backend/app/config.py`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `PGVECTOR_ENABLED` | Enable/disable vector search |
| `SECRET_KEY` | JWT signing key |
| `OPENAI_API_KEY` | For LLM features |
| `UPLOAD_DIR` | File upload storage path |
| `PROJECT_UPLOAD_DIR` | Project files storage path |

### Build & deploy commands
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd ongc-portal && npm install
npm run build    # produces dist/
npm run dev      # dev server on :5173
```
