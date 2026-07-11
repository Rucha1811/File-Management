import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { S } from "../shared/styles";
import { DynamicCRUD } from "../shared/DynamicCRUD";

const BTN = {
  padding: "8px 20px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const OVERLAY = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.5)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 1000,
};

const MODAL = {
  background: "#fff", borderRadius: 12, padding: 28, minWidth: 700,
  maxWidth: "90vw", maxHeight: "85vh", overflow: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const styles = {
  summaryTable: (compact) => ({
    width: "100%", borderCollapse: "collapse",
    fontSize: compact ? 13 : 14,
    background: "#fff", borderRadius: 8, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  }),
  th: {
    background: "linear-gradient(135deg, #1a3a5c, #2a5a8c)",
    color: "#fff", padding: "10px 8px", textAlign: "center",
    fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)",
    whiteSpace: "nowrap",
  },
  td: { padding: "8px", textAlign: "center", border: "1px solid #e0e0e0", verticalAlign: "middle" },
  tdLabel: { padding: "8px 12px", fontWeight: 600, textAlign: "left", border: "1px solid #e0e0e0", background: "#f8f9fa" },
  card: {
    background: "#fff", borderRadius: 10, padding: "20px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 24,
  },
  cardHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
};

const BUDGET_HEADS = [
  "Capital",
  "Stores",
  "Spares",
  "Contractual",
];

const BUDGET_COLS = [
  { key: "budgetHead", label: "Budget Head", readonly: true },
  { key: "be", label: "BE (Cr)" },
  { key: "re", label: "RE (Cr)" },
  { key: "utilization", label: "Utilization (Cr)" },
  { key: "pendingBalance", label: "Pending Balance (Cr)" },
  { key: "utilPct1", label: "% Util (1)" },
  { key: "utilPct2", label: "% Util (2)" },
  { key: "prRaised", label: "PR Raised (Cr)" },
  { key: "poPlaced", label: "PO Placed (Cr)" },
  { key: "materialReceived", label: "Material Received (Cr)" },
  { key: "remarks", label: "Remarks" },
];

const ACQ_SECTIONS = [
  "GP-03", "GP-06", "GP-15", "GP-16", "GP-26",
  "GP-61", "GP-81", "NLW", "CB-ONHP-2022/1",
];

const ACQ_ROWS = [
  { sno: 1, label: "Staff" },
  { sno: 2, label: "Stores & spares" },
  { sno: 3, label: "Other Contractuals" },
  { sno: 4, label: "Insurance" },
  { sno: 5, label: "Light,Power,Fuel,Water" },
  { sno: 6, label: "Other Comp. Income" },
  { sno: 7, label: "Others" },
  { sno: 8, label: "Dep" },
  { sno: 9, label: "Total" },
];

function emptyBudgetRows() {
  return BUDGET_HEADS.map((h) => ({
    budgetHead: h, be: 0, re: 0, utilization: 0, pendingBalance: 0,
    utilPct1: 0, utilPct2: 0, prRaised: 0, poPlaced: 0, materialReceived: null, remarks: "",
  }));
}

function emptyAcqRows() {
  return ACQ_ROWS.map((r) => ({
    sno: r.sno, particulars: r.label,
    values: ACQ_SECTIONS.map(() => 0), total: 0,
  }));
}

function BudgetTable({ data }) {
  const rows = data?.rows || emptyBudgetRows();
  return (
    <table style={styles.summaryTable(false)}>
      <thead>
        <tr>
          {BUDGET_COLS.map((c) => (
            <th key={c.key} style={styles.th}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {BUDGET_COLS.map((c) => (
              <td key={c.key}
                style={c.key === "budgetHead" ? styles.tdLabel : styles.td}
              >
                {c.key === "budgetHead" ? row[c.key] :
                 c.key === "remarks" ? (row[c.key] || "") :
                 row[c.key] != null ? Number(row[c.key]).toFixed(2) : "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AcqCostTable({ data }) {
  const sections = data?.sections || ACQ_SECTIONS;
  const rows = data?.rows || emptyAcqRows();
  return (
    <table style={styles.summaryTable(true)}>
      <thead>
        <tr>
          <th style={{...styles.th, width: 40}}>S.No.</th>
          <th style={{...styles.th, textAlign: "left"}}>Particulars</th>
          {sections.map((s) => (
            <th key={s} style={styles.th}>{s}</th>
          ))}
          <th style={styles.th}>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.sno}>
            <td style={styles.td}>{row.sno}</td>
            <td style={{...styles.td, textAlign: "left", fontWeight: row.sno === rows.length ? 700 : 400}}>{row.particulars}</td>
            {row.values.map((v, ci) => (
              <td key={ci} style={{...styles.td, fontWeight: row.sno === rows.length ? 700 : 400}}>
                {v != null ? Number(v).toFixed(2) : "-"}
              </td>
            ))}
            <td style={{...styles.td, fontWeight: 700}}>
              {row.total != null ? Number(row.total).toFixed(2) : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BudgetEditForm({ data, onChange }) {
  const rows = data?.rows || emptyBudgetRows();
  const setRow = (i, field, val) => {
    const updated = rows.map((r, j) => j === i ? { ...r, [field]: val } : r);
    onChange({ ...data, rows: updated });
  };
  return (
    <table style={styles.summaryTable(false)}>
      <thead>
        <tr>
          {BUDGET_COLS.map((c) => (
            <th key={c.key} style={styles.th}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {BUDGET_COLS.map((c) => (
              <td key={c.key} style={c.key === "budgetHead" ? styles.tdLabel : { ...styles.td, padding: "4px" }}>
                {c.readonly ? row[c.key] : (
                  <input
                    type={c.key === "remarks" ? "text" : "number"}
                    step={c.key === "remarks" ? undefined : "0.01"}
                    value={row[c.key] ?? ""}
                    onChange={(e) => setRow(i, c.key, c.key === "remarks" ? e.target.value : (e.target.value === "" ? null : parseFloat(e.target.value) || 0))}
                    style={{ width: c.key === "remarks" ? 120 : 90, padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13, textAlign: "right" }}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AcqEditForm({ data, onChange }) {
  const sections = data?.sections || ACQ_SECTIONS;
  const rows = data?.rows || emptyAcqRows();
  const setValue = (rowI, colI, val) => {
    const updated = rows.map((r, j) => {
      if (j !== rowI) return r;
      const newVals = r.values.map((v, k) => k === colI ? val : v);
      const total = newVals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
      return { ...r, values: newVals, total };
    });
    onChange({ ...data, rows: updated });
  };
  return (
    <table style={styles.summaryTable(true)}>
      <thead>
        <tr>
          <th style={styles.th}>S.No.</th>
          <th style={{...styles.th, textAlign: "left"}}>Particulars</th>
          {sections.map((s) => (
            <th key={s} style={styles.th}>{s}</th>
          ))}
          <th style={styles.th}>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.sno}>
            <td style={styles.td}>{row.sno}</td>
            <td style={{...styles.td, textAlign: "left", fontWeight: row.sno === rows.length ? 700 : 400}}>
              {row.particulars}
            </td>
            {row.values.map((v, ci) => (
              <td key={ci} style={{ ...styles.td, padding: "4px" }}>
                <input
                  type="number"
                  step="0.01"
                  disabled={row.sno === rows.length}
                  value={v ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : (parseFloat(e.target.value) || 0);
                    setValue(i, ci, val);
                  }}
                  style={{ width: 85, padding: "4px 6px", border: "1px solid #ccc", borderRadius: 4, fontSize: 12, textAlign: "right" }}
                />
              </td>
            ))}
            <td style={{...styles.td, fontWeight: 700}}>{Number(row.total).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ContractStatus({ user, onToast }) {
  const [budgetData, setBudgetData] = useState(null);
  const [acqData, setAcqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editType, setEditType] = useState(null);
  const [editData, setEditData] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [financialYear, setFinancialYear] = useState("2025-26");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, acqRes] = await Promise.all([
        api.listContractSummaries("budget_utilization", financialYear),
        api.listContractSummaries("acquisition_cost", financialYear),
      ]);
      setBudgetData(budgetRes.length > 0 ? budgetRes[0] : null);
      setAcqData(acqRes.length > 0 ? acqRes[0] : null);
    } catch (e) {
      if (onToast) onToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [financialYear, onToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (type) => {
    if (type === "budget_utilization") {
      setEditData(budgetData ? { ...budgetData.data } : { rows: emptyBudgetRows() });
      setEditId(budgetData ? budgetData.id : null);
    } else {
      setEditData(acqData ? { ...acqData.data } : { sections: ACQ_SECTIONS, rows: emptyAcqRows() });
      setEditId(acqData ? acqData.id : null);
    }
    setEditType(type);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.updateContractSummary(editId, editData);
      } else {
        await api.createContractSummary(editType, financialYear, editData);
      }
      if (onToast) onToast("Saved successfully", "success");
      setEditType(null);
      await fetchData();
    } catch (e) {
      if (onToast) onToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={{ ...styles.card, marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#1a3a5c" }}>Contract Status Dashboard</h2>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>Financial Year:</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
          >
            <option>2024-25</option>
            <option>2025-26</option>
            <option>2026-27</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      ) : (
        <>
          {/* Budget vs Utilization */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={{ margin: 0, color: "#1a3a5c" }}>Budget vs Utilization (Amount in Crores)</h3>
              <button
                onClick={() => openEdit("budget_utilization")}
                style={{ ...BTN, background: "#1a3a5c", color: "#fff" }}
              >
                {budgetData ? "Edit" : "Add Data"}
              </button>
            </div>
            {budgetData ? (
              <BudgetTable data={budgetData.data} />
            ) : (
              <p style={{ color: "#999", fontStyle: "italic" }}>
                No budget utilization data for {financialYear}. Click "Add Data" to create it.
              </p>
            )}
          </div>

          {/* Acquisition Cost */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={{ margin: 0, color: "#1a3a5c" }}>Seismic Acquisition Cost (₹ in Lakh)</h3>
              <button
                onClick={() => openEdit("acquisition_cost")}
                style={{ ...BTN, background: "#1a3a5c", color: "#fff" }}
              >
                {acqData ? "Edit" : "Add Data"}
              </button>
            </div>
            {acqData ? (
              <AcqCostTable data={acqData.data} />
            ) : (
              <p style={{ color: "#999", fontStyle: "italic" }}>
                No acquisition cost data for {financialYear}. Click "Add Data" to create it.
              </p>
            )}
          </div>

          {/* Edit Modal */}
          {editType && (
            <div style={OVERLAY} onClick={() => !saving && setEditType(null)}>
              <div style={MODAL} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ margin: 0, color: "#1a3a5c" }}>
                    {editType === "budget_utilization" ? "Budget vs Utilization" : "Seismic Acquisition Cost"} — {financialYear}
                  </h3>
                  <button onClick={() => setEditType(null)} style={{ ...BTN, background: "#e0e0e0", color: "#333" }}>
                    Cancel
                  </button>
                </div>

                <div style={{ maxHeight: "55vh", overflow: "auto" }}>
                  {editType === "budget_utilization" ? (
                    <BudgetEditForm data={editData} onChange={setEditData} />
                  ) : (
                    <AcqEditForm data={editData} onChange={setEditData} />
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 8 }}>
                  <button onClick={() => setEditType(null)} style={{ ...BTN, background: "#e0e0e0", color: "#333" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ ...BTN, background: "#1a3a5c", color: "#fff", opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Individual Contract Records */}
      <div style={styles.card}>
        <h3 style={{ margin: "0 0 16px 0", color: "#1a3a5c" }}>Contract / Tendering Records</h3>
        <DynamicCRUD
          page="Contract Status"
          title="Contract / Tendering Status"
          apiList={api.listContractStatus}
          apiCreate={api.createContractStatus}
          apiUpdate={api.updateContractStatus}
          apiDelete={api.deleteContractStatus}
          apiExcelPreview={api.excelContractPreview}
          apiExcelImport={api.excelContractImport}
          excelFields="contract_status"
          uploadSection="Contract / Tendering Status"
          user={user}
          onToast={onToast}
        />
      </div>
    </div>
  );
}
