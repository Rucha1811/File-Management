# Frontend Integration Examples

## 1. Enhanced Fund Management Component

```jsx
import { useState, useEffect } from "react";
import { api } from "../api";

export function FundManagement({ user, section }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ fy: "", month: "", expense_type: "" });
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    head: "",
    allocated: 0,
    spent: 0,
    fy: "2026-27",
    month: "",
    project: "",
    category: "",
    expense_type: "Store",
    audited_statement: "",
  });

  const EXPENSE_CATEGORIES = ["Store", "Spare", "Contractual", "General", "Administrative"];

  useEffect(() => {
    loadData();
    loadSummary();
  }, [filters]);

  const loadData = async () => {
    try {
      const data = await api.listFundManagement(filters);
      setItems(data);
    } catch (err) {
      console.error("Failed to load fund management data:", err);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await api.getFundMonthEndSummary(filters.fy, filters.month);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      await api.createFundManagement(formDataToSend);
      setShowForm(false);
      loadData();
      loadSummary();
    } catch (err) {
      alert("Failed to create record: " + err.message);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportFundManagement(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fund_management_export_${Date.now()}.xlsx`;
      a.click();
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Fund Management</h2>

      {/* Filters */}
      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <select value={filters.fy} onChange={(e) => setFilters({...filters, fy: e.target.value})}>
          <option value="">All FYs</option>
          <option value="2026-27">2026-27</option>
          <option value="2025-26">2025-26</option>
        </select>
        <select value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value})}>
          <option value="">All Months</option>
          <option value="January">January</option>
          <option value="February">February</option>
          {/* Add more months */}
        </select>
        <select value={filters.expense_type} onChange={(e) => setFilters({...filters, expense_type: e.target.value})}>
          <option value="">All Types</option>
          {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)}>Add New</button>
        <button onClick={handleExport}>Export Excel</button>
      </div>

      {/* Month-End Summary */}
      {summary && (
        <div style={{ marginBottom: 20, background: "#f0f8ff", padding: 15, borderRadius: 8 }}>
          <h3>Month-End Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <div>
              <strong>Total Allocated:</strong><br/>
              ₹{summary.total?.allocated?.toLocaleString()}
            </div>
            <div>
              <strong>Total Spent:</strong><br/>
              ₹{summary.total?.spent?.toLocaleString()}
            </div>
            <div>
              <strong>Total Remaining:</strong><br/>
              ₹{summary.total?.remaining?.toLocaleString()}
            </div>
            <div>
              <strong>Utilization:</strong><br/>
              {((summary.total?.spent / summary.total?.allocated) * 100 || 0).toFixed(1)}%
            </div>
          </div>

          {/* By Expense Type */}
          <h4 style={{ marginTop: 15 }}>By Expense Type:</h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e0e0e0" }}>
                <th>Type</th><th>Allocated</th><th>Spent</th><th>Count</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_expense_type?.map((item, i) => (
                <tr key={i}>
                  <td>{item.expense_type}</td>
                  <td>₹{item.allocated?.toLocaleString()}</td>
                  <td>₹{item.spent?.toLocaleString()}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div style={{ marginBottom: 20, background: "#fff", padding: 15, border: "1px solid #ddd" }}>
          <h3>Add Fund Record</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                placeholder="Head/Budget Head"
                value={formData.head}
                onChange={(e) => setFormData({...formData, head: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Allocated"
                value={formData.allocated}
                onChange={(e) => setFormData({...formData, allocated: Number(e.target.value)})}
              />
              <input
                type="number"
                placeholder="Spent"
                value={formData.spent}
                onChange={(e) => setFormData({...formData, spent: Number(e.target.value)})}
              />
              <input
                placeholder="FY (e.g., 2026-27)"
                value={formData.fy}
                onChange={(e) => setFormData({...formData, fy: e.target.value})}
              />
              <input
                placeholder="Month"
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
              />
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({...formData, expense_type: e.target.value})}
              >
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input
                placeholder="Audited Statement (e.g., Q1-2026)"
                value={formData.audited_statement}
                onChange={(e) => setFormData({...formData, audited_statement: e.target.value})}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="submit">Create</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: 10 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#e0e0e0" }}>
            <th>Head</th>
            <th>FY</th>
            <th>Month</th>
            <th>Expense Type</th>
            <th>Allocated</th>
            <th>Spent</th>
            <th>Remaining</th>
            <th>Audited</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.head}</td>
              <td>{item.fy}</td>
              <td>{item.month}</td>
              <td>{item.expense_type}</td>
              <td>₹{item.allocated?.toLocaleString()}</td>
              <td>₹{item.spent?.toLocaleString()}</td>
              <td>₹{item.remaining?.toLocaleString()}</td>
              <td>{item.audited_statement}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 2. Progress Report with Image Upload

```jsx
import { useState, useEffect } from "react";
import { api } from "../api";

export function ProgressReportWithImages({ user }) {
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    project_name: "",
    report_period: "",
    year: "2026",
    section: "Operations",
    subject: "Progress",
    category: "Monthly",
    auto_delete: true,
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.listProgressReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert("File too large (max 50MB)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select an image");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      Object.keys(uploadForm).forEach(key => {
        formData.append(key, uploadForm[key]);
      });

      const result = await api.uploadReportImage(formData);
      alert(`Report uploaded successfully!\nName: ${result.report_name}\nVersion: ${result.version}`);
      setSelectedFile(null);
      setUploadForm({ ...uploadForm, project_name: "", report_period: "" });
      loadReports();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async (reportId) => {
    try {
      const result = await api.generateShareLink(reportId, 7);
      const shareUrl = `${window.location.origin}/shared-report/${result.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      alert(`Share link copied to clipboard!\nExpires: ${new Date(result.expires_at).toLocaleDateString()}`);
    } catch (err) {
      alert("Failed to generate share link: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Progress Reports with Images</h2>

      {/* Upload Form */}
      <div style={{ marginBottom: 20, background: "#f9f9f9", padding: 15, borderRadius: 8 }}>
        <h3>Upload Progress Report (JPG/PNG)</h3>
        <form onSubmit={handleUpload}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input
              placeholder="Project Name *"
              value={uploadForm.project_name}
              onChange={(e) => setUploadForm({...uploadForm, project_name: e.target.value})}
              required
            />
            <input
              placeholder="Report Period (e.g., June 2026)"
              value={uploadForm.report_period}
              onChange={(e) => setUploadForm({...uploadForm, report_period: e.target.value})}
            />
            <input
              placeholder="Year"
              value={uploadForm.year}
              onChange={(e) => setUploadForm({...uploadForm, year: e.target.value})}
            />
            <input
              placeholder="Section"
              value={uploadForm.section}
              onChange={(e) => setUploadForm({...uploadForm, section: e.target.value})}
            />
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={uploadForm.auto_delete}
                onChange={(e) => setUploadForm({...uploadForm, auto_delete: e.target.checked})}
              />
              Auto-delete after 15 days
            </label>
          </div>
          <div style={{ marginBottom: 10 }}>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {selectedFile && <span> Selected: {selectedFile.name}</span>}
          </div>
          <button type="submit" disabled={uploading || !selectedFile}>
            {uploading ? "Uploading..." : "Upload Report"}
          </button>
        </form>
        <p style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
          Standard naming: {uploadForm.project_name || "ProjectName"}_{uploadForm.year}_{uploadForm.section}_{uploadForm.subject}_{uploadForm.category}
        </p>
      </div>

      {/* Reports Gallery */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {reports.map((report) => (
          <div key={report.id} style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
            {report.has_image && (
              <img
                src={report.image_url}
                alt={report.report_name}
                style={{ width: "100%", height: 200, objectFit: "cover" }}
              />
            )}
            <div style={{ padding: 10 }}>
              <h4 style={{ margin: 0, fontSize: 14 }}>{report.report_name || report.project_name}</h4>
              <p style={{ margin: "5px 0", fontSize: 12, color: "#666" }}>
                {report.report_period} • Version {report.version}
              </p>
              {report.auto_delete_at && (
                <p style={{ fontSize: 11, color: "#f44336" }}>
                  Auto-deletes: {new Date(report.auto_delete_at).toLocaleDateString()}
                </p>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 5 }}>
                <button onClick={() => handleShare(report.id)} style={{ fontSize: 12 }}>
                  📤 Share
                </button>
                {report.share_token && (
                  <span style={{ fontSize: 11, color: "green" }}>✓ Shared</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 3. HSE Dashboard Component

```jsx
import { useState, useEffect } from "react";
import { api } from "../api";

export function HSEDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("certificates");
  const [certificates, setCertificates] = useState([]);
  const [expiringCerts, setExpiringCerts] = useState(null);
  const [audits, setAudits] = useState([]);
  const [pendingSummary, setPendingSummary] = useState(null);

  useEffect(() => {
    if (activeTab === "certificates") {
      loadCertificates();
      loadExpiringCerts();
    } else if (activeTab === "audits") {
      loadAudits();
      loadPendingSummary();
    }
  }, [activeTab]);

  const loadCertificates = async () => {
    const data = await api.listHSECertificates();
    setCertificates(data);
  };

  const loadExpiringCerts = async () => {
    const data = await api.getExpiringCertificates(90);
    setExpiringCerts(data);
  };

  const loadAudits = async () => {
    const data = await api.listHSEAudits();
    setAudits(data);
  };

  const loadPendingSummary = async () => {
    const data = await api.getPendingActionsSummary();
    setPendingSummary(data);
  };

  const getExpiryColor = (status) => {
    const colors = {
      "Expired": "#f44336",
      "Expiring Soon": "#ff9800",
      "Warning": "#ffc107",
      "Valid": "#4caf50",
    };
    return colors[status] || "#999";
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>HSE Management</h2>

      {/* Tabs */}
      <div style={{ marginBottom: 20, borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("certificates")}
          style={{
            padding: "10px 20px",
            background: activeTab === "certificates" ? "#1976d2" : "#fff",
            color: activeTab === "certificates" ? "#fff" : "#000",
            border: "none",
            cursor: "pointer",
          }}
        >
          Certificates
        </button>
        <button
          onClick={() => setActiveTab("audits")}
          style={{
            padding: "10px 20px",
            background: activeTab === "audits" ? "#1976d2" : "#fff",
            color: activeTab === "audits" ? "#fff" : "#000",
            border: "none",
            cursor: "pointer",
          }}
        >
          Audits (OBS/ATR)
        </button>
      </div>

      {/* Certificates Tab */}
      {activeTab === "certificates" && (
        <div>
          {/* Expiring Alerts */}
          {expiringCerts && (
            <div style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div style={{ background: "#ffebee", padding: 15, borderRadius: 8 }}>
                <h3 style={{ margin: 0, color: "#f44336" }}>Expired</h3>
                <p style={{ fontSize: 32, margin: "10px 0" }}>{expiringCerts.expired?.length || 0}</p>
              </div>
              <div style={{ background: "#fff3e0", padding: 15, borderRadius: 8 }}>
                <h3 style={{ margin: 0, color: "#ff9800" }}>Expiring Soon (≤30 days)</h3>
                <p style={{ fontSize: 32, margin: "10px 0" }}>{expiringCerts.expiring_soon?.length || 0}</p>
              </div>
              <div style={{ background: "#fffde7", padding: 15, borderRadius: 8 }}>
                <h3 style={{ margin: 0, color: "#ffc107" }}>Warning (≤90 days)</h3>
                <p style={{ fontSize: 32, margin: "10px 0" }}>{expiringCerts.warning?.length || 0}</p>
              </div>
            </div>
          )}

          {/* Certificates Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e0e0e0" }}>
                <th>Certificate Name</th>
                <th>Issued To</th>
                <th>Cert Number</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id}>
                  <td>{cert.name}</td>
                  <td>{cert.issued_to}</td>
                  <td>{cert.certificate_number}</td>
                  <td>{cert.expiry_date}</td>
                  <td>{cert.days_remaining !== null ? cert.days_remaining : "N/A"}</td>
                  <td>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: getExpiryColor(cert.expiry_status),
                      color: "#fff",
                      fontSize: 12,
                    }}>
                      {cert.expiry_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audits Tab */}
      {activeTab === "audits" && (
        <div>
          {/* Pending Actions Summary */}
          {pendingSummary && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 15 }}>
                <div style={{ background: "#e3f2fd", padding: 15, borderRadius: 8 }}>
                  <h4>Total Pending</h4>
                  <p style={{ fontSize: 28, margin: 0 }}>{pendingSummary.total_pending}</p>
                </div>
                <div style={{ background: "#ffebee", padding: 15, borderRadius: 8 }}>
                  <h4>Overdue</h4>
                  <p style={{ fontSize: 28, margin: 0, color: "#f44336" }}>{pendingSummary.overdue_count}</p>
                </div>
                <div style={{ background: "#fff3e0", padding: 15, borderRadius: 8 }}>
                  <h4>Due Soon</h4>
                  <p style={{ fontSize: 28, margin: 0, color: "#ff9800" }}>{pendingSummary.due_soon_count}</p>
                </div>
                <div style={{ background: "#f3e5f5", padding: 15, borderRadius: 8 }}>
                  <h4>By Priority</h4>
                  <div style={{ fontSize: 12 }}>
                    High: {pendingSummary.by_priority?.High || 0}<br/>
                    Med: {pendingSummary.by_priority?.Medium || 0}<br/>
                    Low: {pendingSummary.by_priority?.Low || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audits Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e0e0e0" }}>
                <th>Observation</th>
                <th>Responsible</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} style={{ background: audit.is_overdue ? "#ffebee" : "#fff" }}>
                  <td>{audit.observation?.substring(0, 50)}...</td>
                  <td>{audit.responsible_person}</td>
                  <td>
                    {audit.due_date}
                    {audit.is_overdue && <span style={{ color: "#f44336", marginLeft: 5 }}>
                      (⚠️ {audit.days_overdue}d overdue)
                    </span>}
                  </td>
                  <td>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: 3,
                      fontSize: 11,
                      background: audit.action_priority === "High" ? "#f44336" :
                                  audit.action_priority === "Medium" ? "#ff9800" : "#4caf50",
                      color: "#fff",
                    }}>
                      {audit.action_priority || "None"}
                    </span>
                  </td>
                  <td>{audit.status}</td>
                  <td>{audit.pending_action ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

## How to Use These Examples

1. Copy the component code to your components directory
2. Update import paths as needed
3. Make sure the API client has the required methods (see SETUP_AND_RUN_GUIDE.md)
4. Add the components to your routing/navigation
5. Test with actual data from the backend

## Styling Notes

These examples use inline styles for simplicity. In production:
- Replace with CSS modules or styled-components
- Use your existing design system
- Add proper loading states and error handling
- Add form validation
- Implement pagination for large datasets
