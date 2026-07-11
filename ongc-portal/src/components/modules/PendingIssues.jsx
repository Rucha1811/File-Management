import { useState } from "react";
import { api } from "../../api";
import { S } from "../shared/styles";
import { DynamicCRUD } from "../shared/DynamicCRUD";

export function PendingIssues({ user, onToast }) {
  const [items, setItems] = useState([]);
  const pending = items.filter(i => i.status !== "Resolved").length;
  const resolved = items.filter(i => i.status === "Resolved").length;

  return (
    <div style={S.page}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Total Issues",items.length,"#0b3d91"],["Pending",pending,"#E65100"],["Resolved",resolved,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <DynamicCRUD
        page="Pending Issues"
        title="Pending vs Resolved Issues"
        apiList={api.listPendingIssues}
        apiCreate={api.createPendingIssue}
        apiUpdate={api.updatePendingIssue}
        apiDelete={api.deletePendingIssue}
        apiExcelPreview={api.excelIssuePreview}
        apiExcelImport={api.excelIssueImport}
        excelFields="pending_issue"
        user={user}
        onToast={onToast}
        onItemsChange={setItems}
      />
    </div>
  );
}
