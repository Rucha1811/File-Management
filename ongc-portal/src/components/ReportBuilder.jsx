import { useState, useEffect } from "react";
import { api } from "../api";

const S = {
  page: { padding: "16px 20px", maxWidth:"none", margin:0 },
  title: { fontSize:20, fontWeight:700, color:"#0b3d91", marginBottom:16 },
  card: { background:"#fff", borderRadius:10, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  section: { background:"#fff", borderRadius:10, padding:20, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  sectionTitle: { fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, borderBottom:"2px solid #e0e4e8", paddingBottom:6 },
  input: { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", marginBottom:8, boxSizing:"border-box" },
  textarea: { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", marginBottom:8, minHeight:60, fontFamily:"inherit", boxSizing:"border-box" },
  select: { padding:"8px 12px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", background:"#fff", marginBottom:8 },
  btn: (bg="#0b3d91") => ({ padding:"6px 14px", border:"none", borderRadius:4, background:bg, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }),
  btnSm: (bg="#0b3d91") => ({ padding:"4px 10px", border:"none", borderRadius:3, background:bg, color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }),
  tag: { display:"inline-block", padding:"2px 10px", borderRadius:12, fontSize:12, fontWeight:600, background:"#e8edf2", color:"#0b3d91", marginRight:4, marginBottom:4 },
};

const FIELD_TYPES = ["text","textarea","number","date","select"];

const SEED_TEMPLATES = [
  {
    name:"Weekly Operations Report", period_type:"weekly",
    description:"Standard weekly report for field operations, drilling progress, equipment, HSE, and issues.",
    sections:[
      { key:"ops_update", title:"Operations Update", fields:[
        { key:"location", label:"Location / Rig", type:"text", required:true },
        { key:"activity", label:"Current Activity", type:"text", required:true },
        { key:"progress", label:"Progress (%)", type:"number", required:true },
        { key:"planned", label:"Next Week Plan", type:"textarea" },
      ]},
      { key:"drilling", title:"Drilling Progress", fields:[
        { key:"well_name", label:"Well Name", type:"text" },
        { key:"depth", label:"Current Depth (m)", type:"number" },
        { key:"target_depth", label:"Target Depth (m)", type:"number" },
        { key:"remarks", label:"Remarks", type:"textarea" },
      ]},
      { key:"equipment", title:"Equipment Status", fields:[
        { key:"equip_name", label:"Equipment", type:"text" },
        { key:"status", label:"Status", type:"select" },
        { key:"downtime", label:"Downtime (hrs)", type:"number" },
      ]},
      { key:"hse", title:"HSE Report", fields:[
        { key:"incidents", label:"Incidents (if any)", type:"textarea" },
        { key:"safety_observations", label:"Safety Observations", type:"textarea" },
        { key:"manhours", label:"Man-hours (LTI-free)", type:"number" },
      ]},
      { key:"issues", title:"Issues & Resolutions", fields:[
        { key:"issues_list", label:"Issues Identified", type:"textarea" },
        { key:"resolution", label:"Resolution / Action Taken", type:"textarea" },
        { key:"escalation", label:"Escalation Needed?", type:"text" },
      ]},
    ],
  },
  {
    name:"Monthly Progress Report", period_type:"monthly",
    description:"Comprehensive monthly progress report covering projects, targets, manpower, budget, and challenges.",
    sections:[
      { key:"exec_summary", title:"Executive Summary", fields:[
        { key:"highlights", label:"Key Highlights", type:"textarea", required:true },
        { key:"overall_status", label:"Overall Status", type:"select", required:true },
        { key:"summary", label:"Brief Summary", type:"textarea", required:true },
      ]},
      { key:"project_progress", title:"Project Progress", fields:[
        { key:"projects_completed", label:"Projects Completed", type:"number" },
        { key:"projects_ongoing", label:"Projects Ongoing", type:"number" },
        { key:"projects_planned", label:"Projects Planned", type:"number" },
        { key:"details", label:"Project-wise Details", type:"textarea" },
      ]},
      { key:"targets", title:"Targets vs Achievement", fields:[
        { key:"target_volume", label:"Target Volume (SKM)", type:"number" },
        { key:"achieved_volume", label:"Achieved Volume (SKM)", type:"number" },
        { key:"pct_achievement", label:"Achievement (%)", type:"number" },
        { key:"deviation", label:"Reasons for Deviation", type:"textarea" },
      ]},
      { key:"manpower", title:"Manpower Status", fields:[
        { key:"total_staff", label:"Total Staff", type:"number" },
        { key:"field_staff", label:"Field Staff", type:"number" },
        { key:"office_staff", label:"Office Staff", type:"number" },
        { key:"vacancies", label:"Vacancies", type:"number" },
      ]},
      { key:"budget", title:"Budget Utilization", fields:[
        { key:"allocated", label:"Budget Allocated (₹)", type:"number" },
        { key:"utilized", label:"Budget Utilized (₹)", type:"number" },
        { key:"remaining", label:"Remaining (₹)", type:"number" },
        { key:"notes", label:"Notes", type:"textarea" },
      ]},
      { key:"challenges", title:"Challenges & Recommendations", fields:[
        { key:"challenges", label:"Challenges Faced", type:"textarea" },
        { key:"recommendations", label:"Recommendations", type:"textarea" },
      ]},
    ],
  },
  {
    name:"Quarterly Performance Review", period_type:"quarterly",
    description:"Quarterly review covering overall performance, KPI achievements, technical milestones, financial review, and roadmap.",
    sections:[
      { key:"overview", title:"Quarter Overview", fields:[
        { key:"quarter", label:"Quarter", type:"text", required:true },
        { key:"major_achievements", label:"Major Achievements", type:"textarea", required:true },
        { key:"key_metrics", label:"Key Metrics Summary", type:"textarea" },
      ]},
      { key:"kpi", title:"KPI Summary", fields:[
        { key:"kpi_1", label:"KPI 1 — Name & Value", type:"text" },
        { key:"kpi_2", label:"KPI 2 — Name & Value", type:"text" },
        { key:"kpi_3", label:"KPI 3 — Name & Value", type:"text" },
        { key:"overall_kpi", label:"Overall KPI Achievement (%)", type:"number" },
      ]},
      { key:"technical", title:"Technical Achievements", fields:[
        { key:"new_tech", label:"New Technology/Process Adopted", type:"textarea" },
        { key:"innovation", label:"Innovations", type:"textarea" },
        { key:"publications", label:"Papers / Publications", type:"textarea" },
      ]},
      { key:"financial", title:"Financial Review", fields:[
        { key:"budget_allocated", label:"Budget Allocated (₹ Cr)", type:"number" },
        { key:"expenditure", label:"Expenditure (₹ Cr)", type:"number" },
        { key:"savings", label:"Savings / Overrun", type:"text" },
      ]},
      { key:"team", title:"Team Performance", fields:[
        { key:"headcount", label:"Team Headcount", type:"number" },
        { key:"training", label:"Training / Certifications Completed", type:"textarea" },
        { key:"attrition", label:"Attrition / New Joiners", type:"textarea" },
      ]},
      { key:"road_ahead", title:"Road Ahead", fields:[
        { key:"next_q_plan", label:"Next Quarter Plan", type:"textarea" },
        { key:"strategic", label:"Strategic Initiatives", type:"textarea" },
        { key:"risks", label:"Risks & Mitigation", type:"textarea" },
      ]},
    ],
  },
];

function SectionEditor({ section, onChange }) {
  const upd = (key, val) => onChange({ ...section, [key]: val });
  const addField = () => upd("fields", [...(section.fields||[]), { key:"", label:"", type:"text", required:false, options:"" }]);
  const updField = (i, f) => {
    const fs = [...(section.fields||[])]; fs[i] = f; upd("fields", fs);
  };
  const delField = (i) => {
    const fs = (section.fields||[]).filter((_, idx) => idx !== i);
    upd("fields", fs);
  };
  return (
    <div style={{ background:"#f8faff", borderRadius:8, padding:16, marginBottom:12, border:"1px solid #d0d8e8" }}>
      <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
        <input style={{ ...S.input, marginBottom:0, flex:1 }} placeholder="Section title (e.g. Operations Update)" value={section.title||""} onChange={e => upd("title", e.target.value)} />
        <input style={{ ...S.input, marginBottom:0, width:180 }} placeholder="Key (e.g. operations)" value={section.key||""} onChange={e => upd("key", e.target.value)} />
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:"#555", marginBottom:6 }}>Fields:</div>
      {(section.fields||[]).map((f, i) => (
        <div key={i} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
          <input style={{ ...S.input, marginBottom:0, width:110 }} placeholder="Key" value={f.key} onChange={e => updField(i, {...f, key:e.target.value})} />
          <input style={{ ...S.input, marginBottom:0, width:140 }} placeholder="Label" value={f.label} onChange={e => updField(i, {...f, label:e.target.value})} />
          <select style={{ ...S.select, marginBottom:0 }} value={f.type} onChange={e => updField(i, {...f, type:e.target.value})}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {f.type === "select" && (
            <input style={{ ...S.input, marginBottom:0, width:160 }} placeholder="Options (comma-separated)" value={f.options||""} onChange={e => updField(i, {...f, options:e.target.value})} />
          )}
          <label style={{ fontSize:12, color:"#666", display:"flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
            <input type="checkbox" checked={!!f.required} onChange={e => updField(i, {...f, required:e.target.checked})} /> Required
          </label>
          <button style={{ ...S.btnSm("#c62828") }} onClick={() => delField(i)}>X</button>
        </div>
      ))}
      <button style={{ ...S.btnSm("#0b3d91") }} onClick={addField}>+ Add Field</button>
    </div>
  );
}

export default function ReportBuilder({ user, onToast, defaultTab }) {
  const [templates, setTemplates] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role-based tab access
  const canEdit = user?.role === "admin" || user?.role === "ops_manager";
  const isMyReports = defaultTab === "fill"; // opened from "My Reports / Forms" menu

  // Determine which tabs are allowed for this user
  const allowedTabs = canEdit
    ? ["templates","periods","fill","fill-status","view"]
    : ["fill","view"];

  const [tab, setTab] = useState(defaultTab || (canEdit ? "templates" : "fill"));

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tf, setTf] = useState({ name:"", description:"", period_type:"monthly", sections:[], assigned_roles:[], section:null, area:null });
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [pf, setPf] = useState({ label:"", start_date:"", end_date:"" });

  const [viewPeriod, setViewPeriod] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({});
  const [exporting, setExporting] = useState(false);

  const [assignPeriod, setAssignPeriod] = useState(null);
  const [assignments, setAssignments] = useState({});

  const [seedMsg, setSeedMsg] = useState(null);
  const [fillStatus, setFillStatus] = useState(null);
  const [viewUserSub, setViewUserSub] = useState(null);
  const [myPeriodsFilter, setMyPeriodsFilter] = useState(false);
  const [fillStatusSearch, setFillStatusSearch] = useState("");
  const [viewMode, setViewMode] = useState("summary");
  const [validationErrors, setValidationErrors] = useState({});

  const [myReportsPeriod, setMyReportsPeriod] = useState(null);
  const [myReportsStep, setMyReportsStep] = useState(0);
  const [myReportsForm, setMyReportsForm] = useState({});
  const [myReportsSectionErrors, setMyReportsSectionErrors] = useState({});
  const [myReportsSaving, setMyReportsSaving] = useState(false);

  // (canEdit already declared above)
  const rbToast = (msg, type) => { if (onToast) onToast(msg, type); else alert(msg); };

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, u, s] = await Promise.all([
        api.listReportTemplates(),
        api.listReportPeriods(),
        api.listUsers(),
        api.listReportSubmissions(),
      ]);
      setTemplates(t||[]);
      setPeriods(p||[]);
      setUsers(u||[]);
      setSubmissions(s||[]);
    } catch(e) {
      setTemplates([]); setPeriods([]); setUsers([]); setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSeedTemplates = async () => {
    let count = 0;
    for (const seed of SEED_TEMPLATES) {
      try {
        await api.createReportTemplate(seed.name, seed.description, seed.period_type, seed.sections, seed.assigned_roles || []);
        count++;
      } catch(e) { /* skip duplicates */ }
    }
    setSeedMsg(`${count} template${count!==1?"s":""} added`);
    setTimeout(() => setSeedMsg(null), 3000);
    load();
  };

  const handleSeedDemoData = async () => {
    try {
      const res = await api.seedReportDemoData();
      rbToast(res.msg || "Demo data seeded!", "success");
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const availableUsers = users.filter(u => u.is_active !== false && u.cpf);
  const allSections = [...new Set(users.map(u => u.section).filter(Boolean))].sort();
  const allAreas = [...new Set(users.map(u => u.area).filter(Boolean))].sort();

  const handleCreateTemplate = async () => {
    if (!tf.name || !tf.sections.length) { rbToast("Name and at least one section required", "error"); return; }
    try {
      if (editingTemplate) {
        await api.updateReportTemplate(editingTemplate.id, {
          name: tf.name,
          description: tf.description,
          period_type: tf.period_type,
          sections: JSON.stringify(tf.sections),
          assigned_roles: JSON.stringify(tf.assigned_roles),
          section: tf.section,
          area: tf.area,
        });
        rbToast("Template updated", "success");
      } else {
        await api.createReportTemplate(tf.name, tf.description, tf.period_type, tf.sections, tf.assigned_roles, tf.section, tf.area);
        rbToast("Template created", "success");
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTf({ name:"", description:"", period_type:"monthly", sections:[], assigned_roles:[], section:null, area:null });
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm("Delete this template? All related periods and submissions will also be deleted.")) return;
    try {
      await api.deleteReportTemplate(id);
      rbToast("Template deleted", "success");
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleCreatePeriod = async () => {
    if (!pf.label || !selectedTemplate) { rbToast("Period label required", "error"); return; }
    try {
      await api.createReportPeriod(selectedTemplate, pf.label, pf.start_date||null, pf.end_date||null);
      rbToast("Period created", "success");
      setShowPeriodForm(false);
      setPf({ label:"", start_date:"", end_date:"" });
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleClosePeriod = async (id) => {
    if (!confirm("Close this period? Submissions will be locked.")) return;
    try {
      await api.closeReportPeriod(id);
      rbToast("Period closed", "success");
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleExport = async (periodId, format) => {
    setExporting(true);
    try {
      await api.exportReport(periodId, format);
      rbToast(`Report exported as ${format.toUpperCase()}`, "success");
    } catch(e) { rbToast(e.message, "error"); }
    finally { setExporting(false); }
  };

  const openAssign = async (period) => {
    setAssignPeriod(period);
    try {
      const a = await api.getPeriodAssignments(period.id);
      setAssignments(a || {});
    } catch { setAssignments({}); }
  };

  const handleSaveAssignments = async () => {
    if (!assignPeriod) return;
    try {
      await api.updatePeriodAssignments(assignPeriod.id, assignments);
      rbToast("Assignments saved", "success");
      setAssignPeriod(null);
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const openSectionForm = (periodId, section, sub, currentAssignments) => {
    setViewPeriod(periodId);
    setActiveSection(section);
    const existing = sub ? sub.field_values : {};
    const defaults = {};
    (section.fields||[]).forEach(f => { defaults[f.key] = existing[f.key] || ""; });
    setSectionForm(defaults);
  };

  const handleSaveSection = async (status) => {
    if (!viewPeriod || !activeSection) return;
    try {
      await api.saveReportSubmission(
        viewPeriod,
        activeSection.key,
        user.id,
        sectionForm,
        status
      );
      rbToast(`Section ${status === "submitted" ? "submitted" : "saved as draft"}`, "success");
      setActiveSection(null);
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const templateSections = (t) => {
    if (!t) return [];
    if (Array.isArray(t.sections)) return t.sections;
    try { return JSON.parse(t.sections); } catch { return []; }
  };

  const isPeriodAssigned = (p) => {
    const t = templates.find(tm => tm.id === p.template_id);
    if (!t) return false;
    const roles = t.assigned_roles || [];
    const matchesCpf = roles.length === 0 || roles.includes(user.cpf);
    const matchesSection = !t.section || user.section === t.section;
    const matchesArea = !t.area || user.area === t.area;
    return matchesCpf && matchesSection && matchesArea;
  };

  const getSubmission = (periodId, sectionKey) => {
    return submissions.find(s => s.period_id === periodId && s.section_key === sectionKey);
  };

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#999", fontSize:14 }}>Loading…</div>;

  return (
    <div style={S.page}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={S.title}>{isMyReports ? "My Reports & Forms" : "Report Builder"}</div>
          {isMyReports && (
            <div style={{ fontSize:12, color:"#666", marginTop:2 }}>
              Fill and submit reports assigned to you — step-by-step, like Google Forms
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {allowedTabs.map(t => {
            // Count pending forms for data_creator/viewer — show badge
            const pendingCount = (t === "fill" || t === "my-reports")
              ? periods.filter(p => p.is_open && isPeriodAssigned(p)).filter(p => {
                  const sub = submissions.find(s => s.period_id === p.id && s.user_id === user.id && s.status === "submitted");
                  return !sub;
                }).length
              : 0;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"5px 12px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:12, position:"relative",
                  background: tab===t ? "#0b3d91" : "#e0e0e0", color: tab===t ? "#fff" : "#333" }}>
                {t === "my-reports" ? "My Reports" : t === "templates" ? "Templates" : t === "periods" ? "Periods" : t === "fill" ? (isMyReports ? "📋 Fill My Forms" : "Fill Report") : t === "fill-status" ? "Fill Status" : "View Report"}
                {pendingCount > 0 && (
                  <span style={{ position:"absolute", top:-6, right:-6, background:"#c62828", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: My Reports (Google Forms fill interface) ── */}
      {tab === "my-reports" && (
        <div>
          {!myReportsPeriod ? (
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#333", marginBottom:16 }}>
                My Assigned Reports
              </div>
              <div style={{ fontSize:12, color:"#888", marginBottom:16 }}>
                Reports assigned to you based on your CPF ({user.cpf}). Fill them step by step like Google Forms.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
                {periods.filter(p => {
                  if (!p.is_open) return false;
                  const t = templates.find(tm => tm.id === p.template_id);
                  if (!t) return false;
                  const roles = t.assigned_roles || [];
                  return roles.length === 0 || roles.includes(user.cpf);
                }).map(p => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  if (!t) return null;
                  const secs = templateSections(t);
                  const sub = submissions.find(s => s.period_id === p.id && s.section_key === "__full__" && s.user_id === user.id);
                  const allFields = secs.reduce((a, sec) => a + (sec.fields||[]).length, 0);
                  const filledFields = sub?.field_values ? secs.reduce((a, sec) => a + (sec.fields||[]).filter(f => (sub.field_values[f.key]||"").trim()).length, 0) : 0;
                  const progress = allFields > 0 ? Math.round((filledFields / allFields) * 100) : 0;
                  return (
                    <div key={p.id} style={{ ...S.card, cursor:"pointer", transition:"box-shadow 0.2s", borderLeft: sub?.status === "submitted" ? "4px solid #2E7D32" : sub?.status === "draft" ? "4px solid #E65100" : "4px solid #e0e0e0" }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)"}
                      onClick={() => {
                        setMyReportsPeriod(p.id);
                        setMyReportsStep(0);
                        const defaults = {};
                        secs.forEach(sec => (sec.fields||[]).forEach(f => { defaults[f.key] = (sub?.field_values||{})[f.key] || ""; }));
                        setMyReportsForm(defaults);
                        setMyReportsSectionErrors({});
                      }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{t.name}</div>
                          <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{p.label}</div>
                          <div style={{ fontSize:11, color:"#666" }}>{secs.length} sections | {allFields} fields</div>
                        </div>
                        <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:600, flexShrink:0,
                          background: sub?.status === "submitted" ? "#E8F5E9" : sub?.status === "draft" ? "#FFF3E0" : "#F1F3F4",
                          color: sub?.status === "submitted" ? "#1B5E20" : sub?.status === "draft" ? "#E65100" : "#5F6368" }}>
                          {sub?.status === "submitted" ? "Submitted" : sub?.status === "draft" ? "Draft" : "Not Started"}
                        </span>
                      </div>
                      <div style={{ marginTop:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#5f6368", marginBottom:4 }}>
                          <span>Completion</span>
                          <span>{progress}%</span>
                        </div>
                        <div style={{ height:6, background:"#e8eaed", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${progress}%`, background: sub?.status === "submitted" ? "#2E7D32" : "#1a73e8", borderRadius:3, transition:"width 0.3s ease" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {periods.filter(p => p.is_open && (() => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  if (!t) return false;
                  const roles = t.assigned_roles || [];
                  return roles.length === 0 || roles.includes(user.cpf);
                })).length === 0 && (
                  <div style={{ gridColumn:"1 / -1", color:"#999", fontSize:13, padding:40, textAlign:"center" }}>
                    No open reports assigned to you at this time.
                  </div>
                )}
              </div>
            </div>
          ) : (() => {
            const p = periods.find(pr => pr.id === myReportsPeriod);
            const t = templates.find(tm => tm.id === p?.template_id);
            const secs = t ? templateSections(t) : [];
            if (!p || !t) return null;
            const currentSec = secs[myReportsStep];
            const totalFields = secs.reduce((a, sec) => a + (sec.fields||[]).length, 0);
            const filledFields = secs.reduce((a, sec) => a + (sec.fields||[]).filter(f => (myReportsForm[f.key]||"").trim()).length, 0);
            const overallProgress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
            const sub = submissions.find(s => s.period_id === p.id && s.section_key === "__full__" && s.user_id === user.id);

            const validateSection = (sec) => {
              const errors = {};
              (sec.fields||[]).forEach(f => {
                if (f.required && !(myReportsForm[f.key]||"").trim()) errors[f.key] = true;
              });
              setMyReportsSectionErrors(errors);
              return Object.keys(errors).length === 0;
            };

            const handleStepNext = () => {
              if (currentSec && !validateSection(currentSec)) {
                rbToast("Please fill all required fields in this section", "error");
                return;
              }
              if (myReportsStep < secs.length - 1) setMyReportsStep(myReportsStep + 1);
            };

            const handleStepPrev = () => {
              if (myReportsStep > 0) setMyReportsStep(myReportsStep - 1);
            };

            const handleMyReportsSave = async (status) => {
              if (status === "submitted") {
                let allErrors = {};
                secs.forEach(sec => (sec.fields||[]).forEach(f => {
                  if (f.required && !(myReportsForm[f.key]||"").trim()) allErrors[f.key] = true;
                }));
                setMyReportsSectionErrors(allErrors);
                if (Object.keys(allErrors).length > 0) {
                  rbToast("Please fill all required fields before submitting", "error");
                  const firstErrorSec = secs.findIndex(sec => (sec.fields||[]).some(f => f.required && !(myReportsForm[f.key]||"").trim()));
                  if (firstErrorSec >= 0) setMyReportsStep(firstErrorSec);
                  return;
                }
              }
              setMyReportsSaving(true);
              try {
                await api.saveReportSubmission(p.id, myReportsForm, status);
                rbToast(status === "submitted" ? "Report submitted successfully!" : "Draft saved", "success");
                load();
                if (status === "submitted") setMyReportsPeriod(null);
              } catch(e) { rbToast(e.message, "error"); }
              finally { setMyReportsSaving(false); }
            };

            return (
              <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 0" }}>
                {/* Back Link */}
                <div style={{ marginBottom:16 }}>
                  <button onClick={() => { setMyReportsPeriod(null); setMyReportsStep(0); }}
                    style={{ background:"none", border:"none", color:"#0b3d91", fontWeight:600, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:4 }}>
                    ← Back to My Reports
                  </button>
                </div>

                {/* Progress Card */}
                <div style={{ background:"#fff", borderRadius:12, padding:18, marginBottom:16,
                  boxShadow:"0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)", borderTop:"6px solid #1565c0" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5f6368", marginBottom:6, fontWeight:500 }}>
                    <span>Form Completion Progress</span>
                    <span>{filledFields} of {totalFields} fields completed ({overallProgress}%)</span>
                  </div>
                  <div style={{ height:8, background:"#e8eaed", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${overallProgress}%`, background:"#1a73e8", borderRadius:4, transition:"width 0.3s ease" }} />
                  </div>
                  <div style={{ display:"flex", gap:4, marginTop:8, fontSize:11, color:"#5f6368" }}>
                    <span>Section {myReportsStep + 1} of {secs.length}:</span>
                    <span style={{ fontWeight:600, color:"#202124" }}>{currentSec?.title || currentSec?.key || "—"}</span>
                  </div>
                </div>

                {/* Header Card (Google Forms style) */}
                <div style={{ background:"#fff", borderRadius:12, overflow:"hidden", marginBottom:16,
                  boxShadow:"0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)", borderTop:"10px solid #0b3d91" }}>
                  <div style={{ padding:"22px 24px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                      <h1 style={{ fontSize:24, fontWeight:400, color:"#202124", margin:0 }}>{t.name}</h1>
                      <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:16, fontSize:12, fontWeight:600,
                        background: sub?.status === "submitted" ? "#E8F5E9" : sub?.status === "draft" ? "#FFF3E0" : "#F1F3F4",
                        color: sub?.status === "submitted" ? "#1B5E20" : sub?.status === "draft" ? "#E65100" : "#5F6368" }}>
                        {sub?.status === "submitted" ? "Submitted" : sub?.status === "draft" ? "Draft" : "Not Started"}
                      </span>
                    </div>
                    <div style={{ fontSize:14, color:"#5f6368", marginTop:8, lineHeight:1.5 }}>
                      {t.description || `Submit report data for period: ${p.label}`}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:14, borderTop:"1px solid #f1f3f4", paddingTop:14 }}>
                      <span style={{ fontSize:11, background:"#f1f3f4", padding:"4px 10px", borderRadius:12, color:"#3c4043", fontWeight:500 }}>
                        Period: {p.label}
                      </span>
                      <span style={{ fontSize:11, background:"#f1f3f4", padding:"4px 10px", borderRadius:12, color:"#3c4043", fontWeight:500 }}>
                        Submitter: {user.name} ({user.cpf})
                      </span>
                    </div>
                    {(secs[myReportsStep]?.fields||[]).some(f => f.required) && (
                      <div style={{ fontSize:12, color:"#d93025", marginTop:12, fontWeight:500 }}>
                        * Indicates required question
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Dots */}
                <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                  {secs.map((sec, i) => (
                    <button key={i} onClick={() => {
                      if (i < myReportsStep) setMyReportsStep(i);
                      else if (i === myReportsStep) {}
                      else { if (validateSection(currentSec)) setMyReportsStep(i); }
                    }}
                      style={{ width:32, height:32, borderRadius:"50%", border:"none", cursor:"pointer",
                        fontWeight:700, fontSize:12, transition:"all 0.2s",
                        background: i === myReportsStep ? "#1a73e8" : i < myReportsStep ? "#2E7D32" : "#e8eaed",
                        color: i === myReportsStep || i < myReportsStep ? "#fff" : "#5f6368",
                        boxShadow: i === myReportsStep ? "0 2px 6px rgba(26,115,232,0.4)" : "none" }}>
                      {i < myReportsStep ? "✓" : i + 1}
                    </button>
                  ))}
                </div>

                {/* Current Section Card */}
                {currentSec && (
                  <div style={{ background:"#fff", borderRadius:12, padding:"24px", marginBottom:16,
                    boxShadow:"0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)", borderLeft:"6px solid #1a73e8",
                    animation:"fadeIn 0.3s ease" }}>
                    <h2 style={{ fontSize:18, fontWeight:500, color:"#202124", margin:"0 0 16px 0", borderBottom:"1px solid #f1f3f4", paddingBottom:10 }}>
                      {currentSec.title || currentSec.key}
                    </h2>
                    {(currentSec.fields||[]).map(f => {
                      const isRequired = !!f.required;
                      const hasError = !!myReportsSectionErrors[f.key];
                      const parsedOptions = f.options ? f.options.split(",").map(o => o.trim()).filter(Boolean) : [
                        "Operational", "Under Maintenance", "Not Available", "Completed", "In Progress", "On Track", "At Risk", "Delayed"
                      ];
                      const fieldInputStyle = {
                        width:"100%", padding:"12px", border:`1px solid ${hasError ? "#d93025" : "#dadce0"}`,
                        borderRadius:6, fontSize:14, outline:"none", boxSizing:"border-box",
                        transition:"border-color 0.2s, box-shadow 0.2s"
                      };
                      return (
                        <div key={f.key} style={{ marginBottom:20 }}>
                          <label style={{ fontSize:14, fontWeight:500, color:"#202124", display:"block", marginBottom:8 }}>
                            {f.label||f.key} {isRequired && <span style={{ color:"#d93025" }}>*</span>}
                          </label>
                          {f.type === "textarea" ? (
                            <textarea style={{ ...fieldInputStyle, minHeight:80, fontFamily:"inherit" }}
                              value={myReportsForm[f.key]||""}
                              onChange={e => { setMyReportsForm(p=> ({...p, [f.key]: e.target.value})); setMyReportsSectionErrors(p=>({...p, [f.key]:false})); }}
                              placeholder="Your answer" />
                          ) : f.type === "number" ? (
                            <input type="number" style={fieldInputStyle}
                              value={myReportsForm[f.key]||""}
                              onChange={e => { setMyReportsForm(p=> ({...p, [f.key]: e.target.value})); setMyReportsSectionErrors(p=>({...p, [f.key]:false})); }}
                              placeholder="Your answer (number)" />
                          ) : f.type === "date" ? (
                            <input type="date" style={fieldInputStyle}
                              value={myReportsForm[f.key]||""}
                              onChange={e => { setMyReportsForm(p=> ({...p, [f.key]: e.target.value})); setMyReportsSectionErrors(p=>({...p, [f.key]:false})); }} />
                          ) : f.type === "select" ? (
                            <select style={{ ...fieldInputStyle, background:"#fff" }}
                              value={myReportsForm[f.key]||""}
                              onChange={e => { setMyReportsForm(p=> ({...p, [f.key]: e.target.value})); setMyReportsSectionErrors(p=>({...p, [f.key]:false})); }}>
                              <option value="">Choose</option>
                              {parsedOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input type="text" style={fieldInputStyle}
                              value={myReportsForm[f.key]||""}
                              onChange={e => { setMyReportsForm(p=> ({...p, [f.key]: e.target.value})); setMyReportsSectionErrors(p=>({...p, [f.key]:false})); }}
                              placeholder="Your answer" />
                          )}
                          {hasError && (
                            <div style={{ color:"#d93025", fontSize:12, marginTop:6, display:"flex", alignItems:"center", gap:4 }}>
                              This is a required question
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Navigation & Actions */}
                <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
                  display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                  <div style={{ display:"flex", gap:8 }}>
                    {myReportsStep > 0 && (
                      <button onClick={handleStepPrev}
                        style={{ padding:"10px 20px", border:"1px solid #dadce0", borderRadius:6, background:"#fff",
                          color:"#3c4043", cursor:"pointer", fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:4 }}>
                        ← Previous
                      </button>
                    )}
                    {myReportsStep < secs.length - 1 && (
                      <button onClick={handleStepNext}
                        style={{ padding:"10px 24px", border:"none", borderRadius:6, background:"#1a73e8",
                          color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14,
                          boxShadow:"0 1px 2px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", gap:4 }}>
                        Next →
                      </button>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => handleMyReportsSave("draft")} disabled={myReportsSaving}
                      style={{ padding:"10px 20px", border:"none", borderRadius:6, background:"#f1f3f4",
                        color:"#1a73e8", cursor:"pointer", fontWeight:600, fontSize:14, opacity: myReportsSaving ? 0.6 : 1 }}>
                      {myReportsSaving ? "Saving..." : "Save Draft"}
                    </button>
                    <button onClick={() => handleMyReportsSave("submitted")} disabled={myReportsSaving}
                      style={{ padding:"10px 24px", border:"none", borderRadius:6, background:"#0b3d91",
                        color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14,
                        boxShadow:"0 1px 2px rgba(0,0,0,0.15)", opacity: myReportsSaving ? 0.6 : 1 }}>
                      {myReportsSaving ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Templates ── */}
      {tab === "templates" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#333" }}>{templates.length} Template{templates.length!==1?"s":""}</div>
            <div style={{ display:"flex", gap:6 }}>
              {templates.length === 0 && <button style={S.btn("#2E7D32")} onClick={handleSeedTemplates}>+ Add Sample Templates</button>}
              {canEdit && <button style={S.btn()} onClick={() => { setShowTemplateForm(true); setEditingTemplate(null); setTf({ name:"", description:"", period_type:"monthly", sections:[], assigned_roles:[], section:null, area:null }); }}>+ New Template</button>}
            </div>
          </div>
          {seedMsg && <div style={{ padding:"8px 14px", background:"#E8F5E9", borderRadius:6, color:"#1B5E20", fontSize:13, fontWeight:600, marginBottom:12 }}>{seedMsg}</div>}

          {showTemplateForm && (
            <div style={S.section}>
              <div style={S.sectionTitle}>{editingTemplate ? "Edit Template" : "New Report Template"}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <input style={{ ...S.input, marginBottom:0, flex:1, minWidth:200 }} placeholder="Template name (e.g. Weekly Operations Report)" value={tf.name} onChange={e => setTf(p=>({...p,name:e.target.value}))} />
                <select style={{ ...S.select, marginBottom:0 }} value={tf.period_type} onChange={e => setTf(p=>({...p,period_type:e.target.value}))}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:4 }}>Assign to Users (by CPF):</div>
                <div style={{ maxHeight:160, overflowY:"auto", display:"flex", flexWrap:"wrap", gap:4, padding:"6px 8px", background:"#f8faff", borderRadius:8, border:"1px solid #d0d8e8" }}>
                  {availableUsers.length === 0 && <span style={{ fontSize:11, color:"#999" }}>No users available</span>}
                  {availableUsers.map(u => (
                    <label key={u.cpf} style={{ fontSize:11, display:"flex", alignItems:"center", gap:3, cursor:"pointer", whiteSpace:"nowrap" }}>
                      <input type="checkbox" checked={tf.assigned_roles.includes(u.cpf)} onChange={e => {
                        setTf(p => ({...p, assigned_roles: e.target.checked ? [...p.assigned_roles, u.cpf] : p.assigned_roles.filter(x => x !== u.cpf) }));
                      }} /> {u.name} <span style={{ color:"#999", fontFamily:"monospace", fontSize:10 }}>({u.cpf})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <select style={{ ...S.select, marginBottom:0, flex:1 }} value={tf.section||""} onChange={e => setTf(p=>({...p, section: e.target.value||null}))}>
                  <option value="">All Sections</option>
                  {allSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select style={{ ...S.select, marginBottom:0, flex:1 }} value={tf.area||""} onChange={e => setTf(p=>({...p, area: e.target.value||null}))}>
                  <option value="">All Areas</option>
                  {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <textarea style={S.textarea} placeholder="Description (optional)" value={tf.description} onChange={e => setTf(p=>({...p,description:e.target.value}))} />

              <div style={{ fontSize:14, fontWeight:600, color:"#333", marginBottom:8 }}>Sections:</div>
              {tf.sections.map((sec, i) => (
                <SectionEditor key={i} section={sec} onChange={(updated) => {
                  const s = [...tf.sections]; s[i] = updated; setTf(p=>({...p, sections:s}));
                }} />
              ))}
              <button style={S.btn("#2E7D32")} onClick={() => setTf(p=>({...p, sections:[...p.sections, { key:"", title:"", fields:[] }]}))}>+ Add Section</button>
              <div style={{ marginTop:12, display:"flex", gap:8 }}>
                <button style={S.btn()} onClick={handleCreateTemplate}>{editingTemplate ? "Update Template" : "Create Template"}</button>
                <button style={S.btn("#888")} onClick={() => { setShowTemplateForm(false); setEditingTemplate(null); setTf({ name:"", description:"", period_type:"monthly", sections:[], assigned_roles:[], section:null, area:null }); }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
            {templates.map(t => {
              const secs = templateSections(t);
              const templatePeriods = periods.filter(p => p.template_id === t.id);
              return (
                <div key={t.id} style={S.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91" }}>{t.name}</div>
                      <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{t.period_type} | {templatePeriods.length} period{templatePeriods.length!==1?"s":""}</div>
                    </div>
                    {canEdit && <button style={S.btnSm("#0b3d91")} onClick={() => { setEditingTemplate(t); setTf({ name:t.name, description:t.description||"", period_type:t.period_type, sections:templateSections(t), assigned_roles:t.assigned_roles||[], section:t.section||null, area:t.area||null }); setShowTemplateForm(true); }}>Edit</button>}
                    {canEdit && <button style={S.btnSm("#c62828")} onClick={() => handleDeleteTemplate(t.id)}>Del</button>}
                  </div>
                  {t.description && <div style={{ fontSize:12, color:"#666", marginBottom:8 }}>{t.description}</div>}
                  {t.assigned_roles && t.assigned_roles.length > 0 && (
                    <div style={{ fontSize:11, color:"#555", marginBottom:4 }}>Assigned: {t.assigned_roles.slice(0, 5).map(c => { const u = users.find(us => us.cpf === c); return u ? `${u.name} (${c})` : c; }).join(", ")}{t.assigned_roles.length > 5 ? ` +${t.assigned_roles.length - 5} more` : ""}</div>
                  )}
                  {t.section && <div style={{ fontSize:11, color:"#555", marginBottom:2 }}>Section: {t.section}{t.area ? ` | Area: ${t.area}` : ""}</div>}
                  <div style={{ fontSize:12, color:"#555", marginBottom:4 }}>Sections ({secs.length}):</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {secs.map((sec, i) => (
                      <span key={i} style={S.tag}>{sec.title || sec.key || `Section ${i+1}`}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {templates.length === 0 && <div style={{ color:"#999", fontSize:13, padding:20, textAlign:"center" }}>No templates yet. Click "Add Sample Templates" to get started instantly or create one manually.</div>}
          </div>
        </div>
      )}

      {/* ── Tab: Periods ── */}
      {tab === "periods" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
            <select style={S.select} value={selectedTemplate||""} onChange={e => setSelectedTemplate(Number(e.target.value)||null)}>
              <option value="">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label style={{ fontSize:12, display:"flex", alignItems:"center", gap:4, cursor:"pointer", color:"#555" }}>
              <input type="checkbox" checked={myPeriodsFilter} onChange={e => setMyPeriodsFilter(e.target.checked)} /> My Assignments
            </label>
            {selectedTemplate && canEdit && <button style={S.btn()} onClick={() => { setShowPeriodForm(true); setPf({ label:"", start_date:"", end_date:"" }); }}>+ New Period</button>}
            {canEdit && <button style={S.btn("#2E7D32")} onClick={handleSeedDemoData}>+ Demo Data</button>}
          </div>

          {showPeriodForm && selectedTemplate && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Create New Period</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
                <div style={{ flex:1, minWidth:150 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:2 }}>Label *</label>
                  <input style={{ ...S.input, marginBottom:0 }} placeholder="e.g. June 2025 / Week 25" value={pf.label} onChange={e => setPf(p=>({...p,label:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:2 }}>Start</label>
                  <input style={{ ...S.input, marginBottom:0, width:150 }} type="date" value={pf.start_date} onChange={e => setPf(p=>({...p,start_date:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:2 }}>End</label>
                  <input style={{ ...S.input, marginBottom:0, width:150 }} type="date" value={pf.end_date} onChange={e => setPf(p=>({...p,end_date:e.target.value}))} />
                </div>
                <button style={S.btn()} onClick={handleCreatePeriod}>Create</button>
                <button style={S.btn("#888")} onClick={() => setShowPeriodForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:12 }}>
            {(myPeriodsFilter
              ? periods.filter(p => isPeriodAssigned(p))
              : selectedTemplate ? periods.filter(p => p.template_id === selectedTemplate) : periods
            ).map(p => {
              const t = templates.find(tm => tm.id === p.template_id);
              const secs = t ? templateSections(t) : [];
              const assignedRoles = t?.assigned_roles || [];
              const mySub = submissions.find(s => s.period_id === p.id && s.section_key === "__full__" && s.user_id === user.id);
              return (
                <div key={p.id} style={S.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91" }}>{p.label}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{t?.name || "Unknown template"}</div>
                    </div>
                    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:600,
                      background: p.is_open ? "#E8F5E9" : "#FFEBEE", color: p.is_open ? "#1B5E20" : "#C62828" }}>
                      {p.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>
                    {p.start_date && <span>{p.start_date} to {p.end_date || "—"}</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>
                    {assignedRoles.length > 0 ? `Assigned to ${assignedRoles.length} users` : "All users"} | 
                    {mySub?.status === "submitted" ? <span style={{color:"#2E7D32", fontWeight:600, marginLeft:4}}>You: Submitted</span> : mySub?.status === "draft" ? <span style={{color:"#E65100", fontWeight:600, marginLeft:4}}>You: Draft</span> : <span style={{color:"#999", marginLeft:4}}>You: Not started</span>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {canEdit && p.is_open && <button style={S.btnSm("#0b3d91")} onClick={() => openAssign(p)}>Assign</button>}
                    {p.is_open && isPeriodAssigned(p) && <button style={S.btnSm("#E65100")} onClick={() => { setViewPeriod(p.id); setActiveSection(null); setTab("fill"); }}>Fill</button>}
                    <button style={S.btnSm("#2E7D32")} onClick={() => { setViewPeriod(p.id); setTab("view"); }}>View</button>
                    {p.is_open && canEdit && <button style={S.btnSm("#c62828")} onClick={() => handleClosePeriod(p.id)}>Close</button>}
                  </div>
                </div>
              );
            })}
            {periods.length === 0 && <div style={{ color:"#999", fontSize:13, padding:20, textAlign:"center" }}>No periods yet. Create a template first, then add periods.</div>}
          </div>
        </div>
      )}

      {/* ── Assign Users Modal ── */}
      {assignPeriod && (() => {
        const t = templates.find(tm => tm.id === assignPeriod.template_id);
        const secs = t ? templateSections(t) : [];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={e => { if (e.target === e.currentTarget) setAssignPeriod(null); }}>
            <div style={{ background:"#fff", borderRadius:12, padding:24, maxWidth:600, width:"90%", maxHeight:"80vh", overflowY:"auto" }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Assign Users to Sections</div>
              <div style={{ fontSize:12, color:"#888", marginBottom:16 }}>{t?.name} — {assignPeriod.label}</div>
              {secs.map(sec => (
                <div key={sec.key} style={{ marginBottom:12, padding:"10px 12px", background:"#f8faff", borderRadius:8, border:"1px solid #d0d8e8" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#333", marginBottom:6 }}>{sec.title || sec.key}</div>
                  <select style={{ ...S.select, marginBottom:0, width:"100%" }}
                    value={assignments[sec.key] || ""}
                    onChange={e => setAssignments(p => ({...p, [sec.key]: e.target.value ? Number(e.target.value) : null}))}>
                    <option value="">— Not assigned —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button style={S.btn()} onClick={handleSaveAssignments}>Save Assignments</button>
                <button style={S.btn("#888")} onClick={() => setAssignPeriod(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tab: Fill Report (Google Form style) ── */}
      {tab === "fill" && (
        <div>
          {!viewPeriod && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#333", marginBottom:12 }}>
                Select a period to fill the report
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
                {periods.filter(p => p.is_open).map(p => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  if (!t) return null;
                  const assignedRoles = t.assigned_roles || [];
                  if (assignedRoles.length > 0 && !assignedRoles.includes(user.cpf)) return null;
                  const sub = submissions.find(s => s.period_id === p.id && s.section_key === "__full__" && s.user_id === user.id);
                  return (
                    <div key={p.id} style={{ ...S.card, cursor:"pointer" }}
                      onClick={() => {
                        setViewPeriod(p.id);
                        setActiveSection(null);
                        if (sub) {
                          const defaults = {};
                          (templateSections(t)||[]).forEach(sec => (sec.fields||[]).forEach(f => { defaults[f.key] = (sub.field_values||{})[f.key] || ""; }));
                          setSectionForm(defaults);
                        } else {
                          const defaults = {};
                          (templateSections(t)||[]).forEach(sec => (sec.fields||[]).forEach(f => { defaults[f.key] = ""; }));
                          setSectionForm(defaults);
                        }
                      }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{t.name}</div>
                      <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{p.label}</div>
                      <div style={{ fontSize:11, color:"#666" }}>
                        Status: {sub?.status === "submitted" ? <span style={{color:"#2E7D32", fontWeight:600}}>Submitted</span> : sub?.status === "draft" ? <span style={{color:"#E65100", fontWeight:600}}>Draft</span> : <span style={{color:"#999"}}>Not started</span>}
                      </div>
                    </div>
                  );
                })}
                {periods.filter(p => p.is_open).every(p => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  if (!t) return true;
                  const assignedRoles = t.assigned_roles || [];
                  return assignedRoles.length > 0 && !assignedRoles.includes(user.cpf);
                }) && <div style={{ color:"#999", fontSize:13, padding:20, textAlign:"center" }}>No open periods assigned to your role.</div>}
              </div>
            </div>
          )}

          {viewPeriod && (() => {
            const p = periods.find(pr => pr.id === viewPeriod);
            const t = templates.find(tm => tm.id === p?.template_id);
            const secs = t ? templateSections(t) : [];
            if (!p || !t) return null;
            const totalRequired = secs.reduce((a, sec) => a + (sec.fields||[]).filter(f => f.required).length, 0);
            const filledRequired = secs.reduce((a, sec) => a + (sec.fields||[]).filter(f => f.required && (sectionForm[f.key]||"").trim()).length, 0);
            const allFields = secs.reduce((a, sec) => a + (sec.fields||[]).length, 0);
            const filledFields = secs.reduce((a, sec) => a + (sec.fields||[]).filter(f => (sectionForm[f.key]||"").trim()).length, 0);
            const progress = allFields > 0 ? Math.round((filledFields / allFields) * 100) : 0;
            const handleSubmit = async (status) => {
              if (status === "submitted") {
                const errors = {};
                secs.forEach(sec => (sec.fields||[]).forEach(f => {
                  if (f.required && !(sectionForm[f.key]||"").trim()) errors[f.key] = true;
                }));
                setValidationErrors(errors);
                if (Object.keys(errors).length > 0) {
                  rbToast("Please fill all required fields", "error");
                  return;
                }
              }
              try {
                await api.saveReportSubmission(viewPeriod, sectionForm, status);
                rbToast(status === "submitted" ? "Report submitted" : "Saved as draft", "success");
                if (status === "submitted") setViewPeriod(null);
                load();
              } catch(e) { rbToast(e.message, "error"); }
            };
            return (
              <div style={{ background: "#f0f4f9", padding: "20px", borderRadius: 12, minHeight: "80vh" }}>
                {/* Back Link */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <button
                    onClick={() => { setViewPeriod(null); setActiveSection(null); }}
                    style={{
                      background: "none", border: "none", color: "#0b3d91", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13
                    }}
                  >
                    ← Back to Period List
                  </button>
                  <span style={{ fontSize: 12, color: "#666" }}>
                    Form ID: {t.id}-{p.id}
                  </span>
                </div>

                {/* Progress Card */}
                <div style={{
                  background: "#fff", borderRadius: 12, padding: 18, marginBottom: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
                  borderTop: "6px solid #1565c0"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5f6368", marginBottom: 6, fontWeight: 500 }}>
                    <span>Form Completion Progress</span>
                    <span>{filledFields} of {allFields} fields completed ({progress}%)</span>
                  </div>
                  <div style={{ height: 8, background: "#e8eaed", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "#1a73e8", borderRadius: 4, transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {/* Header Card (Styled exactly like Google Forms) */}
                <div style={{
                  background: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
                  borderTop: "10px solid #0b3d91"
                }}>
                  <div style={{ padding: "22px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <h1 style={{ fontSize: 28, fontWeight: 400, color: "#202124", margin: 0 }}>{t.name}</h1>
                      <span style={{
                        display: "inline-block", padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                        background: sub?.status === "submitted" ? "#E8F5E9" : sub?.status === "draft" ? "#FFF3E0" : "#F1F3F4",
                        color: sub?.status === "submitted" ? "#1B5E20" : sub?.status === "draft" ? "#E65100" : "#5F6368"
                      }}>
                        {sub?.status === "submitted" ? "✓ Submitted" : sub?.status === "draft" ? "⚡ Saved Draft" : "Not Started"}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: "#5f6368", marginTop: 8, lineHeight: 1.5 }}>
                      {t.description || `Submit report data for period: ${p.label}`}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, borderTop: "1px solid #f1f3f4", paddingTop: 14 }}>
                      <span style={{ fontSize: 11, background: "#f1f3f4", padding: "4px 10px", borderRadius: 12, color: "#3c4043", fontWeight: 500 }}>
                        📅 Period: {p.label}
                      </span>
                      <span style={{ fontSize: 11, background: "#f1f3f4", padding: "4px 10px", borderRadius: 12, color: "#3c4043", fontWeight: 500 }}>
                        👤 Submitter: {user.name} ({user.cpf})
                      </span>
                      {user.section && (
                        <span style={{ fontSize: 11, background: "#f1f3f4", padding: "4px 10px", borderRadius: 12, color: "#3c4043", fontWeight: 500 }}>
                          🏢 Section: {user.section}
                        </span>
                      )}
                    </div>

                    {totalRequired > 0 && (
                      <div style={{ fontSize: 12, color: "#d93025", marginTop: 12, fontWeight: 500 }}>
                        * Indicates required question
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Cards */}
                {secs.map(sec => (
                  <div key={sec.key} style={{
                    background: "#fff", borderRadius: 12, padding: "24px", marginBottom: 16,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
                    borderLeft: "6px solid #1a73e8"
                  }}>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: "#202124", margin: "0 0 16px 0", borderBottom: "1px solid #f1f3f4", paddingBottom: 10 }}>
                      {sec.title || sec.key}
                    </h2>

                    {(sec.fields||[]).map(f => {
                      const isRequired = !!f.required;
                      const hasError = !!validationErrors[f.key];
                      const parsedOptions = f.options ? f.options.split(",").map(o => o.trim()).filter(Boolean) : [
                        "Operational", "Under Maintenance", "Not Available", "Completed", "In Progress", "On Track", "At Risk", "Delayed"
                      ];

                      return (
                        <div key={f.key} style={{ marginBottom: 20 }}>
                          <label style={{ fontSize: 14, fontWeight: 500, color: "#202124", display: "block", marginBottom: 8 }}>
                            {f.label||f.key} {isRequired && <span style={{ color: "#d93025" }}>*</span>}
                          </label>

                          {f.type === "textarea" ? (
                            <textarea
                              style={{
                                width: "100%", padding: "12px", border: `1px solid ${hasError ? "#d93025" : "#dadce0"}`,
                                borderRadius: 6, fontSize: 14, outline: "none", minHeight: 80, boxSizing: "border-box",
                                fontFamily: "inherit", transition: "border-color 0.2s, box-shadow 0.2s"
                              }}
                              value={sectionForm[f.key]||""}
                              onChange={e => { setSectionForm(p=> ({...p, [f.key]: e.target.value})); setValidationErrors(p=>({...p, [f.key]:false})); }}
                              placeholder="Your answer"
                            />
                          ) : f.type === "number" ? (
                            <input
                              type="number"
                              style={{
                                width: "100%", padding: "12px", border: `1px solid ${hasError ? "#d93025" : "#dadce0"}`,
                                borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box",
                                transition: "border-color 0.2s, box-shadow 0.2s"
                              }}
                              value={sectionForm[f.key]||""}
                              onChange={e => { setSectionForm(p=> ({...p, [f.key]: e.target.value})); setValidationErrors(p=>({...p, [f.key]:false})); }}
                              placeholder="Your answer (number)"
                            />
                          ) : f.type === "date" ? (
                            <input
                              type="date"
                              style={{
                                width: "100%", padding: "11px 12px", border: `1px solid ${hasError ? "#d93025" : "#dadce0"}`,
                                borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box",
                                transition: "border-color 0.2s, box-shadow 0.2s"
                              }}
                              value={sectionForm[f.key]||""}
                              onChange={e => { setSectionForm(p=> ({...p, [f.key]: e.target.value})); setValidationErrors(p=>({...p, [f.key]:false})); }}
                            />
                          ) : f.type === "select" ? (
                            <select
                              style={{
                                width: "100%", padding: "12px", border: `1px solid ${hasError ? "#d93025" : "#dadce0"}`,
                                borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box",
                                transition: "border-color 0.2s, box-shadow 0.2s"
                              }}
                              value={sectionForm[f.key]||""}
                              onChange={e => { setSectionForm(p=> ({...p, [f.key]: e.target.value})); setValidationErrors(p=>({...p, [f.key]:false})); }}
                            >
                              <option value="">Choose</option>
                              {parsedOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              style={{
                                width: "100%", padding: "12px", border: `1px solid ${hasError ? "#d93025" : "#dadce0"}`,
                                borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box",
                                transition: "border-color 0.2s, box-shadow 0.2s"
                              }}
                              value={sectionForm[f.key]||""}
                              onChange={e => { setSectionForm(p=> ({...p, [f.key]: e.target.value})); setValidationErrors(p=>({...p, [f.key]:false})); }}
                              placeholder="Your answer"
                            />
                          )}

                          {hasError && (
                            <div style={{ color: "#d93025", fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                              ⚠️ This is a required question
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Form Actions */}
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "20px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
                }}>
                  <button
                    onClick={() => { setViewPeriod(null); }}
                    style={{
                      padding: "10px 20px", border: "1px solid #dadce0", borderRadius: 6,
                      background: "#fff", color: "#3c4043", cursor: "pointer", fontWeight: 600, fontSize: 14
                    }}
                  >
                    Clear Form
                  </button>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleSubmit("draft")}
                      style={{
                        padding: "10px 20px", border: "none", borderRadius: 6,
                        background: "#f1f3f4", color: "#1a73e8", cursor: "pointer", fontWeight: 600, fontSize: 14
                      }}
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleSubmit("submitted")}
                      style={{
                        padding: "10px 24px", border: "none", borderRadius: 6,
                        background: "#0b3d91", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.15)"
                      }}
                    >
                      Submit Form
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Fill Status (admin/ops) ── */}
      {tab === "fill-status" && (
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"#333", marginBottom:12 }}>Select a period to view fill status</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
            {periods.map(p => {
              const t = templates.find(tm => tm.id === p.template_id);
              return (
                <div key={p.id} style={{ ...S.card, cursor:"pointer" }} onClick={async () => {
                  try {
                    const fs = await api.getFillStatus(p.id);
                    setFillStatus(fs);
                    setViewPeriod(p.id);
                    setFillStatusSearch("");
                  } catch(e) { rbToast(e.message, "error"); }
                }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{t?.name}</div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{p.label}</div>
                  <div style={{ fontSize:11, color:"#666" }}>
                    {p.is_open ? "Open" : "Closed"}
                  </div>
                </div>
              );
            })}
          </div>

          {viewPeriod && fillStatus && (() => {
            const p = periods.find(pr => pr.id === viewPeriod);
            const t = templates.find(tm => tm.id === p?.template_id);
            if (!p || !t) return null;
            const statuses = fillStatus.fill_status || [];
            const submitted = statuses.filter(s => s.status === "submitted").length;
            const draft = statuses.filter(s => s.status === "draft").length;
            const notStarted = statuses.filter(s => !s.status || s.status === "not_started").length;
            const maxCount = Math.max(submitted, draft, notStarted, 1);
            const filtered = fillStatusSearch ? statuses.filter(s => (s.name||"").toLowerCase().includes(fillStatusSearch.toLowerCase()) || (s.cpf||"").includes(fillStatusSearch)) : statuses;
            return (
              <div style={{ marginTop:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91" }}>{fillStatus.template_name} — {fillStatus.period_label}</div>
                    <div style={{ fontSize:12, color:"#888" }}>{submitted}/{statuses.length} filled | Assigned: {(fillStatus.assigned_roles||[]).length} users</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {["json","html","text","docx","pptx","pdf"].map(fmt => (
                      <button key={fmt} style={S.btnSm(fmt==="pdf"?"#c62828":fmt==="docx"?"#0b3d91":fmt==="pptx"?"#E65100":"#555")}
                        onClick={() => handleExport(viewPeriod, fmt)} disabled={exporting}>
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                    <button style={S.btnSm("#888")} onClick={() => { setViewPeriod(null); setFillStatus(null); }}>Back</button>
                  </div>
                </div>

                <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
                  {[{label:"Submitted", count:submitted, color:"#2E7D32"},{label:"Draft", count:draft, color:"#E65100"},{label:"Not started", count:notStarted, color:"#999"}].map(stat => (
                    <div key={stat.label} style={{ flex:1, minWidth:100, background:"#fff", borderRadius:8, padding:"12px 16px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div style={{ fontSize:22, fontWeight:700, color:stat.color }}>{stat.count}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{stat.label}</div>
                      <div style={{ height:4, background:"#e8ecf0", borderRadius:2, marginTop:6, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(stat.count/maxCount)*100}%`, background:stat.color, borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <input style={{ ...S.input, marginBottom:10 }} placeholder="Search by name or CPF..." value={fillStatusSearch} onChange={e => setFillStatusSearch(e.target.value)} />

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {filtered.map(fs => (
                    <div key={fs.user_id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      background:"#fff", borderRadius:8, padding:"12px 16px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                          fontWeight:700, fontSize:13, color:"#fff",
                          background: fs.has_filled ? (fs.status === "submitted" ? "#2E7D32" : "#E65100") : "#ccc" }}>
                          {fs.name ? fs.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>{fs.name}</div>
                          <div style={{ fontSize:11, color:"#888" }}>{fs.cpf}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:600,
                          background: fs.status === "submitted" ? "#E8F5E9" : fs.status === "draft" ? "#FFF3E0" : "#f0f0f0",
                          color: fs.status === "submitted" ? "#1B5E20" : fs.status === "draft" ? "#E65100" : "#999" }}>
                          {fs.status === "submitted" ? "✓ Submitted" : fs.status === "draft" ? "⚡ Draft" : "— Not started"}
                        </span>
                        {fs.submitted_at && <span style={{ fontSize:10, color:"#999" }}>{fs.submitted_at.split("T")[0]}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {filtered.length === 0 && <div style={{ color:"#999", fontSize:13, textAlign:"center", padding:20 }}>No matching users</div>}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: View Report ── */}
      {tab === "view" && (
        <div>
          {!viewPeriod && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#333", marginBottom:12 }}>Select a period to view the compiled report</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
                {periods.map(p => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  const secs = t ? templateSections(t) : [];
                  const filledCount = submissions.filter(s => s.period_id === p.id && s.status === "submitted").length;
                  const totalUsers = t?.assigned_roles?.length ? users.filter(u => t.assigned_roles.includes(u.cpf)).length : 1;
                  return (
                    <div key={p.id} style={{ ...S.card, cursor:"pointer" }} onClick={async () => {
                      setViewPeriod(p.id);
                      setViewMode("summary");
                      try {
                        const fs = await api.getFillStatus(p.id);
                        setFillStatus(fs);
                      } catch { setFillStatus(null); }
                    }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{t?.name}</div>
                      <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{p.label}</div>
                      <div style={{ fontSize:11, color:"#666" }}>
                        {filledCount}/{totalUsers} users submitted
                        <span style={{ marginLeft:8, display:"inline-block", padding:"1px 6px", borderRadius:6, fontSize:10, fontWeight:600,
                          background: p.is_open ? "#E8F5E9" : "#FFEBEE", color: p.is_open ? "#1B5E20" : "#C62828" }}>
                          {p.is_open ? "Open" : "Closed"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewPeriod && (() => {
            const p = periods.find(pr => pr.id === viewPeriod);
            const t = templates.find(tm => tm.id === p?.template_id);
            const secs = t ? templateSections(t) : [];
            if (!p || !t) return null;
            const usersWithSubs = (fillStatus?.fill_status || []).filter(fs => fs.has_filled);
            const totalUsers = (fillStatus?.fill_status || []).length;
            const submittedCount = usersWithSubs.filter(fs => fs.status === "submitted").length;
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91" }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#888" }}>Period: {p.label} | {submittedCount}/{totalUsers} submitted | {p.is_open ? "Open" : "Closed"}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <button style={S.btnSm(viewMode==="summary"?"#0b3d91":"#e0e0e0", viewMode==="summary"?undefined:undefined)} onClick={() => setViewMode("summary")}>Summary</button>
                    <button style={S.btnSm(viewMode==="individual"?"#0b3d91":"#e0e0e0")} onClick={() => { setViewMode("individual"); setViewUserSub(null); }}>Individual</button>
                    {["json","html","text","docx","pptx","pdf"].map(fmt => (
                      <button key={fmt} style={S.btnSm(fmt==="pdf"?"#c62828":fmt==="docx"?"#0b3d91":fmt==="pptx"?"#E65100":"#555")}
                        onClick={() => handleExport(viewPeriod, fmt)} disabled={exporting}>
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                    <button style={S.btnSm("#888")} onClick={() => { setViewPeriod(null); setFillStatus(null); setViewUserSub(null); }}>Back</button>
                  </div>
                </div>

                {viewMode === "summary" ? (
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#333", marginBottom:8 }}>Summary of Responses</div>
                    {secs.map(sec => {
                      const allSubs = (fillStatus?.fill_status || []).filter(fs => fs.has_filled);
                      return (
                        <div key={sec.key} style={S.section}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>{sec.title || sec.key}</div>
                          {(sec.fields||[]).map(f => {
                            const vals = [];
                            allSubs.forEach(fs => {
                              const sub = submissions.find(s => s.period_id === viewPeriod && s.section_key === "__full__" && s.user_id === fs.user_id);
                              const v = sub?.field_values?.[f.key];
                              if (v && v.trim()) vals.push(v);
                            });
                            const unique = [...new Set(vals)];
                            return (
                              <div key={f.key} style={{ padding:"6px 0", borderBottom:"1px solid #f0f4f8" }}>
                                <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:2 }}>{f.label||f.key}</div>
                                <div style={{ fontSize:12, color:"#333" }}>
                                  {unique.length === 0 ? <span style={{color:"#ccc"}}>No responses</span> : (
                                    f.type === "number" ? (
                                      <span>Avg: {vals.length > 0 ? (vals.reduce((a,b) => a + Number(b), 0) / vals.length).toFixed(1) : "—"} ({vals.length} responses)</span>
                                    ) : (
                                      <span>{unique.slice(0, 5).join(", ")}{unique.length > 5 ? ` +${unique.length-5} more` : ""} ({vals.length} responses)</span>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ) : !viewUserSub ? (
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#333", marginBottom:8 }}>User Submissions</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {(fillStatus?.fill_status || []).map(fs => (
                        <div key={fs.user_id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                          background:"#fff", borderRadius:8, padding:"10px 16px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                          cursor:"pointer" }} onClick={async () => {
                          setViewUserSub(fs);
                          const subs = await api.listReportSubmissions(viewPeriod, "__full__", null, fs.user_id);
                          if (subs && subs.length > 0) {
                            const defaults = {};
                            secs.forEach(sec => (sec.fields||[]).forEach(f => { defaults[f.key] = (subs[0].field_values||{})[f.key] || ""; }));
                            setSectionForm(defaults);
                          }
                        }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>{fs.name}</div>
                            <div style={{ fontSize:11, color:"#888" }}>{fs.cpf}</div>
                          </div>
                          <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:600,
                            background: fs.status === "submitted" ? "#E8F5E9" : fs.status === "draft" ? "#FFF3E0" : "#f0f0f0",
                            color: fs.status === "submitted" ? "#1B5E20" : fs.status === "draft" ? "#E65100" : "#999" }}>
                            {fs.status || "Not started"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:"#333" }}>
                          Viewing: {viewUserSub.name} ({viewUserSub.cpf}) — {viewUserSub.role}
                        </div>
                        <div style={{ fontSize:11, color:"#888" }}>
                          Status: {viewUserSub.status || "Not started"} {viewUserSub.submitted_at ? `| Submitted: ${viewUserSub.submitted_at}` : ""}
                        </div>
                      </div>
                      <button style={S.btnSm("#888")} onClick={() => { setViewUserSub(null); }}>Back to list</button>
                    </div>
                    {secs.map(sec => (
                      <div key={sec.key} style={S.section}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>{sec.title || sec.key}</div>
                        {(sec.fields||[]).map(f => {
                          const v = sectionForm[f.key];
                          return (
                            <div key={f.key} style={{ display:"flex", padding:"6px 0", borderBottom:"1px solid #f0f4f8" }}>
                              <div style={{ width:200, fontSize:13, fontWeight:600, color:"#555", flexShrink:0 }}>{f.label||f.key}</div>
                              <div style={{ fontSize:13, color:"#333" }}>{v || <span style={{color:"#ccc"}}>—</span>}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
