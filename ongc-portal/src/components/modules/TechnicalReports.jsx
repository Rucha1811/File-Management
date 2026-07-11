import { useState } from "react";
import { api } from "../../api";
import { S } from "../shared/styles";
import { DynamicCRUD } from "../shared/DynamicCRUD";

const TABS = ["Reconnaissance Reports","Project Reports","Operations Reports","Field Observer Logs"];

export function TechnicalReports({ user, onToast }) {
  const [active, setActive] = useState("Project Reports");
  const [items, setItems] = useState([]);

  return (
    <div style={S.page}>
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {TABS.map(t => (
          <button key={t} style={{padding:"6px 14px",borderRadius:4,border:"none",cursor:"pointer",fontWeight:600,fontSize:14,background:active===t?"#0b3d91":"#e0e0e0",color:active===t?"#fff":"#333"}} onClick={()=>setActive(t)}>{t}</button>
        ))}
      </div>
      <DynamicCRUD
        key={active}
        page="Technical Reports"
        title={`Technical Reports — ${active}`}
        apiList={() => api.listTechnicalReports(active)}
        apiCreate={api.createTechnicalReport}
        apiUpdate={api.updateTechnicalReport}
        apiDelete={api.deleteTechnicalReport}
        apiExcelPreview={api.excelReportPreview}
        apiExcelImport={api.excelReportImport}
        excelFields="report"
        uploadSection="Technical Reports"
        user={user}
        onToast={onToast}
        onItemsChange={setItems}
      />
    </div>
  );
}
