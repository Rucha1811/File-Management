import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td } from "./styles";
import { MiniUpload } from "./MiniUpload";
import { FileTableSection } from "./FileTableSection";
import ExcelUploadModal from "../ExcelUploadModal";

export function DynamicCRUD({
  page,
  title,
  apiList,
  apiCreate,
  apiUpdate,
  apiDelete,
  apiExcelPreview,
  apiExcelImport,
  excelFields,
  uploadSection,
  user,
  onToast,
  onItemsChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState([]);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [fv, setFv] = useState(0);

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await apiList().catch(e => { console.error("apiList failed:", e); return []; });
    setItems(d || []);
    onItemsChange?.(d || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!page) return;
    api.listPageFields(page)
      .then(f => {
        setFields(f);
        const selFields = f.filter(x => x.field_type === "select").map(x => x.field_name);
        if (selFields.length) {
          Promise.all(
            selFields.map(t => api.getLookups(t, page).then(d => [t, d]).catch(() => [t, []]))
          ).then(entries => {
            setOptions(Object.fromEntries(entries));
          });
        }
      })
      .catch(e => { console.error("listPageFields failed:", e); setFields([]); });
  }, [page]);

  const resetForm = () => {
    const empty = {};
    fields.forEach(f => { empty[f.field_name] = ""; });
    setForm(empty);
    setEditing(null);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(s => !s);
    setShowUpload(false);
  };

  const startEdit = (item) => {
    let vals = {};
    try { if (item.dynamic_fields) vals = JSON.parse(item.dynamic_fields); } catch {}
    fields.forEach(f => {
      if (vals[f.field_name] === undefined || vals[f.field_name] === null) {
        vals[f.field_name] = item[f.field_name] || "";
      }
    });
    setForm(vals);
    setEditing(item);
    setShowForm(true);
    setShowUpload(false);
  };

  const handleSubmit = async () => {
    const firstField = fields[0];
    if (firstField && !form[firstField.field_name]?.toString().trim()) {
      onToast?.(`${firstField.label} is required`, "error");
      return;
    }
    const fd = new FormData();
    fd.append("dynamic_fields", JSON.stringify(form));
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    try {
      if (editing) {
        await apiUpdate(editing.id, fd);
        onToast?.("Updated", "success");
      } else {
        await apiCreate(fd);
        onToast?.("Created", "success");
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (e) {
      onToast?.(e.message || "Operation failed", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try {
      await apiDelete(id);
      onToast?.("Deleted", "success");
      load();
    } catch (e) {
      onToast?.(e.message || "Delete failed", "error");
    }
  };

  if (loading && items.length === 0 && !fields.length) {
    return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading...</div></div>;
  }

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>{title}</div>
        <div style={{display:"flex",gap:6}}>
          {fields.length > 0 && canEdit && (
            <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}}
              onClick={startCreate}>
              {showForm ? "Close" : "+ Add"}
            </button>
          )}
          {uploadSection && (
            <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUpload?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}}
              onClick={() => { setShowUpload(u => !u); setShowForm(false); }}>
              {showUpload ? "Close" : "\uD83D\uDCC1 Upload"}
            </button>
          )}
          {canEdit && apiExcelPreview && (
            <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}}
              onClick={() => setShowExcelModal(true)}>
              \uD83D\uDCE5 Excel
            </button>
          )}
        </div>
      </div>

      {fields.length === 0 && !loading ? (
        <div style={{textAlign:"center",padding:40,fontSize:14,color:"#999",background:"#fff",borderRadius:8,boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}>
          No form fields configured. Admin must set up fields in Settings → Form Builder for "{page}".
        </div>
      ) : showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={{...S.sectionTitle,fontSize:20}}>{editing ? "Edit" : "New"} {title}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:12}}>
            {fields.map(f => {
              const val = form[f.field_name] ?? "";
              return (
                <div key={f.field_name} style={S.field}>
                  <label style={S.label}>{f.label}</label>
                  {f.field_type === "select" ? (
                    <select style={S.select} value={val} onChange={e => setForm(p => ({...p, [f.field_name]: e.target.value}))}>
                      <option value="">— Select —</option>
                      {(options[f.field_name] || []).map(o => (
                        <option key={o.id || o} value={o.value || o}>{o.value || o}</option>
                      ))}
                    </select>
                  ) : f.field_type === "textarea" ? (
                    <textarea style={{...S.input,resize:"vertical",minHeight:60}} rows={2} value={val}
                      onChange={e => setForm(p => ({...p, [f.field_name]: e.target.value}))} />
                  ) : f.field_type === "date" ? (
                    <input style={S.input} type="date" value={val}
                      onChange={e => setForm(p => ({...p, [f.field_name]: e.target.value}))} />
                  ) : f.field_type === "number" ? (
                    <input style={S.input} type="number" step="any" value={val}
                      onChange={e => setForm(p => ({...p, [f.field_name]: e.target.value}))} />
                  ) : (
                    <input style={S.input} type="text" value={val}
                      onChange={e => setForm(p => ({...p, [f.field_name]: e.target.value}))} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleSubmit}>{editing ? "Update" : "Create"}</button>
            <button style={{...S.btnSm("#888")}} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {showUpload && uploadSection && (
            <MiniUpload user={user} section={uploadSection} page={page} onUpload={() => setFv(x => x + 1)} onToast={onToast} />
          )}

          <div style={S.section}>
            {loading ? (
              <div style={{textAlign:"center",padding:20,color:"#888",fontSize:15}}>Loading...</div>
            ) : items.length === 0 ? (
              <div style={{textAlign:"center",padding:20,color:"#999",fontSize:15}}>No records found.</div>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {fields.map(f => <th key={f.field_name} style={th}>{f.label}</th>)}
                    {canEdit && <th key="_actions" style={th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} style={{background:i % 2 === 0 ? "#fff" : "#f8f9fa"}}>
                      {fields.map(f => {
                        let v = item[f.field_name] ?? "—";
                        if (f.field_type === "date" && v && v !== "—") {
                          const d = new Date(v);
                          if (!isNaN(d.getTime())) v = d.toLocaleDateString();
                        }
                        return <td key={f.field_name} style={td}>{v}</td>;
                      })}
                      {canEdit && (
                        <td style={td}>
                          <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#e3f2fd",color:"#0b3d91",cursor:"pointer",marginRight:4}}
                            onClick={() => startEdit(item)}>Edit</button>
                          <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}}
                            onClick={() => handleDelete(item.id)}>Del</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {uploadSection && <FileTableSection section={uploadSection} version={fv} />}

          {apiExcelPreview && (
            <ExcelUploadModal show={showExcelModal} onClose={() => setShowExcelModal(false)}
              onToast={onToast} apiPreview={apiExcelPreview} apiImport={apiExcelImport}
              fields={excelFields} page={page} onSuccess={load} />
          )}
        </>
      )}
    </div>
  );
}
