import { useState, useEffect } from "react";
import { api } from "../api";

// Maps any variant of a page/module name to the canonical DB page name
// (matches exactly what was seeded into the lookups table via seed_all_module_fields.py)
export function getCanonicalPageName(pageOrFields) {
  if (!pageOrFields) return "";
  const norm = pageOrFields.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const MAP = {
    // Progress Reports
    "progressreport": "ProgressReport",
    "progressreports": "ProgressReport",
    // Contract Status
    "contractstatus": "ContractStatus",
    // Fund Management
    "fundmanagement": "FundManagement",
    // Data Processing
    "dataprocessing": "DataProcessing",
    // Regional Lab
    "regionallab": "RegionalLab",
    // Reporting Appraisals
    "reportingappraisals": "ReportingAppraisals",
    "reportingappraisal": "ReportingAppraisals",
    // Pending Issues
    "pendingissues": "PendingIssues",
    "pendingissue": "PendingIssues",
    // HSE
    "hse": "HSE",
    "hseincident": "HSE",
    "hseincidents": "HSE",
    "hsecertificate": "HSECertificate",
    "hsecertificates": "HSECertificate",
    "hseaudit": "HSEAudit",
    "hseaudits": "HSEAudit",
    // AWP
    "awp": "AWP",
    "awpitem": "AWP",
    "awpitems": "AWP",
    // Highlights
    "highlights": "Highlights",
    "highlight": "Highlights",
    // Technical Reports
    "technicalreports": "TechnicalReports",
    "technicalreport": "TechnicalReports",
    // Manpower Status
    "manpowerstatus": "ManpowerStatus",
  };
  return MAP[norm] || pageOrFields;
}

// Determines which API call to use to get field options for the mapping UI
async function fetchFieldOptions(page, fields) {
  // Projects — dedicated /excel-fields backend endpoint (fixed schema)
  if (fields === "project" || page === "project") {
    return api.getProjectExcelFields().then(f =>
      f.map(x => ({ value: x.field_name, label: x.label }))
    );
  }
  // Targets — dedicated /excel-fields backend endpoint (fixed schema)
  if (fields === "target" || page === "target") {
    return api.getTargetExcelFields().then(f =>
      f.map(x => ({ value: x.field_name, label: x.label }))
    );
  }
  // Dynamic modules — look up fields from the lookups table via canonical page name
  const lookupPage = getCanonicalPageName(page || fields || "");
  if (!lookupPage) return [];
  return api.listPageFields(lookupPage).then(f =>
    f.map(x => ({ value: x.field_name, label: x.label || x.field_name }))
  ).catch(() => []);
}

export default function ExcelUploadModal({
  show, onClose, onToast,
  apiPreview, apiImport,
  fields, onSuccess, page, title,
  extraFilters
}) {
  const [excelFile, setExcelFile]       = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelMapping, setExcelMapping] = useState({});
  const [excelLoading, setExcelLoading] = useState(false);
  const [fieldOpts, setFieldOpts]       = useState([]);
  const [showMapPanel, setShowMapPanel] = useState(false);
  const [optsLoading, setOptsLoading]   = useState(false);
  const [inputKey, setInputKey]         = useState(0);

  // Load field options whenever the modal opens
  useEffect(() => {
    if (!show) return;
    setOptsLoading(true);
    fetchFieldOptions(page, fields)
      .then(opts => setFieldOpts(opts))
      .catch(() => setFieldOpts([]))
      .finally(() => setOptsLoading(false));
  }, [show, page, fields]);

  function reset() {
    setExcelPreview(null);
    setExcelFile(null);
    setExcelMapping({});
    setShowMapPanel(false);
    setInputKey(k => k + 1);
  }

  if (!show) return null;

  const hasUnmapped = excelPreview && excelPreview.columns?.some(c => !excelMapping[c]);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}
      onClick={() => { onClose(); reset(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14,
          padding: 28, maxWidth: 720, width: "92%",
          maxHeight: "88vh", overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0b3d91" }}>📥 {title || "Upload Excel"}</div>
          <button
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", lineHeight: 1 }}
            onClick={() => { onClose(); reset(); }}
          >✕</button>
        </div>

        {/* ── Step 1: File picker ── */}
        {!excelPreview && (
          <div>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
              Select an <strong>.xlsx</strong> file to bulk import data.
              Column names will be auto-detected and matched to the correct fields.
              Any unmatched columns can be mapped manually before importing.
            </p>

            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "32px 20px",
              border: "2px dashed #c0cfe8", borderRadius: 10,
              background: "#f5f8ff", cursor: "pointer",
              transition: "border-color 0.2s"
            }}>
              <span style={{ fontSize: 36 }}>📂</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0b3d91" }}>Click to select an Excel file</span>
              <span style={{ fontSize: 12, color: "#999" }}>.xlsx or .xls files supported</span>
              <input
                key={inputKey}
                type="file" accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
                    onToast?.("Only .xlsx or .xls files are supported", "error");
                    return;
                  }
                  if (!apiPreview) {
                    onToast?.("Excel upload preview API is not configured for this module", "error");
                    return;
                  }
                  setExcelFile(file);
                  setExcelLoading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const data = await apiPreview(fd);
                    setExcelPreview(data);
                    // Pre-fill mapping with whatever the backend auto-matched
                    setExcelMapping(data.auto_mapping || {});
                    // If any unmatched → open the map panel automatically
                    if (!data.auto) setShowMapPanel(true);
                  } catch (err) {
                    onToast?.(err.message || "Failed to read file", "error");
                    setExcelPreview(null);
                    setExcelFile(null);
                  }
                  setExcelLoading(false);
                }}
              />
            </label>

            {excelLoading && (
              <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>
                ⏳ Reading Excel file…
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => { onClose(); reset(); }}
                style={{ padding: "8px 18px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}
              >Cancel</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview + mapping ── */}
        {excelPreview && (
          <div>
            {/* File / sheet info bar */}
            <div style={{ background: "#f0f4ff", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#333" }}>
              <strong>📄 {excelFile?.name}</strong>
              <span style={{ marginLeft: 12, color: "#666" }}>
                Sheet: <strong>{excelPreview.sheet_name}</strong> ·{" "}
                <strong>{excelPreview.row_count}</strong> rows ·{" "}
                <strong>{excelPreview.columns?.length}</strong> columns
              </span>

              {excelPreview.sheets?.length > 1 && (
                <select
                  style={{ marginLeft: 14, padding: "3px 8px", border: "1px solid #c0cfe8", borderRadius: 4, fontSize: 12 }}
                  value={excelPreview.sheet_name}
                  onChange={async e => {
                    setExcelLoading(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", excelFile);
                      fd.append("sheet_name", e.target.value);
                      const data = await apiPreview(fd);
                      setExcelPreview(data);
                      setExcelMapping(data.auto_mapping || {});
                      if (!data.auto) setShowMapPanel(true);
                    } catch (err) {
                      onToast?.(err.message, "error");
                    }
                    setExcelLoading(false);
                  }}
                >
                  {excelPreview.sheets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            {/* Duplicate warning */}
            {excelPreview.duplicate_count > 0 && (
              <div style={{ padding: "8px 14px", background: "#FFF3E0", border: "1px solid #ffe082", borderRadius: 8, fontSize: 12, color: "#E65100", marginBottom: 12 }}>
                ⚠️ <strong>{excelPreview.duplicate_count}</strong> row(s) already exist and will be <strong>skipped</strong> on import.
              </div>
            )}

            {/* Auto-match status */}
            {excelPreview.auto ? (
              <div style={{ padding: "10px 14px", background: "#E8F5E9", border: "1px solid #a5d6a7", borderRadius: 8, fontSize: 13, color: "#1B5E20", fontWeight: 600, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>✅ All columns auto-matched! Ready to import.</span>
                <button
                  onClick={() => setShowMapPanel(!showMapPanel)}
                  style={{ background: "#1B5E20", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                >
                  {showMapPanel ? "Hide mapping" : "Verify mapping"}
                </button>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", background: "#FFF8E1", border: "1px solid #ffe082", borderRadius: 8, fontSize: 13, color: "#B71C1C", fontWeight: 600, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>⚠️ {excelPreview.unmapped?.length || 0} column(s) couldn't be auto-matched — please map them below.</span>
                <button
                  onClick={() => setShowMapPanel(!showMapPanel)}
                  style={{ background: "#B71C1C", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                >
                  {showMapPanel ? "Hide" : "Map columns"}
                </button>
              </div>
            )}

            {/* Column mapping panel */}
            {showMapPanel && (
              <div style={{ border: "1px solid #d0d8e8", borderRadius: 10, padding: 16, background: "#fafbff", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0b3d91", marginBottom: 12 }}>
                  🗂 Column Mapping
                  {optsLoading && <span style={{ fontSize: 11, color: "#999", fontWeight: 400, marginLeft: 8 }}>Loading fields…</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: "8px 6px", alignItems: "center" }}>
                  {/* Header row */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Excel Column</div>
                  <div />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Maps to Field</div>

                  {excelPreview.columns?.map(col => {
                    const matched = !!excelMapping[col];
                    return [
                      /* Column name chip */
                      <div key={`col-${col}`} style={{
                        padding: "7px 10px",
                        background: matched ? "#f0f7f0" : "#fff8e1",
                        border: `1px solid ${matched ? "#a5d6a7" : "#ffe082"}`,
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                        color: matched ? "#1B5E20" : "#B71C1C",
                        display: "flex", alignItems: "center", gap: 6
                      }}>
                        {matched ? "✓" : "!"} {col}
                      </div>,

                      /* Arrow */
                      <div key={`arr-${col}`} style={{ textAlign: "center", color: "#bbb", fontSize: 16 }}>→</div>,

                      /* Field selector */
                      <select
                        key={`sel-${col}`}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          border: `1px solid ${matched ? "#ccc" : "#ffb300"}`,
                          borderRadius: 6, fontSize: 12, background: "#fff",
                          outline: "none", cursor: "pointer"
                        }}
                        value={excelMapping[col] || ""}
                        onChange={e => setExcelMapping(m => ({ ...m, [col]: e.target.value || undefined }))}
                      >
                        <option value="">— Skip this column —</option>
                        {fieldOpts.length === 0 && !optsLoading
                          ? <option disabled>No fields configured in database</option>
                          : fieldOpts.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))
                        }
                      </select>
                    ];
                  })}
                </div>
              </div>
            )}

            {/* Data preview */}
            <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "8px 14px", background: "#f5f5f5", fontSize: 12, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>
                Data Preview (first {excelPreview.preview?.length || 0} rows)
              </div>
              <div style={{ overflow: "auto", maxHeight: 160 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {excelPreview.columns?.map(c => (
                        <th key={c} style={{ padding: "6px 10px", background: "#f0f4ff", border: "1px solid #e0e8f5", whiteSpace: "nowrap", textAlign: "left", color: "#333", fontWeight: 600 }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelPreview.preview?.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        {excelPreview.columns?.map(c => (
                          <td key={c} style={{ padding: "5px 10px", border: "1px solid #eee", whiteSpace: "nowrap", color: "#555" }}>
                            {row[c] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                style={{ padding: "9px 20px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}
                onClick={() => reset()}
              >← Back</button>

              <button
                disabled={excelLoading}
                style={{
                  padding: "9px 24px", border: "none", borderRadius: 6,
                  background: excelLoading ? "#90a4ae" : "#0b3d91",
                  color: "#fff", cursor: excelLoading ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700, minWidth: 140,
                  display: "flex", alignItems: "center", gap: 8, justifyContent: "center"
                }}
                onClick={async () => {
                  if (!apiImport) {
                    onToast?.("Excel upload import API is not configured for this module", "error");
                    return;
                  }
                  setExcelLoading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", excelFile);
                    const finalMapping = Object.fromEntries(
                      Object.entries(excelMapping).filter(([, v]) => v)
                    );
                    fd.append("mapping", JSON.stringify(finalMapping));
                    fd.append("conflict", "skip");
                    if (excelPreview.sheet_name) fd.append("sheet_name", excelPreview.sheet_name);
                    if (extraFilters?.fy) fd.append("fy", extraFilters.fy);
                    if (extraFilters?.month && extraFilters.month !== "All") fd.append("month", extraFilters.month);
                    const data = await apiImport(fd);
                    onToast?.(
                      data.msg || `${data.imported} record(s) imported successfully${data.skipped ? `, ${data.skipped} skipped` : ""}`,
                      "success"
                    );
                    onClose();
                    reset();
                    onSuccess?.();
                  } catch (err) {
                    onToast?.(err.message || "Import failed", "error");
                  }
                  setExcelLoading(false);
                }}
              >
                {excelLoading ? "⏳ Importing…" : `Import ${excelPreview.row_count} rows`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
