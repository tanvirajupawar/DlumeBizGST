import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const downloadExcel = (data, fileName = "Report") => {
  if (!data.length) {
    alert("No data available");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const downloadPDF = (data, columns, fileName = "Report") => {
  if (!data.length) {
    alert("No data available");
    return;
  }

  const doc = new jsPDF();

  const rows = data.map((row) =>
    columns.map((col) => row[col.key] ?? "")
  );

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: rows,
  });

  doc.save(`${fileName}.pdf`);
};