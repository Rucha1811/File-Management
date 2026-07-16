import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge, C0 } from "../shared/styles";
import { DonutSimple, VBarSimple, COL0 } from "../shared/Charts";
import { DrillDownModal } from "../shared/DrillDownModal";
import ExcelUploadModal from "../ExcelUploadModal";
import { ModuleFilesSection } from "../shared/ModuleFilesSection";

// Generate FY list from 1950 through 3000
function generateFYList() {
  const fys = [];
  for (let y = 3000; y >= 1950; y--) {
    fys.push(`FY ${y}-${String(y + 1).slice(-2)}`);
  }
  return fys;
}
const ALL_FY_OPTIONS = generateFYList();

const FISCAL_MONTHS = [
  "April","May","June","July","August","September",
  "October","November","December","January","February","March"
];

export function FundManagement({ user, onToast }) {
  const [activeTab, setActiveTab] = useState("Audited Statement");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFY, setSelectedFY] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [drillDown, setDrillDown] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // DB-driven dropdown options
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  const isViewer = user?.role === "viewer";

  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed; April = 3
    return m >= 3 ? `FY ${y}-${String(y + 1).slice(-2)}` : `FY ${y - 1}-${String(y).slice(-2)}`;
  })();

  const [form, setForm] = useState({
    head: "", allocated: "", spent: "", remaining: "",
    fy: currentFY, month: "", project: "", category: "", amount: "",
    audited_statement: "", expense_type: "", month_end_summary: ""
  });

  // Load data + dropdown configs from DB
  useEffect(() => {
    loadData();
    // Pull expense categories and types from DB via lookup API
    api.getLookups("expense_category").then(d => setExpenseCategories(d?.map?.(x => x.value) || [])).catch(() => {});
    api.getLookups("expense_type").then(d => setExpenseTypes(d?.map?.(x => x.value) || [])).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.listFundManagement();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      onToast?.("Failed to load fund records", "error");
    }
    setLoading(false);
  };

  const resetForm = () => setForm({
    head: "", allocated: "", spent: "", remaining: "",
    fy: currentFY, month: "", project: "", category: expenseCategories[0] || "",
    amount: "", audited_statement: "", expense_type: expenseTypes[0] || "",
    month_end_summary: ""
  });

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!form.head.trim()) { onToast?.("Budget Head is required", "error"); return; }
    const alloc = parseFloat(form.allocated) || 0;
    const spent = parseFloat(form.spent) || 0;
    const fd = new FormData();
    fd.append("head", form.head.trim());
    fd.append("allocated", String(alloc));
    fd.append("spent", String(spent));
    fd.append("remaining", String(parseFloat(form.remaining) || (alloc - spent)));
    fd.append("fy", form.fy || currentFY);
    fd.append("month", form.month || "");
    fd.append("project", form.project || "");
    fd.append("category", form.category || "");
    fd.append("amount", String(parseFloat(form.amount) || 0));
    fd.append("audited_statement", form.audited_statement || "");
    fd.append("expense_type", form.expense_type || "");
    fd.append("month_end_summary", form.month_end_summary || "");
    try {
      if (editingItem) {
        await api.updateFundManagement(editingItem.id, fd);
        onToast?.("Record updated", "success");
      } else {
        await api.createFundManagement(fd);
        onToast?.("Record created", "success");
      }
      resetForm(); setEditingItem(null); setShowForm(false); loadData();
    } catch (err) { onToast?.(err.message || "Failed to save", "error"); }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      head: item.head || "", allocated: item.allocated || "", spent: item.spent || "",
      remaining: item.remaining || "", fy: item.fy || currentFY, month: item.month || "",
      project: item.project || "", category: item.category || "",
      amount: item.amount || "", audited_statement: item.audited_statement || "",
      expense_type: item.expense_type || "", month_end_summary: item.month_end_summary || ""
    });
    setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try { await api.deleteFundManagement(id); onToast?.("Record deleted", "success"); loadData(); }
    catch { onToast?.("Failed to delete", "error"); }
  };

  const loadHistory = async (item) => {
    setHistoryItem(item); setLoadingHistory(true);
    try {
      const data = await api.getFundHistory(item.id);
      setItemHistory(data?.history || []);
    } catch { setItemHistory([]); }
    setLoadingHistory(false);
  };

  // Filtered items — FY + Month
  const filteredItems = items.filter(x =>
    (selectedFY === "All" || x.fy === selectedFY) &&
    (selectedMonth === "All" || x.month === selectedMonth)
  );

  // Distinct FYs that actually exist in the data, plus "All"
  const existingFYs = ["All", ...new Set(items.map(x => x.fy).filter(Boolean)).values()].sort().reverse();

  const totalAllocated = filteredItems.reduce((s, d) => s + Number(d.allocated || 0), 0);
  const totalSpent     = filteredItems.reduce((s, d) => s + Number(d.spent || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const utilPct        = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : "0.0";

  const fyChartData = {};
  items.forEach(x => { if (x.fy) { fyChartData[x.fy] = (fyChartData[x.fy] || 0) + Number(x.spent || 0); } });

  const catChartData = {};
  filteredItems.forEach(x => {
    const cat = x.category || "Uncategorized";
    catChartData[cat] = (catChartData[cat] || 0) + Number(x.amount || x.spent || 0);
  });

  const monthSummary = FISCAL_MONTHS.reduce((acc, m) => {
    const rows = filteredItems.filter(x => x.month === m);
    acc[m] = { spent: rows.reduce((s, d) => s + Number(d.amount || d.spent || 0), 0), count: rows.length };
    return acc;
  }, {});

  const projectSummary = filteredItems.filter(x => x.project).reduce((acc, x) => {
    const p = x.project;
    if (!acc[p]) acc[p] = { allocated: 0, spent: 0, amount: 0 };
    acc[p].allocated += Number(x.allocated || 0);
    acc[p].spent     += Number(x.spent || 0);
    acc[p].amount    += Number(x.amount || x.spent || 0);
    return acc;
  }, {});

  const tabStyle = (t) => ({
    padding: "8px 16px", borderRadius: 4, border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: 14,
    background: activeTab === t ? "#0b3d91" : "#e0e0e0",
    color: activeTab === t ? "#fff" : "#333",
  });

  const catColor = (cat) => {
    const map = { Store: C0.blue, Spare: C0.orange, Contractual: C0.purple };
    return map[cat] || "#607d8b";
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={S.title}>Fund Management Dashboard</div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#666" }}>FY:</span>
          <select style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:4, fontSize:13 }}
            value={selectedFY} onChange={e => setSelectedFY(e.target.value)}>
            {existingFYs.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize:13, fontWeight:600, color:"#666" }}>Month:</span>
          <select style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:4, fontSize:13 }}
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            <option value="All">All Months</option>
            {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {canEdit && <>
            <button style={{ padding:"6px 14px", border:"none", borderRadius:4, background:"#0b3d91", color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer" }}
              onClick={() => { setEditingItem(null); resetForm(); setShowForm(v => !v); }}>
              {showForm ? "Close Form" : "+ Add Record"}
            </button>
            <button style={{ padding:"6px 14px", border:"none", borderRadius:4, background:"#2e7d32", color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer" }}
              onClick={() => setShowExcelModal(true)}>
              📥 Import Excel
            </button>
          </>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, borderBottom:"1px solid #ddd", paddingBottom:10 }}>
        {["Audited Statement","Month-wise Spent","Project-wise Spent","Documents Directory"].map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => { setActiveTab(t); setShowForm(false); }}>{t}</button>
        ))}
      </div>

      {/* KPI Cards */}
      {activeTab !== "Documents Directory" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[
            ["Total Allocated", `₹${totalAllocated.toFixed(2)} Cr`, "#0b3d91"],
            ["Total Spent", `₹${totalSpent.toFixed(2)} Cr`, "#e65100"],
            ["Remaining Funds", `₹${totalRemaining.toFixed(2)} Cr`, totalRemaining >= 0 ? "#1b5e20" : "#c62828"],
            ["Utilisation", `${utilPct}%`, "#6a1b9a"],
          ].map(([l,v,c]) => (
            <div key={l} style={{ ...S.card, textAlign:"center", borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:"#666", fontWeight:600 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
              <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>
                {selectedFY !== "All" ? selectedFY : "All FYs"}{selectedMonth !== "All" ? ` · ${selectedMonth}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && canEdit && (
        <div style={{ background:"#fff", borderRadius:8, padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.1)", marginBottom:20, border:"1px solid #e0e8f5" }}>
          <div style={{ ...S.sectionTitle, fontSize:15, marginBottom:12 }}>
            {editingItem ? "✏️ Edit Fund Record" : "➕ Add Fund Record"}
          </div>
          <form onSubmit={handleCreateOrUpdate}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              <div style={S.field}>
                <label style={S.label}>Budget Head / Item Name *</label>
                <input style={S.input} value={form.head} onChange={e => setForm(p=>({...p,head:e.target.value}))} required placeholder="e.g. Seismic Survey Equipment" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Financial Year (FY)</label>
                <select style={S.select} value={form.fy} onChange={e => setForm(p=>({...p,fy:e.target.value}))}>
                  {ALL_FY_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Month</label>
                <select style={S.select} value={form.month} onChange={e => setForm(p=>({...p,month:e.target.value}))}>
                  <option value="">— No specific month —</option>
                  {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Expense Category</label>
                <select style={S.select} value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                  <option value="">— Select —</option>
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  {expenseCategories.length === 0 && ["Store","Spare","Contractual","Other"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Expense Type</label>
                <select style={S.select} value={form.expense_type} onChange={e => setForm(p=>({...p,expense_type:e.target.value}))}>
                  <option value="">— Select —</option>
                  {expenseTypes.map(c => <option key={c} value={c}>{c}</option>)}
                  {expenseTypes.length === 0 && ["Store","Spare","Contractual","General","Administrative","Maintenance","Other"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Project Name</label>
                <input style={S.input} value={form.project} onChange={e => setForm(p=>({...p,project:e.target.value}))} placeholder="e.g. KG Basin Phase II" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Allocated (₹ Cr)</label>
                <input style={S.input} type="number" step="0.01" min="0" value={form.allocated}
                  onChange={e => { const a=parseFloat(e.target.value)||0; setForm(p=>({...p,allocated:e.target.value,remaining:String(a-(parseFloat(p.spent)||0))})); }} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Spent (₹ Cr)</label>
                <input style={S.input} type="number" step="0.01" min="0" value={form.spent}
                  onChange={e => { const s=parseFloat(e.target.value)||0; setForm(p=>({...p,spent:e.target.value,remaining:String((parseFloat(p.allocated)||0)-s)})); }} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Remaining (auto-calc)</label>
                <input style={{ ...S.input, background:"#f5f5f5" }} value={form.remaining} readOnly />
              </div>
              <div style={S.field}>
                <label style={S.label}>Expenditure Amount (₹ Lakhs)</label>
                <input style={S.input} type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} />
              </div>
              <div style={{ ...S.field, gridColumn:"span 2" }}>
                <label style={S.label}>Audited Statement Reference</label>
                <input style={S.input} value={form.audited_statement} onChange={e => setForm(p=>({...p,audited_statement:e.target.value}))} placeholder="e.g. CAG Audit Q1-2026 / Internal Audit FY2025-26" />
              </div>
            </div>
            <div style={{ ...S.field, marginTop:12 }}>
              <label style={S.label}>Month-End Notes / Summary</label>
              <textarea style={{ ...S.input, minHeight:56 }} value={form.month_end_summary}
                onChange={e => setForm(p=>({...p,month_end_summary:e.target.value}))}
                placeholder="Optional notes for this record's month-end reporting…" />
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button style={{ ...S.btnSm(), padding:"8px 18px" }} type="submit">
                {editingItem ? "Save Changes" : "Add Record"}
              </button>
              <button style={{ ...S.btnSm("#888"), padding:"8px 18px" }} type="button"
                onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}


      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#888", fontSize:14 }}>Loading fund data…</div>
      ) : (
        <>
          {/* ── TAB 1: AUDITED STATEMENT ── */}
          {activeTab === "Audited Statement" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16 }}>
              <div style={S.section}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={S.sectionTitle}>FY-wise Audited Statements ({filteredItems.length} records)</div>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Budget Head</th>
                        <th style={th}>FY</th>
                        <th style={th}>Month</th>
                        <th style={th}>Category</th>
                        <th style={th}>Expense Type</th>
                        <th style={th}>Allocated (Cr)</th>
                        <th style={th}>Spent (Cr)</th>
                        <th style={th}>Remaining (Cr)</th>
                        <th style={th}>Audit Ref</th>
                        {canEdit && <th style={th}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 && (
                        <tr><td colSpan={canEdit ? 10 : 9} style={{ textAlign:"center", padding:24, color:"#aaa" }}>
                          No records found for the selected filter. {canEdit && "Click '+ Add Record' to create one."}
                        </td></tr>
                      )}
                      {filteredItems.map((item, idx) => {
                        const rem = Number(item.allocated||0) - Number(item.spent||0);
                        return (
                          <tr key={item.id || idx} style={{ background: idx%2===0 ? "#fff" : "#f8f9fa" }}>
                            <td style={{ ...td, fontWeight:600 }}>{item.head}</td>
                            <td style={td}>{item.fy || "—"}</td>
                            <td style={td}>{item.month || "—"}</td>
                            <td style={td}><span style={badge(catColor(item.category))}>{item.category || "—"}</span></td>
                            <td style={td}><span style={badge("#455a64")}>{item.expense_type || "—"}</span></td>
                            <td style={td}>₹{Number(item.allocated||0).toFixed(2)}</td>
                            <td style={td}>₹{Number(item.spent||0).toFixed(2)}</td>
                            <td style={{ ...td, color: rem<0 ? C0.red : C0.green, fontWeight:700 }}>
                              ₹{rem.toFixed(2)}
                            </td>
                            <td style={{ ...td, fontSize:11, color:"#666" }}>{item.audited_statement || "—"}</td>
                            {canEdit && (
                              <td style={td}>
                                <button style={{ marginRight:4, fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#e1f5fe", color:"#0288d1", cursor:"pointer" }} onClick={() => handleEdit(item)}>Edit</button>
                                <button style={{ marginRight:4, fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#f3e5f5", color:"#6a1b9a", cursor:"pointer" }} onClick={() => loadHistory(item)}>History</button>
                                <button style={{ fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#ffebee", color:"#c62828", cursor:"pointer" }} onClick={() => handleDelete(item.id)}>Del</button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={S.section}>
                <div style={S.sectionTitle}>Expenditure by FY</div>
                {Object.keys(fyChartData).length > 0
                  ? <VBarSimple data={fyChartData} color={C0.blue} height={180} />
                  : <div style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:30 }}>No data yet</div>}
                <div style={{ marginTop:16 }}>
                  <div style={{ ...S.sectionTitle, fontSize:13, marginBottom:8 }}>Quick Stats</div>
                  {[
                    ["Records", filteredItems.length],
                    ["Utilisation", `${utilPct}%`],
                    ["Avg per Record", filteredItems.length ? `₹${(totalSpent/filteredItems.length).toFixed(2)} Cr` : "—"],
                  ].map(([l,v]) => (
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0", borderBottom:"1px solid #f0f0f0" }}>
                      <span style={{ color:"#666" }}>{l}</span><span style={{ fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: MONTH-WISE SPENT ── */}
          {activeTab === "Month-wise Spent" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16 }}>
              <div style={S.section}>
                <div style={S.sectionTitle}>Month-wise Expenditure Records</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Month</th>
                        <th style={th}>FY</th>
                        <th style={th}>Budget Head</th>
                        <th style={th}>Category</th>
                        <th style={th}>Expense Type</th>
                        <th style={th}>Project</th>
                        <th style={th}>Amount (₹L)</th>
                        <th style={th}>Notes</th>
                        {canEdit && <th style={th}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.filter(x => x.month).length === 0 && (
                        <tr><td colSpan={canEdit ? 9 : 8} style={{ textAlign:"center", padding:24, color:"#aaa" }}>
                          No month-wise records for the current filter.
                        </td></tr>
                      )}
                      {filteredItems.filter(x => x.month).map((item, idx) => (
                        <tr key={item.id || idx} style={{ background: idx%2===0?"#fff":"#f8f9fa" }}>
                          <td style={{ ...td, fontWeight:700 }}>{item.month}</td>
                          <td style={td}>{item.fy || "—"}</td>
                          <td style={td}>{item.head}</td>
                          <td style={td}><span style={badge(catColor(item.category))}>{item.category||"—"}</span></td>
                          <td style={td}><span style={badge("#455a64")}>{item.expense_type||"—"}</span></td>
                          <td style={td}>{item.project || "—"}</td>
                          <td style={td}>₹{Number(item.amount||item.spent||0).toFixed(2)}</td>
                          <td style={{ ...td, fontSize:11, color:"#777", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={item.month_end_summary}>{item.month_end_summary || "—"}</td>
                          {canEdit && (
                            <td style={td}>
                              <button style={{ marginRight:4, fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#e1f5fe", color:"#0288d1", cursor:"pointer" }} onClick={() => handleEdit(item)}>Edit</button>
                              <button style={{ fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#ffebee", color:"#c62828", cursor:"pointer" }} onClick={() => handleDelete(item.id)}>Del</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Month-End Summary Panel */}
              <div style={S.section}>
                <div style={S.sectionTitle}>Month-End Summary</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {FISCAL_MONTHS.map(m => {
                    const { spent: val, count } = monthSummary[m] || { spent:0, count:0 };
                    return (
                      <div key={m}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background: val>0 ? "#f1f8e9" : "#f5f5f5", borderRadius:6, border:"1px solid #eee", cursor: val>0 ? "pointer" : "default" }}
                        onClick={() => val>0 && setDrillDown({ title:`${m} — Expense Details`, data: filteredItems.filter(x=>x.month===m).map(r=>({ Head:r.head, Category:r.category||"—", "Expense Type":r.expense_type||"—", Project:r.project||"—", "Amount (₹L)": `₹${Number(r.amount||r.spent||0).toFixed(2)}` })) })}>
                        <div>
                          <span style={{ fontWeight:600, fontSize:13 }}>{m}</span>
                          {count > 0 && <span style={{ fontSize:11, color:"#888", marginLeft:6 }}>({count} entries)</span>}
                        </div>
                        <span style={{ fontWeight:700, fontSize:13, color: val>0 ? C0.green : "#aaa" }}>
                          {val>0 ? `₹${val.toFixed(2)} L` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: PROJECT-WISE SPENT ── */}
          {activeTab === "Project-wise Spent" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16 }}>
              <div style={S.section}>
                <div style={S.sectionTitle}>Project-wise Expenditure</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Project</th>
                        <th style={th}>FY</th>
                        <th style={th}>Budget Head</th>
                        <th style={th}>Category</th>
                        <th style={th}>Expense Type</th>
                        <th style={th}>Allocated (Cr)</th>
                        <th style={th}>Spent (Cr)</th>
                        <th style={th}>Exp Amount (₹L)</th>
                        {canEdit && <th style={th}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.filter(x=>x.project).length === 0 && (
                        <tr><td colSpan={canEdit?9:8} style={{ textAlign:"center", padding:24, color:"#aaa" }}>No project-wise records for this filter.</td></tr>
                      )}
                      {filteredItems.filter(x=>x.project).map((item, idx) => (
                        <tr key={item.id||idx} style={{ background:idx%2===0?"#fff":"#f8f9fa" }}>
                          <td style={{ ...td, fontWeight:700 }}>{item.project}</td>
                          <td style={td}>{item.fy||"—"}</td>
                          <td style={td}>{item.head}</td>
                          <td style={td}><span style={badge(catColor(item.category))}>{item.category||"—"}</span></td>
                          <td style={td}><span style={badge("#455a64")}>{item.expense_type||"—"}</span></td>
                          <td style={td}>₹{Number(item.allocated||0).toFixed(2)}</td>
                          <td style={td}>₹{Number(item.spent||0).toFixed(2)}</td>
                          <td style={td}>₹{Number(item.amount||item.spent||0).toFixed(2)}</td>
                          {canEdit && (
                            <td style={td}>
                              <button style={{ marginRight:4, fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#e1f5fe", color:"#0288d1", cursor:"pointer" }} onClick={() => handleEdit(item)}>Edit</button>
                              <button style={{ fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#ffebee", color:"#c62828", cursor:"pointer" }} onClick={() => handleDelete(item.id)}>Del</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={S.section}>
                  <div style={S.sectionTitle}>Category Distribution</div>
                  {Object.keys(catChartData).length > 0
                    ? <DonutSimple data={catChartData} colors={COL0} size={120}
                        onClick={k => setDrillDown({ title:`Category: ${k}`, data: filteredItems.filter(x=>x.category===k).map(r=>({ Head:r.head, Project:r.project||"—", FY:r.fy||"—", "Spent(Cr)":`₹${Number(r.spent||0).toFixed(2)}` })) })} />
                    : <div style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:20 }}>No data</div>}
                </div>
                <div style={S.section}>
                  <div style={S.sectionTitle}>Project Totals</div>
                  {Object.entries(projectSummary).map(([p, v]) => (
                    <div key={p} style={{ fontSize:13, padding:"6px 8px", background:"#f8f9fa", borderRadius:4, borderLeft:"3px solid #0b3d91", marginBottom:6 }}>
                      <div style={{ fontWeight:600 }}>{p}</div>
                      <div style={{ display:"flex", gap:16, marginTop:3, fontSize:12, color:"#555" }}>
                        <span>Alloc: <strong>₹{v.allocated.toFixed(2)} Cr</strong></span>
                        <span>Spent: <strong>₹{v.spent.toFixed(2)} Cr</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: DOCUMENTS ── */}
          {activeTab === "Documents Directory" && (
            <ModuleFilesSection section="Fund Management" user={user} onToast={onToast} />
          )}
        </>
      )}

      {/* History Modal */}
      {historyItem && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setHistoryItem(null)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:680, maxWidth:"92vw", maxHeight:"80vh", overflow:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>📋 Change History — {historyItem.head}</div>
              <button onClick={() => setHistoryItem(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#888" }}>✕</button>
            </div>
            {loadingHistory ? <p style={{ color:"#888" }}>Loading history…</p>
              : itemHistory.length === 0 ? <p style={{ color:"#aaa" }}>No history recorded for this record yet.</p>
              : itemHistory.map((h, i) => (
                <div key={i} style={{ padding:"10px 14px", borderLeft:`4px solid ${h.action==="create"?"#1b5e20":h.action==="delete"?"#c62828":"#0b3d91"}`, marginBottom:10, background:"#fafafa", borderRadius:"0 6px 6px 0" }}>
                  <div style={{ display:"flex", gap:12, fontSize:12, color:"#555", marginBottom:4 }}>
                    <span style={{ fontWeight:700, textTransform:"uppercase", color: h.action==="create"?"#1b5e20":h.action==="delete"?"#c62828":"#0b3d91" }}>{h.action}</span>
                    <span>By: <strong>{h.changed_by}</strong></span>
                    <span>{h.changed_at ? new Date(h.changed_at).toLocaleString() : ""}</span>
                  </div>
                  {h.field_name && (
                    <div style={{ fontSize:12 }}>
                      <span style={{ color:"#666" }}>Field: </span><strong>{h.field_name}</strong>
                      <span style={{ color:"#c62828", marginLeft:8 }}>{h.old_value || "—"}</span>
                      <span style={{ color:"#888", margin:"0 6px" }}>→</span>
                      <span style={{ color:"#1b5e20" }}>{h.new_value || "—"}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <ExcelUploadModal
        show={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onToast={onToast}
        apiPreview={api.excelFundPreview}
        apiImport={api.excelFundImport}
        fields="fund_management"
        onSuccess={() => loadData()}
      />
      {drillDown && <DrillDownModal title={drillDown.title} data={drillDown.data} onClose={() => setDrillDown(null)} />}
    </div>
  );
}
