# HSE Page Enhancement Plan

## Summary of Changes

Only **one file** needs modification: `src/components/modules/HSE.jsx` (586 lines).
The backend routes and models already support all required fields — no backend changes needed.

---

## What Already Exists (No Changes Needed)

- **Backend models** (`base.py`): `HSECertificate` already has `certificate_type`, `department`, `notes`. `HSEAudit` already has `audit_type`, `department`.
- **Backend routes**: Already return these fields in list endpoints and accept them in create/update.
- **Incidents tab**: Uses `DynamicCRUD` which pulls configurable fields from DB `page_fields` table. KPI cards compute from live DB data.
- **Fallback arrays**: The `["Valid","Expired","Expiring Soon",...]` and `["Critical","High","Medium","Low"]` arrays are only used when DB lookups return empty — this is correct behavior.

---

## Changes to `src/components/modules/HSE.jsx`

### 1. Add HSE Compliance Dashboard (new section above tabs)

Compute and display at the very top of the page (before tabs):

- **Overall Compliance Score** (0-100%): weighted average of:
  - Certificate compliance: `(valid certs / total certs) * 100` (only if certs exist)
  - Audit closure rate: `(closed audits / total audits) * 100` (only if audits exist)
  - Incident resolution rate: `(resolved incidents / total incidents) * 100` (only if incidents exist)
- **Summary cards** row showing:
  - Total items across all 3 modules (certs + audits + incidents)
  - Open items needing attention (expired certs + pending audits + open incidents)
  - Overdue items (expired certs + overdue audits)
  - Compliance score with color coding (green ≥80%, amber ≥50%, red <50%)
- Visual: A compact horizontal dashboard with 4 summary cards + a progress bar for the compliance score.

### 2. Enhance CERTIFICATES Tab

#### 2a. Add new fields to form state
- Add `certificate_type: ""` and `department: ""` to the `certForm` initial state (line 41-44)
- Add `notes: ""` to the form state

#### 2b. Add form fields (in the form grid, after the existing 7 fields)
- **Certificate Type** — `<select>` with options: Safety, Training, Equipment, Medical, Insurance, Other
- **Department** — `<input>` text field with placeholder "e.g. Drilling, Production, Pipeline"
- **Notes** — `<textarea>` spanning full width, optional

#### 2c. Update handlers
- `handleCertSubmit`: include `certificate_type`, `department`, `notes` in FormData
- `editCert`: populate `certificate_type`, `department`, `notes` from the certificate object
- Reset form in `handleCertSubmit` after success to include new fields

#### 2d. Add columns to table
- Add **Type** column (shows `certificate_type`, fallback "—")
- Add **Department** column (shows `department`, fallback "—")
- Update `colSpan` in empty row and header count accordingly

### 3. Enhance AUDITS Tab

#### 3a. Add new fields to form state
- Add `audit_type: ""` and `department: ""` to the `auditForm` initial state (line 49-53)

#### 3b. Add form fields (in the form grid)
- **Audit Area/Location** — `<input>` text field with placeholder "e.g. Platform A, Drilling Rig #3"
- **Department** — `<input>` text field with placeholder "e.g. HSE, Operations, Maintenance"

#### 3c. Update handlers
- `handleAuditSubmit`: include `audit_type`, `department` in FormData
- `editAudit`: populate `audit_type`, `department` from the audit object
- Reset form in `handleAuditSubmit` after success to include new fields

#### 3d. Add columns to table
- Add **Area/Location** column (shows `audit_type`, fallback "—")
- Add **Department** column (shows `department`, fallback "—")
- Update `colSpan` in empty row and header count accordingly

### 4. Incidents Tab — No Changes

Already fully dynamic via `DynamicCRUD`. The page field configuration in the DB controls what fields appear. KPI cards are computed from live data.

---

## Implementation Details

### Compliance Score Computation (new helper)
```js
const complianceScore = (() => {
  let scores = [];
  if (certificates.length) {
    const valid = certsByStatus["Valid"] || 0;
    scores.push((valid / certificates.length) * 100);
  }
  if (audits.length) {
    const closed = auditsByStatus["Closed"] || 0;
    scores.push((closed / audits.length) * 100);
  }
  if (incidents.length) {
    const resolved = incidents.filter(i => i.status === "Resolved" || i.status === "Closed").length;
    scores.push((resolved / incidents.length) * 100);
  }
  return scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 100;
})();
```

### Open Items Computation
```js
const openItems = (certsByStatus["Expired"]||0) + (certsByStatus["Expiring Soon"]||0) + pendingAudits.length + incidents.filter(i => (i.status||"Open") === "Open").length;
```

### Dashboard JSX Structure
- Container div with flex layout, 4 stat cards in a row
- Each card: icon/label + count + colored left border
- Compliance score card with circular progress or horizontal bar

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/modules/HSE.jsx` | Add dashboard, add cert_type/department/notes fields to Cert tab, add audit_type/department fields to Audit tab |

## Files NOT Modified

| File | Reason |
|------|--------|
| `backend/app/routes/hse_certificates.py` | Already handles certificate_type, department, notes |
| `backend/app/routes/hse_audits.py` | Already handles audit_type, department |
| `backend/app/routes/hse_incidents.py` | No changes needed |
| `backend/app/models/base.py` | All columns already exist |
