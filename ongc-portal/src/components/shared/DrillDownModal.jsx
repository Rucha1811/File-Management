export function DrillDownModal({ title, data, onClose }) {
  if (!data || !data.length) return null;
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.4)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:10, padding:24, maxWidth:700, width:"90%", maxHeight:"70vh", overflow:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91" }}>{title}</div>
          <button style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#999", lineHeight:1 }} onClick={onClose}>×</button>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead><tr>
            {Object.keys(data[0]).map(k => <th key={k} style={{ textAlign:"left", padding:"8px 10px", borderBottom:"2px solid #e0e0e0", color:"#666", fontWeight:600, fontSize:12 }}>{k}</th>)}
          </tr></thead>
          <tbody>{data.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
              {Object.values(row).map((v, j) => <td key={j} style={{ padding:"8px 10px", borderBottom:"1px solid #f0f0f0", color:"#444", fontSize:13 }}>{v ?? "—"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
