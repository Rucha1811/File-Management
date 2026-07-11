import { useState } from "react";
import { api } from "../../api";
import { S } from "../shared/styles";
import { DynamicCRUD } from "../shared/DynamicCRUD";

export function HSE({ user, onToast }) {
  const [items, setItems] = useState([]);

  const stats = {
    daysWithoutIncident: 185, totalInspections: 24, complianceRate: "97.2%",
    activeDrills: 3, lastInspection: "2025-06-14", pendingActions: 2,
  };

  return (
    <div style={S.page}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Days Without Incident",stats.daysWithoutIncident,"#1B5E20"],["Compliance Rate",stats.complianceRate,"#0b3d91"],["Pending Actions",stats.pendingActions,"#E65100"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:28,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[["Total Inspections",stats.totalInspections],["Active Drills",stats.activeDrills],["Last Inspection",stats.lastInspection]].map(([l,v])=>(
          <div key={l} style={S.card}>
            <div style={{fontSize:14,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{v}</div>
          </div>
        ))}
      </div>
      <DynamicCRUD
        page="HSE"
        title="HSE Dashboard"
        apiList={api.listHSEIncidents}
        apiCreate={api.createHSEIncident}
        apiUpdate={api.updateHSEIncident}
        apiDelete={api.deleteHSEIncident}
        apiExcelPreview={api.excelHSEPreview}
        apiExcelImport={api.excelHSEImport}
        excelFields="hse_incident"
        user={user}
        onToast={onToast}
        onItemsChange={setItems}
      />
    </div>
  );
}
