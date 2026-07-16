import { useState, useEffect } from "react";
import { api } from "../api";

const S = {
  page: { padding: 0, maxWidth: "none", margin: 0 },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  section: { background: "#fff", borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { textAlign:"left", padding:"8px 10px", borderBottom:"2px solid #e0e0e0", color:"#666", fontWeight:600, fontSize:13 },
  td: { padding:"8px 10px", borderBottom:"1px solid #f0f0f0", color:"#444", fontSize:13 },
  badge: (fg, bg) => ({ display:"inline-block", padding:"2px 8px", borderRadius:12, fontWeight:600, fontSize:12, color:fg||"#fff", background:bg||"#888" }),
  btnSm: (variant) => ({ padding:"4px 12px", border:"none", borderRadius:4, fontWeight:600, fontSize:12, cursor:"pointer", background: variant==="danger"?"#c62828":variant==="success"?"#1B5E20":"#0b3d91", color:"#fff" }),
};

const C = {
  blue: "#1565C0", green: "#2E7D32", orange: "#E65100", red: "#C62828",
  purple: "#6A1B9A", teal: "#00838F", dark: "#0D47A1",
};

const COLORS = [C.blue, C.green, C.orange, C.purple, C.teal, C.red, C.dark];

function KpiCard({ label, value, color, sub, onClick }) {
  return (
    <div style={{ ...S.card, textAlign:"center", cursor: onClick ? "pointer" : "default" }} onClick={() => onClick?.(label)}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "#0b3d91" }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function DrillDownModal({ title, data, onClose }) {
  if (!data || !data.length) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 24, maxWidth: 700, width: "90%", maxHeight: "70vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0b3d91" }}>{title}</div>
          <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999", lineHeight: 1 }} onClick={onClose}>×</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            {Object.keys(data[0]).map(k => <th key={k} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #e0e0e0", color: "#666", fontWeight: 600, fontSize: 12 }}>{k}</th>)}
          </tr></thead>
          <tbody>{data.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
              {Object.values(row).map((v, j) => <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f0", color: "#444", fontSize: 13 }}>{v ?? "—"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function PieChart({ data, colors, size = 140, onClick }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  if (!entries.length) return <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>No data</div>;
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;
  let cum = 0;
  const segs = entries.map(([k, v], i) => {
    const p = total ? v / total : 0, s = cum; cum += p;
    return { key: k, value: v, pct: p, start: s, color: (colors ? colors[i % colors.length] : "#ccc") };
  });
  const arc = (s, e) => {
    if (e - s >= 1) return `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    const sx = cx + r * Math.sin(2 * Math.PI * s), sy = cy - r * Math.cos(2 * Math.PI * s);
    const ex = cx + r * Math.sin(2 * Math.PI * e), ey = cy - r * Math.cos(2 * Math.PI * e);
    return `M${cx} ${cy} L${sx} ${sy} A${r} ${r} 0 ${(e - s) > 0.5 ? 1 : 0} 1 ${ex} ${ey} Z`;
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ cursor: onClick ? "pointer" : "default" }}>
        {segs.map((s, i) => <path key={i} d={arc(s.start, s.start + s.pct)} fill={s.color} stroke="#fff" strokeWidth={1.5} style={{ cursor: onClick ? "pointer" : "default" }} onClick={() => onClick?.(s.key, s.value)} />)}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
        <text x={cx} y={cy + 1} textAnchor="middle" fontSize={size * 0.12} fontWeight={700} fill="#333">{total}</text>
        <text x={cx} y={cy + size * 0.06} textAnchor="middle" fontSize={size * 0.06} fill="#aaa">Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: onClick ? "pointer" : "default" }} onClick={() => onClick?.(s.key, s.value)}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: "#555", fontWeight: 500 }}>{s.key}</span>
            <span style={{ fontWeight: 700, color: "#333" }}>{s.value}</span>
            <span style={{ color: "#999", fontSize: 11 }}>({(s.pct * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBar({ data, maxOverride, color = C.blue, height = 22, onClick }) {
  const entries = Object.entries(data);
  const max = maxOverride || Math.max(...Object.values(data), 1);
  if (!entries.length) return <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 20 }}>No data</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map(([k, v], i) => (
        <div key={i} style={{ cursor: onClick ? "pointer" : "default" }} onClick={() => onClick?.(k, v)}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 1 }}>
            <span style={{ color: "#555", fontWeight: 500 }}>{k}</span>
            <span style={{ fontWeight: 700, color: "#333" }}>{v}</span>
          </div>
          <div style={{ height, background: "#f0f4f8", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: Array.isArray(color) ? color[i % color.length] : color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 14 }}>Loading dashboard…</div>;
}

const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

function GroupedBar({ data, labels, groups, colors, height=160 }) {
  const maxVal = Math.max(...Object.values(data), 1);
  const groupW = 56;
  const barW = Math.max(10, (groupW - 8) / groups.length);
  const labelH = 20;
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:2, height, overflowX:"auto", padding:"0 4px 20px" }}>
      {labels.map((label, li) => (
        <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:groupW, minWidth:groupW }}>
          <div style={{ display:"flex", gap:1, alignItems:"flex-end", height:height-labelH, paddingTop:labelH }}>
            {groups.map((g, vi) => {
              const v = data[`${label}_${g}`] || 0;
              const h = Math.max((v / maxVal) * (height - labelH - labelH), 2);
              return (
                <div key={g} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:colors[vi], marginBottom:2, lineHeight:1.2 }}>{v}</div>
                  <div style={{ width:barW, height:h, background:colors[vi], borderRadius:"3px 3px 0 0", transition:"height 0.4s" }} />
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:10, color:"#888", marginTop:2, textAlign:"center" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function SmartDashboard({ user, onToast }) {
  const role = user?.role || "viewer";
  const level = user?.level ?? 0;
  const section = user?.section || "";
  const area = user?.area || "";

  const [stats, setStats] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [myFiles, setMyFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState(null);
  const [s2Monthly, setS2Monthly] = useState(null);
  const [s2Yearly, setS2Yearly] = useState(null);
  const [berProjects, setBerProjects] = useState([]);
  const [berSelectedProjects, setBerSelectedProjects] = useState([]);
  const [berAllRecords, setBerAllRecords] = useState([]);
  const [moduleSummary, setModuleSummary] = useState(null);
  const currentDashFy = (() => { const y = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1; return `${y}-${String(y+1).slice(2)}`; })();
  const [dashFy, setDashFy] = useState(currentDashFy);

  const isAdmin = role === "admin";
  const isOps = role === "ops_manager";
  const isCreator = role === "data_creator";
  const isViewer = role === "viewer";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStats(),
      api.listHighlights(),
      api.listFiles(),
      api.stage2Monthly(),
      api.stage2Yearly(),
      api.stage2Targets(),
      api.getModuleSummary(),
    ]).then(([s, h, all, s2m, s2y, s2t, ms]) => {
      setStats(s || { total:0, pending:0, approved:0, rejected:0, bySection:{}, byClassification:{}, byType:{} });
      setHighlights(h || []);
      const norm = (all || []).map(f => ({
        id: f.id,
        fileName: f.file_name,
        fileType: f.file_type?.toUpperCase(),
        status: f.status,
        section: f.section,
        category: f.category,
        uploadedBy: f.uploaded_by,
        uploadedByName: f.uploaded_by_name,
        uploadDate: f.upload_date,
      }));
      setMyFiles(norm.filter(f => f.uploadedBy === user.id));
      setS2Monthly(s2m || {});
      setS2Yearly(s2y || { be:{target:0,achieved:0}, re:{target:0,achieved:0} });
      setBerProjects([...new Set((s2t||[]).map(t => t.project_name).filter(Boolean))].sort());
      setBerAllRecords(s2t || []);
      setModuleSummary(ms || null);
    }).catch(() => {
      setStats({ total:0, pending:0, approved:0, rejected:0, bySection:{}, byClassification:{}, byType:{} });
      setHighlights([]);
      setMyFiles([]);
      setS2Monthly({});
      setS2Yearly({ be:{target:0,achieved:0}, re:{target:0,achieved:0} });
      setBerProjects([]);
      setBerAllRecords([]);
      setModuleSummary(null);
    }).finally(() => setLoading(false));
  }, [user.id]);

  useEffect(() => {
    Promise.all([
      api.stage2Monthly(dashFy),
      api.stage2Yearly(dashFy),
      api.stage2Targets(dashFy),
    ]).then(([s2m, s2y, s2t]) => {
      setS2Monthly(s2m || {});
      setS2Yearly(s2y || { be:{target:0,achieved:0}, re:{target:0,achieved:0} });
      setBerProjects([...new Set((s2t||[]).map(t => t.project_name).filter(Boolean))].sort());
      setBerAllRecords(s2t || []);
    }).catch(() => {
      setS2Monthly({});
      setS2Yearly({ be:{target:0,achieved:0}, re:{target:0,achieved:0} });
      setBerProjects([]);
      setBerAllRecords([]);
    });
  }, [dashFy]);

  const toggleBerProject = (pn) => {
    setBerSelectedProjects(prev =>
      prev.includes(pn) ? prev.filter(x => x !== pn) : [...prev, pn]
    );
  };

  if (loading) return <Spinner />;

  const roleBanner = () => {
    if (isAdmin) return { label:"Admin (Full Control)", color:"#0b3d91", bg:"#E3F2FD", msg:"You have full access to all data across all sections." };
    if (isOps) return { label:`Operations Manager — ${area || section}`, color:"#E65100", bg:"#FFF3E0", msg:`You manage data for: ${area || section}. Viewing team performance and section activity.` };
    if (isCreator) return { label:`Data Creator — ${section || area}`, color:"#2E7D32", bg:"#E8F5E9", msg:`Your section: ${section || area}. View your uploads and module activity.` };
    return { label:`Viewer — Level ${level}`, color:"#6A1B9A", bg:"#F3E5F5", msg:"You have read-only access to approved general-availability data." };
  };
  const bn = roleBanner();

  return (
    <div style={S.page}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:22, fontWeight:700, color:"#0b3d91" }}>Dashboard</div>
      </div>

      <div style={{ background:bn.bg, borderRadius:8, padding:"12px 16px", marginBottom:20, border:`1px solid ${bn.color}40` }}>
        <div style={{ fontWeight:700, color:bn.color, marginBottom:4, fontSize:14 }}>{bn.label}</div>
        <div style={{ color:"#5a6a7a", fontSize:13 }}>{bn.msg}</div>
      </div>

      {isViewer && stats && (
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>File Distribution</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <PieChart data={stats.bySection || {}} onClick={(key, val) => setDrillDown({ title: `Files by Section: ${key}`, rows: [{ Section: key, Count: val }] })} />
            <PieChart data={stats.byClassification || {}} onClick={(key, val) => setDrillDown({ title: `Files by Classification: ${key}`, rows: [{ Classification: key, Count: val }] })} />
          </div>
        </div>
      )}

      {/* ── BE/RE Targets & Achievement (Stage-II) ── */}
      {!isViewer && (s2Monthly || berAllRecords.length > 0) && (() => {
        const rawMonths = ["apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb","mar"];
        const activeProjects = berSelectedProjects;
        const records = activeProjects.length ? berAllRecords.filter(r => activeProjects.includes(r.project_name)) : berAllRecords;
        // compute aggregated monthly/yearly from selected records
        const compMonthly = {};
        const compYearly = { be:{target:0,achieved:0}, re:{target:0,achieved:0} };
        records.forEach(rec => {
          const pfx = rec.type === "BE" ? "be" : "re";
          rawMonths.forEach((m, i) => {
            if (!compMonthly[MONTHS[i]]) compMonthly[MONTHS[i]] = { be_target:0, be_achieved:0, re_target:0, re_achieved:0 };
            compMonthly[MONTHS[i]][pfx + "_target"] += Number(rec[m]||0);
            compMonthly[MONTHS[i]][pfx + "_achieved"] += Number(rec[m + "_ach"]||0);
          });
          compYearly[pfx].target += Number(rec.total||0);
          compYearly[pfx].achieved += Number(rec.total_ach||0);
        });
        const cm = Object.keys(compMonthly).length ? compMonthly : s2Monthly;
        const cy = Object.keys(compYearly.be).length ? compYearly : s2Yearly;
        // per-project computed data for comparison
        const projData = activeProjects.length >= 2 ? activeProjects.map(pn => {
          const recs = berAllRecords.filter(r => r.project_name === pn);
          const pm = {}; const py = { be:{target:0,achieved:0}, re:{target:0,achieved:0} };
          recs.forEach(rec => {
            const pfx = rec.type === "BE" ? "be" : "re";
            rawMonths.forEach((m, i) => {
              if (!pm[MONTHS[i]]) pm[MONTHS[i]] = { be_target:0, be_achieved:0, re_target:0, re_achieved:0 };
              pm[MONTHS[i]][pfx + "_target"] += Number(rec[m]||0);
              pm[MONTHS[i]][pfx + "_achieved"] += Number(rec[m + "_ach"]||0);
            });
            py[pfx].target += Number(rec.total||0);
            py[pfx].achieved += Number(rec.total_ach||0);
          });
          return { project: pn, monthly: pm, yearly: py };
        }) : [];
        return (
        <div style={S.section}>
          <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>BE & RE Targets & Achievement</div>
          {/* ── FY filter + project selectors ── */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <label style={{fontSize:12,color:"#666"}}>FY:</label>
              <input style={{width:85,padding:"6px 8px",border:"1px solid #d0d5dd",borderRadius:6,fontSize:13,textAlign:"center"}} value={dashFy} onChange={e=>setDashFy(e.target.value)} placeholder="YYYY-YY" />
              <button style={{padding:"2px 8px",border:"1px solid #ccc",borderRadius:3,background:"#fff",cursor:"pointer",fontSize:13}} onClick={()=>{const m=dashFy.match(/^(\d{4})/);if(m){const n=Number(m[1])-1;setDashFy(`${n}-${String(n+1).slice(2)}`)}}}>◀</button>
              <button style={{padding:"2px 8px",border:"1px solid #ccc",borderRadius:3,background:"#fff",cursor:"pointer",fontSize:13}} onClick={()=>{const m=dashFy.match(/^(\d{4})/);if(m){const n=Number(m[1])+1;setDashFy(`${n}-${String(n+1).slice(2)}`)}}}>▶</button>
            </div>
            <select style={{ padding:"8px 12px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:14, background:"#fff", minWidth:220 }} value={activeProjects[0]||""} onChange={e => {
              const v = e.target.value;
              if (!v) setBerSelectedProjects([]);
              else setBerSelectedProjects([v]);
            }}>
              <option value="">— All Projects —</option>
              {berProjects.map(pn => <option key={pn} value={pn}>{pn}</option>)}
            </select>
            {activeProjects[0] && (
              <select style={{ padding:"8px 12px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:14, background:"#fff", minWidth:220 }} value={activeProjects[1]||""} onChange={e => {
                const v = e.target.value;
                if (!v) setBerSelectedProjects([activeProjects[0]]);
                else setBerSelectedProjects([activeProjects[0], v]);
              }}>
                <option value="">+ Compare with…</option>
                {berProjects.filter(pn => pn !== activeProjects[0]).map(pn => <option key={pn} value={pn}>{pn}</option>)}
              </select>
            )}
            {activeProjects.length >= 2 && (
              <select style={{ padding:"8px 12px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:14, background:"#fff", minWidth:220 }} value={activeProjects[2]||""} onChange={e => {
                const v = e.target.value;
                if (!v) setBerSelectedProjects([activeProjects[0], activeProjects[1]]);
                else setBerSelectedProjects([activeProjects[0], activeProjects[1], v]);
              }}>
                <option value="">+ Compare with…</option>
                {berProjects.filter(pn => !activeProjects.includes(pn)).map(pn => <option key={pn} value={pn}>{pn}</option>)}
              </select>
            )}
            {activeProjects.length > 0 && (
              <button style={{ padding:"6px 12px", border:"1px solid #e0e0e0", borderRadius:6, background:"#f5f5f5", cursor:"pointer", fontSize:13 }} onClick={() => setBerSelectedProjects([])}>Clear</button>
            )}
            {berProjects.length === 0 && <span style={{ fontSize:12, color:"#aaa" }}>No project data.</span>}
          </div>
          {/* ── aggregate charts (none or single project) ── */}
          {activeProjects.length < 2 && cm && (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1565C0", marginBottom:6 }}>BE — Monthly Target vs Achievement</div>
                  <div style={{ overflowX:"auto", paddingBottom:4 }}>
                    <GroupedBar
                      data={Object.fromEntries(MONTHS.flatMap(m => [[`${m}_Target`, cm[m]?.be_target||0], [`${m}_Achieved`, cm[m]?.be_achieved||0]]))}
                      labels={MONTHS} groups={["Target","Achieved"]} colors={["#1565C0","#2E7D32"]} height={150} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#E65100", marginBottom:6 }}>RE — Monthly Target vs Achievement</div>
                  <div style={{ overflowX:"auto", paddingBottom:4 }}>
                    <GroupedBar
                      data={Object.fromEntries(MONTHS.flatMap(m => [[`${m}_Target`, cm[m]?.re_target||0], [`${m}_Achieved`, cm[m]?.re_achieved||0]]))}
                      labels={MONTHS} groups={["Target","Achieved"]} colors={["#E65100","#2E7D32"]} height={150} />
                  </div>
                </div>
              </div>
              {cy && (
                <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap", justifyContent:"center" }}>
                  <div style={{ padding:"8px 14px", background:"#e3f2fd", borderRadius:6, textAlign:"center", minWidth:100, cursor:"pointer" }} onClick={() => setDrillDown({title:"BE Target", data:[{Type:"BE", Target:cy.be?.target||0, Achieved:cy.be?.achieved||0}]})}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#1565C0" }}>BE Target</div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#1565C0" }}>{cy.be?.target || 0}</div>
                  </div>
                  <div style={{ padding:"8px 14px", background:"#e8f5e9", borderRadius:6, textAlign:"center", minWidth:100, cursor:"pointer" }} onClick={() => setDrillDown({title:"BE Achieved", data:[{Type:"BE", Achieved:cy.be?.achieved||0}]})}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#2E7D32" }}>BE Achieved</div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#2E7D32" }}>{cy.be?.achieved || 0}</div>
                  </div>
                  <div style={{ padding:"8px 14px", background:"#fff3e0", borderRadius:6, textAlign:"center", minWidth:100, cursor:"pointer" }} onClick={() => setDrillDown({title:"RE Target", data:[{Type:"RE", Target:cy.re?.target||0, Achieved:cy.re?.achieved||0}]})}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#E65100" }}>RE Target</div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#E65100" }}>{cy.re?.target || 0}</div>
                  </div>
                  <div style={{ padding:"8px 14px", background:"#fce4ec", borderRadius:6, textAlign:"center", minWidth:100, cursor:"pointer" }} onClick={() => setDrillDown({title:"RE Achieved", data:[{Type:"RE", Achieved:cy.re?.achieved||0}]})}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#c62828" }}>RE Achieved</div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#c62828" }}>{cy.re?.achieved || 0}</div>
                  </div>
                </div>
              )}
            </>
          )}
          {/* ── comparison view for 2+ projects ── */}
          {activeProjects.length >= 2 && projData.map(pd => (
            <div key={pd.project} style={{ marginBottom:20, border:"1px solid #e8edf2", borderRadius:8, padding:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:10 }}>{pd.project}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1565C0", marginBottom:4 }}>BE — Monthly Target vs Achievement</div>
                  <div style={{ overflowX:"auto", paddingBottom:4 }}>
                    <GroupedBar
                      data={Object.fromEntries(MONTHS.flatMap(m => [[`${m}_Target`, pd.monthly[m]?.be_target||0], [`${m}_Achieved`, pd.monthly[m]?.be_achieved||0]]))}
                      labels={MONTHS} groups={["Target","Achieved"]} colors={["#1565C0","#2E7D32"]} height={120} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#E65100", marginBottom:4 }}>RE — Monthly Target vs Achievement</div>
                  <div style={{ overflowX:"auto", paddingBottom:4 }}>
                    <GroupedBar
                      data={Object.fromEntries(MONTHS.flatMap(m => [[`${m}_Target`, pd.monthly[m]?.re_target||0], [`${m}_Achieved`, pd.monthly[m]?.re_achieved||0]]))}
                      labels={MONTHS} groups={["Target","Achieved"]} colors={["#E65100","#2E7D32"]} height={120} />
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                <div style={{ padding:"6px 12px", background:"#e3f2fd", borderRadius:5, textAlign:"center", minWidth:80 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#1565C0" }}>BE Target</div>
                  <div style={{ fontSize:17, fontWeight:800, color:"#1565C0" }}>{pd.yearly.be?.target||0}</div>
                </div>
                <div style={{ padding:"6px 12px", background:"#e8f5e9", borderRadius:5, textAlign:"center", minWidth:80 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#2E7D32" }}>BE Ach.</div>
                  <div style={{ fontSize:17, fontWeight:800, color:"#2E7D32" }}>{pd.yearly.be?.achieved||0}</div>
                </div>
                <div style={{ padding:"6px 12px", background:"#fff3e0", borderRadius:5, textAlign:"center", minWidth:80 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#E65100" }}>RE Target</div>
                  <div style={{ fontSize:17, fontWeight:800, color:"#E65100" }}>{pd.yearly.re?.target||0}</div>
                </div>
                <div style={{ padding:"6px 12px", background:"#fce4ec", borderRadius:5, textAlign:"center", minWidth:80 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#c62828" }}>RE Ach.</div>
                  <div style={{ fontSize:17, fontWeight:800, color:"#c62828" }}>{pd.yearly.re?.achieved||0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        );
      })()}

      {/* ── Module Summary ── */}
      {moduleSummary && moduleSummary.modules && (
        <div style={S.section}>
          <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:14 }}>Module Overview ({moduleSummary.total} total records)</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
            {Object.entries(moduleSummary.modules).map(([key, mod]) => {
              const statusColors = { "N/A":"#888", Open:"#c62828", "In Progress":"#e65100", Completed:"#1b5e20", Closed:"#2e7d32", Resolved:"#2e7d32", Pending:"#f9a825", Approved:"#1b5e20", Rejected:"#c62828", Draft:"#607d8b", Valid:"#1b5e20", Expired:"#c62828", "On Track":"#1b5e20", Ongoing:"#e65100" };
              const total = mod.total;
              const topStatus = Object.entries(mod.status_counts).sort((a,b) => b[1] - a[1])[0];
              return (
                <div key={key} style={{ background:"#f9fafb", borderRadius:8, padding:"12px 14px", cursor:"pointer", border:"1px solid #e8edf2" }}
                  onClick={() => setDrillDown({ title: mod.label, data: mod.recent.map(r => ({ Name: r.name, Status: r.status, "Created": r.created_at?.split("T")[0]||"—" })) })}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#888", textTransform:"uppercase", letterSpacing:0.3, marginBottom:2 }}>{mod.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:"#0b3d91" }}>{total}</div>
                  {topStatus && (
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background: statusColors[topStatus[0]]||"#888", flexShrink:0 }} />
                      <span style={{ fontSize:11, color:"#666" }}>{topStatus[0]}: {topStatus[1]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {highlights.length > 0 && !isViewer && (
        <div style={S.section}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Highlights</div>
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
            {highlights.slice(0, 8).map(h => (
              <div key={h.id} style={{ minWidth:200, background:"#f9fafb", borderRadius:8, padding:12, flexShrink:0 }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{h.icon || "🏆"}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{h.title}</div>
                <div style={{ fontSize:12, color:"#666", lineHeight:1.3 }}>{h.description}</div>
                {h.author && <div style={{ fontSize:12, color:"#999", marginTop:4 }}>— {h.author}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(isCreator || isViewer) && (
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>
            {isCreator ? "My Recent Uploads" : "Available Files (General Access)"}
          </div>
          {myFiles.length === 0 ? (
            <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>{isCreator ? "No uploads yet." : "No files available."}</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr>
                <th style={S.th}>File Name</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Section</th>
                <th style={S.th}>Status</th>
              </tr></thead>
              <tbody>{myFiles.slice(0,6).map(f=>(
                <tr key={f.id}>
                  <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span></td>
                  <td style={S.td}>{f.fileType}</td>
                  <td style={S.td}>{f.section}</td>
                  <td style={S.td}><span style={{ ...S.badge(f.status==="Approved"?"#1B5E20":f.status==="Pending"?"#E65100":"#C62828", f.status==="Approved"?"#E8F5E9":f.status==="Pending"?"#FFF3E0":"#FFEBEE") }}>{f.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {drillDown && <DrillDownModal title={drillDown.title} data={drillDown.data || drillDown.rows} onClose={() => setDrillDown(null)} />}
    </div>
  );
}
