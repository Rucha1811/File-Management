import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../../api";
import { S, th, td, C2 } from "../shared/styles";
import { DrillDownModal } from "../shared/DrillDownModal";
import ExcelUploadModal from "../ExcelUploadModal";

const MONTHS = ["apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb","mar"];
const MONTH_LABELS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

function emptyMonthly() {
  const o = {};
  MONTHS.forEach(m => { o[m] = ""; o[m+"_ach"] = ""; });
  return o;
}

function generateReportHtml(berData, awpItems, awpFields, historyData) {
  const now = new Date().toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" });

  const gt = berData.reduce((s,i) => { s.total += Number(i.total||0); s.ach += Number(i.total_ach||0); return s; }, {total:0, ach:0});
  const overallPct = gt.total > 0 ? Math.round((gt.ach / gt.total) * 100) : 0;

  let rows = "";
  berData.forEach(item => {
    const total = Number(item.total || 0);
    const ach = Number(item.total_ach || 0);
    const pct = total > 0 ? Math.round((ach / total) * 100) : 0;
    rows += `<tr><td>${item.project_name}</td><td>${item.type}</td><td>${item.financial_year}</td><td>${item.project_type || "—"}</td><td>${item.basin || "—"}</td><td class="num">${total.toLocaleString()}</td><td class="num">${ach.toLocaleString()}</td><td class="num">${pct}%</td></tr>`;
  });

  const statusColors = { "On Track":"#1B5E20", "Needs Attention":"#E65100", "Critical":"#e74c3c" };
  const statusBg = { "On Track":"#e8f5e9", "Needs Attention":"#fff3e0", "Critical":"#ffebee" };

  let awpRows = "";
  awpItems.forEach(item => {
    let df = {};
    try { df = item.dynamic_fields ? (typeof item.dynamic_fields === "string" ? JSON.parse(item.dynamic_fields) : item.dynamic_fields) : {}; } catch {}
    awpRows += "<tr>" + (awpFields||[]).map(f => {
      const val = df[f.field_name] || "—";
      if (/status/i.test(f.field_name)) {
        const sc = { "On Track":"#1B5E20", "Needs Attention":"#E65100", "Critical":"#e74c3c" }[val] || "#555";
        const sbg = { "On Track":"#e8f5e9", "Needs Attention":"#fff3e0", "Critical":"#ffebee" }[val] || "#f5f5f5";
        return `<td><span class="status" style="background:${sbg};color:${sc}">${val}</span></td>`;
      }
      return `<td>${val}</td>`;
    }).join("") + "</tr>";
  });

  const fys = [...new Set(berData.map(i => i.financial_year))].sort();
  const types = [...new Set(berData.map(i => i.type))].sort();

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KPI &amp; AWP Report</title>
<style>
  @page { margin:20mm 15mm; }
  body { font-family:Arial,sans-serif; font-size:11px; margin:0; padding:0; color:#222; line-height:1.4; }
  .cover { page-break-after:always; text-align:center; padding-top:120px; }
  .cover h1 { color:#0b3d91; font-size:28px; margin-bottom:8px; }
  .cover .subtitle { font-size:16px; color:#555; margin-bottom:40px; }
  .cover .meta { font-size:13px; color:#666; margin-top:60px; }
  .cover .meta div { margin-bottom:6px; }
  .cover .badge { display:inline-block; background:#0b3d91; color:#fff; padding:4px 16px; border-radius:4px; font-size:14px; margin-top:20px; }
  .section { page-break-inside:avoid; margin-bottom:24px; }
  .page-break { page-break-before:always; }
  h2 { color:#0b3d91; font-size:15px; margin:20px 0 10px; border-bottom:2px solid #0b3d91; padding-bottom:5px; }
  h3 { font-size:12px; margin:14px 0 6px; color:#444; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:10.5px; }
  th { background:#0b3d91; color:#fff; padding:5px 6px; text-align:left; font-weight:600; white-space:nowrap; }
  td { padding:4px 6px; border-bottom:1px solid #ddd; }
  tr:nth-child(even) { background:#f5f7fa; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .status { padding:2px 8px; border-radius:3px; font-weight:600; font-size:10px; white-space:nowrap; }
  .summary-grid { display:flex; gap:12px; margin:12px 0 20px; flex-wrap:wrap; }
  .summary-card { flex:1; min-width:100px; background:#f0f4ff; border-radius:6px; padding:10px 14px; text-align:center; border:1px solid #d6e0f5; }
  .summary-card .val { font-size:20px; font-weight:700; color:#0b3d91; }
  .summary-card .lbl { font-size:10px; color:#666; margin-top:2px; }
  .footer { margin-top:30px; color:#999; font-size:9px; border-top:1px solid #ddd; padding-top:6px; text-align:center; }
  @media print { .no-print { display:none; } body { font-size:10px; } }
</style></head><body>

<div class="cover">
  <h1>KPI / Targets / AWP</h1>
  <div class="subtitle">Comprehensive Report — Geophysical Services</div>
  <div class="badge">Financial Years: ${fys.join(", ") || "—"}</div>
  <div class="meta">
    <div><strong>Report Type:</strong> BE / RE Acquisition Targets &amp; AWP Items</div>
    <div><strong>Generated:</strong> ${now}</div>
    <div><strong>Total Targets:</strong> ${berData.length} records across ${fys.length} FYs</div>
    <div><strong>Total AWP Items:</strong> ${awpItems.length}</div>
  </div>
</div>

<div class="section">
  <h2>Executive Summary</h2>
  <div class="summary-grid">
    <div class="summary-card"><div class="val">${gt.total.toLocaleString()}</div><div class="lbl">Total Target (SKM)</div></div>
    <div class="summary-card"><div class="val">${gt.ach.toLocaleString()}</div><div class="lbl">Total Achieved (SKM)</div></div>
    <div class="summary-card"><div class="val">${overallPct}%</div><div class="lbl">Overall Achievement</div></div>
    <div class="summary-card"><div class="val">${berData.length}</div><div class="lbl">Target Records</div></div>
    <div class="summary-card"><div class="val">${awpItems.length}</div><div class="lbl">AWP Items</div></div>
  </div>
</div>

<div class="section page-break">
  <h2>BE / RE Acquisition Targets</h2>
  <table>
    <thead><tr><th>Project</th><th>Type</th><th>FY</th><th>Proj. Type</th><th>Basin</th><th class="num">Total</th><th class="num">Achieved</th><th class="num">%</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#999">No records</td></tr>'}</tbody>
  </table>
</div>

<div class="section">
  <h2>AWP Items</h2>
  <table>
    <thead><tr>${(awpFields||[]).map(f => `<th${/progress/i.test(f.field_name) ? ' class="num"' : ''}>${f.field_name}</th>`).join("")}</tr></thead>
    <tbody>${awpRows || `<tr><td colspan="${(awpFields||[]).length}" style="text-align:center;color:#999">No records</td></tr>`}</tbody>
  </table>
</div>

<div class="section page-break">
  <h2>Change History</h2>
  ${(historyData && historyData.length > 0) ? `
  <table>
    <thead><tr><th>Project</th><th>Type</th><th>FY</th><th>Month</th><th>Field</th><th>Old Value</th><th>New Value</th><th>Changed By</th><th>Date</th></tr></thead>
    <tbody>${historyData.map(h => {
      const proj = h.target?.project_name || berData.find(t => t.id === h.target_id)?.project_name || "—";
      const typ = h.target?.type || berData.find(t => t.id === h.target_id)?.type || "—";
      const fy = h.target?.financial_year || berData.find(t => t.id === h.target_id)?.financial_year || "—";
      return `<tr><td>${proj}</td><td>${typ}</td><td>${fy}</td><td>${h.month}</td><td>${h.field}</td><td class="num">${h.old_value ?? "—"}</td><td class="num">${h.new_value ?? "—"}</td><td>${h.changer?.name || h.changed_by || "—"}</td><td>${h.created_at ? String(h.created_at).slice(0,10) : "—"}</td></tr>`;
    }).join("")}</tbody>
  </table>
  ` : '<p style="color:#999;font-style:italic">No change history recorded yet.</p>'}
</div>

<div class="footer">
  Data Vision — Geophysical Services | Digital Platform for Secure Storage, Data Management and Access<br>
  Generated: ${now} | Report contains ${berData.length} acquisition targets and ${awpItems.length} AWP items
</div>

</body></html>`;
}

function HistoryModalWidget({ berData, availFYs, histFyFilter, setHistFyFilter, histMonthFilter, setHistMonthFilter, histProjectFilter, setHistProjectFilter, historyData, historyLoading, loadHistoryFiltered, onClose, api }) {
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const MONTH_LABELS_SHORT = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

  useEffect(() => {
    if (histProjectFilter && histFyFilter) {
      setChartLoading(true);
      Promise.all([
        api.stage2Monthly(histFyFilter, histProjectFilter).catch(() => null),
      ]).then(([m]) => {
        if (m) setChartData(m);
        setChartLoading(false);
      });
    } else {
      setChartData(null);
    }
  }, [histProjectFilter, histFyFilter]);

  const allFYs = useMemo(() => {
    const s = new Set(availFYs || []);
    for (let y = 2000; y <= 3000; y++) s.add(`${y}-${String(y+1).slice(2)}`);
    return [...s].sort();
  }, [availFYs]);

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,padding:24,maxWidth:1000,width:"90%",maxHeight:"85vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C2.dark}}>📜 Change History</div>
          <button style={{padding:"4px 12px",border:"none",borderRadius:4,background:"#eee",cursor:"pointer",fontSize:13}} onClick={onClose}>✕ Close</button>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <select style={{padding:"4px 8px",border:"1px solid #ccc",borderRadius:4,fontSize:12,maxWidth:160}} value={histFyFilter} onChange={e=>{setHistFyFilter(e.target.value);loadHistoryFiltered(e.target.value,histMonthFilter,histProjectFilter)}}>
            <option value="">All FYs</option>
            {allFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <select style={{padding:"4px 8px",border:"1px solid #ccc",borderRadius:4,fontSize:12}} value={histMonthFilter} onChange={e=>{setHistMonthFilter(e.target.value);loadHistoryFiltered(histFyFilter,e.target.value,histProjectFilter)}}>
            <option value="">All Months</option>
            {["apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb","mar"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select style={{padding:"4px 8px",border:"1px solid #ccc",borderRadius:4,fontSize:12}} value={histProjectFilter} onChange={e=>{setHistProjectFilter(e.target.value);loadHistoryFiltered(histFyFilter,histMonthFilter,e.target.value)}}>
            <option value="">All Projects</option>
            {[...new Set(berData.map(d=>d.project_name))].sort().map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Comparison Chart */}
        {histProjectFilter && histFyFilter && (
          <div style={{background:"#f8faff",borderRadius:8,padding:16,marginBottom:16,border:"1px solid #e0e8f5"}}>
            <div style={{fontSize:14,fontWeight:600,color:C2.dark,marginBottom:12}}>
              📊 Target vs Achievement — {histProjectFilter} ({histFyFilter})
            </div>
            {chartLoading ? (
              <div style={{textAlign:"center",padding:16,color:"#888",fontSize:12}}>Loading chart...</div>
            ) : chartData ? (
              <ComparisonChart data={chartData} />
            ) : (
              <div style={{textAlign:"center",padding:16,color:"#aaa",fontSize:12}}>No analytics data for comparison.</div>
            )}
          </div>
        )}

        {/* History Table */}
        {historyLoading ? (
          <div style={{textAlign:"center",padding:20,color:"#888",fontSize:13}}>Loading history...</div>
        ) : historyData.length === 0 ? (
          <div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:13}}>No changes recorded yet.</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#f0f4ff"}}>
                <th style={th}>Project</th><th style={th}>Type</th><th style={th}>FY</th>
                <th style={th}>Month</th><th style={th}>Field</th>
                <th style={th}>Old</th><th style={th}>New</th>
                <th style={th}>Changed By</th><th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((h,i) => (
                <tr key={h.id||i} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                  <td style={td}>{h.target?.project_name || berData.find(t=>t.id===h.target_id)?.project_name || "—"}</td>
                  <td style={td}>{h.target?.type || berData.find(t=>t.id===h.target_id)?.type || "—"}</td>
                  <td style={td}>{h.target?.financial_year || berData.find(t=>t.id===h.target_id)?.financial_year || "—"}</td>
                  <td style={td}><span style={{background:"#e3f2fd",color:"#1565c0",padding:"2px 6px",borderRadius:3,fontWeight:600,fontSize:11,textTransform:"capitalize"}}>{h.month}</span></td>
                  <td style={td}>{h.field}</td>
                  <td style={td}>{h.old_value ?? "—"}</td>
                  <td style={{...td,fontWeight:600,color:"#1B5E20"}}>{h.new_value ?? "—"}</td>
                  <td style={td}>{h.changer?.name || h.changed_by || "—"}</td>
                  <td style={td}>{h.created_at ? String(h.created_at).slice(0,10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ComparisonChart({ data }) {
  const MONTH_LABELS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
  const entries = MONTH_LABELS.map((label, i) => {
    const v = data[label];
    if (!v) return null;
    const tgt = Number(v.be_target || 0) + Number(v.re_target || 0);
    const ach = Number(v.be_achieved || 0) + Number(v.re_achieved || 0);
    return { label, target: tgt, achieved: ach };
  }).filter(Boolean);
  if (entries.length === 0) return <div style={{textAlign:"center",padding:16,color:"#aaa",fontSize:12}}>No monthly data.</div>;
  const maxVal = Math.max(...entries.flatMap(e => [e.target, e.achieved, 1]));
  return (
    <div style={{display:"flex",gap:4,alignItems:"end",minHeight:140,paddingTop:8}}>
      {entries.map(e => (
        <div key={e.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{display:"flex",gap:3,alignItems:"end",height:120}}>
            <div title={`Target: ${e.target}`} style={{width:14,background:"#1565c0",borderRadius:"4px 4px 0 0",height:Math.max((e.target/maxVal)*110,1),transition:"height 0.3s"}} />
            <div title={`Achieved: ${e.achieved}`} style={{width:14,background:"#4caf50",borderRadius:"4px 4px 0 0",height:Math.max((e.achieved/maxVal)*110,1),transition:"height 0.3s"}} />
          </div>
          <div style={{fontSize:9,color:"#888",marginTop:4}}>{e.label}</div>
          <div style={{fontSize:8,color:"#1565c0"}}>{e.target}</div>
          <div style={{fontSize:8,color:"#4caf50"}}>{e.achieved}</div>
        </div>
      ))}
      <div style={{paddingLeft:8,fontSize:10,color:"#888",whiteSpace:"nowrap"}}>
        <div><span style={{display:"inline-block",width:10,height:10,background:"#1565c0",borderRadius:2,marginRight:4}}/> Target</div>
        <div><span style={{display:"inline-block",width:10,height:10,background:"#4caf50",borderRadius:2,marginRight:4}}/> Achieved</div>
      </div>
    </div>
  );
}

export function KPITargetsAWP({ user, onToast }) {
  const [berData, setBerData] = useState([]);
  const [berLoading, setBerLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [berForm, setBerForm] = useState({ project_name:"", project_type:"", type:"BE", financial_year:"", basin:"", editing:null, ...emptyMonthly() });
  const [berMonthly, setBerMonthly] = useState(null);
  const [berYearly, setBerYearly] = useState(null);
  const [saving, setSaving] = useState(false);
  const [drillDown, setDrillDown] = useState(null);

  const [awpItems, setAwpItems] = useState([]);
  const [awpLoading, setAwpLoading] = useState(false);
  const [awpFields, setAwpFields] = useState([]);
  const [awpFieldOpts, setAwpFieldOpts] = useState({});
  const [awpValues, setAwpValues] = useState({});
  const [showAwpForm, setShowAwpForm] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [awpSaving, setAwpSaving] = useState(false);
  const [awpEditingId, setAwpEditingId] = useState(null);
  const [isApprovedEdit, setIsApprovedEdit] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [availFYs, setAvailFYs] = useState([]);
  const [histFyFilter, setHistFyFilter] = useState("");
  const [histMonthFilter, setHistMonthFilter] = useState("");
  const [histProjectFilter, setHistProjectFilter] = useState("");
  const currentFy = (() => { const y = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1; return `${y}-${String(y+1).slice(2)}`; })();
  const [overviewFy, setOverviewFy] = useState(currentFy);
  const [exporting, setExporting] = useState(false);
  const exportAbortRef = useRef(null);

  useEffect(() => { loadBer(); }, []);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => { loadAwp(); loadAwpFields(); }, []);

  const loadAwpFields = async () => {
    const f = await api.listPageFields("AWP").catch(() => []);
    setAwpFields(f || []);
    const opts = {};
    for (const field of (f || [])) {
      if (field.field_type === "select") {
        const vals = await api.getLookups(field.field_name, "AWP").catch(() => []);
        opts[field.field_name] = vals || [];
      }
    }
    setAwpFieldOpts(opts);
  };

  const surveyTypeMap = {
    "2D Seismic":"2D", "3D Seismic":"3D", "VSP":"VSP",
    "Dual 2D+3D":"Dual 2D+3D","Review":"Review",
  };

  const [berProjId, setBerProjId] = useState("");

  const loadBerRecord = async (project_name, type, financial_year) => {
    if (!project_name || !type || !financial_year) return;
    const records = await api.stage2Targets(financial_year, type, project_name).catch(() => []);
    const match = records?.[0];
    if (match) {
      const m = emptyMonthly();
      MONTHS.forEach(mm => {
        if (match[mm]) m[mm] = match[mm];
        if (match[mm+"_ach"]) m[mm+"_ach"] = match[mm+"_ach"];
      });
      setBerForm(prev => ({ ...prev, editing:match.id, ...m }));
    } else {
      setBerForm(prev => ({ ...prev, editing:null, ...emptyMonthly() }));
    }
  };

  const handleBerProjectChange = (projectId) => {
    setBerProjId(projectId);
    const p = projects.find(x => x.id === Number(projectId));
    if (!p) return;
    const fy = overviewFy;
    const berType = "BE";
    setBerForm({
      project_name:p.project_name,
      project_type:surveyTypeMap[p.survey_type] || p.survey_type || "",
      type:berType,
      financial_year:fy,
      basin:p.area_name || "",
      editing:null,
      ...emptyMonthly()
    });
    setBerMonthly(null);
    setBerYearly(null);
    loadBerRecord(p.project_name, berType, fy);
  };

  const loadBer = async () => {
    setBerLoading(true);
    const d = await api.stage2Targets().catch(() => []);
    setBerData(d || []);
    setBerLoading(false);
  };

  const loadAwp = async () => {
    setAwpLoading(true);
    const d = await api.listAWPItems().catch(() => []);
    setAwpItems(d || []);
    setAwpLoading(false);
  };

  const loadBerAnalytics = async (projectName, fy) => {
    if (!projectName) { setBerMonthly(null); setBerYearly(null); return; }
    const m = await api.stage2Monthly(fy, projectName).catch(() => []);
    const y = await api.stage2Yearly(fy, projectName).catch(() => []);
    setBerMonthly(m || []);
    setBerYearly(y || []);
  };

  const loadHistoryFiltered = async (fy, month, project) => {
    setHistoryLoading(true);
    const h = await api.stage2HistorySummary(fy||undefined, month||undefined, project||undefined).catch(() => []);
    setHistoryData(h || []);
    setHistoryLoading(false);
  };

  const shiftFY = (dir) => {
    const cur = berForm.financial_year || currentFy;
    const m = cur.match(/^(\d{4})/);
    if (!m) return;
    const start = Number(m[1]) + dir;
    const next = `${start}-${String(start+1).slice(2)}`;
    setBerForm(p=>({...p,financial_year:next,editing:null,...emptyMonthly()}));
    loadBerRecord(berForm.project_name, berForm.type, next);
  };

  const openHistory = async (targetId) => {
    setHistoryLoading(true);
    setHistoryModal(targetId);
    setHistMonthFilter("");
    if (typeof targetId === "string" && targetId.startsWith("summary:")) {
      const fy = targetId.replace("summary:","");
      setHistFyFilter(fy);
      setHistProjectFilter("");
      const h = await api.stage2HistorySummary(fy).catch(() => []);
      setHistoryData(h || []);
    } else {
      const item = berData.find(t => t.id === targetId);
      const project = item?.project_name || "";
      const fy = item?.financial_year || "";
      setHistFyFilter(fy);
      setHistProjectFilter(project);
      const h = await api.stage2HistorySummary(fy, undefined, project).catch(() => []);
      setHistoryData(h || []);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    api.stage2FinancialYears().then(setAvailFYs).catch(() => {});
  }, []);

  useEffect(() => {
    loadBerAnalytics(berForm.project_name, berForm.financial_year);
  }, [berForm.project_name, berForm.financial_year, berForm.type]);

  const handleBerSubmit = async () => {
    if (!berForm.project_name || !berForm.type || !berForm.financial_year) {
      onToast?.("Project name, type, and financial year required", "error"); return;
    }
    setSaving(true);
    const body = {
      project_name: berForm.project_name,
      project_type: berForm.project_type || null,
      type: berForm.type,
      financial_year: berForm.financial_year,
      basin: berForm.basin || null,
    };
    MONTHS.forEach(m => {
      if (berForm[m]) body[m] = Number(berForm[m]);
      if (berForm[m+"_ach"]) body[m+"_ach"] = Number(berForm[m+"_ach"]);
    });
    if (berForm.editing) {
      if (isApprovedEdit && unlockPassword) body._unlock_password = unlockPassword;
      const ok = await api.stage2UpdateTarget(berForm.editing, body).then(() => true).catch(e => { onToast?.(e?.message || "Failed to update","error"); return false; });
      if (!ok) { setSaving(false); return; }
      onToast?.("Updated","success");
    } else {
      const ok = await api.stage2CreateTarget(body).then(() => true).catch(e => { onToast?.(e?.message || "Failed to create","error"); return false; });
      if (!ok) { setSaving(false); return; }
      onToast?.("Created","success");
    }
    setSaving(false);
    setIsApprovedEdit(false);
    setUnlockPassword("");
    setBerForm(prev => ({ ...prev, editing:null, ...emptyMonthly() }));
    loadBer();
    loadBerRecord(berForm.project_name, berForm.type, berForm.financial_year);
    loadBerAnalytics(berForm.project_name, berForm.financial_year);
  };

  const handleBerDelete = async (id) => {
    if (!confirm("Delete this acquisition target?")) return;
    await api.stage2DeleteTarget(id).catch(() => { onToast?.("Failed to delete","error"); return; });
    onToast?.("Deleted","success");
    loadBer();
    if (berForm.editing === id) {
      setBerForm(prev => ({ ...prev, editing:null, ...emptyMonthly() }));
    }
  };

  const startBerEdit = (item) => {
    if (item.approved && user?.role !== "admin") {
      onToast?.("This target is approved and locked. Only admin can edit.", "error");
      return;
    }
    const m = emptyMonthly();
    MONTHS.forEach(mm => {
      if (item[mm]) m[mm] = item[mm];
      if (item[mm+"_ach"]) m[mm+"_ach"] = item[mm+"_ach"];
    });
    const p = projects.find(x => x.project_name === item.project_name);
    if (p) setBerProjId(String(p.id));
    setBerForm({ ...m, project_name:item.project_name, project_type:item.project_type||"", type:item.type, financial_year:item.financial_year, basin:item.basin||"", editing:item.id });
    setIsApprovedEdit(!!item.approved);
    if (!item.approved) setUnlockPassword("");
  };

  const startAwpEdit = (item) => {
    setAwpEditingId(item.id);
    let df = {};
    try { df = item.dynamic_fields ? (typeof item.dynamic_fields === "string" ? JSON.parse(item.dynamic_fields) : item.dynamic_fields) : {}; } catch {}
    setAwpValues({ ...df });
    if (!df || Object.keys(df).length === 0) {
      const legacy = {
        Activity: item.activity,
        Target: item.target,
        Achieved: item.achieved,
        "Progress %": item.progress,
        Deadline: item.deadline ? String(item.deadline).slice(0,10) : "",
        Status: item.status,
      };
      setAwpValues(Object.fromEntries(Object.entries(legacy).filter(([_,v]) => v)));
    }
    setShowAwpForm(true);
  };

  const resetAwpForm = () => {
    setAwpValues({});
    setAwpEditingId(null);
    setShowAwpForm(false);
  };

  const handleAwpCreate = async () => {
    const required = (awpFields||[]).find(f => f.required);
    if (required && !awpValues[required.field_name]) { onToast?.(`${required.field_name} is required`, "error"); return; }
    setAwpSaving(true);
    const fd = new FormData();
    fd.append("dynamic_fields", JSON.stringify(awpValues));
    if (awpEditingId) {
      await api.updateAWPItem(awpEditingId, fd).catch(() => { onToast?.("Failed to update", "error"); setAwpSaving(false); return; });
      onToast?.("AWP item updated", "success");
    } else {
      await api.createAWPItem(fd).catch(() => { onToast?.("Failed to create", "error"); setAwpSaving(false); return; });
      onToast?.("AWP item created", "success");
    }
    resetAwpForm();
    setAwpSaving(false);
    loadAwp();
  };

  const handleAwpDelete = async (id) => {
    if (!confirm("Delete this AWP item?")) return;
    await api.deleteAWPItem(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    loadAwp();
  };

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const fetchHistoryForExport = async () => {
    try {
      const h = await api.stage2HistorySummary().catch(() => []);
      return h || [];
    } catch { return []; }
  };

  const exportWord = async () => {
    try {
      const history = await fetchHistoryForExport();
      const html = generateReportHtml(berData, awpItems, awpFields, history);
      const blob = new Blob([html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `KPI_AWP_Report_${new Date().toISOString().slice(0,10)}.doc`;
      a.click(); URL.revokeObjectURL(url);
      onToast?.("Report downloaded", "success");
    } catch { onToast?.("Export failed", "error"); }
  };

  const exportPDF = async () => {
    const history = await fetchHistoryForExport();
    const html = generateReportHtml(berData, awpItems, awpFields, history);
    const w = window.open("", "_blank");
    if (!w) { onToast?.("Popup blocked. Allow popups and try again.", "error"); return; }
    w.document.write(html);
    w.document.title = "KPI_AWP_Report";
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={S.title}>KPI / Targets / AWP</div>
      </div>
      <div style={{...S.section,marginTop:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C2.dark}}>BE / RE Acquisition Targets</div>
          <div style={{display:"flex",gap:6}}>
            <button style={{...S.btnSm(),background:"#0b3d91",color:"#fff",fontSize:11}} onClick={exportWord}>Export Word</button>
            <button style={{...S.btnSm(),background:"#c62828",color:"#fff",fontSize:11}} onClick={exportPDF}>Export PDF</button>
            <button style={{...S.btnSm(),background:"#2e7d32",color:"#fff",fontSize:11}} disabled={exporting} onClick={async () => {
              if (exporting) {
                if (exportAbortRef.current) exportAbortRef.current.abort();
                return;
              }
              const controller = new AbortController();
              exportAbortRef.current = controller;
              setExporting(true);
              try {
                const r = await api.stage2Export({signal:controller.signal});
                if (!r.ok) { onToast?.("Export failed","error"); setExporting(false); return; }
                const blob = await r.blob(); const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "all_acquisition_targets.xlsx";
                a.click(); URL.revokeObjectURL(url);
              } catch (e) {
                if (e?.name !== "AbortError") onToast?.("Export failed","error");
              }
              setExporting(false);
              exportAbortRef.current = null;
            }}>{exporting ? "⬇ Exporting... (click to cancel)" : "Export Excel"}</button>
            <button style={{...S.btnSm(),background:"#6a1b9a",color:"#fff",fontSize:11}} onClick={async () => {
              const fy = berForm.financial_year || currentFy;
              const summary = await api.stage2HistorySummary(fy).catch(() => []);
              if (!summary || summary.length === 0) { onToast?.("No history found for this FY","info"); return; }
              openHistory("summary:"+fy);
            }}>📜 History</button>
          </div>
        </div>

        {/* FY filter — always visible at top */}
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <label style={{fontSize:13,fontWeight:600,color:"#555"}}>Financial Year:</label>
            <button style={{padding:"2px 8px",border:"1px solid #ccc",borderRadius:3,background:"#fff",cursor:"pointer",fontSize:13}} onClick={()=>{const m=overviewFy.match(/^(\d{4})/);if(m){const n=Number(m[1])-1;const fy=`${n}-${String(n+1).slice(2)}`;setOverviewFy(fy);setBerForm(p=>({...p,financial_year:fy,editing:null,...emptyMonthly()}));if(berForm.project_name)loadBerRecord(berForm.project_name,berForm.type,fy);}}}>◀</button>
            <input style={{width:100,padding:"6px 8px",border:"1px solid #d0d5dd",borderRadius:6,fontSize:14,textAlign:"center",fontWeight:600}} value={overviewFy} onChange={e=>{const fy=e.target.value;setOverviewFy(fy);setBerForm(p=>({...p,financial_year:fy,editing:null,...emptyMonthly()}));if(berForm.project_name)loadBerRecord(berForm.project_name,berForm.type,fy);}} placeholder="YYYY-YY" />
            <button style={{padding:"2px 8px",border:"1px solid #ccc",borderRadius:3,background:"#fff",cursor:"pointer",fontSize:13}} onClick={()=>{const m=overviewFy.match(/^(\d{4})/);if(m){const n=Number(m[1])+1;const fy=`${n}-${String(n+1).slice(2)}`;setOverviewFy(fy);setBerForm(p=>({...p,financial_year:fy,editing:null,...emptyMonthly()}));if(berForm.project_name)loadBerRecord(berForm.project_name,berForm.type,fy);}}}>▶</button>
          </div>
          <span style={{fontSize:12,color:"#aaa"}}>Filter all targets and overview by financial year</span>
        </div>

        {/* Project + BE/RE selector row */}
        <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap",marginBottom:16}}>
          <div style={S.field}>
            <label style={S.label}>Select Project</label>
            <select style={{...S.select,minWidth:220}} value={berProjId} onChange={e=>handleBerProjectChange(e.target.value)}>
              <option value="">— Choose —</option>
              {projects.filter(p=>p.survey_type).map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>
          {berForm.project_name && (
            <>
              <button style={{padding:"6px 14px",border:"1px solid #1565c0",borderRadius:4,background:"#fff",color:"#1565c0",cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:4,alignSelf:"end"}} onClick={()=>{setBerForm(p=>({...p,project_name:"",editing:null,...emptyMonthly()}));setBerProjId("");setBerMonthly(null);setBerYearly(null);}}>
                ← Back to Overview
              </button>
              <div style={S.field}>
                <label style={S.label}>BE / RE</label>
                <div style={{display:"flex",gap:4}}>
                  <button
                    style={{padding:"6px 16px", background:berForm.type==="BE"?"#1565c0":"#e0e0e0", color:berForm.type==="BE"?"#fff":"#555", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:12}}
                    onClick={() => { setBerForm(p=>({...p,type:"BE",editing:null,...emptyMonthly()})); loadBerRecord(berForm.project_name, "BE", berForm.financial_year); }}
                  >BE</button>
                  <button
                    style={{padding:"6px 16px", background:berForm.type==="RE"?"#c62828":"#e0e0e0", color:berForm.type==="RE"?"#fff":"#555", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:12}}
                    onClick={() => { setBerForm(p=>({...p,type:"RE",editing:null,...emptyMonthly()})); loadBerRecord(berForm.project_name, "RE", berForm.financial_year); }}
                  >RE</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Monthly form */}
        {berForm.project_name && (
          <div style={{background:"#f8faff",borderRadius:8,padding:16,border:"1px solid #e0e8f5",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
              <div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={berForm.project_name} disabled /></div>
              <div style={S.field}><label style={S.label}>Project Type</label>
                <select style={S.select} value={berForm.project_type} onChange={e=>setBerForm(p=>({...p,project_type:e.target.value}))}>
                  <option value="">Select…</option>
                  <option value="2D">2D</option><option value="3D">3D</option>
                  <option value="VSP">VSP</option><option value="Dual 2D+3D">Dual 2D+3D</option>
                </select>
              </div>
              <div style={S.field}><label style={S.label}>Basin</label><input style={S.input} value={berForm.basin} onChange={e=>setBerForm(p=>({...p,basin:e.target.value}))} placeholder="WON" /></div>
              <div style={S.field}><label style={S.label}>Status</label>
                <input style={S.input} value={berForm.editing ? `Editing (ID: ${berForm.editing})` : "New Record"} disabled />
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8}}>Monthly Targets &amp; Achievements <span style={{fontWeight:400,color:"#aaa"}}>(in SKM)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {MONTHS.map((m,i) => (
                <div key={m} style={{background:"#fff",borderRadius:6,padding:8,border:"1px solid #e8edf5"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>{MONTH_LABELS[i]}</div>
                  <input style={{...S.input,fontSize:11,padding:"3px 6px",marginBottom:4}} type="number" placeholder="Target" value={berForm[m]} onChange={e=>setBerForm(p=>({...p,[m]:e.target.value}))} />
                  <input style={{...S.input,fontSize:11,padding:"3px 6px"}} type="number" placeholder="Achieved" value={berForm[m+"_ach"]} onChange={e=>setBerForm(p=>({...p,[m+"_ach"]:e.target.value}))} />
                </div>
              ))}
            </div>
            {isApprovedEdit && (
              <div style={{marginTop:12}}>
                <label style={{fontSize:12,fontWeight:600,color:"#c62828",display:"block",marginBottom:4}}>🔒 Approved Target — Enter admin password to unlock &amp; save</label>
                <input style={{...S.input,maxWidth:280}} type="password" placeholder="Admin password" value={unlockPassword} onChange={e=>setUnlockPassword(e.target.value)} />
              </div>
            )}
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button style={{...S.btnSm(),flex:1}} onClick={handleBerSubmit} disabled={saving}>
                {saving ? "Saving..." : berForm.editing ? (isApprovedEdit ? "🔓 Unlock & Update" : "✏️ Update Target") : "💾 Save New Target"}
              </button>
              <button style={{...S.btnSm(),flex:0.5,background:"#f5f5f5",color:"#555"}} onClick={() => { setBerForm(p=>({...p,editing:null,...emptyMonthly()})); setIsApprovedEdit(false); setUnlockPassword(""); loadBerRecord(berForm.project_name, berForm.type, berForm.financial_year); }}>
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Existing records table for this project */}
        {berForm.project_name && berData.filter(d => d.project_name === berForm.project_name).length > 0 && (
          <div style={{overflowX:"auto",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8}}>Records for {berForm.project_name}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#f0f4ff"}}>
                  <th style={th}>Type</th>
                  <th style={th}>FY</th>
                  <th style={th}>Proj. Type</th>
                  <th style={th}>Basin</th>
                  <th style={th}>Total</th>
                  <th style={th}>Achieved</th>
                  <th style={th}>%</th>
                  <th style={th}>Status</th>
                  <th style={th}></th>
                  {canEdit && <th style={th}></th>}
                </tr>
              </thead>
              <tbody>
                {berData.filter(d => d.project_name === berForm.project_name).map(item => {
                  const total = Number(item.total || 0);
                  const ach = Number(item.total_ach || 0);
                  const pct = total > 0 ? Math.round((ach / total) * 100) : 0;
                  return (
                    <tr key={item.id} style={{borderBottom:"1px solid #f0f0f0",cursor:"pointer",background:berForm.editing===item.id?"#fff8e1":"transparent",opacity:item.approved?0.8:1}} onClick={()=>startBerEdit(item)}>
                      <td style={td}><span style={{background:item.type==="BE"?"#e3f2fd":"#fce4ec",color:item.type==="BE"?"#1565c0":"#c62828",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>{item.type}</span></td>
                      <td style={td}>{item.financial_year}</td>
                      <td style={td}>{item.project_type ? <span style={{background:"#f3e5f5",color:"#6a1b9a",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>{item.project_type}</span> : "—"}</td>
                      <td style={td}>{item.basin || "—"}</td>
                      <td style={td}>{total.toLocaleString()}</td>
                      <td style={td}>{ach.toLocaleString()}</td>
                      <td style={td}>{pct}%</td>
                      <td style={td}>
                        {item.approved ? (
                          <span style={{background:"#e8f5e9",color:"#1B5E20",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>✅ Approved</span>
                        ) : item.approval_requested ? (
                          <span style={{background:"#fff8e1",color:"#E65100",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>🔶 Requested</span>
                        ) : (
                          <span style={{background:"#fff3e0",color:"#E65100",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>⏳ Pending</span>
                        )}
                      </td>
                      <td style={td}>
                        <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#f3e5f5",color:"#6a1b9a",cursor:"pointer"}} onClick={e=>{e.stopPropagation();openHistory(item.id);}}>📜 History</button>
                      </td>
                      {canEdit && (
                        <td style={td}>
                          <div style={{display:"flex",gap:4}}>
                            {!item.approved && (user?.role === "admin" || user?.role === "ops_manager") && (
                              <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#e8f5e9",color:"#1B5E20",cursor:"pointer"}} onClick={async e=>{e.stopPropagation();const ok=await api.stage2ApproveTarget(item.id).then(()=>true).catch(()=>false);if(ok){onToast?.("Approved","success");loadBer();}else onToast?.("Approval failed","error");}}>Approve</button>
                            )}
                            {!item.approved && !item.approval_requested && user?.role === "data_creator" && (
                              <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#fff8e1",color:"#E65100",cursor:"pointer"}} onClick={async e=>{e.stopPropagation();const ok=await api.stage2RequestApproval(item.id).then(()=>true).catch(()=>false);if(ok){onToast?.("Approval requested","success");loadBer();}else onToast?.("Request failed","error");}}>🔶 Request Approval</button>
                            )}
                            {!item.approved && item.approval_requested && (user?.role === "admin" || user?.role === "ops_manager") && (
                              <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#fff8e1",color:"#E65100",cursor:"pointer"}} onClick={async e=>{e.stopPropagation();const ok=await api.stage2CancelApprovalRequest(item.id).then(()=>true).catch(()=>false);if(ok){onToast?.("Request cancelled","success");loadBer();}else onToast?.("Cancel failed","error");}}>✕ Cancel Request</button>
                            )}
                            {item.approved && user?.role === "admin" && (
                              <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#fff3e0",color:"#E65100",cursor:"pointer"}} onClick={e=>{e.stopPropagation();startBerEdit(item);}}>🔓 Unlock</button>
                            )}
                            <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={e=>{e.stopPropagation();handleBerDelete(item.id)}}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state when project has no targets */}
        {berForm.project_name && berData.filter(d => d.project_name === berForm.project_name).length === 0 && (
          <div style={{background:"#fafafa",borderRadius:8,padding:24,border:"1px solid #eee",textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:24,marginBottom:8}}>📋</div>
            <div style={{fontSize:14,fontWeight:600,color:"#555",marginBottom:4}}>No BE/RE targets yet for <strong>{berForm.project_name}</strong></div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>
              Select <strong>{berForm.type === "BE" ? "RE" : "BE"}</strong> or a different <strong>FY</strong> above, then fill in the monthly form and click <strong>"Save New Target"</strong>.
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button style={{padding:"6px 18px",border:"none",borderRadius:4,background:"#1565c0",color:"#fff",fontSize:12,cursor:"pointer"}} onClick={()=>{setBerForm(p=>({...p,type:"BE",editing:null,...emptyMonthly()}));loadBerRecord(berForm.project_name,"BE",berForm.financial_year);}}>
                Try BE
              </button>
              <button style={{padding:"6px 18px",border:"none",borderRadius:4,background:"#c62828",color:"#fff",fontSize:12,cursor:"pointer"}} onClick={()=>{setBerForm(p=>({...p,type:"RE",editing:null,...emptyMonthly()}));loadBerRecord(berForm.project_name,"RE",berForm.financial_year);}}>
                Try RE
              </button>
            </div>
          </div>
        )}

        {/* Project-specific mini analytics */}
        {berForm.project_name && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:14,fontWeight:600,color:C2.dark,marginBottom:12}}>Analytics: {berForm.project_name} ({berForm.type})</div>
            {berYearly && (() => {
              const y = berYearly[berForm.type.toLowerCase()];
              if (!y) return null;
              return (
                <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <div style={{background:"#fff",borderRadius:8,padding:"12px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",textAlign:"center",flex:1,minWidth:120,cursor:"pointer"}} onClick={()=>setDrillDown({title:berForm.type+" Summary",data:[{"Project":berForm.project_name,Type:berForm.type,"FY":berForm.financial_year,"Target":y.target,"Achieved":y.achieved}]})}>
                    <div style={{fontSize:22,fontWeight:700,color:berForm.type==="BE"?"#1565c0":"#c62828"}}>{Number(y.target||0).toLocaleString()}</div>
                    <div style={{fontSize:11,color:"#888"}}>{berForm.type} Target</div>
                    <div style={{fontSize:11,color:"#555"}}>Ach: {Number(y.achieved||0).toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}
            {berMonthly && (() => {
              const prefix = berForm.type === "BE" ? "be_" : "re_";
              const entries = Object.entries(berMonthly).filter(([_, v]) => Number(v[prefix+"target"]||0) > 0 || Number(v[prefix+"achieved"]||0) > 0);
              if (entries.length === 0) return null;
              const maxVal = Math.max(...entries.map(([_, v]) => Math.max(Number(v[prefix+"target"]||0), Number(v[prefix+"achieved"]||0), 1)), 1);
              return (
                <div style={{background:"#fff",borderRadius:8,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:12}}>Monthly Target vs Achievement</div>
                  <div style={{display:"flex",gap:6,alignItems:"end",minHeight:160}}>
                    {entries.map(([monthLabel, v]) => {
                      const tgt = Number(v[prefix+"target"]||0);
                      const ach = Number(v[prefix+"achieved"]||0);
                      const tH = (tgt / maxVal) * 120;
                      const aH = (ach / maxVal) * 120;
                      return (
                        <div key={monthLabel} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer"}} onClick={()=>setDrillDown({title:berForm.type+" — "+monthLabel,data:[{Month:monthLabel,"Target (SKM)":tgt,"Achieved (SKM)":ach}]})}>
                          <div style={{display:"flex",gap:4,alignItems:"end",height:130}}>
                            <div title={`Target: ${tgt}`} style={{width:16,background:berForm.type==="BE"?"#1565c0":"#c62828",borderRadius:"4px 4px 0 0",height:Math.max(tH,1),transition:"height 0.3s"}} />
                            <div title={`Ach: ${ach}`} style={{width:16,background:"#4caf50",borderRadius:"4px 4px 0 0",height:Math.max(aH,1),transition:"height 0.3s"}} />
                          </div>
                          <div style={{fontSize:9,color:"#888",marginTop:4}}>{monthLabel}</div>
                          <div style={{fontSize:8,color:berForm.type==="BE"?"#1565c0":"#c62828"}}>{tgt}</div>
                          <div style={{fontSize:8,color:"#4caf50"}}>{ach}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {!berMonthly && !berYearly && (
              <div style={{textAlign:"center",padding:12,color:"#aaa",fontSize:12}}>No analytics data for this project yet.</div>
            )}
          </div>
        )}
      </div>

      {/* ── AWP Items Section ── */}
      <div style={{...S.section,marginTop:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:C2.dark}}>AWP Items</div>
          {canEdit && (
            <>
              <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowAwpForm(!showAwpForm)}>
                {showAwpForm ? (awpEditingId ? "Cancel" : "Close") : "+ Add AWP Item"}
              </button>
              <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>
                📥 Excel
              </button>
            </>
          )}
        </div>

        {showAwpForm && canEdit && (
          <div style={{background:"#fff",borderRadius:8,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:C2.dark,marginBottom:12}}>{awpEditingId ? "Edit AWP Item" : "New AWP Item"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {(awpFields||[]).map(f => (
                <div key={f.field_name} style={S.field}>
                  <label style={S.label}>{f.field_name}{f.required ? " *" : ""}</label>
                  {f.field_type === "select" ? (
                    <select style={S.select} value={awpValues[f.field_name]||""} onChange={e=>setAwpValues(p=>({...p,[f.field_name]:e.target.value}))}>
                      <option value="">— Select —</option>
                      {(awpFieldOpts[f.field_name]||[]).map(o => (
                        <option key={o.id || o.value || o} value={o.value || o}>{o.value || o}</option>
                      ))}
                    </select>
                  ) : f.field_type === "date" ? (
                    <input style={S.input} type="date" value={awpValues[f.field_name]?.slice(0,10)||""} onChange={e=>setAwpValues(p=>({...p,[f.field_name]:e.target.value}))} />
                  ) : (
                    <input style={S.input} value={awpValues[f.field_name]||""} onChange={e=>setAwpValues(p=>({...p,[f.field_name]:e.target.value}))} placeholder={f.placeholder||f.field_name} />
                  )}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button style={S.btnSm()} onClick={handleAwpCreate} disabled={awpSaving}>{awpSaving ? "Saving..." : awpEditingId ? "✏️ Update" : "💾 Create"}</button>
              <button style={{...S.btnSm("#888")}} onClick={resetAwpForm}>Cancel</button>
            </div>
          </div>
        )}

        {awpLoading ? (
          <div style={{textAlign:"center",padding:20,fontSize:13,color:"#888"}}>Loading AWP items...</div>
        ) : awpItems.length === 0 ? (
          <div style={{textAlign:"center",padding:20,fontSize:13,color:"#aaa"}}>No AWP items yet.</div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#f0f4ff"}}>
                  {(awpFields||[]).map(f => (
                    <th key={f.field_name} style={th}>{f.field_name}</th>
                  ))}
                  {canEdit && <th style={th}></th>}
                </tr>
              </thead>
              <tbody>
                {awpItems.map((d,i) => {
                  let df = {};
                  try { df = d.dynamic_fields ? (typeof d.dynamic_fields === "string" ? JSON.parse(d.dynamic_fields) : d.dynamic_fields) : {}; } catch {}
                  if (!df || Object.keys(df).length === 0) {
                    const legacy = {
                      Activity: d.activity, Target: d.target,
                      Achieved: d.achieved, "Progress %": d.progress,
                      Deadline: d.deadline ? String(d.deadline).slice(0,10) : "",
                      Status: d.status,
                    };
                    df = Object.fromEntries(Object.entries(legacy).filter(([_,v]) => v));
                  }
                  return (
                    <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa",cursor:canEdit?"pointer":"default"}} onClick={() => canEdit && startAwpEdit(d)}>
                      {(awpFields||[]).map(f => {
                        const val = df[f.field_name] || "";
                        let cell = val;
                        if (val && /progress/i.test(f.field_name)) {
                          cell = (
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:60,height:6,background:"#eee",borderRadius:3}}>
                                <div style={{width:val,height:6,background:df.Status==="On Track"?"#1B5E20":df.Status==="Critical"?"#e74c3c":"#E65100",borderRadius:3}}/>
                              </div>
                              {val}
                            </div>
                          );
                        } else if (/status/i.test(f.field_name) && val) {
                          cell = (
                            <span style={{background:val==="On Track"?"#e8f5e9":val==="Needs Attention"?"#fff3e0":"#ffebee",color:val==="On Track"?"#1B5E20":val==="Needs Attention"?"#E65100":"#e74c3c",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>
                              {val}
                            </span>
                          );
                        } else if (/deadline|date/i.test(f.field_name) && val) {
                          cell = String(val).slice(0,10);
                        }
                        return <td key={f.field_name} style={td}>{cell}</td>;
                      })}
                      {canEdit && (
                        <td style={td}>
                          <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={e=>{e.stopPropagation();handleAwpDelete(d.id)}}>Delete</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyModal && <HistoryModalWidget
        berData={berData}
        availFYs={availFYs}
        histFyFilter={histFyFilter}
        setHistFyFilter={setHistFyFilter}
        histMonthFilter={histMonthFilter}
        setHistMonthFilter={setHistMonthFilter}
        histProjectFilter={histProjectFilter}
        setHistProjectFilter={setHistProjectFilter}
        historyData={historyData}
        historyLoading={historyLoading}
        loadHistoryFiltered={loadHistoryFiltered}
        onClose={()=>setHistoryModal(null)}
        api={api}
      />}
      {drillDown && <DrillDownModal title={drillDown.title} data={drillDown.data} onClose={() => setDrillDown(null)} />}
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelAWPPreview} apiImport={api.excelAWPImport} fields="awp_item" onSuccess={()=>{loadAwp()}} />
    </div>
  );
}
