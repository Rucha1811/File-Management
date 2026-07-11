import { api } from "../../api";
import { S } from "../shared/styles";
import { DynamicCRUD } from "../shared/DynamicCRUD";

export function ProgressReport({ user, onToast }) {
  return (
    <div style={S.page}>
      <DynamicCRUD
        page="Progress Report"
        title="Progress Report"
        apiList={api.listProgressReports}
        apiCreate={api.createProgressReport}
        apiUpdate={api.updateProgressReport}
        apiDelete={api.deleteProgressReport}
        apiExcelPreview={api.excelProgressPreview}
        apiExcelImport={api.excelProgressImport}
        excelFields="progress_report"
        uploadSection="Progress Report"
        user={user}
        onToast={onToast}
      />
    </div>
  );
}
