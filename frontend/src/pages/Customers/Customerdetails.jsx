import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import InvoiceDetailPanel from "../../components/InvoiceDetailPanel";
import SalesReturnModal from "../../components/SalesReturnModal";
import CreditNoteModal from "../../components/CreditNoteModal";
import ActionMenu from "../../components/ActionMenu";
import PaymentSuccessScreen from "../Payment/PaymentSuccessScreen";
import { downloadExcel } from "../../utils/exportUtils";

const FILTERS = [
  "Today","Yesterday","This Week","Last Week","Last 7 Days",
  "This Month","Previous Month","Last 30 Days",
  "This Quarter","Previous Quarter",
  "Current Fiscal Year","Previous Fiscal Year",
  "Last 365 Days","Custom Date Range",
];

// ── PDF Generator ─────────────────────────────────────────────────────────────
const generatePDFFile = async (data, columns, title, customer = null) => {
  const { jsPDF } = await import("jspdf");
  const autoTable  = (await import("jspdf-autotable")).default;

  const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW    = 210;
  const pageH    = 297;
  const margin   = 15;
  const contentW = pageW - margin * 2;

  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const txt = (text, x, y, opts = {}) => doc.text(String(text ?? ""), x, y, opts);
  const line = (x1, y1, x2, y2) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.line(x1, y1, x2, y2);
  };

  const drawPageHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    txt("D'Lume", margin, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    txt("Ph: 9137826646", margin, 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    txt(title, pageW - margin, 14, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    txt(`Generated: ${dateStr}`, pageW - margin, 19, { align: "right" });

    line(margin, 22, pageW - margin, 22);
  };

  drawPageHeader();
  let y = 28;

  if (customer) {
    const name    = customer.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—";
    const phone   = customer.contact_no_1 || customer.phone || "—";
    const email   = customer.email || "—";
    const gstin   = customer.gstin || "—";
    const pan     = customer.pan_number || "—";
    const addr    = [customer.address_line_1, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ") || "—";
    const ship    = [customer.shipping_address_line_1, customer.shipping_city, customer.shipping_state, customer.shipping_pincode].filter(Boolean).join(", ") || "—";
    const openBal = "Rs. " + Number(customer.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const partyType = customer.party_type || "Customer";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    txt("To,", margin, y);
    y += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    txt(name, margin, y);
    y += 5;

    const fields = [
      ["Mobile",          phone,    "GSTIN",            gstin   ],
      ["Email",           email.length > 35 ? email.substring(0,33)+"…" : email,
                                    "PAN",              pan     ],
      ["Party Type",      partyType,"Opening Balance",  openBal ],
      ["Billing Address", addr.length > 35 ? addr.substring(0,33)+"…" : addr,
                                    "Shipping Address", ship.length > 35 ? ship.substring(0,33)+"…" : ship],
    ];

    const lLabel = margin;
    const lVal   = margin + 28;
    const rLabel = margin + 95;
    const rVal   = margin + 123;

    fields.forEach(([ll, lv, rl, rv]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      txt(ll, lLabel, y);
      txt(rl, rLabel, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      txt(lv, lVal, y);
      txt(rv, rVal, y);
      y += 5;
    });

    y += 2;
    line(margin, y, pageW - margin, y);
    y += 5;
  }

  autoTable(doc, {
    startY: y,
    head: [columns.map(c => c.label)],
    body: data.map(row =>
      columns.map(c => {
        const val = row[c.key];
        if (val === null || val === undefined) return "—";
        return String(val);
      })
    ),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      font: "helvetica",
      textColor: [25, 25, 25],
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [25, 25, 25],
      fontStyle: "bold",
      fontSize: 7.5,
      lineColor: [170, 170, 170],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    bodyStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      ...(columns.length > 2 && {
        [columns.length - 1]: { halign: "right" },
        ...(columns.length > 3 && { [columns.length - 2]: { halign: "right" } }),
        ...(columns.length > 4 && { [columns.length - 3]: { halign: "right" } }),
      }),
    },
    didDrawPage: (hookData) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      line(margin, pageH - 11, pageW - margin, pageH - 11);
      txt(`Page ${hookData.pageNumber} of ${pageCount}`, pageW - margin, pageH - 6, { align: "right" });
      txt("D'Lume — Confidential", margin, pageH - 6);
    },
  });

  const lastY = doc.lastAutoTable.finalY;
  const amountCols = columns.filter(c =>
    ["amount", "balance", "debit", "credit"].some(k => c.key.toLowerCase().includes(k))
  );

  if (amountCols.length > 0 && data.length > 0) {
    const summaryY = lastY + 4;
    line(margin, summaryY, pageW - margin, summaryY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    txt(`${data.length} record${data.length !== 1 ? "s" : ""}`, margin, summaryY + 5);

    let rightOffset = pageW - margin;
    [...amountCols].reverse().forEach(col => {
      const total = data.reduce((sum, row) => sum + Number(row[col.key] || 0), 0);
      const formatted = "Rs. " + total.toLocaleString("en-IN", { minimumFractionDigits: 2 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      txt(`${col.label}:`, rightOffset - 28, summaryY + 5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(20, 20, 20);
      txt(formatted, rightOffset, summaryY + 5, { align: "right" });

      rightOffset -= 52;
    });
  }

  const blob = doc.output("blob");
  return new File([blob], `${title}.pdf`, { type: "application/pdf" });
};

// ── Excel Generator ───────────────────────────────────────────────────────────
const generateExcelFile = async (data, columns, title, customer = null) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const rows = [];

  rows.push(["D'Lume"]);
  rows.push(["Ph: 9137826646"]);
  rows.push([`Report: ${title}`]);
  rows.push([`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`]);
  rows.push([]);

  if (customer) {
    const name    = customer.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—";
    const phone   = customer.contact_no_1 || customer.phone || "—";
    const email   = customer.email || "—";
    const gstin   = customer.gstin || "—";
    const pan     = customer.pan_number || "—";
    const addr    = [customer.address_line_1, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ") || "—";
    const ship    = [customer.shipping_address_line_1, customer.shipping_city, customer.shipping_state, customer.shipping_pincode].filter(Boolean).join(", ") || "—";
    const openBal = Number(customer.opening_balance || 0);
    const partyType = customer.party_type || "Customer";

    rows.push(["Party Name",       name]);
    rows.push(["Party Type",       partyType]);
    rows.push(["Mobile",           phone]);
    rows.push(["Email",            email]);
    rows.push(["GSTIN",            gstin]);
    rows.push(["PAN",              pan]);
    rows.push(["Opening Balance",  openBal]);
    rows.push(["Billing Address",  addr]);
    rows.push(["Shipping Address", ship]);
    rows.push([]);
  }

  rows.push(columns.map(c => c.label));

  data.forEach(row => {
    rows.push(columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return "";
      if (typeof val === "number") return val;
      const num = Number(val);
      if (!isNaN(num) && val !== "" && val !== "—" && val !== "-") return num;
      return String(val);
    }));
  });

  const amountCols = columns.filter(c =>
    ["amount", "balance", "debit", "credit"].some(k => c.key.toLowerCase().includes(k))
  );
  if (amountCols.length > 0 && data.length > 0) {
    rows.push([]);
    const totalsRow = columns.map(col => {
      if (amountCols.some(ac => ac.key === col.key)) {
        return data.reduce((sum, row) => sum + Number(row[col.key] || 0), 0);
      }
      return col.key === columns[0].key ? "TOTAL" : "";
    });
    rows.push(totalsRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = columns.map(c => {
    if (["address", "addr", "email"].some(k => c.key.toLowerCase().includes(k))) return { wch: 38 };
    if (["amount", "balance", "debit", "credit"].some(k => c.key.toLowerCase().includes(k))) return { wch: 16 };
    return { wch: 18 };
  });

  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob  = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return new File([blob], `${title}.xlsx`, { type: blob.type });
};

const triggerDownload = (file) => {
  const url = URL.createObjectURL(file);
  const a   = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = {
  Back:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Receipt:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  User:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Ledger:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  Edit:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Chevron:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  Sort:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="5 8 12 1 19 8" opacity=".45"/><polyline points="5 16 12 23 19 16" opacity=".45"/></svg>,
  Calendar: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Print:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Share:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Plus:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Bank:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  Doc:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Office:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
};

const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtDate = (d) => { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

const getDateRange = (filter) => {
  const today = new Date();
  let from, to;
  const format = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  switch (filter) {
    case "Today": from = to = new Date(); break;
    case "Yesterday": from = to = new Date(new Date().setDate(today.getDate() - 1)); break;
    case "Last 7 Days": from = new Date(today); from.setDate(today.getDate() - 6); to = today; break;
    case "Last 30 Days": from = new Date(today); from.setDate(today.getDate() - 29); to = today; break;
    case "Last 365 Days": from = new Date(today); from.setDate(today.getDate() - 364); to = today; break;
    default: return "";
  }
  return `${format(from)} to ${format(to)}`;
};

const getBalance = (r) => {
  const total = Number(r.total_amount || 0);
  const paid  = Number(r.paid_amount  || 0);
  return total - paid;
};

// ── Shared primitives ─────────────────────────────────────────────────────────
const DateFilter = ({ showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) => (
  <div ref={filterRef} className="relative">
    <div onClick={(e) => { e.stopPropagation(); setShowFilter(prev => !prev); }}
      className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-[7px] cursor-pointer hover:border-gray-400">
      <Ico.Calendar /><span className="text-[13px] text-gray-700">{selectedFilter}</span><Ico.Chevron />
    </div>
    {showFilter && (
      <div className="absolute mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400 border-b bg-gray-50">SELECT DATE RANGE</div>
        <div className="max-h-80 overflow-y-auto">
          {FILTERS.map((f, i) => (
            <div key={i} onMouseEnter={() => setHoveredFilter(f)} onMouseLeave={() => setHoveredFilter(null)}
              onClick={(e) => { e.stopPropagation(); setSelectedFilter(f); setShowFilter(false); }}
              className={`flex justify-between px-4 py-3 text-sm cursor-pointer ${selectedFilter === f ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
              <span>{f}</span>
              <span className={`text-xs transition ${hoveredFilter === f || selectedFilter === f ? "opacity-100 text-gray-500" : "opacity-0"}`}>{getDateRange(f)}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const ActionBtn = ({ icon: Icon, label, danger, square, onClick }) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium border rounded-md bg-white transition
      ${danger ? "text-red-500 border-red-300 hover:bg-red-50" : "text-gray-600 border-gray-300 hover:bg-gray-50"}
      ${square ? "px-[9px]" : ""}`}>
    {Icon && <Icon />} {label}
  </button>
);

const TableView = ({ cols, rows, onRowClick }) => (
  <div className="border border-gray-200 rounded-lg overflow-visible">
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="bg-gray-50">
          {cols.map((c) => (
            <th key={c.key} className="px-4 py-[10px] text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
              {c.sortable ? <span className="flex items-center gap-1">{c.label} <Ico.Sort /></span> : c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-sm text-gray-400">No records found</td></tr>
        ) : rows.map((row, i) => (
          <tr key={i} onClick={() => onRowClick && onRowClick(row)}
            className={`border-b border-gray-100 last:border-0 transition ${onRowClick ? "hover:bg-gray-50/60 cursor-pointer" : ""}`}>
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-[11px] text-gray-700">{c.render ? c.render(row, i) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProfileCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`border border-gray-200 rounded-xl p-5 ${className}`}>
    <div className="flex items-center gap-2 text-[13.5px] font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100"><Icon /> {title}</div>
    {children}
  </div>
);

const PField = ({ label, value }) => (
  <div>
    <p className="text-[11.5px] text-gray-400 mb-0.5">{label}</p>
    <p className="text-[13px] font-medium text-gray-900">{value || "-"}</p>
  </div>
);

const openPrintWindow = (title, tableHTML) => {
  const html = `<html><head><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;font-size:13px;color:#111;padding:32px}h2{font-size:18px;font-weight:600;margin-bottom:20px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:9px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0}td{padding:9px 12px;border-bottom:1px solid #ebebeb}tr:last-child td{border-bottom:none}</style></head><body><h2>${title}</h2>${tableHTML}</body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 300);
};

// ── Receive Modal ─────────────────────────────────────────────────────────────
function ReceiveModal({
  invoices,
  customerId,
  customer,
  onClose,
  onSuccess
}) {
const totalDue =
  Number(customer?.opening_balance || 0) +
  invoices.reduce((s, r) => s + getBalance(r), 0);
    const [amount, setAmount] = useState(totalDue);
  const [mode, setMode]     = useState("Cash");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReceive = async () => {
    if (!amount || Number(amount) <= 0) { alert("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const res = await axios.post("http://localhost:8000/api/payment-in", {
        customer_id: customerId,
        amount: Number(amount),
        payment_mode: mode,
        remark,
        invoice_ids: invoices.filter(inv => getBalance(inv) > 0).map(inv => inv._id),
      });
      if (res.data.success) {
        window.dispatchEvent(new Event("paymentUpdated"));
        onSuccess(res.data.data);
      } else {
        alert("Payment collection failed");
      }
    } catch (err) {
      console.error(err);
      alert("Payment collection failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-[15px] font-semibold text-gray-800">Receive Payment for Selected Invoices</h2>
        <div className="border border-gray-100 rounded-xl overflow-hidden text-[12px]">
          {invoices.map((inv, i) => (
            <div key={i} className="flex justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
              <span className="font-mono text-gray-600">{inv.invoice_no || inv.sales_invoice_no || "—"}</span>
              <span className="font-semibold text-gray-800">{fmt(getBalance(inv))}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-2.5 bg-gray-50 font-semibold text-[13px]">
            <span>Total Due</span>
            <span className="text-blue-700">{fmt(totalDue)}</span>
          </div>
        </div>
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">Amount to Receive</label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-r border-gray-200">₹</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 px-3 py-2 text-sm focus:outline-none tabular-nums" />
          </div>
        </div>
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">Payment Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option>
          </select>
        </div>
        <div>
          <label className="text-[12px] text-gray-500 mb-1 block">Remark (optional)</label>
          <input value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add a note..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleReceive} disabled={saving} className="flex-1 py-2 bg-[#1e3a8a] text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
            {saving ? "Saving..." : "Confirm Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Transactions ─────────────────────────────────────────────────────────
function TransactionsTab({ customerId, customerName, customer, showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) {
  const [invoices, setInvoices]                   = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [selectedInvoice, setSelectedInvoice]     = useState(null);
  const [showSuccess, setShowSuccess]             = useState(false);
  const [paymentData, setPaymentData]             = useState(null);
  const [salesReturnTarget, setSalesReturnTarget] = useState(null);
  const [creditNoteTarget, setCreditNoteTarget]   = useState(null);
  const [selected, setSelected]                   = useState([]);
  const [showReceiveModal, setShowReceiveModal]   = useState(false);

  const fetchInvoices = async () => {
    if (!customerId) return;
    try {
      const res = await axios.get(`http://localhost:8000/api/sales?customer_id=${customerId}`);
if (res.data.success) {

  let invoiceData = res.data.data || [];

  // 🔥 ADD OPENING BALANCE ROW
  if (Number(customer?.opening_balance || 0) > 0) {

    invoiceData = [
      {
        _id: "opening-balance",

        invoice_no: "OPENING BALANCE",

        invoice_date:
          customer.createdAt || new Date(),

        total_amount:
          Number(customer.opening_balance),

        paid_amount: 0,

        payment_status: "Unpaid",

        isOpeningBalance: true,
      },

      ...invoiceData,
    ];
  }

  setInvoices(invoiceData);
}    } catch (err) { console.error(err); }
  };

  useEffect(() => { setLoading(true); fetchInvoices().finally(() => setLoading(false)); }, [customerId]);
  useEffect(() => {
    const handle = () => { setLoading(true); fetchInvoices().finally(() => setLoading(false)); };
    window.addEventListener("paymentUpdated", handle);
    return () => window.removeEventListener("paymentUpdated", handle);
  }, []);

  const toggleRow = (id) => setSelected(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  const toggleAll = () => {
    const unpaidIds = invoices.filter(r => getBalance(r) > 0).map(r => r._id);
    setSelected(selected.length === unpaidIds.length ? [] : unpaidIds);
  };

  const selectedInvoices = invoices.filter(r => selected.includes(r._id));

  const getInvoiceExportData = () => invoices.map(r => ({
    date:    fmtDate(r.invoice_date),
    invoice: r.invoice_no || r.sales_invoice_no || "-",
    amount:  r.total_amount || 0,
    balance: getBalance(r),
    status:  r.payment_status || "-",
  }));

  const invoiceColumns = [
    { key: "date",    label: "Date"       },
    { key: "invoice", label: "Invoice No" },
    { key: "amount",  label: "Amount"     },
    { key: "balance", label: "Balance"    },
    { key: "status",  label: "Status"     },
  ];

  const handleExcel = async () => {
    const file = await generateExcelFile(getInvoiceExportData(), invoiceColumns, "Sales Invoices", customer);
    triggerDownload(file);
  };

  const handlePDF = async () => {
    const file = await generatePDFFile(getInvoiceExportData(), invoiceColumns, "Sales Invoices", customer);
    triggerDownload(file);
  };

  const sharePDF = async () => {
    try {
      const file = await generatePDFFile(getInvoiceExportData(), invoiceColumns, "Sales Invoices", customer);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Invoices PDF", files: [file] });
      } else { alert("Sharing not supported"); }
    } catch (err) { console.error(err); }
  };

  const handlePrint = () => {
    const tableHTML = `<table><thead><tr><th>Date</th><th>Invoice No</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>
      ${invoices.map(r => `<tr><td>${fmtDate(r.invoice_date)}</td><td>${r.invoice_no || r.sales_invoice_no || "—"}</td>
        <td>₹${Number(r.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td>${getBalance(r) > 0 ? "₹" + Number(getBalance(r)).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</td>
        <td>${r.payment_status || "—"}</td></tr>`).join("")}
    </tbody></table>`;
    openPrintWindow("Sales Invoices", tableHTML);
  };

  const cols = [
    {
      key: "select",
      label: (
        <input type="checkbox"
          checked={selected.length > 0 && selected.length === invoices.filter(r => getBalance(r) > 0).length}
          onChange={toggleAll} onClick={e => e.stopPropagation()} />
      ),
      render: (r) => {
        const isPaid = getBalance(r) === 0;
        if (isPaid) return <input type="checkbox" checked={true} readOnly onClick={e => e.stopPropagation()} className="accent-green-500 cursor-not-allowed" />;
        return <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleRow(r._id)} onClick={e => e.stopPropagation()} />;
      },
    },
    { key: "invoice_date", label: "Date",       sortable: true, render: r => fmtDate(r.invoice_date) },
    { key: "invoice_no",   label: "Invoice No", render: r => r.invoice_no || r.sales_invoice_no || "—" },
    {
      key: "total_amount", label: "Amount",
      render: r => (
        <>
          {fmt(r.total_amount)}
          {getBalance(r) > 0 && getBalance(r) < Number(r.total_amount) && (
            <span className="block text-[12px] text-gray-500 mt-0.5">({fmt(getBalance(r))} unpaid)</span>
          )}
        </>
      ),
    },


    {
      
      key: "payment_status", label: "Status",
   render: r => {

  if (r.isOpeningBalance) {

    return (
      <span className="inline-block px-2.5 py-[3px] text-[12px] font-medium rounded-full border bg-orange-100 text-orange-700 border-orange-300">
        Opening
      </span>
    );
  }

  const bal = getBalance(r);
const total = Number(r.total_amount || 0);

const status =
  bal === 0
    ? "Paid"
    : bal < total
    ? "Partial"
    : "Unpaid";
            return (
          <span className={`inline-block px-2.5 py-[3px] text-[12px] font-medium rounded-full border
            ${status === "Paid" ? "bg-green-100 text-green-800 border-green-300"
              : status === "Unpaid" ? "bg-red-100 text-red-700 border-red-200"
              : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}>
            {status}
          </span>
        );
      },
    },
  ];

  if (showSuccess) {
    return (
      <PaymentSuccessScreen
        amount={paymentData?.amount} method={paymentData?.method}
        date={paymentData?.date}    customer={paymentData?.customer}
        onDone={() => { setShowSuccess(false); setSelected([]); setLoading(true); fetchInvoices().finally(() => setLoading(false)); }}
      />
    );
  }

  return (
    <>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <DateFilter showFilter={showFilter} setShowFilter={setShowFilter} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} hoveredFilter={hoveredFilter} setHoveredFilter={setHoveredFilter} filterRef={filterRef} />
        <ActionBtn icon={Ico.Download} label="Excel" onClick={handleExcel} />
        <ActionBtn icon={Ico.Print}    label="PDF"   onClick={handlePDF}   />
        <button onClick={sharePDF} className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition">
          <Ico.Share /> Share <Ico.Chevron />
        </button>
        <button disabled={selected.length === 0} onClick={() => setShowReceiveModal(true)}
          className={`px-4 py-[7px] text-[13px] font-medium rounded-md transition
            ${selected.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}>
          Receive ({selected.length})
        </button>
      </div>

      {loading
        ? <p className="text-sm text-gray-400 py-8 text-center">Loading...</p>
        : <TableView cols={cols} rows={invoices}onRowClick={(row) => {

  if (row.isOpeningBalance) return;

  setSelectedInvoice({
              ...row,
              invoiceNo: row.invoice_no || row.sales_invoice_no,
              amount:    row.total_amount,
              items:     (row.details || []).map(d => ({ item: d.product_name, qty: d.qty, price: d.price, total: d.amount })),
              customer:  row.customer_id?.customer_name || row.customer_id?.first_name || "—",
              date:      new Date(row.invoice_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            });
          }} />
      }

      {selectedInvoice && <InvoiceDetailPanel invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}

      {showReceiveModal && (
       <ReceiveModal
  invoices={selectedInvoices}
  customerId={customerId}
  customer={customer}
          onClose={() => setShowReceiveModal(false)}
          onSuccess={(data) => {
            setShowReceiveModal(false);
            setPaymentData({ amount: data.amount, method: data.payment_mode, date: new Date().toLocaleDateString("en-GB"), customer: { first_name: customerName, contact_no_1: "" } });
            setShowSuccess(true);
          }}
        />
      )}

      {salesReturnTarget && (
        <SalesReturnModal invoice={salesReturnTarget} onClose={() => setSalesReturnTarget(null)}
          onConfirm={async (data) => {
            try {
              const res = await axios.post("http://localhost:8000/api/sales-return", {
                sales_id: salesReturnTarget._id, customer_id: salesReturnTarget.customer_id?._id,
                date: data.date,
                details: (data.items || []).map(it => ({ product_id: it.product_id || null, product_name: it.item, qty: it.returnQty, price: it.price, amount: it.returnQty * it.price })),
                total_amount: data.total || 0, reason: data.reason || "",
              });
              if (res.data.success) { alert("Sales Return Created Successfully"); setSalesReturnTarget(null); }
            } catch (err) { console.error(err); alert("Server Error"); }
          }}
        />
      )}

      {creditNoteTarget && (
        <CreditNoteModal invoice={creditNoteTarget} onClose={() => setCreditNoteTarget(null)}
          onConfirm={async (data) => {
            try {
              const res = await axios.post("http://localhost:8000/api/credit-note", {
                sales_id: creditNoteTarget._id, customer_id: creditNoteTarget.customer_id?._id,
                details: (data.items || []).map(i => ({ product_id: i.product_id || null, product_name: i.item, qty: i.qty, price: i.newPrice, amount: i.qty * i.newPrice })),
                amount: Number(data.creditTotal), reason: data.reason || "", date: new Date().toISOString(),
              });
              if (res.data.success) { alert("Credit Note Created Successfully"); setCreditNoteTarget(null); }
            } catch (err) { console.error(err); alert("Server Error"); }
          }}
        />
      )}
    </>
  );
}

// ── EditField ─────────────────────────────────────────────────────────────────
const EditField = ({ label, fieldKey, form, set, type = "text" }) => (
  <div>
    <label className="text-[12px] text-gray-500 mb-1 block">{label}</label>
    <input type={type} value={form[fieldKey] || ""} onChange={(e) => set(fieldKey, e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
  </div>
);

// ── EditCustomerModal ─────────────────────────────────────────────────────────
function EditCustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    company_name: customer.company_name || "",
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    party_type: customer.party_type || "Customer",
    contact_no_1: customer.contact_no_1 || "",
    email: customer.email || "",
    opening_balance: customer.opening_balance ?? 0,
    gstin: customer.gstin || "",
    pan_number: customer.pan_number || "",
    address_line_1: customer.address_line_1 || "",
    city: customer.city || "",
    state: customer.state || "",
    pincode: customer.pincode || "",
    shipping_address_line_1: customer.shipping_address_line_1 || "",
    shipping_city: customer.shipping_city || "",
    shipping_state: customer.shipping_state || "",
    shipping_pincode: customer.shipping_pincode || "",
  }));

  const [saving, setSaving] = useState(false);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.first_name && !form.company_name) { alert("First Name or Company Name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance || 0) };
      const res = await axios.put(`http://localhost:8000/api/customers/${customer._id}`, payload);
      if (res.data.success) {
        onSave(res.data.data || { ...customer, ...payload });
      } else { alert("Failed to save changes"); }
    } catch (err) { console.error(err); alert("Server error while saving"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-gray-800">Edit Customer</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 text-lg">×</button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">General Details</p>
            <div className="grid grid-cols-2 gap-4">
              <EditField label="Company Name"    fieldKey="company_name"    form={form} set={set} />
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">Party Type</label>
                <select value={form.party_type} onChange={e => set("party_type", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option>Customer</option><option>Supplier</option>
                </select>
              </div>
              <EditField label="First Name"      fieldKey="first_name"      form={form} set={set} />
              <EditField label="Last Name"       fieldKey="last_name"       form={form} set={set} />
              <EditField label="Mobile Number"   fieldKey="contact_no_1"    form={form} set={set} />
              <EditField label="Opening Balance" fieldKey="opening_balance" type="number" form={form} set={set} />
              <div className="col-span-2">
                <EditField label="Email" fieldKey="email" type="email" form={form} set={set} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Business Details</p>
            <div className="grid grid-cols-2 gap-4">
              <EditField label="GSTIN"      fieldKey="gstin"       form={form} set={set} />
              <EditField label="PAN Number" fieldKey="pan_number"  form={form} set={set} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Billing Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><EditField label="Address Line 1" fieldKey="address_line_1" form={form} set={set} /></div>
              <EditField label="City"    fieldKey="city"    form={form} set={set} />
              <EditField label="State"   fieldKey="state"   form={form} set={set} />
              <EditField label="Pincode" fieldKey="pincode" form={form} set={set} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Shipping Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><EditField label="Address Line 1" fieldKey="shipping_address_line_1" form={form} set={set} /></div>
              <EditField label="City"    fieldKey="shipping_city"    form={form} set={set} />
              <EditField label="State"   fieldKey="shipping_state"   form={form} set={set} />
              <EditField label="Pincode" fieldKey="shipping_pincode" form={form} set={set} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Profile ──────────────────────────────────────────────────────────────
function ProfileTab({ customer, onEdit }) {
  const addr        = [customer.address_line_1, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ");
  const shippingAddr= [customer.shipping_address_line_1, customer.shipping_city, customer.shipping_state, customer.shipping_pincode].filter(Boolean).join(", ");
  const name        = customer.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 transition">
          <Ico.Edit /> Edit Profile
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ProfileCard title="General Details" icon={Ico.Doc}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
            <PField label="Party Name"    value={name} />
            <PField label="Party Type"    value={customer.party_type || "Customer"} />
            <PField label="Mobile Number" value={customer.contact_no_1 || customer.phone} />
          </div>
          <div className="mb-3"><PField label="Email" value={customer.email} /></div>
          <PField label="Opening Balance" value={`₹${customer.opening_balance ?? 0}`} />
        </ProfileCard>
        <ProfileCard title="Business Details" icon={Ico.Office}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
            <PField label="GSTIN"      value={customer.gstin} />
            <PField label="PAN Number" value={customer.pan_number} />
          </div>
          <div className="mb-3">
            <p className="text-[11.5px] text-gray-400 mb-0.5">Billing Address</p>
            <p className="text-[13px] font-medium text-gray-900">{addr || "-"}</p>
          </div>
          <div className="mb-3">
            <p className="text-[11.5px] text-gray-400 mb-0.5">Shipping Address</p>
            <p className="text-[13px] font-medium text-gray-900">{shippingAddr || "-"}</p>
          </div>
        </ProfileCard>
      </div>
    </>
  );
}

function DetailedLedgerTab({
  customer,
  customerId,
  showFilter,
  setShowFilter,
  selectedFilter,
  setSelectedFilter,
  hoveredFilter,
  setHoveredFilter,
  filterRef,
}) {

  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const customerName =
    customer.customer_name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  // ───────────────── FETCH ─────────────────
  const fetchAll = () => {

    if (!customerId) return Promise.resolve();

    return Promise.all([

      axios
        .get(`http://localhost:8000/api/sales?customer_id=${customerId}`)
        .catch(() => ({ data: { data: [] } })),

      axios
        .get(`http://localhost:8000/api/payment-in?customer_id=${customerId}`)
        .catch(() => ({ data: { data: [] } })),

    ]).then(([salesRes, paymentRes]) => {

      setInvoices(salesRes.data.data || []);
      setPayments(paymentRes.data.data || []);

    });
  };

  useEffect(() => {

    setLoading(true);

    fetchAll().finally(() => setLoading(false));

  }, [customerId]);

  useEffect(() => {

    const handle = () => {

      setLoading(true);

      fetchAll().finally(() => setLoading(false));

    };

    window.addEventListener("paymentUpdated", handle);

    return () =>
      window.removeEventListener("paymentUpdated", handle);

  }, [customerId]);


  const openingBalance =
  Number(customer.opening_balance || 0);

  // ───────────────── TIMELINE ─────────────────
  const { timeline, totalAmount, totalPaid, totalBalance } = (() => {

    const events = [];

    [...invoices]
      .sort(
        (a, b) =>
          new Date(a.invoice_date) -
          new Date(b.invoice_date)
      )
      .forEach((inv) =>
        events.push({
          type: "invoice",
          date: new Date(inv.invoice_date),
          data: inv,
        })
      );

    [...payments]
      .sort(
        (a, b) =>
          new Date(a.date || a.createdAt) -
          new Date(b.date || b.createdAt)
      )
      .forEach((pay) =>
        events.push({
          type: "payment",
          date: new Date(pay.date || pay.createdAt),
          data: pay,
        })
      );

    events.sort((a, b) => a.date - b.date);

    let runningBal = Number(customer.opening_balance || 0);
    let totalAmt = 0;
    let totalPaidAmt = 0;

    const rows = [];

    events.forEach((evt) => {

      if (evt.type === "invoice") {

        const inv = evt.data;
        const invAmt = Number(inv.total_amount || 0);

        runningBal += invAmt;
        totalAmt += invAmt;

        rows.push({
          _type: "invoice",
          inv,
          runningBal,
        });

      } else {

        const pay = evt.data;
        const payAmt = Number(pay.amount || 0);

        runningBal -= payAmt;
        totalPaidAmt += payAmt;

        rows.push({
          _type: "payment",
          pay,
          payAmt,
          runningBal,
        });

      }

    });

    return {
      timeline: rows,
      totalAmount: totalAmt,
      totalPaid: totalPaidAmt,
      totalBalance: runningBal,
    };

  })();

  // ───────────────── EXPORT ─────────────────
  const handleExcel = async () =>
    triggerDownload(
      await generateExcelFile([], [], "Party Ledger", customer)
    );

  const handlePDF = async () =>
    triggerDownload(
      await generatePDFFile([], [], "Party Ledger", customer)
    );

  // ───────────────── RENDER ─────────────────
  return (
    <>

      {/* Toolbar */}
      <div className="flex gap-2.5 mb-4 flex-wrap">

        <DateFilter
          showFilter={showFilter}
          setShowFilter={setShowFilter}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          hoveredFilter={hoveredFilter}
          setHoveredFilter={setHoveredFilter}
          filterRef={filterRef}
        />

        <ActionBtn
          icon={Ico.Download}
          label="Excel"
          onClick={handleExcel}
        />

        <ActionBtn
          icon={Ico.Print}
          label="PDF"
          onClick={handlePDF}
        />

      </div>

      {/* Main Report */}
      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden">

        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-200 bg-gray-50">

          <div className="flex items-start justify-between">

            <div>

              <h1 className="text-[22px] font-semibold text-gray-900">
                D&apos;Lume
              </h1>

              <p className="text-[12px] text-gray-500 mt-1">
                Customer Detailed Ledger Report
              </p>

              <div className="flex items-center gap-5 mt-2 text-[11px] text-gray-500">

                <span>
                  Customer:
                  {" "}
                  <span className="font-medium text-gray-700">
                    {customerName}
                  </span>
                </span>

                <span>
                  Generated:
                  {" "}
                  {new Date().toLocaleDateString("en-GB")}
                </span>

              </div>

            </div>

            <div className="text-right">

              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                Outstanding Balance
              </p>

          <p className="text-[24px] font-semibold text-indigo-700 mt-1 tabular-nums">
{fmt(Math.abs(totalBalance))}</p>

            </div>

          </div>

        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 border-b border-gray-200">

          <div className="px-6 py-4 border-r border-gray-200">

            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              Total Sales
            </p>

            <p className="text-[18px] font-semibold text-gray-900 mt-1 tabular-nums">
              {fmt(totalAmount)}
            </p>

          </div>

          <div className="px-6 py-4 border-r border-gray-200">

            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              Total Received
            </p>

            <p className="text-[18px] font-semibold text-green-700 mt-1 tabular-nums">
              {fmt(totalPaid)}
            </p>

          </div>

          <div className="px-6 py-4">

            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              Current Balance
            </p>

<p className="text-[18px] font-semibold text-indigo-700 mt-1 tabular-nums">
  {fmt(Math.abs(totalBalance))}
</p>

          </div>

        </div>

        {/* Table */}
        {loading ? (

          <div className="py-16 text-center text-sm text-gray-400">
            Loading ledger...
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full border-collapse">

              <thead>

                <tr className="bg-[#f8fafc] border-b border-gray-300">

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Particulars
                  </th>

                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Bags
                  </th>

                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Qty
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Rate
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Debit
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Credit
                  </th>

                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Balance
                  </th>

                </tr>

              </thead>

              <tbody>

                {/* Opening Balance */}
                {Number(customer.opening_balance || 0) !== 0 && (

                  <tr className="bg-amber-50 border-b border-amber-100">

                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      —
                    </td>

                    <td className="px-4 py-3 text-[12px] font-medium text-amber-900">
                      Opening Balance
                    </td>

                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>

                    <td className="px-4 py-3 text-right text-[12px] font-semibold text-amber-900 tabular-nums">
                      {fmt(customer.opening_balance || 0)}
                    </td>

                  </tr>

                )}

                {timeline.map((row, idx) => {

                  /* ───────── INVOICE ───────── */
                  if (row._type === "invoice") {

                    const inv = row.inv;
                    const details = inv.details || [];

                    return (

                      <React.Fragment key={idx}>

                        {/* Invoice Header */}
                        <tr className="bg-slate-100 border-y border-slate-200">

                          <td className="px-4 py-3 text-[12px] font-medium text-gray-700">
                            {fmtDate(inv.invoice_date)}
                          </td>

                          <td
                            colSpan={4}
                            className="px-4 py-3 text-[12px] font-semibold text-slate-900"
                          >
                            Invoice #
                            {inv.invoice_no || inv.sales_invoice_no || "—"}
                          </td>

                          <td className="px-4 py-3 text-right text-[12px] font-semibold text-slate-900 tabular-nums">
                            {fmt(inv.total_amount || 0)}
                          </td>

                          <td></td>

                          <td className="px-4 py-3 text-right text-[12px] font-semibold text-indigo-700 tabular-nums">
                            {fmt(Math.abs(row.runningBal))}
                          </td>

                        </tr>

                        {/* Item Rows */}
                        {details.map((d, di) => {

                          const qty =
                            d.qty ||
                            d.quantity ||
                            0;

                          const rate =
                            Number(
                              d.price ||
                              d.rate ||
                              d.sale_price ||
                              0
                            );

                          const amount =
                            Number(
                              d.amount ||
                              d.total ||
                              qty * rate
                            );

                          return (

                            <tr
                              key={di}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >

                              <td></td>

                              <td className="px-4 py-3">

                                <div className="text-[12px] text-gray-800">
                                  {d.product_name || d.name || "—"}
                                </div>

                                {(d.description || "").trim() && (

                                  <div className="text-[10px] text-gray-400 mt-0.5">
                                    {d.description}
                                  </div>

                                )}

                              </td>

                              <td className="px-4 py-3 text-center text-[12px] text-gray-600">
                                {d.bags || "-"}
                              </td>

                              <td className="px-4 py-3 text-center text-[12px] text-gray-700">
                                {qty}
                              </td>

                              <td className="px-4 py-3 text-right text-[12px] text-gray-700 tabular-nums">
                                {fmt(rate)}
                              </td>

                              <td className="px-4 py-3 text-right text-[12px] text-gray-900 tabular-nums">
                                {fmt(amount)}
                              </td>

                              <td></td>
                              <td></td>

                            </tr>

                          );

                        })}

                      </React.Fragment>

                    );
                  }

                  /* ───────── PAYMENT ───────── */
                  if (row._type === "payment") {

                    const pay = row.pay;

                    return (

                      <tr
                        key={idx}
                        className="bg-green-50 border-y border-green-100"
                      >

                        <td className="px-4 py-3 text-[12px] text-green-700">
                          {fmtDate(
                            pay.date ||
                            pay.payment_date ||
                            pay.createdAt
                          )}
                        </td>

                        <td
                          colSpan={4}
                          className="px-4 py-3 text-[12px] text-green-800"
                        >
                          Payment Received
                          {" • "}
                          {pay.payment_mode || "Cash"}

                          {pay.transaction_id && (
                            <span className="text-green-600">
                              {" • "}TXN:
                              {" "}
                              {pay.transaction_id}
                            </span>
                          )}
                        </td>

                        <td></td>

                        <td className="px-4 py-3 text-right text-[12px] font-semibold text-green-700 tabular-nums">
                          {fmt(row.payAmt)}
                        </td>

                        <td className="px-4 py-3 text-right text-[12px] font-semibold text-indigo-700 tabular-nums">
                          {fmt(Math.abs(row.runningBal))}
                        </td>

                      </tr>

                    );
                  }

                  return null;

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </>
  );
}
// ── GST Ledger (unchanged) ────────────────────────────────────────────────────
function GSTLedgerTab({ customer, customerId, showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalReceivable: 0, dateRange: "" });
  const customerName = customer.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    Promise.all([
      axios.get(`http://localhost:8000/api/sales?customer_id=${customerId}`).catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:8000/api/sales-return?customer_id=${customerId}`).catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:8000/api/credit-note?customer_id=${customerId}`).catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:8000/api/payment-in?customer_id=${customerId}`).catch(() => ({ data: { data: [] } })),
    ]).then(([salesRes, returnRes, creditRes, paymentRes]) => {
      const sales    = (salesRes.data.data   || []).map(r => ({ _id: r._id, date: r.invoice_date,       voucher: "Sales Invoice", number: r.invoice_no || r.sales_invoice_no || "—", debit: r.total_amount || 0, credit: 0 }));
      const returns  = (returnRes.data.data  || []).map(r => ({ _id: r._id, date: r.date || r.createdAt, voucher: "Sales Return",  number: r.return_no || "—",                         debit: 0, credit: r.total_amount || 0 }));
      const credits  = (creditRes.data.data  || []).map(r => ({ _id: r._id, date: r.date || r.createdAt, voucher: "Credit Note",   number: r.credit_note_no || r.return_no || "—",     debit: 0, credit: r.amount || r.total_amount || 0 }));
      const payments = (paymentRes.data.data || []).map(r => ({ _id: r._id, date: r.date || r.createdAt, voucher: "Payment In",    number: r.payment_no || "—",                        debit: 0, credit: r.amount || 0 }));

      const all = [...sales, ...returns, ...credits, ...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
      let balance = customer.opening_balance || 0;
      const withBalance = all.map(row => { balance = balance + row.debit - row.credit; return { ...row, runningBalance: balance }; });

      const dates   = all.map(r => new Date(r.date)).filter(d => !isNaN(d));
      const minDate = dates.length ? new Date(Math.min(...dates)) : null;
      const maxDate = dates.length ? new Date(Math.max(...dates)) : null;
      const fmtD    = d => d?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) || "";
      setSummary({ totalReceivable: balance, dateRange: minDate && maxDate ? `${fmtD(minDate)} – ${fmtD(maxDate)}` : "—" });
      setEntries(withBalance);
    }).finally(() => setLoading(false));
  }, [customerId]);

  const VOUCHER_COLORS = {
    "Sales Invoice": "text-blue-700 bg-blue-50",
    "Sales Return":  "text-orange-700 bg-orange-50",
    "Credit Note":   "text-purple-700 bg-purple-50",
    "Payment In":    "text-green-700 bg-green-50",
  };

  const cols = [
    { key: "date",           label: "Date",        render: r => fmtDate(r.date) },
    { key: "voucher",        label: "Voucher",      render: r => <span className={`px-2 py-0.5 rounded text-xs font-medium ${VOUCHER_COLORS[r.voucher] || "text-gray-600 bg-gray-100"}`}>{r.voucher}</span> },
    { key: "number",         label: "Ref No" },
    { key: "debit",          label: "Debit (₹)",   render: r => r.debit  > 0 ? <span className="text-gray-800 font-medium tabular-nums">{fmt(r.debit)}</span>  : <span className="text-gray-300">—</span> },
    { key: "credit",         label: "Credit (₹)",  render: r => r.credit > 0 ? <span className="text-green-700 font-medium tabular-nums">{fmt(r.credit)}</span> : <span className="text-gray-300">—</span> },
    { key: "runningBalance", label: "Balance (₹)", render: r => <span className={`font-semibold tabular-nums ${r.runningBalance < 0 ? "text-red-600" : r.runningBalance > 0 ? "text-gray-800" : "text-gray-400"}`}>{r.runningBalance < 0 ? `(${fmt(Math.abs(r.runningBalance))})` : fmt(r.runningBalance)}</span> },
  ];

  const getLedgerExportData = () => entries.map(r => ({
    date:    fmtDate(r.date),
    voucher: r.voucher,
    ref:     r.number,
    debit:   r.debit   || 0,
    credit:  r.credit  || 0,
    balance: r.runningBalance || 0,
  }));

  const ledgerColumns = [
    { key: "date",    label: "Date"    },
    { key: "voucher", label: "Voucher" },
    { key: "ref",     label: "Ref No"  },
    { key: "debit",   label: "Debit"   },
    { key: "credit",  label: "Credit"  },
    { key: "balance", label: "Balance" },
  ];

  const handleLedgerExcel = async () => {
    const file = await generateExcelFile(getLedgerExportData(), ledgerColumns, "Party Ledger", customer);
    triggerDownload(file);
  };

  const handleLedgerPDF = async () => {
    const file = await generatePDFFile(getLedgerExportData(), ledgerColumns, "Party Ledger", customer);
    triggerDownload(file);
  };

  const sharePDF = async () => {
    try {
      const file = await generatePDFFile(getLedgerExportData(), ledgerColumns, "Party Ledger", customer);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Ledger PDF", files: [file] });
      } else { alert("Sharing not supported"); }
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <DateFilter showFilter={showFilter} setShowFilter={setShowFilter} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} hoveredFilter={hoveredFilter} setHoveredFilter={setHoveredFilter} filterRef={filterRef} />
        <ActionBtn icon={Ico.Download} label="Excel" onClick={handleLedgerExcel} />
        <ActionBtn icon={Ico.Print}    label="PDF"   onClick={handleLedgerPDF}   />
        <button onClick={sharePDF} className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition">
          <Ico.Share /> Share <Ico.Chevron />
        </button>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-visible">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-start">
          <div><p className="text-[17px] font-bold text-gray-900">D&apos;Lume</p><p className="text-[12px] text-indigo-500 mt-0.5">Phone no: &nbsp;9137826646</p></div>
          <p className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">Party Ledger</p>
        </div>
        <div className="px-5 pt-4 pb-4 flex justify-between items-start">
          <div>
            <p className="text-[12px] text-gray-500">To,</p>
            <p className="text-[14px] font-bold text-gray-900 mt-0.5">{customerName}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{customer.contact_no_1 || customer.phone}</p>
          </div>
          <div className="border border-gray-200 rounded-lg px-4 py-3 text-right min-w-[220px]">
            <p className="text-[12px] text-gray-500 pb-2 mb-2 border-b border-gray-200">{summary.dateRange}</p>
            <p className="text-[12px] text-gray-500">Total Receivable</p>
            <p className={`text-[16px] font-bold mt-0.5 ${summary.totalReceivable < 0 ? "text-red-600" : "text-gray-900"}`}>{fmt(Math.abs(summary.totalReceivable))}</p>
          </div>
        </div>
        <div className="mx-0 border-t border-gray-100">
          <table className="w-full text-[13px]"><tbody>
            <tr className="bg-gray-50 border-b border-gray-200">
              <td className="px-4 py-3 text-gray-400 italic" colSpan={3}>Opening Balance</td>
              <td className="px-4 py-3 text-gray-300">—</td>
              <td className="px-4 py-3 text-gray-300">—</td>
              <td className="px-4 py-3 font-semibold text-gray-700 tabular-nums">{fmt(customer.opening_balance || 0)}</td>
            </tr>
          </tbody></table>
        </div>
        {loading ? <p className="text-sm text-gray-400 py-10 text-center">Loading ledger...</p> : <TableView cols={cols} rows={entries} />}
      </div>
    </>
  );
}

// ── Tab: Payments ─────────────────────────────────────────────────────────────
function PaymentsTab({ customerId, customer, showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    axios.get(`http://localhost:8000/api/payment-in?customer_id=${customerId}`)
      .then(res => { if (res.data.success) setPayments(res.data.data); })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => {
    const handle = () => {
      setLoading(true);
      axios.get(`http://localhost:8000/api/payment-in?customer_id=${customerId}`)
        .then(res => { if (res.data.success) setPayments(res.data.data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    window.addEventListener("paymentUpdated", handle);
    return () => window.removeEventListener("paymentUpdated", handle);
  }, [customerId]);

  const cols = [
    { key: "sr_no",       label: "Sr No",        render: (_, index) => index + 1 },
    { key: "date",        label: "Date",         render: r => fmtDate(r.date || r.payment_date) },
    { key: "amount",      label: "Amount",       render: r => fmt(r.amount || r.total_amount) },
    { key: "payment_mode",label: "Payment Mode", render: r => r.payment_mode || r.paymentMethod || r.method || "Cash" },
    { key: "status",      label: "Status",       render: () => <span className="px-2 py-[3px] text-xs rounded-full bg-green-100 text-green-700 border border-green-300">Received</span> },
  ];

  const getPaymentExportData = () => payments.map(r => ({
    date:       fmtDate(r.date || r.payment_date),
    payment_no: r.payment_no || "-",
    amount:     r.amount || 0,
    mode:       r.payment_mode || "-",
  }));

  const paymentColumns = [
    { key: "date",       label: "Date"       },
    { key: "payment_no", label: "Payment No" },
    { key: "amount",     label: "Amount"     },
    { key: "mode",       label: "Mode"       },
  ];

  const handlePaymentExcel = async () => {
    const file = await generateExcelFile(getPaymentExportData(), paymentColumns, "Payment History", customer);
    triggerDownload(file);
  };

  const handlePaymentPDF = async () => {
    const file = await generatePDFFile(getPaymentExportData(), paymentColumns, "Payment History", customer);
    triggerDownload(file);
  };

  const sharePDF = async () => {
    try {
      const file = await generatePDFFile(getPaymentExportData(), paymentColumns, "Payment History", customer);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Payments PDF", files: [file] });
      } else { alert("Sharing not supported"); }
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <DateFilter showFilter={showFilter} setShowFilter={setShowFilter} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} hoveredFilter={hoveredFilter} setHoveredFilter={setHoveredFilter} filterRef={filterRef} />
        <ActionBtn icon={Ico.Download} label="Excel" onClick={handlePaymentExcel} />
        <ActionBtn icon={Ico.Print}    label="PDF"   onClick={handlePaymentPDF}   />
        <button onClick={sharePDF} className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition">
          <Ico.Share /> Share <Ico.Chevron />
        </button>
      </div>
      {loading ? <p className="text-sm text-gray-400 py-8 text-center">Loading...</p> : <TableView cols={cols} rows={payments} />}
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function CustomerDetails({ isGSTUser = false }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer]   = useState(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const [showEdit, setShowEdit]   = useState(false);

  const [filters, setFilters] = useState({
    invoices: { show: false, selected: "Last 365 Days", hovered: null },
    payments: { show: false, selected: "Last 365 Days", hovered: null },
    ledger:   { show: false, selected: "Last 365 Days", hovered: null },
  });

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this customer permanently?")) return;
    try {
      const res = await axios.delete(`http://localhost:8000/api/customers/${id}`);
      if (res.data.success) { alert("Customer deleted successfully"); navigate(-1); }
      else { alert("Failed to delete customer"); }
    } catch (err) { console.error(err); alert("Server error while deleting"); }
  };

  const updateFilter = (tab, key, value) => setFilters(prev => ({ ...prev, [tab]: { ...prev[tab], [key]: value } }));
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilters(prev => ({
          invoices: { ...prev.invoices, show: false },
          payments: { ...prev.payments, show: false },
          ledger:   { ...prev.ledger,   show: false },
        }));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { if (id) fetchCustomer(); }, [id]);
  useEffect(() => {
    const handle = () => fetchCustomer();
    window.addEventListener("paymentUpdated", handle);
    return () => window.removeEventListener("paymentUpdated", handle);
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/customers/${id}`);
      if (res.data.success) setCustomer(res.data.data);
    } catch { setCustomer(null); }
  };

  if (!customer) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  const customerName = customer.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  const TABS = [
    { key: "invoices", label: "Invoices",           icon: Ico.Receipt },
    { key: "payments", label: "Payments",           icon: Ico.Bank    },
    { key: "profile",  label: "Profile",            icon: Ico.User    },
    { key: "ledger",   label: "Ledger (Statement)", icon: Ico.Ledger  },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"><Ico.Back /></button>
          <span className="text-[17px] font-semibold text-gray-900">{customerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn icon={Ico.Trash} danger square onClick={handleDelete} />
        </div>
      </div>

      <div className="flex justify-between px-6 border-b border-gray-200">
        <div className="flex">
          {TABS.filter(t => t.key !== "profile").map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13.5px] border-b-2 -mb-px transition whitespace-nowrap ${activeTab === key ? "border-indigo-600 text-indigo-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon /> {label}
            </button>
          ))}
        </div>
        {TABS.filter(t => t.key === "profile").map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13.5px] border-b-2 -mb-px transition whitespace-nowrap ${activeTab === key ? "border-indigo-600 text-indigo-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "invoices" && (
          <TransactionsTab
            customerId={id} customerName={customerName} customer={customer}
            showFilter={filters.invoices.show}        setShowFilter={v => updateFilter("invoices","show",v)}
            selectedFilter={filters.invoices.selected} setSelectedFilter={v => updateFilter("invoices","selected",v)}
            hoveredFilter={filters.invoices.hovered}   setHoveredFilter={v => updateFilter("invoices","hovered",v)}
            filterRef={filterRef}
          />
        )}
        {activeTab === "payments" && (
          <PaymentsTab
            customerId={id} customer={customer}
            showFilter={filters.payments.show}        setShowFilter={v => updateFilter("payments","show",v)}
            selectedFilter={filters.payments.selected} setSelectedFilter={v => updateFilter("payments","selected",v)}
            hoveredFilter={filters.payments.hovered}   setHoveredFilter={v => updateFilter("payments","hovered",v)}
            filterRef={filterRef}
          />
        )}
        {activeTab === "profile" && (
          <ProfileTab customer={customer} onEdit={() => setShowEdit(true)} />
        )}
        {activeTab === "ledger" && (
          // ── Route to correct ledger based on isGSTUser ──
          isGSTUser ? (
            <GSTLedgerTab
              customer={customer} customerId={id}
              showFilter={filters.ledger.show}        setShowFilter={v => updateFilter("ledger","show",v)}
              selectedFilter={filters.ledger.selected} setSelectedFilter={v => updateFilter("ledger","selected",v)}
              hoveredFilter={filters.ledger.hovered}   setHoveredFilter={v => updateFilter("ledger","hovered",v)}
              filterRef={filterRef}
            />
          ) : (
            <DetailedLedgerTab
              customer={customer} customerId={id}
              showFilter={filters.ledger.show}        setShowFilter={v => updateFilter("ledger","show",v)}
              selectedFilter={filters.ledger.selected} setSelectedFilter={v => updateFilter("ledger","selected",v)}
              hoveredFilter={filters.ledger.hovered}   setHoveredFilter={v => updateFilter("ledger","hovered",v)}
              filterRef={filterRef}
            />
          )
        )}
      </div>

      {showEdit && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => { setCustomer(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}