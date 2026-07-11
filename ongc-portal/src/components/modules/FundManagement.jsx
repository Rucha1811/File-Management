import { useState } from "react";
import { api } from "../../api";
import { S } from "../shared/styles";
import { DynamicCRUD } from "../shared/DynamicCRUD";

export function FundManagement({ user, onToast }) {
  const [items, setItems] = useState([]);

  const totalAlloc = items.reduce((s, d) => s + Number(d.allocated || 0), 0);
  const totalSpent = items.reduce((s, d) => s + Number(d.spent || 0), 0);
  const totalRemain = items.reduce((s, d) => s + Number(d.remaining || 0), 0);

  return (
    <div style={S.page}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Total Allocated",`₹${totalAlloc.toFixed(1)} Cr`,"#0b3d91"],
          ["Total Spent",`₹${totalSpent.toFixed(1)} Cr`,"#E65100"],
          ["Remaining",`₹${totalRemain.toFixed(1)} Cr`,"#1B5E20"]].map(([l,v,c]) => (
          <div key={l} style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <DynamicCRUD
        page="Fund Management"
        title="Fund Management"
        apiList={api.listFundManagement}
        apiCreate={api.createFundManagement}
        apiUpdate={api.updateFundManagement}
        apiDelete={api.deleteFundManagement}
        apiExcelPreview={api.excelFundPreview}
        apiExcelImport={api.excelFundImport}
        excelFields="fund_management"
        uploadSection="Fund Management"
        user={user}
        onToast={onToast}
        onItemsChange={setItems}
      />
    </div>
  );
}
