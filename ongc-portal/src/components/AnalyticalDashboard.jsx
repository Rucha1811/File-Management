import { useState, useEffect } from "react";
import { api } from "../api";
import { DrillDownModal } from "./shared/DrillDownModal";

const S = {
  page: { padding: 0, maxWidth: "none", margin: 0 },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  section: { background: "#fff", borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
};

const C = {
  blue: "#1565C0", green: "#2E7D32", orange: "#E65100", red: "#C62828",
  purple: "#6A1B9A", teal: "#00838F", dark: "#0D47A1",
};

const COLORS = [C.blue, C.green, C.orange, C.purple, C.teal, C.red, C.dark];

function KpiCard({ label, value, color, sub, onClick }) {
  return (
    <div style={{ ...S.card, textAlign:"center", cursor:onClick?"pointer":"default" }} onClick={() => onClick?.()}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "#0b3d91" }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>{sub}</div>}
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
    return { key: k, value: v, pct: p, start: s, color: (Array.isArray(colors) ? colors[i % colors.length] : colors) || "#ccc" };
  });
  const arc = (s, e) => {
    if (e - s >= 1) return `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    const sx = cx + r * Math.sin(2 * Math.PI * s), sy = cy - r * Math.cos(2 * Math.PI * s);
    const ex = cx + r * Math.sin(2 * Math.PI * e), ey = cy - r * Math.cos(2 * Math.PI * e);
    return `M${cx} ${cy} L${sx} ${sy} A${r} ${r} 0 ${(e - s) > 0.5 ? 1 : 0} 1 ${ex} ${ey} Z`;
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs.map((s, i) => (
          <path key={i} d={arc(s.start, s.start + s.pct)} fill={s.color} stroke="#fff" strokeWidth={1.5} style={{cursor:onClick?"pointer":"default"}} onClick={() => onClick?.(s.key)} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
        <text x={cx} y={cy + 1} textAnchor="middle" fontSize={size * 0.12} fontWeight={700} fill="#333">{total}</text>
        <text x={cx} y={cy + size * 0.06} textAnchor="middle" fontSize={size * 0.06} fill="#aaa">Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor:onClick?"pointer":"default" }} onClick={() => onClick?.(s.key)}>
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
        <div key={i} style={{cursor:onClick?"pointer":"default"}} onClick={() => onClick?.(k)}>
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
  return <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 14 }}>Loading dashboard data…</div>;
}

export default function AnalyticalDashboard({ user, onToast }) {
  const [period, setPeriod] = useState("month");
  const [activity, setActivity] = useState(null);
  const [targets, setTargets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [techReports, setTechReports] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState(null);
  const [berTargets, setBerTargets] = useState([]);
  const [berSelectedProject, setBerSelectedProject] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [a, t, p, r, h, u, n, be] = await Promise.all([
        api.activitySummary(period),
        api.listTargets(),
        api.listProjects(),
        api.listTechnicalReports(),
        api.listHighlights(),
        api.listUsers(),
        api.listNotifications(),
        api.stage2Targets(),
      ]);
      setActivity(a || null);
      setTargets(t || []);
      setProjects(p || []);
      setTechReports(r || []);
      setHighlights(h || []);
      setUsers(u || []);
      setNotifs(n || []);
      setBerTargets(be || []);
    } catch {
      setActivity(null); setTargets([]); setProjects([]);
      setTechReports([]); setHighlights([]); setUsers([]); setNotifs([]);
      setBerTargets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  if (loading) return <Spinner />;

  const activityLog = activity?.recentActivity || [];
  const totalTargetValue = targets.reduce((s, t) => s + (Number(t.target_value)||0), 0);
  const totalAchieved = targets.reduce((s, t) => s + (Number(t.achieved)||0), 0);
  const overallPct = totalTargetValue ? ((totalAchieved / totalTargetValue) * 100).toFixed(1) : "0";
  const ongoingProjects = projects.filter(p => p.status !== "Completed" && p.status !== "Closed");
  const unreadNotifs = notifs.filter(n => !n.is_read).length;

  /* ── Page-level aggregations ── */

  // 1. Progress Report → Targets by Section
  const progressBySection = {};
  targets.forEach(t => { progressBySection[t.section || "General"] = (progressBySection[t.section || "General"] || 0) + 1; });

  // 2. Manpower Status → Users by Role
  const usersByRole = {};
  users.forEach(u => { usersByRole[u.role || "user"] = (usersByRole[u.role || "user"] || 0) + 1; });

  // 3. Contract Status → Projects by Status
  const projectsByStatus = {};
  projects.forEach(p => { projectsByStatus[p.status || "Unknown"] = (projectsByStatus[p.status || "Unknown"] || 0) + 1; });

  // 4. Fund Management → Targets by Fiscal Year
  const targetsByFy = {};
  targets.forEach(t => { targetsByFy[t.fiscal_year || "Not Set"] = (targetsByFy[t.fiscal_year || "Not Set"] || 0) + 1; });

  // 5. Operations → Projects by Block
  const projectsByBlock = {};
  projects.forEach(p => { projectsByBlock[p.block || "Unassigned"] = (projectsByBlock[p.block || "Unassigned"] || 0) + 1; });

  // 6. Data Processing → Projects by Progress Bucket
  const progressBuckets = { "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0 };
  projects.forEach(p => {
    const v = Number(p.progress) || 0;
    if (v <= 25) progressBuckets["0-25%"]++;
    else if (v <= 50) progressBuckets["26-50%"]++;
    else if (v <= 75) progressBuckets["51-75%"]++;
    else progressBuckets["76-100%"]++;
  });

  // 7. Regional Electronics Lab → Projects by Section
  const projectsBySection = {};
  projects.forEach(p => { projectsBySection[p.section || "Unassigned"] = (projectsBySection[p.section || "Unassigned"] || 0) + 1; });

  // 8. Reporting / Appraisals → Target Achievement split
  const targetAchievement = { Achieved: totalAchieved, Remaining: Math.max(0, totalTargetValue - totalAchieved) };

  // 9. Technical Reports → Reports by Category
  const reportsByCategory = {};
  techReports.forEach(r => { reportsByCategory[r.category || "Uncategorized"] = (reportsByCategory[r.category || "Uncategorized"] || 0) + 1; });

  // 10. HSE → Activity by Action
  const activityByAction = {};
  activityLog.forEach(a => { activityByAction[a.action || "other"] = (activityByAction[a.action || "other"] || 0) + 1; });

  // 11. Highlights → just count (no breakdown)

  const pageCharts = [
    { page: "Progress Report", label: "Targets by Section", data: progressBySection, colors: COLORS },
    { page: "Manpower Status", label: "Users by Role", data: usersByRole, colors: [C.blue, C.green, C.orange, C.purple, C.teal, C.dark] },
    { page: "Contract Status", label: "Projects by Status", data: projectsByStatus, colors: [C.green, C.blue, C.orange, C.purple, C.red, C.teal] },
    { page: "Fund Management", label: "Targets by Fiscal Year", data: targetsByFy, colors: [C.teal, C.blue, C.green, C.orange, C.purple] },
    { page: "Operations", label: "Projects by Block", data: projectsByBlock, colors: COLORS },
    { page: "Data Processing", label: "Projects by Progress", data: progressBuckets, colors: [C.red, C.orange, C.blue, C.green] },
    { page: "Regional Electronics Lab", label: "Projects by Section", data: projectsBySection, colors: COLORS },
    { page: "Reporting / Appraisals", label: "Target Achievement", data: targetAchievement, colors: [C.green, C.orange] },
    { page: "Technical Reports", label: "Reports by Category", data: reportsByCategory, colors: COLORS },
    { page: "HSE", label: "Activity by Action", data: activityByAction, colors: [C.blue, C.green, C.red, C.purple] },
  ];

  const targetBarData = {};
  targets.forEach(t => { targetBarData[t.title] = Number(t.achieved) || 0; });

  const reportsByStatus = {};
  techReports.forEach(r => { reportsByStatus[r.status || "Draft"] = (reportsByStatus[r.status || "Draft"] || 0) + 1; });

  const berProjectNames = [...new Set(berTargets.map(t => t.project_name).filter(Boolean))].sort();
  const berFiltered = berSelectedProject ? berTargets.filter(t => t.project_name === berSelectedProject) : berTargets;
  const BER_MONTHS = ["apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb","mar"];
  const BER_LABELS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
  const combinedMonthly = {};
  const combinedYearly = { be: { target: 0, achieved: 0 }, re: { target: 0, achieved: 0 } };
  berFiltered.forEach(rec => {
    const pfx = rec.type === "BE" ? "be" : "re";
    BER_MONTHS.forEach((m, i) => {
      if (!combinedMonthly[i]) combinedMonthly[i] = { label: BER_LABELS[i], be_target: 0, be_achieved: 0, re_target: 0, re_achieved: 0 };
      combinedMonthly[i][pfx + "_target"] += Number(rec[m] || 0);
      combinedMonthly[i][pfx + "_achieved"] += Number(rec[m + "_ach"] || 0);
    });
    combinedYearly[pfx].target += Number(rec.total || 0);
    combinedYearly[pfx].achieved += Number(rec.total_ach || 0);
  });
  const berEntries = Object.values(combinedMonthly).filter(e => e.be_target > 0 || e.re_target > 0);

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0b3d91" }}>Dashboard</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["week", "month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid", borderColor: period === p ? C.blue : "#ddd", background: period === p ? C.blue : "#fff", color: period === p ? "#fff" : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {p === "week" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:20 }}>
        <KpiCard label="Projects" value={projects.length} color={C.blue} sub={`${ongoingProjects.length} ongoing`} onClick={()=>setDrillDown({title:"Projects",data:projects.map(p=>({Name:p.project_name||p.name,Status:p.status,Block:p.block,Section:p.section}))})} />
        <KpiCard label="Targets" value={targets.length} color={C.dark} sub={`${totalAchieved}/${totalTargetValue} done`} onClick={()=>setDrillDown({title:"Targets",data:targets.map(t=>({Title:t.title,Goal:t.target_value,Achieved:t.achieved,Section:t.section}))})} />
        <KpiCard label="Activity (30d)" value={activity?.totalUploads || 0} color={C.purple} sub={`${activity?.totalApprovals || 0} approvals`} />
        <KpiCard label="Tech Reports" value={techReports.length} color={C.teal} onClick={()=>setDrillDown({title:"Tech Reports",data:techReports.map(r=>({Title:r.title,Category:r.category,Status:r.status}))})} />
        <KpiCard label="Highlights" value={highlights.length} color={C.orange} onClick={()=>setDrillDown({title:"Highlights",data:highlights.map(h=>({Title:h.title,Description:h.description,Author:h.author}))})} />
        <KpiCard label="Users" value={users.length} color={C.green} onClick={()=>setDrillDown({title:"Users",data:users.map(u=>({Name:u.username,Role:u.role,Email:u.email}))})} />
        <KpiCard label="Notifications" value={notifs.length} color={C.red} sub={`${unreadNotifs} unread`} />
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: "#0b3d91", marginBottom: 14 }}>Page Analytics</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16, marginBottom:20 }}>
        {pageCharts.map(({ page, label, data, colors }) => (
          <div key={page} style={S.section}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{page}</span>
              <span style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>{label}</span>
            </div>
            <PieChart data={data} colors={colors} size={140} onClick={k=>setDrillDown({title:page+" — "+label+": "+k,data:[]})} />
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>Targets Achievement</div>
          <HBar data={targetBarData} color={[C.blue, C.green, C.orange, C.purple, C.teal, C.dark]} height={22} onClick={k=>setDrillDown({title:"Target: "+k,data:targets.filter(t=>t.title===k).map(t=>({Title:t.title,Goal:t.target_value,Achieved:t.achieved,Section:t.section}))})} />
        </div>
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>Tech Reports by Status</div>
          <HBar data={reportsByStatus} color={[C.green, C.blue, C.orange, C.purple]} height={22} onClick={k=>setDrillDown({title:"Status: "+k,data:techReports.filter(r=>r.status===k).map(r=>({Title:r.title,Category:r.category,Status:r.status}))})} />
        </div>
      </div>

      {/* BE & RE Targets & Achievement */}
      <div style={S.section}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>BE &amp; RE Targets &amp; Achievement</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <select style={{ padding:"8px 12px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:14, background:"#fff", minWidth:240 }} value={berSelectedProject} onChange={e => setBerSelectedProject(e.target.value)}>
            <option value="">— All Projects —</option>
            {berProjectNames.map(pn => <option key={pn} value={pn}>{pn}</option>)}
          </select>
          {berProjectNames.length === 0 && <span style={{ fontSize: 12, color: "#aaa" }}>No BE/RE data found.</span>}
        </div>
        {berEntries.length > 0 ? (() => {
          const renderChart = (type, pfx) => {
            const bc = type === "BE" ? "#1565c0" : "#c62828";
            const maxVal = Math.max(...berEntries.map(e => Math.max(Number(e[pfx+"_target"])||0, Number(e[pfx+"_achieved"])||0, 1)), 1);
            return (
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#555", marginBottom:8 }}>{type} — Monthly Target vs Achievement</div>
                <div style={{ display:"flex", gap:4, alignItems:"end", minHeight:140 }}>
                  {berEntries.map(e => {
                    const tgt = Number(e[pfx+"_target"]||0);
                    const ach = Number(e[pfx+"_achieved"]||0);
                    return (
                      <div key={e.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer" }} onClick={()=>setDrillDown({title:type+" — "+e.label,data:[{Month:e.label,"Target (SKM)":tgt,"Achieved (SKM)":ach}]})}>
                        <div style={{ display:"flex", gap:3, alignItems:"end", height:120 }}>
                          <div title={`Target: ${tgt}`} style={{ width:14, background:bc, borderRadius:"3px 3px 0 0", height:Math.max((tgt/maxVal)*110,1), transition:"height 0.3s" }} />
                          <div title={`Ach: ${ach}`} style={{ width:14, background:"#4caf50", borderRadius:"3px 3px 0 0", height:Math.max((ach/maxVal)*110,1), transition:"height 0.3s" }} />
                        </div>
                        <div style={{ fontSize:8, color:"#888", marginTop:2 }}>{e.label}</div>
                        <div style={{ fontSize:7, color:bc }}>{tgt}</div>
                        <div style={{ fontSize:7, color:"#4caf50" }}>{ach}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };
          const bt = combinedYearly.be.target, ba = combinedYearly.be.achieved;
          const rt = combinedYearly.re.target, ra = combinedYearly.re.achieved;
          return (
            <div>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:16 }}>
                {renderChart("BE", "be")}
                {renderChart("RE", "re")}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <div style={{ background:"#f8faff", borderRadius:8, padding:"12px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", textAlign:"center", flex:1, minWidth:120, cursor:"pointer" }} onClick={()=>setDrillDown({title:"BE Target",data:[{Type:"BE",Target:bt,Achieved:ba}]})}>
                  <div style={{ fontSize:22, fontWeight:700, color:"#1565c0" }}>{bt.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:"#888" }}>BE Target</div>
                </div>
                <div style={{ background:"#f8faff", borderRadius:8, padding:"12px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", textAlign:"center", flex:1, minWidth:120, cursor:"pointer" }} onClick={()=>setDrillDown({title:"BE Achieved",data:[{Type:"BE",Achieved:ba}]})}>
                  <div style={{ fontSize:22, fontWeight:700, color:"#4caf50" }}>{ba.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:"#888" }}>BE Achieved</div>
                </div>
                <div style={{ background:"#f8faff", borderRadius:8, padding:"12px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", textAlign:"center", flex:1, minWidth:120, cursor:"pointer" }} onClick={()=>setDrillDown({title:"RE Target",data:[{Type:"RE",Target:rt,Achieved:ra}]})}>
                  <div style={{ fontSize:22, fontWeight:700, color:"#c62828" }}>{rt.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:"#888" }}>RE Target</div>
                </div>
                <div style={{ background:"#f8faff", borderRadius:8, padding:"12px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", textAlign:"center", flex:1, minWidth:120, cursor:"pointer" }} onClick={()=>setDrillDown({title:"RE Achieved",data:[{Type:"RE",Achieved:ra}]})}>
                  <div style={{ fontSize:22, fontWeight:700, color:"#4caf50" }}>{ra.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:"#888" }}>RE Achieved</div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{ textAlign:"center", padding:16, color:"#aaa", fontSize:12 }}>No BE/RE data available.</div>
        )}
      </div>

      {targets.length > 0 && (
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>Targets & Accomplishment</div>
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:150, background:"#f8faff", borderRadius:8, padding:"10px 16px", textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#888", fontWeight:600 }}>Overall Target</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#c62828" }}>{totalTargetValue}</div>
            </div>
            <div style={{ flex:1, minWidth:150, background:"#f8faff", borderRadius:8, padding:"10px 16px", textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#888", fontWeight:600 }}>Achieved</div>
              <div style={{ fontSize:24, fontWeight:800, color:"#1B5E20" }}>{totalAchieved}</div>
            </div>
            <div style={{ flex:1, minWidth:150, background:"#f8faff", borderRadius:8, padding:"10px 16px", textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#888", fontWeight:600 }}>Progress</div>
              <div style={{ fontSize:24, fontWeight:800, color: parseFloat(overallPct) >= 100 ? "#1B5E20" : "#E65100" }}>{overallPct}%</div>
              <div style={{ height:6, background:"#e0e4e8", borderRadius:3, marginTop:6, overflow:"hidden" }}>
                <div style={{ width:`${Math.min(parseFloat(overallPct), 100)}%`, height:"100%", background: parseFloat(overallPct) >= 100 ? "#1B5E20" : "#E65100", borderRadius:3 }} />
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            {targets.map(t => {
              const pct = t.target_value > 0 ? ((Number(t.achieved) / Number(t.target_value)) * 100).toFixed(1) : "0";
              return (
                <div key={t.id} style={{ minWidth:180, flex:1, background:"#f9fafb", borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:2 }}>{t.title}</div>
                  {t.section && <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>{t.section}</div>}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                    <span style={{ color:"#c62828" }}>Goal: {t.target_value}</span>
                    <span style={{ color:"#1B5E20" }}>Done: {t.achieved}</span>
                  </div>
                  <div style={{ height:8, background:"#e0e4e8", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(pct, 100)}%`, height:"100%", background: parseFloat(pct) >= 100 ? "#1B5E20" : "#0b3d91", borderRadius:4 }} />
                  </div>
                  <div style={{ textAlign:"right", fontSize:12, fontWeight:700, color: parseFloat(pct) >= 100 ? "#1B5E20" : "#0b3d91", marginTop:1 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ongoingProjects.length > 0 && (
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>Ongoing Projects ({ongoingProjects.length})</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:10 }}>
            {ongoingProjects.slice(0, 6).map(p => (
              <div key={p.id} style={{ background:"#f9fafb", borderRadius:8, padding:14, border:"1px solid #e0e4e8" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{p.project_name || p.name}</div>
                {p.section && <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{p.section}</div>}
                <div style={{ display:"flex", gap:10, fontSize:12, color:"#555" }}>
                  <span>Block: {p.block || "—"}</span>
                  <span>Status: <span style={{ fontWeight:600, color: p.status === "In Progress" ? "#E65100" : "#0b3d91" }}>{p.status || "—"}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {highlights.length > 0 && (
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>Highlights</div>
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

      {activityLog.length > 0 && (
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 10 }}>Recent Activity</div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 10px", borderBottom:"2px solid #e0e0e0", color:"#666", fontWeight:600, fontSize:13 }}>Action</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", borderBottom:"2px solid #e0e0e0", color:"#666", fontWeight:600, fontSize:13 }}>Details</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", borderBottom:"2px solid #e0e0e0", color:"#666", fontWeight:600, fontSize:13 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {activityLog.slice(0, 12).map((a, i) => (
                  <tr key={a.id || i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "5px 10px" }}>
                      <span style={{ display:"inline-block", padding:"1px 8px", borderRadius:3, fontSize:12, fontWeight:600,
                        background: a.action === "upload" ? "#E3F2FD" : a.action === "approve" ? "#E8F5E9" : "#FFEBEE",
                        color: a.action === "upload" ? "#1565c0" : a.action === "approve" ? "#1B5E20" : "#C62828",
                      }}>{a.action}</span>
                    </td>
                    <td style={{ padding: "5px 10px", color:"#444", fontSize:12 }}>{a.details || "—"}</td>
                    <td style={{ padding: "5px 10px", color:"#888", fontSize:12 }}>{a.timestamp ? new Date(a.timestamp).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {drillDown && <DrillDownModal title={drillDown.title} data={drillDown.data} onClose={() => setDrillDown(null)} />}
    </div>
  );
}
