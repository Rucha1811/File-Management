import { useState, useEffect, useCallback, useRef } from "react";
import { api, getToken } from "../../api";
import { S } from "../shared/styles";
import { ModuleFilesSection } from "../shared/ModuleFilesSection";

const BASE = import.meta.env.VITE_API_URL || "";

/* ─── Image card with authenticated blob-URL loading & lightbox ─── */
function ImageCard({ file, onDelete, canEdit }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    const tok = getToken();
    const headers = {};
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    fetch(`${BASE}/api/files/view/${file.id}`, { headers })
      .then(r => r.blob())
      .then(b => { objectUrl = URL.createObjectURL(b); setImgSrc(objectUrl); setLoading(false); })
      .catch(() => setLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id]);

  return (
    <>
      <div
        style={{
          background: "#fff", borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "hidden", display: "flex", flexDirection: "column",
          transition: "box-shadow 0.2s, transform 0.2s", cursor: "pointer"
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(11,61,145,0.15)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "none"; }}
      >
        {/* Thumbnail */}
        <div
          style={{ height: 180, background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}
          onClick={() => imgSrc && setLightbox(true)}
        >
          {loading ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>Loading…</div>
          ) : imgSrc ? (
            <img src={imgSrc} alt={file.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 40 }}>🖼️</div>
          )}
          {imgSrc && (
            <div
              className="pr-img-overlay"
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0)"; }}
            >
              <span style={{ color: "#fff", fontSize: 26, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>🔍 View</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {file.file_name}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>
            {file.upload_date ? String(file.upload_date).slice(0, 10) : "—"}
            {file.uploaded_by_name ? ` · ${file.uploaded_by_name}` : ""}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              style={{ flex: 1, padding: "4px 0", background: "#e3f2fd", color: "#0277bd", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              onClick={() => setLightbox(true)}
              disabled={!imgSrc}
            >🔍 View Full</button>
            {canEdit && (
              <button
                style={{ flex: 1, padding: "4px 0", background: "#ffebee", color: "#c62828", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); onDelete(file.id); }}
              >🗑 Delete</button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && imgSrc && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox(false)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <img src={imgSrc} alt={file.file_name}
              style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", display: "block" }}
            />
            <div style={{ textAlign: "center", color: "#fff", marginTop: 10, fontSize: 14, fontWeight: 600 }}>{file.file_name}</div>
            <button
              style={{
                position: "absolute", top: -14, right: -14,
                background: "#fff", border: "none", borderRadius: "50%",
                width: 32, height: 32, fontSize: 18, lineHeight: "32px",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", textAlign: "center"
              }}
              onClick={() => setLightbox(false)}
            >✕</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main Progress Report Component ─── */
export function ProgressReport({ user, onToast }) {
  const [activeTab, setActiveTab] = useState("Image Gallery");
  const [imageFiles, setImageFiles] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const fileInputRef = useRef(null);

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const data = await api.searchFiles({ section: "Progress Report" });
      const files = Array.isArray(data) ? data : (data?.files || []);
      const images = files.filter(f => {
        const name = (f.file_name || "").toLowerCase();
        const type = (f.file_type || "").toLowerCase();
        return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")
          || type === "jpg" || type === "jpeg" || type === "png" || type === "image/jpeg" || type === "image/png";
      });
      setImageFiles(images);
    } catch {
      onToast?.("Failed to load progress report images", "error");
    }
    setLoadingImages(false);
  }, []);

  useEffect(() => {
    if (activeTab === "Image Gallery") loadImages();
  }, [activeTab, loadImages]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = ["image/jpeg", "image/jpg", "image/png"].includes(file.type)
      || /\.(jpg|jpeg|png)$/i.test(file.name);
    if (!isImage) {
      onToast?.("Only JPG and PNG images are allowed for Progress Reports", "error");
      setInputKey(k => k + 1);
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading "${file.name}"…`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("file_name", file.name);
      fd.append("file_type", "JPG");
      fd.append("section", "Progress Report");
      fd.append("classification", "General / Available for All");
      fd.append("description", `Progress Report image — ${new Date().toLocaleDateString()}`);
      await api.uploadFile(fd);
      onToast?.(`"${file.name}" uploaded successfully!`, "success");
      setInputKey(k => k + 1);
      loadImages();
    } catch (err) {
      onToast?.(err.message || "Upload failed", "error");
    }
    setUploading(false);
    setUploadProgress(null);
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Delete this progress report image?")) return;
    // Soft-delete: remove from local list immediately (file soft-delete via backend PATCH)
    setImageFiles(prev => prev.filter(f => f.id !== fileId));
    try {
      await api.updateFile(fileId, { deleted: true });
      onToast?.("Image deleted", "success");
    } catch {
      onToast?.("Image removed from view", "info");
    }
  };

  const tabStyle = (tab) => ({
    padding: "8px 20px", borderRadius: 4, border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: 14,
    background: activeTab === tab ? "#0b3d91" : "#e8eaf6",
    color: activeTab === tab ? "#fff" : "#3949ab",
    transition: "background 0.2s, color 0.2s",
  });

  return (
    <div style={S.page}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "2px solid #e0e4f0", paddingBottom: 12 }}>
        {["Image Gallery", "Documents & Files"].map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      {/* ── TAB 1: IMAGE GALLERY ── */}
      {activeTab === "Image Gallery" && (
        <div>
          {/* Upload Zone */}
          {canEdit && (
            <div style={{
              background: "linear-gradient(135deg, #e8f0fe 0%, #e8f5e9 100%)",
              border: "2px dashed #90caf9", borderRadius: 14,
              padding: "24px 28px", marginBottom: 28,
              display: "flex", alignItems: "center", gap: 20,
              boxShadow: "0 2px 12px rgba(11,61,145,0.06)"
            }}>
              <div style={{ fontSize: 52 }}>📸</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: "#0b3d91", marginBottom: 4 }}>
                  Upload Daily Progress Report Image
                </div>
                <div style={{ fontSize: 13, color: "#546e7a", marginBottom: 14, lineHeight: 1.5 }}>
                  Upload JPG / JPEG / PNG scans or photos of daily progress reports.<br />
                  Images are stored securely and displayed in the gallery below.
                </div>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "9px 22px", background: uploading ? "#90a4ae" : "#0b3d91",
                  color: "#fff", borderRadius: 6, cursor: uploading ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: 13, boxShadow: "0 2px 8px rgba(11,61,145,0.25)",
                  transition: "background 0.2s"
                }}>
                  {uploading ? "⏳ Uploading…" : "📤 Choose Image (JPG/PNG)"}
                  <input
                    key={inputKey}
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={handleImageUpload}
                  />
                </label>
                {uploadProgress && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#0b3d91", fontWeight: 600 }}>
                    {uploadProgress}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontSize: 13, color: "#607d8b", lineHeight: 2 }}>
                <div style={{ fontWeight: 700, color: "#0b3d91" }}>✅ Accepted:</div>
                <div>.JPG &nbsp; .JPEG &nbsp; .PNG</div>
                <div style={{ marginTop: 6, fontWeight: 700, color: "#0b3d91" }}>
                  📁 {imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""} stored
                </div>
              </div>
            </div>
          )}

          {/* Gallery header */}
          {imageFiles.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e" }}>Progress Report Gallery</div>
              <div style={{ fontSize: 12, background: "#e3f2fd", color: "#0277bd", padding: "3px 12px", borderRadius: 20, fontWeight: 700 }}>
                {imageFiles.length} Report{imageFiles.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Grid / Empty state */}
          {loadingImages ? (
            <div style={{ textAlign: "center", padding: 72, color: "#888" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14 }}>Loading progress report images…</div>
            </div>
          ) : imageFiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: 72, background: "#fafbff", borderRadius: 14, border: "1px dashed #c5cae9" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🖼️</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#555", marginBottom: 6 }}>No Progress Report Images Yet</div>
              <div style={{ fontSize: 13, color: "#888" }}>
                {canEdit
                  ? "Use the upload button above to add daily progress report images."
                  : "No images have been uploaded yet."}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
              {imageFiles.map(f => (
                <ImageCard key={f.id} file={f} onDelete={handleDelete} canEdit={canEdit} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DOCUMENTS & FILES (existing doc vault) ── */}
      {activeTab === "Documents & Files" && (
        <ModuleFilesSection section="Progress Report" user={user} onToast={onToast} />
      )}
    </div>
  );
}
