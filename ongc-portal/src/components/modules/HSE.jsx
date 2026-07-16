import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge, C0 } from "../shared/styles";
import { DrillDownModal } from "../shared/DrillDownModal";
import ExcelUploadModal from "../ExcelUploadModal";
import { DynamicCRUD } from "../shared/DynamicCRUD";
import { FileTableSection } from "../shared/FileTableSection";

// Priority colours
const PRIORITY_COLOR = { High:"#c62828", Critical:"#b71c1c", Medium:"#e65100", Low:"#1b5e20" };
const STATUS_COLOR   = { Open:"#c62828", "In Progress":"#e65100", Closed:"#1b5e20", Resolved:"#2e7d32", Pending:"#f9a825" };

const CERT_TYPE_OPTIONS = ["Safety","Training","Equipment","Medical","Insurance","Other"];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

function expiryLabel(days) {
  if (days === null) return { text:"No expiry", color:"#607d8b" };
  if (days < 0)   return { text:`Expired ${Math.abs(days)}d ago`, color:"#c62828" };
  if (days <= 30) return { text:`Expires in ${days}d`, color:"#e65100" };
  if (days <= 90) return { text:`${days}d left`, color:"#f9a825" };
  return { text:`Valid (${days}d left)`, color:"#1b5e20" };
}

export function HSE({ user, onToast }) {
  const [activeTab, setActiveTab] = useState("Certificates");
  const [certificates, setCertificates] = useState([]);
  const [audits, setAudits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState(null);

  // Excel modals
  const [showCertExcel, setShowCertExcel]   = useState(false);
  const [showAuditExcel, setShowAuditExcel] = useState(false);

  // Certificate form
  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCert, setEditingCert]   = useState(null);
  const [certForm, setCertForm] = useState({
    name:"", certificate_number:"", issued_to:"", issuing_authority:"",
    issue_date:"", expiry_date:"", status:"Valid",
    certificate_type:"", department:"", notes:""
  });
  const [certFile, setCertFile] = useState(null);
  const [certDocType, setCertDocType] = useState("Report");
  const [certClassification, setCertClassification] = useState("General");
  const [certFileDescription, setCertFileDescription] = useState("");

  // Audit form
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editingAudit, setEditingAudit]   = useState(null);
  const [auditForm, setAuditForm] = useState({
    audit_date:"", observation:"", action_taken_report:"",
    responsible_person:"", due_date:"", status:"Open",
    pending_action: true, action_priority:"Medium", closure_date:"",
    audit_type:"", department:""
  });
  const [auditFile, setAuditFile] = useState(null);
  const [auditDocType, setAuditDocType] = useState("Report");
  const [auditClassification, setAuditClassification] = useState("General");
  const [auditFileDescription, setAuditFileDescription] = useState("");

  // Filters
  const [certFilter, setCertFilter]   = useState("All"); // All, Valid, Expiring Soon, Expired
  const [auditFilter, setAuditFilter] = useState("All"); // All, Open, Pending, Closed

  // Dropdown options from DB
  const [auditStatuses, setAuditStatuses]    = useState([]);
  const [certStatuses, setCertStatuses]      = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  useEffect(() => {
    loadAll();
    // Load dynamic options from DB
    api.getLookups("audit_status").then(d  => setAuditStatuses(d?.map?.(x=>x.value)||[])).catch(()=>{});
    api.getLookups("certificate_status").then(d => setCertStatuses(d?.map?.(x=>x.value)||[])).catch(()=>{});
    api.getLookups("action_priority").then(d => setPriorityOptions(d?.map?.(x=>x.value)||[])).catch(()=>{});
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [certData, auditData] = await Promise.all([
        api.listHSECertificates(),
        api.listHSEAudits(),
      ]);
      setCertificates(Array.isArray(certData) ? certData : []);
      setAudits(Array.isArray(auditData) ? auditData : []);
    } catch (e) { onToast?.("Failed to fetch HSE data", "error"); }
    setLoading(false);
  };

  // ── Certificate CRUD ──
  const CERT_FORM_EMPTY = { name:"",certificate_number:"",issued_to:"",issuing_authority:"",issue_date:"",expiry_date:"",status:"Valid",certificate_type:"",department:"",notes:"" };

  const resetCertFileState = () => { setCertFile(null); setCertDocType("Report"); setCertClassification("General"); setCertFileDescription(""); };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    if (!certForm.name.trim()) { onToast?.("Certificate name is required", "error"); return; }
    const fd = new FormData();
    Object.entries(certForm).forEach(([k,v]) => fd.append(k, v||""));
    try {
      if (editingCert) { await api.updateHSECertificate(editingCert.id, fd); onToast?.("Certificate updated","success"); }
      else             { await api.createHSECertificate(fd); onToast?.("Certificate created","success"); }
      if (certFile) {
        try {
          const fileFD = new FormData();
          fileFD.append("file", certFile);
          fileFD.append("file_name", certFile.name);
          fileFD.append("file_type", (certFile.name.split('.').pop() || "").toUpperCase());
          fileFD.append("section", "HSE Certificates");
          fileFD.append("doc_type", certDocType);
          fileFD.append("classification", certClassification);
          fileFD.append("description", certFileDescription || "");
          fileFD.append("dynamic_fields", JSON.stringify({}));
          await api.uploadFile(fileFD);
          onToast?.("File uploaded", "success");
        } catch (e) { onToast?.("Certificate saved but file upload failed", "warning"); }
      }
      setCertForm(CERT_FORM_EMPTY);
      resetCertFileState();
      setEditingCert(null); setShowCertForm(false); loadAll();
    } catch (err) { onToast?.(err.message||"Failed to save certificate","error"); }
  };

  const editCert = (c) => {
    setEditingCert(c);
    setCertForm({
      name:c.name||"", certificate_number:c.certificate_number||"", issued_to:c.issued_to||"",
      issuing_authority:c.issuing_authority||"", issue_date:c.issue_date||"", expiry_date:c.expiry_date||"", status:c.status||"Valid",
      certificate_type:c.certificate_type||"", department:c.department||"", notes:c.notes||""
    });
    setShowCertForm(true); setActiveTab("Certificates"); window.scrollTo({top:0,behavior:"smooth"});
  };

  const deleteCert = async (id) => {
    if (!confirm("Delete this certificate?")) return;
    try { await api.deleteHSECertificate(id); onToast?.("Deleted","success"); loadAll(); }
    catch { onToast?.("Failed to delete","error"); }
  };

  // ── Audit CRUD ──
  const AUDIT_FORM_EMPTY = { audit_date:"",observation:"",action_taken_report:"",responsible_person:"",due_date:"",status:"Open",pending_action:true,action_priority:"Medium",closure_date:"",audit_type:"",department:"" };

  const resetAuditFileState = () => { setAuditFile(null); setAuditDocType("Report"); setAuditClassification("General"); setAuditFileDescription(""); };

  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    if (!auditForm.observation.trim()) { onToast?.("Observation is required","error"); return; }
    const fd = new FormData();
    Object.entries(auditForm).forEach(([k,v]) => fd.append(k, v===true?"true":v===false?"false":(v||"")));
    try {
      if (editingAudit) { await api.updateHSEAudit(editingAudit.id, fd); onToast?.("Audit updated","success"); }
      else              { await api.createHSEAudit(fd); onToast?.("Observation created","success"); }
      if (auditFile) {
        try {
          const fileFD = new FormData();
          fileFD.append("file", auditFile);
          fileFD.append("file_name", auditFile.name);
          fileFD.append("file_type", (auditFile.name.split('.').pop() || "").toUpperCase());
          fileFD.append("section", "HSE Audits");
          fileFD.append("doc_type", auditDocType);
          fileFD.append("classification", auditClassification);
          fileFD.append("description", auditFileDescription || "");
          fileFD.append("dynamic_fields", JSON.stringify({}));
          await api.uploadFile(fileFD);
          onToast?.("File uploaded", "success");
        } catch (e) { onToast?.("Observation saved but file upload failed", "warning"); }
      }
      setAuditForm(AUDIT_FORM_EMPTY);
      resetAuditFileState();
      setEditingAudit(null); setShowAuditForm(false); loadAll();
    } catch (err) { onToast?.(err.message||"Failed to save audit","error"); }
  };

  const editAudit = (a) => {
    setEditingAudit(a);
    setAuditForm({
      audit_date:a.audit_date||"", observation:a.observation||"", action_taken_report:a.action_taken_report||"",
      responsible_person:a.responsible_person||"", due_date:a.due_date||"", status:a.status||"Open",
      pending_action: a.pending_action!==false, action_priority:a.action_priority||"Medium", closure_date:a.closure_date||"",
      audit_type:a.audit_type||"", department:a.department||""
    });
    setShowAuditForm(true); setActiveTab("Audits (OBS/ATR)"); window.scrollTo({top:0,behavior:"smooth"});
  };

  const deleteAudit = async (id) => {
    if (!confirm("Delete this observation?")) return;
    try { await api.deleteHSEAudit(id); onToast?.("Deleted","success"); loadAll(); }
    catch { onToast?.("Failed to delete","error"); }
  };

  // ── Computed stats directly from DB data (no hardcoding) ──
  const certsByStatus = certificates.reduce((acc, c) => {
    const days = daysUntil(c.expiry_date);
    const label = days===null ? "No Expiry" : days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : days <= 90 ? "Warning" : "Valid";
    acc[label] = (acc[label]||0) + 1;
    return acc;
  }, {});

  const auditsByStatus = audits.reduce((acc, a) => {
    acc[a.status||"Unknown"] = (acc[a.status||"Unknown"]||0) + 1;
    return acc;
  }, {});

  const pendingAudits   = audits.filter(a => a.pending_action !== false && a.status !== "Closed");
  const overdueAudits   = pendingAudits.filter(a => a.due_date && daysUntil(a.due_date) < 0);
  const dueSoonAudits   = pendingAudits.filter(a => a.due_date && daysUntil(a.due_date) >= 0 && daysUntil(a.due_date) <= 7);
  const highPriority    = pendingAudits.filter(a => a.action_priority === "High" || a.action_priority === "Critical");

  // ── Compliance Dashboard computations ──
  const certComplianceRate = certificates.length
    ? Math.round(((certsByStatus["Valid"]||0) + (certsByStatus["No Expiry"]||0)) / certificates.length * 100)
    : 100;
  const auditClosureRate = audits.length
    ? Math.round((auditsByStatus["Closed"]||0) / audits.length * 100)
    : 100;
  const incidentResolutionRate = incidents.length
    ? Math.round(incidents.filter(i => i.status==="Resolved"||i.status==="Closed").length / incidents.length * 100)
    : 100;

  const totalItems = certificates.length + audits.length + incidents.length;
  const openAttention = (certsByStatus["Expired"]||0) + (certsByStatus["Expiring Soon"]||0) + pendingAudits.length + incidents.filter(i=>(i.status||"Open")==="Open").length;
  const totalOverdue = (certsByStatus["Expired"]||0) + overdueAudits.length;

  const scores = [];
  if (certificates.length) scores.push(certComplianceRate);
  if (audits.length) scores.push(auditClosureRate);
  if (incidents.length) scores.push(incidentResolutionRate);
  const overallScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 100;
  const scoreColor = overallScore >= 80 ? "#1b5e20" : overallScore >= 50 ? "#e65100" : "#c62828";

  // Filtered lists
  const filteredCerts = certificates.filter(c => {
    if (certFilter === "All") return true;
    const days = daysUntil(c.expiry_date);
    if (certFilter === "Expired")      return days !== null && days < 0;
    if (certFilter === "Expiring Soon") return days !== null && days >= 0 && days <= 30;
    if (certFilter === "Warning")       return days !== null && days > 30 && days <= 90;
    if (certFilter === "Valid")         return days === null || days > 90;
    return true;
  });

  const filteredAudits = audits.filter(a => {
    if (auditFilter === "All")     return true;
    if (auditFilter === "Pending") return a.pending_action !== false && a.status !== "Closed";
    if (auditFilter === "Overdue") return a.pending_action !== false && a.due_date && daysUntil(a.due_date) < 0;
    if (auditFilter === "High")    return a.action_priority === "High" || a.action_priority === "Critical";
    return a.status === auditFilter;
  });

  const tabStyle = (t) => ({
    padding:"8px 16px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:14,
    background: activeTab===t ? "#0b3d91" : "#e0e0e0",
    color: activeTab===t ? "#fff" : "#333",
  });

  return (
    <div style={S.page}>
      {/* ── HSE COMPLIANCE DASHBOARD ── */}
      <div style={{ background:"linear-gradient(135deg,#0b3d91 0%,#1565c0 100%)", borderRadius:10, padding:"20px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ fontSize:17, fontWeight:700, marginBottom:14, letterSpacing:0.5 }}>HSE Compliance Dashboard</div>
        <div style={{ display:"grid", gridTemplateColumns:"180px 1fr repeat(3,1fr)", gap:16, alignItems:"center" }}>
          {/* Overall Score */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:40, fontWeight:900, lineHeight:1 }}>{overallScore}%</div>
            <div style={{ fontSize:11, opacity:0.85, marginTop:4 }}>Overall Compliance</div>
            <div style={{ height:6, background:"rgba(255,255,255,0.2)", borderRadius:3, marginTop:8, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${overallScore}%`, background: scoreColor === "#1b5e20" ? "#4caf50" : scoreColor === "#e65100" ? "#ff9800" : "#f44336", borderRadius:3, transition:"width 0.6s" }} />
            </div>
          </div>
          {/* Summary Stats */}
          {[
            ["Total Records", totalItems, "All modules combined"],
            ["Needs Attention", openAttention, "Expired certs + pending audits + open incidents"],
            ["Overdue Items", totalOverdue, "Expired certificates + overdue actions"],
          ].map(([label, value, sub]) => (
            <div key={label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:8, padding:"12px 16px" }}>
              <div style={{ fontSize:24, fontWeight:800 }}>{value}</div>
              <div style={{ fontSize:12, fontWeight:600, opacity:0.9 }}>{label}</div>
              <div style={{ fontSize:10, opacity:0.65, marginTop:2 }}>{sub}</div>
            </div>
          ))}
          {/* Module Breakdown */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {[
              ["Certificates", certComplianceRate, certificates.length, `${certsByStatus["Expired"]||0} expired`],
              ["Audits", auditClosureRate, audits.length, `${pendingAudits.length} pending`],
              ["Incidents", incidentResolutionRate, incidents.length, `${incidents.filter(i=>(i.status||"Open")==="Open").length} open`],
            ].map(([mod, rate, total, note]) => (
              <div key={mod} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                <span style={{ fontWeight:600, width:80 }}>{mod}</span>
                <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.2)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${rate}%`, background: rate>=80?"#4caf50":rate>=50?"#ff9800":"#f44336", borderRadius:3 }} />
                </div>
                <span style={{ fontWeight:700, width:32, textAlign:"right" }}>{rate}%</span>
                <span style={{ opacity:0.7, fontSize:10, width:80, textAlign:"right" }}>{total} total · {note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:16, borderBottom:"1px solid #ddd", paddingBottom:10 }}>
        {["Incidents","Certificates","Audits (OBS/ATR)"].map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── TAB: INCIDENTS ── */}
      {activeTab === "Incidents" && (
        <>
          {/* Real incident stats from DB */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
            {[
              ["Total Incidents", incidents.length, "#e65100"],
              ["Open / Unresolved", incidents.filter(i=>(i.status||"Open")==="Open").length, "#c62828"],
              ["Resolved", incidents.filter(i=>i.status==="Resolved"||i.status==="Closed").length, "#1b5e20"],
              ["This Month", incidents.filter(i => { if(!i.date) return false; const d=new Date(i.date),n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth(); }).length, "#0b3d91"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ ...S.card, textAlign:"center", borderLeft:`4px solid ${c}` }}>
                <div style={{ fontSize:12, color:"#666", fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:26, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
              </div>
            ))}
          </div>
          <DynamicCRUD
            page="HSE" title="HSE Incident Dashboard"
            apiList={api.listHSEIncidents}
            apiCreate={api.createHSEIncident}
            apiUpdate={api.updateHSEIncident}
            apiDelete={api.deleteHSEIncident}
            apiExcelPreview={api.excelHSEPreview}
            apiExcelImport={api.excelHSEImport}
            excelFields="hse_incident"
            uploadSection="HSE Incidents"
            user={user} onToast={onToast}
            onItemsChange={setIncidents}
          />
        </>
      )}


      {/* ── TAB: CERTIFICATES ── */}
      {activeTab === "Certificates" && (
        <>
          {/* Stats from real DB data */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:16 }}>
            {[
              ["Total Certs", certificates.length, "#0b3d91"],
              ["Valid", certsByStatus["Valid"]||0, "#1b5e20"],
              ["Warning (≤90d)", certsByStatus["Warning"]||0, "#f9a825"],
              ["Expiring ≤30d", certsByStatus["Expiring Soon"]||0, "#e65100"],
              ["Expired", certsByStatus["Expired"]||0, "#c62828"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ ...S.card, textAlign:"center", borderLeft:`4px solid ${c}`, cursor: v>0?"pointer":"default" }}
                onClick={() => { if(v>0) { const f=l.includes("Expiring")?"Expiring Soon":l.includes("Warning")?"Warning":l.includes("Expired")?"Expired":l.includes("Valid")?"Valid":"All"; setCertFilter(f); } }}>
                <div style={{ fontSize:11, color:"#666", fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:24, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Alert Banner */}
          {((certsByStatus["Expired"]||0) + (certsByStatus["Expiring Soon"]||0)) > 0 && (
            <div style={{ padding:"10px 16px", background:"#fff3e0", border:"1px solid #ffe082", borderRadius:8, color:"#b71c1c", fontSize:13, fontWeight:600, marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
              Action Required: <span style={{ fontWeight:400 }}>{certsByStatus["Expired"]||0} certificate(s) expired, {certsByStatus["Expiring Soon"]||0} expiring within 30 days.</span>
            </div>
          )}

          {/* Filter + Toolbar */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#555" }}>Filter:</span>
              {["All","Valid","Warning","Expiring Soon","Expired"].map(f => (
                <button key={f} onClick={() => setCertFilter(f)}
                  style={{ padding:"4px 10px", border:`1px solid ${certFilter===f?"#0b3d91":"#ddd"}`, borderRadius:4, background: certFilter===f?"#0b3d91":"#fff", color: certFilter===f?"#fff":"#555", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                  {f}
                </button>
              ))}
            </div>
            {canEdit && (
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ padding:"6px 14px", border:"none", borderRadius:4, background:"#0b3d91", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}
                  onClick={() => { setEditingCert(null); setCertForm(CERT_FORM_EMPTY); resetCertFileState(); setShowCertForm(v=>!v); }}>
                  {showCertForm ? "Close" : "+ Add Certificate"}
                </button>
                <button style={{ padding:"6px 14px", border:"none", borderRadius:4, background:"#2e7d32", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}
                  onClick={() => setShowCertExcel(true)}>
                  Import Excel
                </button>
              </div>
            )}
          </div>

          {/* Certificate Form */}
          {showCertForm && canEdit && (
            <div style={{ background:"#fff", borderRadius:8, padding:"18px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.1)", marginBottom:18, border:"1px solid #e0e8f5" }}>
              <div style={{ ...S.sectionTitle, fontSize:15, marginBottom:12 }}>{editingCert ? "Edit Certificate" : "New Certificate"}</div>
              <form onSubmit={handleCertSubmit}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  <div style={S.field}>
                    <label style={S.label}>Certificate Name *</label>
                    <input style={S.input} value={certForm.name} onChange={e => setCertForm(p=>({...p,name:e.target.value}))} required placeholder="e.g. Safety Induction Certificate" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Certificate Number</label>
                    <input style={S.input} value={certForm.certificate_number} onChange={e => setCertForm(p=>({...p,certificate_number:e.target.value}))} placeholder="e.g. CERT-2026-001" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Certificate Type</label>
                    <select style={S.select} value={certForm.certificate_type} onChange={e => setCertForm(p=>({...p,certificate_type:e.target.value}))}>
                      <option value="">Select type...</option>
                      {CERT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Issued To (Name/Party)</label>
                    <input style={S.input} value={certForm.issued_to} onChange={e => setCertForm(p=>({...p,issued_to:e.target.value}))} placeholder="Employee or contractor name" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Issuing Authority</label>
                    <input style={S.input} value={certForm.issuing_authority} onChange={e => setCertForm(p=>({...p,issuing_authority:e.target.value}))} placeholder="e.g. DGMS / OISD / ONGC Safety Board" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Department</label>
                    <input style={S.input} value={certForm.department} onChange={e => setCertForm(p=>({...p,department:e.target.value}))} placeholder="e.g. Drilling, Production, Pipeline" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Issue Date</label>
                    <input style={S.input} type="date" value={certForm.issue_date} onChange={e => setCertForm(p=>({...p,issue_date:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Expiry Date</label>
                    <input style={S.input} type="date" value={certForm.expiry_date} onChange={e => setCertForm(p=>({...p,expiry_date:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Current Status</label>
                    <select style={S.select} value={certForm.status} onChange={e => setCertForm(p=>({...p,status:e.target.value}))}>
                      {(certStatuses.length ? certStatuses : ["Valid","Expired","Expiring Soon","Suspended","Cancelled"]).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ ...S.field, gridColumn:"span 3" }}>
                    <label style={S.label}>Notes / Remarks</label>
                    <textarea style={{ ...S.input, minHeight:50 }} value={certForm.notes} onChange={e => setCertForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional notes about this certificate..." />
                  </div>
                </div>
                <div style={{marginTop:18,borderTop:"1px solid #e0e0e0",paddingTop:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#333",marginBottom:10}}>Upload Document</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                    <div style={S.field}>
                      <label style={S.label}>File</label>
                      <input type="file" style={S.input}
                        onChange={e => setCertFile(e.target.files[0] || null)} />
                    </div>
                    <div style={S.field}>
                      <label style={S.label}>Document Type</label>
                      <select style={S.select} value={certDocType} onChange={e => setCertDocType(e.target.value)}>
                        {["Report","Data Set","Invoice","Contract","Technical Document","Administrative","Other"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={S.field}>
                      <label style={S.label}>Classification</label>
                      <select style={S.select} value={certClassification} onChange={e => setCertClassification(e.target.value)}>
                        {["General","Sensitive","Confidential","Highly Confidential"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{...S.field,gridColumn:"span 3"}}>
                      <label style={S.label}>Description</label>
                      <textarea style={{...S.input,resize:"vertical",minHeight:50}} rows={2} value={certFileDescription}
                        onChange={e => setCertFileDescription(e.target.value)} placeholder="Optional file description..." />
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <button style={{ ...S.btnSm(), padding:"8px 18px" }} type="submit">{editingCert?"Save Changes":"Add Certificate"}</button>
                  <button style={{ ...S.btnSm("#888"), padding:"8px 18px" }} type="button" onClick={() => { setShowCertForm(false); setEditingCert(null); resetCertFileState(); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Certificates Table */}
          <div style={S.section}>
            <div style={{ ...S.sectionTitle, marginBottom:10 }}>Certificates Register ({filteredCerts.length})</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Certificate Name</th>
                    <th style={th}>Type</th>
                    <th style={th}>Cert No.</th>
                    <th style={th}>Issued To</th>
                    <th style={th}>Department</th>
                    <th style={th}>Issuing Authority</th>
                    <th style={th}>Issue Date</th>
                    <th style={th}>Expiry Date</th>
                    <th style={th}>Days Left</th>
                    <th style={th}>Validity Status</th>
                    {canEdit && <th style={th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCerts.length === 0 && (
                    <tr><td colSpan={canEdit?11:10} style={{ textAlign:"center", padding:24, color:"#aaa" }}>
                      {certFilter !== "All" ? `No ${certFilter} certificates found.` : "No certificates recorded. Click '+ Add Certificate'."}
                    </td></tr>
                  )}
                  {filteredCerts.map((c, idx) => {
                    const days = daysUntil(c.expiry_date);
                    const { text, color } = expiryLabel(days);
                    return (
                      <tr key={c.id||idx} style={{ background: idx%2===0?"#fff":"#f8f9fa" }}>
                        <td style={{ ...td, fontWeight:600 }}>{c.name}</td>
                        <td style={{ ...td, fontSize:11 }}>{c.certificate_type ? <span style={{ padding:"2px 8px", borderRadius:3, background:"#e3f2fd", color:"#1565c0", fontWeight:600 }}>{c.certificate_type}</span> : "—"}</td>
                        <td style={{ ...td, fontSize:11, color:"#555" }}>{c.certificate_number||"—"}</td>
                        <td style={td}>{c.issued_to||"—"}</td>
                        <td style={{ ...td, fontSize:12 }}>{c.department||"—"}</td>
                        <td style={{ ...td, fontSize:12 }}>{c.issuing_authority||"—"}</td>
                        <td style={td}>{c.issue_date||"—"}</td>
                        <td style={{ ...td, fontWeight: days!==null && days<=30 ? 700 : 400, color: days!==null && days<0 ? "#c62828" : "inherit" }}>{c.expiry_date||"—"}</td>
                        <td style={{ ...td, fontWeight:700, color }}>{days===null ? "—" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</td>
                        <td style={td}><span style={{ ...badge(color), fontSize:11 }}>{text}</span></td>
                        {canEdit && (
                          <td style={td}>
                            <button style={{ marginRight:4, fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#e1f5fe", color:"#0288d1", cursor:"pointer" }} onClick={() => editCert(c)}>Edit</button>
                            <button style={{ fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#ffebee", color:"#c62828", cursor:"pointer" }} onClick={() => deleteCert(c.id)}>Del</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <FileTableSection section="HSE Certificates" />
          <ExcelUploadModal show={showCertExcel} onClose={() => setShowCertExcel(false)} onToast={onToast}
            apiPreview={api.excelHSECertificatePreview} apiImport={api.excelHSECertificateImport}
            fields="hse_certificate" onSuccess={loadAll} />
        </>
      )}


      {/* ── TAB: AUDITS (OBS/ATR) ── */}
      {activeTab === "Audits (OBS/ATR)" && (
        <>
          {/* Real stats from DB */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:16 }}>
            {[
              ["Total OBS", audits.length, "#0b3d91"],
              ["Open", auditsByStatus["Open"]||0, "#c62828"],
              ["In Progress", auditsByStatus["In Progress"]||0, "#e65100"],
              ["Closed", auditsByStatus["Closed"]||0, "#1b5e20"],
              ["Pending Actions", pendingAudits.length, "#b71c1c"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ ...S.card, textAlign:"center", borderLeft:`4px solid ${c}` }}>
                <div style={{ fontSize:11, color:"#666", fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:24, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Overdue / Due-soon alerts */}
          {overdueAudits.length > 0 && (
            <div style={{ padding:"10px 16px", background:"#ffebee", border:"1px solid #ef9a9a", borderRadius:8, color:"#c62828", fontSize:13, fontWeight:600, marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>{overdueAudits.length} action(s) OVERDUE — immediate attention required</span>
              <button onClick={() => setAuditFilter("Overdue")} style={{ padding:"3px 10px", border:"none", borderRadius:4, background:"#c62828", color:"#fff", fontSize:11, cursor:"pointer", fontWeight:600 }}>View</button>
            </div>
          )}
          {dueSoonAudits.length > 0 && (
            <div style={{ padding:"10px 16px", background:"#fff3e0", border:"1px solid #ffcc80", borderRadius:8, color:"#e65100", fontSize:13, fontWeight:600, marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>{dueSoonAudits.length} action(s) due within 7 days</span>
              <button onClick={() => setAuditFilter("Pending")} style={{ padding:"3px 10px", border:"none", borderRadius:4, background:"#e65100", color:"#fff", fontSize:11, cursor:"pointer", fontWeight:600 }}>View</button>
            </div>
          )}
          {highPriority.length > 0 && (
            <div style={{ padding:"10px 16px", background:"#fce4ec", border:"1px solid #f48fb1", borderRadius:8, color:"#880e4f", fontSize:13, fontWeight:600, marginBottom:14 }}>
              {highPriority.length} High/Critical priority action(s) pending
            </div>
          )}

          {/* Priority breakdown cards */}
          {pendingAudits.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
              {["Critical","High","Medium","Low"].map(p => {
                const cnt = pendingAudits.filter(a => a.action_priority === p).length;
                return (
                  <div key={p} style={{ padding:"10px 14px", background:"#fff", border:`1px solid ${PRIORITY_COLOR[p]||"#ddd"}`, borderRadius:8, textAlign:"center" }}
                    onClick={() => cnt > 0 && setDrillDown({ title:`${p} Priority — Pending Actions`, data: pendingAudits.filter(a=>a.action_priority===p).map(a=>({ OBS:a.observation?.slice(0,60)+"…"||"—", Responsible:a.responsible_person||"—", "Due Date":a.due_date||"—", Status:a.status })) })}>
                    <div style={{ fontSize:11, color:"#666", fontWeight:600 }}>{p} Priority</div>
                    <div style={{ fontSize:22, fontWeight:800, color: PRIORITY_COLOR[p]||"#607d8b", marginTop:4 }}>{cnt}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter + Toolbar */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#555" }}>Filter:</span>
              {["All","Open","In Progress","Closed","Pending","Overdue","High"].map(f => (
                <button key={f} onClick={() => setAuditFilter(f)}
                  style={{ padding:"4px 10px", border:`1px solid ${auditFilter===f?"#0b3d91":"#ddd"}`, borderRadius:4, background: auditFilter===f?"#0b3d91":"#fff", color: auditFilter===f?"#fff":"#555", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {f}
                </button>
              ))}
            </div>
            {canEdit && (
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ padding:"6px 14px", border:"none", borderRadius:4, background:"#0b3d91", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}
                  onClick={() => { setEditingAudit(null); setAuditForm(AUDIT_FORM_EMPTY); resetAuditFileState(); setShowAuditForm(v=>!v); }}>
                  {showAuditForm ? "Close" : "+ Add Observation"}
                </button>
                <button style={{ padding:"6px 14px", border:"none", borderRadius:4, background:"#2e7d32", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }} onClick={() => setShowAuditExcel(true)}>
                  Import Excel
                </button>
              </div>
            )}
          </div>

          {/* Audit Form */}
          {showAuditForm && canEdit && (
            <div style={{ background:"#fff", borderRadius:8, padding:"18px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.1)", marginBottom:18, border:"1px solid #e0e8f5" }}>
              <div style={{ ...S.sectionTitle, fontSize:15, marginBottom:12 }}>{editingAudit ? "Edit Observation" : "New Audit Observation (OBS)"}</div>
              <form onSubmit={handleAuditSubmit}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  <div style={S.field}>
                    <label style={S.label}>Audit Date</label>
                    <input style={S.input} type="date" value={auditForm.audit_date} onChange={e => setAuditForm(p=>({...p,audit_date:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Audit Area / Location</label>
                    <input style={S.input} value={auditForm.audit_type} onChange={e => setAuditForm(p=>({...p,audit_type:e.target.value}))} placeholder="e.g. Platform A, Drilling Rig #3" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Department</label>
                    <input style={S.input} value={auditForm.department} onChange={e => setAuditForm(p=>({...p,department:e.target.value}))} placeholder="e.g. HSE, Operations, Maintenance" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Responsible Person</label>
                    <input style={S.input} value={auditForm.responsible_person} onChange={e => setAuditForm(p=>({...p,responsible_person:e.target.value}))} placeholder="Name / Designation" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Action Priority</label>
                    <select style={S.select} value={auditForm.action_priority} onChange={e => setAuditForm(p=>({...p,action_priority:e.target.value}))}>
                      {(priorityOptions.length ? priorityOptions : ["Critical","High","Medium","Low"]).map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Target / Due Date</label>
                    <input style={S.input} type="date" value={auditForm.due_date} onChange={e => setAuditForm(p=>({...p,due_date:e.target.value}))} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Status</label>
                    <select style={S.select} value={auditForm.status}
                      onChange={e => { const s=e.target.value; setAuditForm(p=>({...p,status:s,pending_action:s!=="Closed"&&s!=="Resolved"})); }}>
                      {(auditStatuses.length ? auditStatuses : ["Open","In Progress","Closed","Resolved","Pending"]).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Closure Date {auditForm.status==="Closed"&&<span style={{color:"#c62828"}}>*</span>}</label>
                    <input style={S.input} type="date" value={auditForm.closure_date} onChange={e => setAuditForm(p=>({...p,closure_date:e.target.value}))} />
                  </div>
                  <div style={{ ...S.field, gridColumn:"span 3" }}>
                    <label style={S.label}>Observation Description (OBS) *</label>
                    <textarea style={{ ...S.input, minHeight:70 }} value={auditForm.observation} onChange={e => setAuditForm(p=>({...p,observation:e.target.value}))} required placeholder="Describe the non-conformity or finding in detail..." />
                  </div>
                  <div style={{ ...S.field, gridColumn:"span 3" }}>
                    <label style={S.label}>Action Taken Report (ATR)</label>
                    <textarea style={{ ...S.input, minHeight:60 }} value={auditForm.action_taken_report} onChange={e => setAuditForm(p=>({...p,action_taken_report:e.target.value}))} placeholder="Describe corrective / preventive action taken..." />
                  </div>
                </div>
                <div style={{marginTop:18,borderTop:"1px solid #e0e0e0",paddingTop:16}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#333",marginBottom:10}}>Upload Document</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                    <div style={S.field}>
                      <label style={S.label}>File</label>
                      <input type="file" style={S.input}
                        onChange={e => setAuditFile(e.target.files[0] || null)} />
                    </div>
                    <div style={S.field}>
                      <label style={S.label}>Document Type</label>
                      <select style={S.select} value={auditDocType} onChange={e => setAuditDocType(e.target.value)}>
                        {["Report","Data Set","Invoice","Contract","Technical Document","Administrative","Other"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={S.field}>
                      <label style={S.label}>Classification</label>
                      <select style={S.select} value={auditClassification} onChange={e => setAuditClassification(e.target.value)}>
                        {["General","Sensitive","Confidential","Highly Confidential"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{...S.field,gridColumn:"span 3"}}>
                      <label style={S.label}>Description</label>
                      <textarea style={{...S.input,resize:"vertical",minHeight:50}} rows={2} value={auditFileDescription}
                        onChange={e => setAuditFileDescription(e.target.value)} placeholder="Optional file description..." />
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:14, alignItems:"center" }}>
                  <button style={{ ...S.btnSm(), padding:"8px 18px" }} type="submit">{editingAudit?"Save Changes":"Add Observation"}</button>
                  <button style={{ ...S.btnSm("#888"), padding:"8px 18px" }} type="button" onClick={() => { setShowAuditForm(false); setEditingAudit(null); resetAuditFileState(); }}>Cancel</button>
                  <label style={{ fontSize:13, display:"flex", alignItems:"center", gap:6, marginLeft:8, color:"#555" }}>
                    <input type="checkbox" checked={auditForm.pending_action}
                      onChange={e => setAuditForm(p=>({...p,pending_action:e.target.checked}))} />
                    Mark as Pending Action
                  </label>
                </div>
              </form>
            </div>
          )}

          {/* Audits Table */}
          <div style={S.section}>
            <div style={{ ...S.sectionTitle, marginBottom:10 }}>
              Audit Observations — {auditFilter !== "All" ? auditFilter : "All"} ({filteredAudits.length})
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Audit Date</th>
                    <th style={th}>Area / Location</th>
                    <th style={th}>Department</th>
                    <th style={th}>Observation (OBS)</th>
                    <th style={th}>Action Taken (ATR)</th>
                    <th style={th}>Responsible</th>
                    <th style={th}>Due Date</th>
                    <th style={th}>Priority</th>
                    <th style={th}>Status</th>
                    <th style={th}>Pending</th>
                    <th style={th}>Days Left</th>
                    {canEdit && <th style={th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.length === 0 && (
                    <tr><td colSpan={canEdit?12:11} style={{ textAlign:"center", padding:24, color:"#aaa" }}>
                      No records for this filter.
                    </td></tr>
                  )}
                  {filteredAudits.map((a, idx) => {
                    const dueDays = daysUntil(a.due_date);
                    const isOverdue = a.pending_action !== false && dueDays !== null && dueDays < 0;
                    return (
                      <tr key={a.id||idx} style={{ background: isOverdue ? "#fff8f6" : idx%2===0?"#fff":"#f8f9fa" }}>
                        <td style={td}>{a.audit_date||"—"}</td>
                        <td style={{ ...td, fontSize:12 }}>{a.audit_type||"—"}</td>
                        <td style={{ ...td, fontSize:12 }}>{a.department||"—"}</td>
                        <td style={{ ...td, maxWidth:200, fontSize:12 }}>
                          <div style={{ fontWeight:500, lineHeight:1.4 }}>{a.observation}</div>
                        </td>
                        <td style={{ ...td, maxWidth:180, fontSize:12, color: a.action_taken_report ? "#333" : "#bbb" }}>
                          {a.action_taken_report || "ATR pending"}
                        </td>
                        <td style={td}>{a.responsible_person||"—"}</td>
                        <td style={{ ...td, fontWeight: isOverdue?700:400, color: isOverdue?"#c62828":"inherit" }}>{a.due_date||"—"}</td>
                        <td style={td}><span style={{ ...badge(PRIORITY_COLOR[a.action_priority]||"#607d8b"), fontSize:11 }}>{a.action_priority||"—"}</span></td>
                        <td style={td}><span style={{ ...badge(STATUS_COLOR[a.status]||"#607d8b"), fontSize:11 }}>{a.status||"—"}</span></td>
                        <td style={{ ...td, textAlign:"center" }}>
                          {a.pending_action !== false ? <span style={{ color:"#c62828", fontWeight:700 }}>Yes</span> : <span style={{ color:"#1b5e20" }}>No</span>}
                        </td>
                        <td style={{ ...td, fontWeight:700, color: isOverdue?"#c62828": dueDays!==null&&dueDays<=7?"#e65100":"#333" }}>
                          {dueDays === null ? "—" : dueDays < 0 ? `${Math.abs(dueDays)}d over` : `${dueDays}d`}
                        </td>
                        {canEdit && (
                          <td style={td}>
                            <button style={{ marginRight:4, fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#e1f5fe", color:"#0288d1", cursor:"pointer" }} onClick={() => editAudit(a)}>Edit</button>
                            <button style={{ fontSize:11, padding:"2px 7px", border:"none", borderRadius:3, background:"#ffebee", color:"#c62828", cursor:"pointer" }} onClick={() => deleteAudit(a.id)}>Del</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <FileTableSection section="HSE Audits" />
          <ExcelUploadModal show={showAuditExcel} onClose={() => setShowAuditExcel(false)} onToast={onToast}
            apiPreview={api.excelHSEAuditPreview} apiImport={api.excelHSEAuditImport}
            fields="hse_audit" onSuccess={loadAll} />
        </>
      )}

      {drillDown && <DrillDownModal title={drillDown.title} data={drillDown.data} onClose={() => setDrillDown(null)} />}
    </div>
  );
}
