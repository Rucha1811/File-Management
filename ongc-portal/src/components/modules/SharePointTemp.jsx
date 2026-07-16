import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";

const ROLES = ["Public", "Operations", "GP-03 Team", "GP-06 Team", "Admin"];

export function SharePointTemp({ onToast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareFile, setShareFile] = useState(null);
  const [shareRole, setShareRole] = useState("Public");
  const [shareHours, setShareHours] = useState(24);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSharedFiles();
      setFiles(data || []);
    } catch { setFiles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleShare = async () => {
    if (!shareFile) { onToast?.("Select a file to share", "error"); return; }
    try {
      await api.shareFile(shareFile, shareRole, shareHours);
      setShareFile(null);
      onToast?.(`File shared for ${shareHours} hours (${shareRole})`, "success");
      fetchFiles();
    } catch (e) {
      onToast?.(e.message || "Share failed", "error");
    }
  };

  const handleDownload = async (f) => {
    try {
      const res = await api.downloadSharedFile(f.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = f.file_name; a.click();
      URL.revokeObjectURL(url);
    } catch {
      onToast?.("Download failed", "error");
    }
  };

  const handleDelete = async (f) => {
    try {
      await api.deleteSharedFile(f.id);
      onToast?.("Shared file removed", "success");
      fetchFiles();
    } catch (e) {
      onToast?.(e.message || "Delete failed", "error");
    }
  };

  return (
    <div style={S.page}>
      <div style={S.title}>Share Point (Temporary File)</div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Share a File</div>
        <div style={{ display:"flex", gap:12, alignItems:"end", flexWrap:"wrap" }}>
          <div style={S.field}><label style={S.label}>Select File *</label><input style={S.input} type="file" onChange={e=>setShareFile(e.target.files[0])} /></div>
          <div style={S.field}>
            <label style={S.label}>Access Role</label>
            <select style={S.select} value={shareRole} onChange={e=>setShareRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r === "Public" ? "Public (Anyone with Link)" : r}</option>)}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Expires In (hours)</label>
            <input style={{...S.input,width:80}} type="number" min={1} max={168} value={shareHours} onChange={e=>setShareHours(Number(e.target.value))} />
          </div>
          <button style={S.btnSm()} onClick={handleShare}>Share</button>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Shared Files</div>
        {loading ? <div style={{textAlign:"center",padding:20,color:"#999"}}>Loading...</div> : files.length === 0 ? (
          <div style={{textAlign:"center",padding:20,color:"#999"}}>No active shared files.</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><th style={th}>File</th><th style={th}>Shared By</th><th style={th}>Role</th><th style={th}>Expires In</th><th style={th}>Downloads</th><th style={th}>Status</th><th style={th}></th></tr></thead>
            <tbody>{files.map((f,i)=>{
              const hrs = Math.floor(f.remaining_seconds / 3600);
              const mins = Math.floor((f.remaining_seconds % 3600) / 60);
              return (
                <tr key={f.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                  <td style={td}><span style={{color:"#0b3d91",cursor:"pointer"}} onClick={() => handleDownload(f)}>{f.file_name}</span></td>
                  <td style={td}>{f.shared_by_name}</td><td style={td}>{f.role}</td>
                  <td style={{...td,fontWeight:600,color:f.remaining_seconds < 600 ? "#e74c3c" : "#333"}}>{hrs}h {mins}m</td>
                  <td style={td}>{f.download_count || 0}</td>
                  <td style={td}><span style={badge(f.is_active ? "#1B5E20" : "#999")}>{f.is_active ? "Active" : "Expired"}</span></td>
                  <td style={td}><button style={{background:"none",border:"none",color:"#c62828",cursor:"pointer",fontSize:12}} onClick={() => handleDelete(f)}>Remove</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
