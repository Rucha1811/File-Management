import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { S, th, td, badge, C0 } from "./styles";
import { DonutSimple, COL0 } from "./Charts";
import { DrillDownModal } from "./DrillDownModal";
import FileUploadForm from "../FileUploadForm";

const statusColor = { "Approved":"#1B5E20","Pending":"#E65100","Rejected":"#B71C1C" };
const statusBg = { "Approved":"#E8F5E9","Pending":"#FFF3E0","Rejected":"#FFEBEE" };

export function ModuleFilesSection({ section, user, onToast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [drillDown, setDrillDown] = useState(null);
  const [filter, setFilter] = useState({
    search: "", season: "", category: "", classification: "", status: "", file_type: "", data_type: "", block: "", sortBy: "name", sortDir: "asc"
  });

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.searchFiles({ section: section });
      setFiles(Array.isArray(data) ? data : []);
      setSearchResults(null);
    } catch {
      setFiles([]);
    }
    setLoading(false);
  }, [section]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSearch = async () => {
    if (!filter.search.trim()) {
      setSearchResults(null);
      loadFiles();
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchFiles({ search: filter.search, section: section });
      setSearchResults(res || []);
    } catch (e) {
      onToast?.("Search failed: " + e.message, "error");
    }
    setSearching(false);
  };

  const handleFileAction = async (id, action, classification) => {
    try {
      if (action === "approve") {
        await api.approveFile(id, classification);
        onToast?.("File approved", "success");
      } else if (action === "reject") {
        const comment = prompt("Enter rejection reason:");
        if (comment === null) return;
        await api.rejectFile(id, comment);
        onToast?.("File rejected", "success");
      }
      loadFiles();
    } catch (e) {
      onToast?.(e.message || "Action failed", "error");
    }
  };

  const handleDownload = (id, fileName) => {
    api.downloadFile(id)
      .then(async (res) => {
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((e) => onToast?.(e.message, "error"));
  };

  const handleView = (id) => {
    api.viewFile(id)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load preview");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      })
      .catch((e) => onToast?.(e.message, "error"));
  };

  const activeFiles = searchResults !== null ? searchResults : files;

  const byStatus = { Approved: 0, Pending: 0, Rejected: 0 };
  const byCategory = {};
  const byType = {};
  const byClassification = {};

  activeFiles.forEach(f => {
    const s = f.status || "Pending";
    byStatus[s] = (byStatus[s] || 0) + 1;
    const cat = f.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    const t = f.file_type || "Unknown";
    byType[t] = (byType[t] || 0) + 1;
    const c = f.classification || "Unclassified";
    byClassification[c] = (byClassification[c] || 0) + 1;
  });

  const allSeasons = [...new Set(activeFiles.map(f => f.season).filter(Boolean))].sort();
  const allCategories = [...new Set(activeFiles.map(f => f.category).filter(Boolean))].sort();
  const classifs = ["General / Available for All", "Sensitive / Internal Use", "Confidential", "Highly Confidential / Restricted"];
  const statuses = ["Approved", "Pending", "Rejected"];
  const allFileTypes = [...new Set(activeFiles.map(f => f.file_type).filter(Boolean))].sort();
  const allDataTypes = [...new Set(activeFiles.map(f => f.data_type).filter(Boolean))].sort();
  const allBlocks = [...new Set(activeFiles.map(f => f.block).filter(Boolean))].sort();

  const displayed = activeFiles.filter(f => {
    if (filter.season && f.season !== filter.season) return false;
    if (filter.category && f.category !== filter.category) return false;
    if (filter.classification && f.classification !== filter.classification) return false;
    if (filter.status && (f.status || "Pending") !== filter.status) return false;
    if (filter.file_type && f.file_type !== filter.file_type) return false;
    if (filter.data_type && f.data_type !== filter.data_type) return false;
    if (filter.block && f.block !== filter.block) return false;
    return true;
  }).sort((a, b) => {
    let valA = a[filter.sortBy === "name" ? "file_name" : filter.sortBy === "date" ? "created_at" : filter.sortBy === "project" ? "project_name" : filter.sortBy] || "";
    let valB = b[filter.sortBy === "name" ? "file_name" : filter.sortBy === "date" ? "created_at" : filter.sortBy === "project" ? "project_name" : filter.sortBy] || "";
    if (filter.sortBy === "date") {
      valA = a.created_at || a.upload_date || "";
      valB = b.created_at || b.upload_date || "";
    }
    const dir = filter.sortDir === "asc" ? 1 : -1;
    return String(valA).localeCompare(String(valB)) * dir;
  });

  const thSort = (key, label) => {
    const active = filter.sortBy === key;
    return (
      <th style={{ ...th, cursor: "pointer", color: active ? "#0b3d91" : "#555" }} onClick={() => setFilter(f => ({ ...f, sortBy: key, sortDir: f.sortBy === key && f.sortDir === "asc" ? "desc" : "asc" }))}>
        {label} {active && (filter.sortDir === "asc" ? "▲" : "▼")}
      </th>
    );
  };

  const selStyle = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, outline: "none", background: "#fff", color: "#333" };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={S.title}>Document Vault — {section}</div>
        {canEdit && (
          <button style={{ padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: showUpload ? "#e74c3c" : "#0b3d91", color: "#fff" }}
            onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? "Close Upload" : "📄 Upload Document"}
          </button>
        )}
      </div>

      {showUpload && canEdit && (
        <FileUploadForm user={user} section={section} onUpload={() => { loadFiles(); setShowUpload(false); }} onToast={onToast} />
      )}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          ["Total Files", activeFiles.length, C0.blue, null],
          ["Approved", byStatus.Approved, C0.green, f => (f.status || "Pending") === "Approved"],
          ["Pending", byStatus.Pending, C0.orange, f => (f.status || "Pending") === "Pending"],
          ["Rejected", byStatus.Rejected, C0.red, f => (f.status || "Pending") === "Rejected"]
        ].map(([l, v, c, fl]) => (
          <div key={l} style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: fl ? "pointer" : "default" }}
            onClick={() => fl && setDrillDown({ title: l + " Files", data: activeFiles.filter(fl).map(f => ({ Name: f.file_name, Type: f.file_type, Status: f.status, Category: f.category })) })}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 13, color: "#888", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Donut Charts */}
      {activeFiles.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={S.section}>
            <div style={S.sectionTitle}>Files by Category</div>
            <DonutSimple data={byCategory} colors={COL0} size={100} onClick={k => setDrillDown({ title: "Category: " + k, data: activeFiles.filter(f => (f.category || "Uncategorized") === k).map(f => ({ Name: f.file_name, Type: f.file_type, Status: f.status })) })} />
          </div>
          <div style={S.section}>
            <div style={S.sectionTitle}>Status Distribution</div>
            <DonutSimple data={byStatus} colors={[C0.green, C0.orange, C0.red]} size={100} onClick={k => setDrillDown({ title: "Status: " + k, data: activeFiles.filter(f => (f.status || "Pending") === k).map(f => ({ Name: f.file_name, Type: f.file_type, Category: f.category })) })} />
          </div>
        </div>
      )}

      {/* Files List Table Section */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Uploaded Files Directory</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <input style={{ ...S.input, width: 180, fontSize: 13, marginBottom: 0 }} placeholder="Search filename…" value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
          <button style={{ padding: "6px 12px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600, background: "#0b3d91", color: "#fff" }} onClick={handleSearch}>
            {searching ? "…" : "Search"}
          </button>
          {searchResults && <button style={{ padding: "6px 12px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 13, background: "#fff", color: "#666" }} onClick={() => { setFilter(f => ({ ...f, search: "" })); setSearchResults(null); loadFiles(); }}>Clear</button>}

          <select style={selStyle} value={filter.season} onChange={e => setFilter(f => ({ ...f, season: e.target.value }))}>
            <option value="">All Seasons</option>
            {allSeasons.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={selStyle} value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={selStyle} value={filter.classification} onChange={e => setFilter(f => ({ ...f, classification: e.target.value }))}>
            <option value="">All Classifications</option>
            {classifs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={selStyle} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: "#888", fontSize: 13 }}>Loading files...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999", fontSize: 13 }}>No files found for this section.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr>
                  {thSort("name", "File Name")}
                  {thSort("project", "Project")}
                  {thSort("category", "Category")}
                  {thSort("type", "Type")}
                  {thSort("classification", "Classification")}
                  {thSort("season", "Season")}
                  {thSort("status", "Status")}
                  {thSort("date", "Uploaded Date")}
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((f, i) => {
                  const status = f.status || "Pending";
                  const canApproveReject = user?.role === "admin" || (user?.role === "ops_manager" && status === "Pending");
                  return (
                    <tr key={f.id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8", fontWeight: 500, color: "#0b3d91" }}>{f.file_name || f.fileName || "—"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8" }}>{f.project_name || f.projectName || "—"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8", color: "#555" }}>{f.category || "—"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8" }}><span style={badge(f.file_type === "PDF" ? "#1565c0" : "#6a1b9a")}>{f.file_type || f.fileType || "—"}</span></td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8" }}><span style={badge(f.classification?.includes("Confidential") || f.classification?.includes("Sensitive") ? "#e65100" : "#2e7d32")}>{f.classification || "—"}</span></td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8", color: "#555" }}>{f.season || "—"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8" }}><span style={badge(statusColor[status])}>{status}</span></td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8", color: "#888" }}>{f.created_at ? f.created_at.slice(0, 10) : f.upload_date ? String(f.upload_date).slice(0, 10) : "—"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f4f8", whiteSpace: "nowrap" }}>
                        <button style={{ fontSize: 11, padding: "2px 6px", marginRight: 4, background: "#e1f5fe", color: "#0288d1", border: "none", borderRadius: 3, cursor: "pointer" }} onClick={() => handleView(f.id)}>View</button>
                        <button style={{ fontSize: 11, padding: "2px 6px", marginRight: 4, background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 3, cursor: "pointer" }} onClick={() => handleDownload(f.id, f.file_name)}>Download</button>
                        {canApproveReject && (
                          <>
                            <button style={{ fontSize: 11, padding: "2px 6px", marginRight: 4, background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 3, cursor: "pointer" }} onClick={() => handleFileAction(f.id, "approve", f.classification)}>Approve</button>
                            <button style={{ fontSize: 11, padding: "2px 6px", background: "#ffebee", color: "#c62828", border: "none", borderRadius: 3, cursor: "pointer" }} onClick={() => handleFileAction(f.id, "reject")}>Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {drillDown && <DrillDownModal title={drillDown.title} data={drillDown.data} onClose={() => setDrillDown(null)} />}
    </div>
  );
}
