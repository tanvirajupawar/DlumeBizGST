import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

// ─── Constants ───────────────────────────────────────────────────────────────

const GST_TABS = [
  "Purchase",
  "Purchase Return / Debit Note",
  "Purchase Summary",
  "ITC Summary"
];

const NON_GST_TABS = [
  "Purchase"
];
const FILTERS = [
  "Today", "Yesterday", "This Week", "Last Week", "Last 7 Days",
  "This Month", "Previous Month", "Last 30 Days", "This Quarter",
  "Previous Quarter", "Current Fiscal Year", "Previous Fiscal Year",
  "Last 365 Days",
];

const BUYER_STATE = "27"; // Maharashtra

// ─── PDF Generator ────────────────────────────────────────────────────────────

const generatePDFFile = async (data, columns, title, dateRange = "") => {
  const { jsPDF } = await import("jspdf");
  const autoTable  = (await import("jspdf-autotable")).default;

  const doc      = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW    = 297;
  const pageH    = 210;
  const margin   = 15;
  const contentW = pageW - margin * 2;

  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const txt  = (text, x, y, opts = {}) => doc.text(String(text ?? ""), x, y, opts);
  const line = (x1, y1, x2, y2) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.line(x1, y1, x2, y2);
  };

  // ── Page header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  txt("D'Lume", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  txt("Ph: 9137826646", margin, 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  txt(title, pageW - margin, 13, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  txt(`Generated: ${dateStr}`, pageW - margin, 18, { align: "right" });
  if (dateRange) {
    txt(`Period: ${dateRange}`, pageW - margin, 23, { align: "right" });
  }

  line(margin, 26, pageW - margin, 26);

  // ── Amount columns detection ──
  const amountKeys = ["value", "taxable", "igst", "cgst", "sgst", "total_tax", "total", "credit", "debit", "balance", "amount"];

  autoTable(doc, {
    startY: 31,
    head: [columns.map(c => c.label)],
    body: data.map(row =>
      columns.map(c => {
        const val = row[c.key];
        if (val === null || val === undefined) return "—";
        if (amountKeys.some(k => c.key.toLowerCase().includes(k)) && typeof val === "number") {
          return "Rs. " + val.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        }
        return String(val);
      })
    ),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
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
      fontSize: 7,
      lineColor: [170, 170, 170],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    bodyStyles:         { fillColor: [255, 255, 255] },
    columnStyles: (() => {
      const styles = {};
      columns.forEach((c, i) => {
        if (amountKeys.some(k => c.key.toLowerCase().includes(k))) {
          styles[i] = { halign: "right" };
        }
      });
      return styles;
    })(),
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

  // ── Totals summary ──
  const lastY = doc.lastAutoTable.finalY;
  const amountCols = columns.filter(c => amountKeys.some(k => c.key.toLowerCase().includes(k)));

  if (amountCols.length > 0 && data.length > 0) {
    const summaryY = lastY + 5;
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
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      txt(`${col.label}:`, rightOffset - 30, summaryY + 5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(20, 20, 20);
      txt(formatted, rightOffset, summaryY + 5, { align: "right" });

      rightOffset -= 55;
    });
  }

  const blob = doc.output("blob");
  return new File([blob], `${title}.pdf`, { type: "application/pdf" });
};

// ─── Excel Generator ──────────────────────────────────────────────────────────

const generateExcelFile = async (data, columns, title, dateRange = "") => {
  const XLSX = await import("xlsx");

  const wb   = XLSX.utils.book_new();
  const rows = [];

  rows.push(["D'Lume"]);
  rows.push(["Ph: 9137826646"]);
  rows.push([`Report: ${title}`]);
  rows.push([`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`]);
  if (dateRange) rows.push([`Period: ${dateRange}`]);
  rows.push([]);

  rows.push(columns.map(c => c.label));

  const amountKeys = ["value", "taxable", "igst", "cgst", "sgst", "total_tax", "total", "credit", "debit", "balance", "amount"];
  data.forEach(row => {
    rows.push(columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return "";
      if (typeof val === "number") return val;
      if (amountKeys.some(k => c.key.toLowerCase().includes(k))) {
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
      return String(val);
    }));
  });

  const amountCols = columns.filter(c => amountKeys.some(k => c.key.toLowerCase().includes(k)));
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
    if (["name", "vendor", "description", "place"].some(k => c.key.toLowerCase().includes(k))) return { wch: 30 };
    if (amountKeys.some(k => c.key.toLowerCase().includes(k))) return { wch: 16 };
    if (["gstin", "invoice", "note", "return"].some(k => c.key.toLowerCase().includes(k))) return { wch: 20 };
    return { wch: 15 };
  });

  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob  = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return new File([blob], `${title}.xlsx`, { type: blob.type });
};

// ─── Download helper ──────────────────────────────────────────────────────────

const triggerDownload = (file) => {
  const url = URL.createObjectURL(file);
  const a   = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  URL.revokeObjectURL(url);
};

// ─── Export data builders (per tab) ──────────────────────────────────────────

function buildExportData(tab, purchases, purchaseReturns, debitNotes, filter) {
  if (tab === "Purchase") {
    const rows = filterByDate(purchases, filter, "invoice_date");
    return {
      data: rows.map((p, i) => {
        const t = calcTax(p);
        return {
          sr_no:    i + 1,
          gstin:    t.gstin || "—",
          name:     t.vendorName,
          invoice:  p.supplier_invoice_no || p.order_no || "—",
          date:     fmtDate(p.invoice_date),
          place:    t.placeOfSupply,
          value:    p.total_amount || 0,
          taxable:  t.taxable,
          igst:     t.igst,
          cgst:     t.cgst,
          sgst:     t.sgst,
          total_tax: t.total,
          rate:     t.taxable ? ((t.total / t.taxable) * 100).toFixed(2) + "%" : "0%",
          itc:      t.gstin.length === 15 ? "Yes" : "No",
        };
      }),
      columns: [
        { key: "sr_no",     label: "Sr No"           },
        { key: "gstin",     label: "GSTIN"           },
        { key: "name",      label: "Vendor Name"     },
        { key: "invoice",   label: "Invoice No."     },
        { key: "date",      label: "Invoice Date"    },
        { key: "place",     label: "Place of Supply" },
        { key: "value",     label: "Invoice Value"   },
        { key: "taxable",   label: "Taxable Value"   },
        { key: "igst",      label: "IGST"            },
        { key: "cgst",      label: "CGST"            },
        { key: "sgst",      label: "SGST"            },
        { key: "total_tax", label: "Total Tax"       },
        { key: "rate",      label: "Tax %"           },
        { key: "itc",       label: "ITC Eligible"    },
      ],
    };
  }

  if (tab === "Purchase Return / Debit Note") {
    const rows = filterByDate([...purchaseReturns, ...debitNotes], filter, (r) => r.date || r.debit_date);
    return {
      data: rows.map((p, i) => {
        const t = calcTax(p);
        return {
          sr_no:    i + 1,
          gstin:    t.gstin || "—",
          name:     t.vendorName,
          return_no: p.return_no || p.debit_note_no || "—",
          date:     fmtDate(p.date || p.debit_date),
          place:    t.placeOfSupply,
          value:    p.total_amount || 0,
          taxable:  t.taxable,
          igst:     t.igst,
          cgst:     t.cgst,
          sgst:     t.sgst,
          total_tax: t.total,
          itc:      t.gstin.length === 15 ? "Yes" : "No",
        };
      }),
      columns: [
        { key: "sr_no",     label: "Sr No"                   },
        { key: "gstin",     label: "GSTIN"                   },
        { key: "name",      label: "Vendor Name"             },
        { key: "return_no", label: "Return / Debit Note No." },
        { key: "date",      label: "Return Date"             },
        { key: "place",     label: "Place of Supply"         },
        { key: "value",     label: "Invoice Value"           },
        { key: "taxable",   label: "Taxable Value"           },
        { key: "igst",      label: "IGST"                    },
        { key: "cgst",      label: "CGST"                    },
        { key: "sgst",      label: "SGST"                    },
        { key: "total_tax", label: "Total Tax"               },
        { key: "itc",       label: "ITC Eligible"            },
      ],
    };
  }

  if (tab === "Purchase Summary") {
    const rows = filterByDate(purchases, filter, "invoice_date");
    const map  = {};
    rows.forEach(p => {
      const { gstin } = extractVendorInfo(p);
      const vendorState = gstin.substring(0, 2);
      const isIntra     = vendorState === BUYER_STATE;
      (p.details || []).forEach(item => {
        const rate    = Number(item.gst_rate) || 0;
        const taxable = (Number(item.qty) || 0) * (Number(item.price) || 0) - (Number(item.discount) || 0);
        const tax     = (taxable * rate) / 100;
        if (!map[rate]) map[rate] = { rate, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
        map[rate].taxable += taxable;
        if (isIntra) { map[rate].cgst += tax / 2; map[rate].sgst += tax / 2; }
        else          { map[rate].igst += tax; }
      });
    });
    return {
      data: Object.values(map).sort((a, b) => a.rate - b.rate).map((r, i) => ({
        sr_no:     i + 1,
        rate:      `${r.rate}%`,
        taxable:   r.taxable,
        igst:      r.igst,
        cgst:      r.cgst,
        sgst:      r.sgst,
        total_tax: r.igst + r.cgst + r.sgst,
      })),
      columns: [
        { key: "sr_no",     label: "Sr No"         },
        { key: "rate",      label: "GST Slab"      },
        { key: "taxable",   label: "Taxable Value" },
        { key: "igst",      label: "IGST"          },
        { key: "cgst",      label: "CGST"          },
        { key: "sgst",      label: "SGST"          },
        { key: "total_tax", label: "Total Tax"     },
      ],
    };
  }

  if (tab === "ITC Summary") {
    const filtP = filterByDate(purchases, filter, "invoice_date");
    const filtR = filterByDate([...purchaseReturns, ...debitNotes], filter, (r) => r.date || r.debit_date);
    let elig = { igst: 0, cgst: 0, sgst: 0 };
    let rev  = { igst: 0, cgst: 0, sgst: 0 };
    let inel = { igst: 0, cgst: 0, sgst: 0 };
    filtP.forEach(p => {
      const t = calcTax(p);
      if (t.gstin.length === 15) { elig.igst += t.igst; elig.cgst += t.cgst; elig.sgst += t.sgst; }
      else                        { inel.igst += t.igst; inel.cgst += t.cgst; inel.sgst += t.sgst; }
    });
    filtR.forEach(p => {
      const t = calcTax(p);
      if (t.gstin.length === 15) { rev.igst += t.igst; rev.cgst += t.cgst; rev.sgst += t.sgst; }
    });
    const net = { igst: elig.igst - rev.igst, cgst: elig.cgst - rev.cgst, sgst: elig.sgst - rev.sgst };
    return {
      data: [
        { type: "Eligible ITC",     igst: elig.igst, cgst: elig.cgst, sgst: elig.sgst, total_tax: elig.igst + elig.cgst + elig.sgst, status: "Claimable"     },
        { type: "ITC Reversed",     igst: rev.igst,  cgst: rev.cgst,  sgst: rev.sgst,  total_tax: rev.igst  + rev.cgst  + rev.sgst,  status: "Reversed"      },
        { type: "Ineligible ITC",   igst: inel.igst, cgst: inel.cgst, sgst: inel.sgst, total_tax: inel.igst + inel.cgst + inel.sgst, status: "Not Claimable" },
        { type: "Net ITC Available", igst: net.igst,  cgst: net.cgst,  sgst: net.sgst,  total_tax: net.igst  + net.cgst  + net.sgst,  status: net.igst + net.cgst + net.sgst >= 0 ? "Available" : "Negative" },
      ],
      columns: [
        { key: "type",      label: "ITC Type"   },
        { key: "igst",      label: "IGST"       },
        { key: "cgst",      label: "CGST"       },
        { key: "sgst",      label: "SGST"       },
        { key: "total_tax", label: "Total ITC"  },
        { key: "status",    label: "Status"     },
      ],
    };
  }

  return { data: [], columns: [] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

function getDateBounds(filter) {
  const today = new Date();
  let from, to;
  switch (filter) {
    case "Today":        from = to = new Date(); break;
    case "Yesterday":    from = to = new Date(new Date().setDate(today.getDate() - 1)); break;
    case "This Week": {
      from = new Date(); from.setDate(today.getDate() - today.getDay() + 1);
      to = new Date(from); to.setDate(from.getDate() + 6); break;
    }
    case "Last Week": {
      from = new Date(); from.setDate(today.getDate() - today.getDay() - 6);
      to   = new Date(); to.setDate(today.getDate() - today.getDay()); break;
    }
    case "Last 7 Days":   from = new Date(today); from.setDate(today.getDate() - 6);   to = today; break;
    case "Last 30 Days":  from = new Date(today); from.setDate(today.getDate() - 29);  to = today; break;
    case "Last 365 Days": from = new Date(today); from.setDate(today.getDate() - 364); to = today; break;
    case "This Month":    from = new Date(today.getFullYear(), today.getMonth(), 1);    to = today; break;
    case "Previous Month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to   = new Date(today.getFullYear(), today.getMonth(), 0); break;
    case "This Quarter": {
      const q = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), q * 3, 1); to = today; break;
    }
    case "Previous Quarter": {
      const q = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), (q - 1) * 3, 1);
      to   = new Date(today.getFullYear(), q * 3, 0); break;
    }
    case "Current Fiscal Year": {
      const yr = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      from = new Date(yr, 3, 1); to = today; break;
    }
    case "Previous Fiscal Year": {
      const yr = today.getMonth() >= 3 ? today.getFullYear() - 1 : today.getFullYear() - 2;
      from = new Date(yr, 3, 1); to = new Date(yr + 1, 2, 31); break;
    }
    default: return null;
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getDateRangeLabel(filter) {
  const b = getDateBounds(filter);
  if (!b) return "";
  const f = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${f(b.from)} – ${f(b.to)}`;
}

function filterByDate(rows, filter, dateField) {
  const bounds = getDateBounds(filter);
  if (!bounds) return rows;
  const { from, to } = bounds;
  return rows.filter((row) => {
    const raw = typeof dateField === "function" ? dateField(row) : row[dateField];
    const d = new Date(raw);
    if (isNaN(d)) return false;
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return (
      day >= new Date(from.getFullYear(), from.getMonth(), from.getDate()) &&
      day <= new Date(to.getFullYear(), to.getMonth(), to.getDate())
    );
  });
}

function extractVendorInfo(p) {
  const v = typeof p.vendor_id === "object" && p.vendor_id !== null ? p.vendor_id : null;
  const gstin =
    v?.gst || v?.gstin || v?.gst_no || v?.gst_number ||
    p.vendor_gst || p.gstin || p.gst || "";
  const vendorName =
    v?.company_name || v?.vendor_name || v?.name ||
    p.vendor_name || p.company_name || "—";
  return { gstin: gstin.trim(), vendorName };
}

function calcTax(p) {
  const { gstin, vendorName } = extractVendorInfo(p);
  const vendorState = gstin.substring(0, 2);
  const isIntra     = vendorState === BUYER_STATE;

  const taxable =
    (p.details?.length > 0
      ? p.details.reduce((s, i) => s + (i.amount || (Number(i.qty || 0) * Number(i.price || 0) - Number(i.discount || 0))), 0)
      : 0) ||
    Number(p.taxable_amount) || 0;

  const gstRate = p.details?.[0]?.gst_rate || 18;
  let igst = 0, cgst = 0, sgst = 0;
  if (isIntra) {
    cgst = (taxable * gstRate) / 200;
    sgst = (taxable * gstRate) / 200;
  } else {
    igst = (taxable * gstRate) / 100;
  }

  const posCode = (typeof p.vendor_id === "object" ? p.vendor_id?.state_code : null) || vendorState || "";
  const STATE_NAMES = {
    "01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh",
    "05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh",
    "10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur",
    "15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal",
    "20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat",
    "27":"Maharashtra","29":"Karnataka","30":"Goa","32":"Kerala","33":"Tamil Nadu",
    "34":"Puducherry","36":"Telangana","37":"Andhra Pradesh",
  };
  const placeOfSupply = posCode && STATE_NAMES[posCode] ? `${posCode} – ${STATE_NAMES[posCode]}` : "—";

  return { gstin, vendorName, isIntra, taxable, gstRate, igst, cgst, sgst, total: igst + cgst + sgst, placeOfSupply };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ children, color }) {
  const colors = {
    blue:   { background: "#eff6ff", color: "#1d4ed8" },
    green:  { background: "#f0fdf4", color: "#15803d" },
    red:    { background: "#fef2f2", color: "#b91c1c" },
    amber:  { background: "#fef3c7", color: "#92400e" },
    purple: { background: "#f5f3ff", color: "#5b21b6" },
    gray:   { background: "#f3f4f6", color: "#374151" },
  };
  const s = colors[color] || colors.gray;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 9px",
      borderRadius: "20px", fontSize: "10.5px", fontWeight: 700,
      background: s.background, color: s.color,
    }}>
      {children}
    </span>
  );
}

function KpiCard({ label, value, accent, danger }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "14px 16px", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: "10.5px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "19px", fontWeight: 700, color: danger ? "#b91c1c" : accent ? "#1d4ed8" : "#111827" }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ colSpan, message = "No transactions for the selected period" }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: "center", padding: "56px 0", color: "#9ca3af", fontSize: "13px" }}>
        {message}
      </td>
    </tr>
  );
}

// ─── Date Filter Dropdown ─────────────────────────────────────────────────────

function DateFilter({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((p) => !p)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "12.5px", color: "#374151", fontWeight: 500, userSelect: "none" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {selected}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 270, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.1)", zIndex: 9999, overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", fontSize: "10px", fontWeight: 600, color: "#9ca3af", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Select date range
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {FILTERS.map((f) => (
              <div key={f}
                onMouseEnter={() => setHovered(f)} onMouseLeave={() => setHovered(null)}
                onClick={() => { onChange(f); setOpen(false); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", fontSize: "12.5px", cursor: "pointer", background: selected === f ? "#eff6ff" : "transparent", color: selected === f ? "#1d4ed8" : "#374151", fontWeight: selected === f ? 600 : 400 }}>
                <span>{f}</span>
                <span style={{ fontSize: "10.5px", color: "#9ca3af", opacity: hovered === f || selected === f ? 1 : 0, transition: "opacity 0.15s" }}>
                  {getDateRangeLabel(f)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Table Styles ──────────────────────────────────────────────────────

const TH_STYLE = {
  padding: "7px 5px",
  fontSize: "9px",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  textAlign: "center",
  whiteSpace: "normal",
  lineHeight: "1.2",
};
const TH_GROUP_STYLE = {
  ...TH_STYLE,
  borderBottom: "1px solid #e5e7eb",
  borderLeft: "1px solid #e5e7eb",
  borderRight: "1px solid #e5e7eb",
  background: "#f0f4ff",
  color: "#1d4ed8",
  textAlign: "center",
};
const TD_STYLE = {
  padding: "8px 5px",
  fontSize: "11px",
  color: "#111827",
  textAlign: "center",
  borderTop: "1px solid #f3f4f6",
  wordBreak: "break-word",
  lineHeight: "1.3",
};
const TF_STYLE = {
  padding: "8px 5px",
  fontSize: "11px",
  fontWeight: 700,
  background: "#f9fafb",
  borderTop: "2px solid #e5e7eb",
  textAlign: "center",
};

// ─── Tab: Purchase ─────────────────────────────────────────────────────────────

function PurchaseTab({ data, filter, isGSTUser }) {
    const rows = filterByDate(data, filter, "invoice_date");

  const totals = useMemo(() => {
    return rows.reduce((acc, p) => {
      const t = calcTax(p);
      return {
        value:   acc.value   + (p.total_amount || 0),
        taxable: acc.taxable + t.taxable,
        igst:    acc.igst    + t.igst,
        cgst:    acc.cgst    + t.cgst,
        sgst:    acc.sgst    + t.sgst,
        total:   acc.total   + t.total,
      };
    }, { value: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 });
  }, [rows]);

  return (
    <>
   {isGSTUser ? (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
    <KpiCard label="Total invoices" value={rows.length} />
    <KpiCard label="Total taxable value" value={`₹ ${fmt(totals.taxable)}`} />
    <KpiCard label="Total GST paid" value={`₹ ${fmt(totals.total)}`} accent />
  </div>
) : (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 18 }}>
    <KpiCard label="Total invoices" value={rows.length} />
    <KpiCard label="Total purchase value" value={`₹ ${fmt(totals.value)}`} />
  </div>
)}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "9.5%" }} />
            <col style={{ width: "10%"  }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7.5%" }} />
            <col style={{ width: "9%"   }} />
            <col style={{ width: "8%"   }} />
            <col style={{ width: "8%"   }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7.5%" }} />
            <col style={{ width: "5.5%" }} />
            <col style={{ width: "7%"   }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Invoice details from GSTR-2B</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Amount of tax</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={1} style={TH_STYLE}></th>
            </tr>
       <tr>
  {(isGSTUser
    ? [
        "GSTIN",
        "Vendor name",
        "Invoice no.",
        "Invoice date",
        "Place of supply",
        "Invoice value",
        "Taxable value",
        "IGST",
        "CGST",
        "SGST",
        "Total tax",
        "Tax %",
        "ITC eligible",
      ]
    : [
        "Vendor name",
        "Invoice no.",
        "Invoice date",
        "Invoice value",
      ]
  ).map((h) => (
    <th key={h} style={TH_STYLE}>
      {h}
    </th>
  ))}
</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyState colSpan={13} />
            ) : (
       rows.map((p, i) => {
  const t = calcTax(p);
  const eligible = t.gstin.length === 15;

  return isGSTUser ? (
    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
      <td style={TD_STYLE}>{t.gstin || "—"}</td>

      <td style={{ ...TD_STYLE, textAlign: "left" }}>
        {t.vendorName}
      </td>

      <td style={TD_STYLE}>
        {p.supplier_invoice_no || p.order_no || "—"}
      </td>

      <td style={TD_STYLE}>
        {fmtDate(p.invoice_date)}
      </td>

      <td style={TD_STYLE}>
        {t.placeOfSupply}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right" }}>
        ₹ {fmt(p.total_amount)}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right" }}>
        ₹ {fmt(t.taxable)}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right" }}>
        ₹ {fmt(t.igst)}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right" }}>
        ₹ {fmt(t.cgst)}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right" }}>
        ₹ {fmt(t.sgst)}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>
        ₹ {fmt(t.total)}
      </td>

      <td style={{ ...TD_STYLE, color: "#1d4ed8", fontWeight: 600 }}>
        {t.taxable
          ? ((t.total / t.taxable) * 100).toFixed(2) + "%"
          : "0%"}
      </td>

      <td style={TD_STYLE}>
        <Badge color={eligible ? "green" : "red"}>
          {eligible ? "Yes" : "No"}
        </Badge>
      </td>
    </tr>
  ) : (
    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
      <td style={{ ...TD_STYLE, textAlign: "left" }}>
        {t.vendorName}
      </td>

      <td style={TD_STYLE}>
        {p.supplier_invoice_no || p.order_no || "—"}
      </td>

      <td style={TD_STYLE}>
        {fmtDate(p.invoice_date)}
      </td>

      <td style={{ ...TD_STYLE, textAlign: "right" }}>
        ₹ {fmt(p.total_amount)}
      </td>
    </tr>
  );
})
             
            )}
          </tbody>
      {rows.length > 0 && isGSTUser && (
  <tfoot>
              <tr>
                <td colSpan={5} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Totals</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.value)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.igst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.cgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.sgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(totals.total)}</td>
                <td style={TF_STYLE}>
                  {totals.taxable ? ((totals.total / totals.taxable) * 100).toFixed(2) + "%" : "0%"}
                </td>
                <td style={TF_STYLE}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

// ─── Tab: Purchase Return ─────────────────────────────────────────────────────

function PurchaseReturnTab({ data, filter }) {
  const rows = filterByDate(data, filter, (row) => row.date || row.debit_date);

  const totals = useMemo(() => {
    return rows.reduce((acc, p) => {
      const t = calcTax(p);
      return {
        value:   acc.value   + (p.total_amount || 0),
        taxable: acc.taxable + t.taxable,
        igst:    acc.igst    + t.igst,
        cgst:    acc.cgst    + t.cgst,
        sgst:    acc.sgst    + t.sgst,
        total:   acc.total   + t.total,
      };
    }, { value: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 });
  }, [rows]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total returns"       value={rows.length} />
        <KpiCard label="Total taxable value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="GST reversed"        value={`₹ ${fmt(totals.total)}`} accent />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "9.5%" }} />
            <col style={{ width: "10%"  }} />
            <col style={{ width: "7.5%" }} />
            <col style={{ width: "7.5%" }} />
            <col style={{ width: "9%"   }} />
            <col style={{ width: "8%"   }} />
            <col style={{ width: "8%"   }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7%"   }} />
            <col style={{ width: "7.5%" }} />
            <col style={{ width: "5.5%" }} />
            <col style={{ width: "6.5%" }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Return / Debit Note details from GSTR-2B</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Amount of tax</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={1} style={TH_STYLE}></th>
            </tr>
            <tr>
              {["GSTIN","Vendor name","Return / Debit Note no.","Return / Debit Note date","Place of supply","Invoice value","Taxable value","IGST","CGST","SGST","Total tax","Tax %","ITC eligible"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyState colSpan={13} />
            ) : (
              rows.map((p, i) => {
                const t = calcTax(p);
                const eligible = t.gstin.length === 15;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={TD_STYLE}>{t.gstin || "—"}</td>
                    <td style={{ ...TD_STYLE, textAlign: "left" }}>{t.vendorName}</td>
                    <td style={TD_STYLE}>{p.return_no || p.debit_note_no || "—"}</td>
                    <td style={TD_STYLE}>{fmtDate(p.date || p.debit_date)}</td>
                    <td style={TD_STYLE}>{t.placeOfSupply}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(p.total_amount)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.igst)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.cgst)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.sgst)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(t.total)}</td>
                    <td style={{ ...TD_STYLE, color: "#1d4ed8", fontWeight: 600 }}>
                      {t.taxable ? ((t.total / t.taxable) * 100).toFixed(2) + "%" : "0%"}
                    </td>
                    <td style={TD_STYLE}>
                      <Badge color={eligible ? "green" : "red"}>{eligible ? "Yes" : "No"}</Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Totals</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.value)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.igst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.cgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.sgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(totals.total)}</td>
                <td style={TF_STYLE}>
                  {totals.taxable ? ((totals.total / totals.taxable) * 100).toFixed(2) + "%" : "0%"}
                </td>
                <td style={TF_STYLE}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

// ─── Tab: Purchase Summary ────────────────────────────────────────────────────

function PurchaseSummaryTab({ data, filter }) {
  const rows = filterByDate(data, filter, "invoice_date");

  const slabs = useMemo(() => {
    const map = {};
    rows.forEach((p) => {
      const { gstin } = extractVendorInfo(p);
      const vendorState = gstin.substring(0, 2);
      const isIntra     = vendorState === BUYER_STATE;
      const details     = p.details || [];

      if (details.length > 0) {
        details.forEach((item) => {
          const rate    = Number(item.gst_rate) || 0;
          const taxable = (Number(item.qty) || 0) * (Number(item.price) || 0) - (Number(item.discount) || 0);
          const tax     = (taxable * rate) / 100;
          if (!map[rate]) map[rate] = { rate, taxable: 0, igst: 0, cgst: 0, sgst: 0, count: 0 };
          map[rate].taxable += taxable;
          map[rate].count   += 1;
          if (isIntra) { map[rate].cgst += tax / 2; map[rate].sgst += tax / 2; }
          else          { map[rate].igst += tax; }
        });
      } else {
        const key = "g";
        if (!map[key]) map[key] = { rate: null, taxable: 0, igst: 0, cgst: 0, sgst: 0, count: 0 };
        map[key].taxable += Number(p.taxable_amount) || 0;
        map[key].igst    += Number(p.igst)           || 0;
        map[key].cgst    += Number(p.cgst)           || 0;
        map[key].sgst    += Number(p.sgst)            || 0;
        map[key].count   += 1;
      }
    });
    return Object.values(map).sort((a, b) =>
      a.rate === null ? 1 : b.rate === null ? -1 : a.rate - b.rate
    );
  }, [rows]);

  const totals = useMemo(() => slabs.reduce(
    (acc, r) => ({ taxable: acc.taxable + r.taxable, igst: acc.igst + r.igst, cgst: acc.cgst + r.cgst, sgst: acc.sgst + r.sgst }),
    { taxable: 0, igst: 0, cgst: 0, sgst: 0 }
  ), [slabs]);

  const totalGST      = totals.igst + totals.cgst + totals.sgst;
  const totalPurchase = totals.taxable + totalGST;
  const slabColors    = { 0: "gray", 5: "green", 12: "blue", 18: "purple", 28: "amber" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total purchase value" value={`₹ ${fmt(totalPurchase)}`} />
        <KpiCard label="Total taxable value"  value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total GST paid"        value={`₹ ${fmt(totalGST)}`} accent />
        <KpiCard label="Total invoices"        value={rows.length} />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "9px 16px", fontSize: "10.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          Tax-wise purchase breakup
        </div>
        {slabs.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>No purchase data for the selected period</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
         <tr>
  {(isGSTUser
    ? [
        "GSTIN",
        "Vendor name",
        "Invoice no.",
        "Invoice date",
        "Place of supply",
        "Invoice value",
        "Taxable value",
        "IGST",
        "CGST",
        "SGST",
        "Total tax",
        "Tax %",
        "ITC eligible",
      ]
    : [
        "Vendor name",
        "Invoice no.",
        "Invoice date",
        "Invoice value",
      ]
  ).map((h) => (
    <th key={h} style={TH_STYLE}>
      {h}
    </th>
  ))}
</tr>
            </thead>
            <tbody>
              {slabs.map((s, i) => {
                const tax = s.igst + s.cgst + s.sgst;
                const col = slabColors[s.rate] || "blue";
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={TD_STYLE}><Badge color={col}>{s.rate !== null ? `${s.rate}%` : "—"}</Badge></td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.taxable)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.igst)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.cgst)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.sgst)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(tax)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Total</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.igst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.cgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.sgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(totalGST)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}

// ─── Tab: ITC Summary ─────────────────────────────────────────────────────────

function ITCSummaryTab({ purchases, returns, filter }) {
  const filteredPurchases = filterByDate(purchases, filter, "invoice_date");
  const filteredReturns   = filterByDate(returns, filter, (r) => r.date || r.debit_date);

  const agg = useMemo(() => {
    let eligIgst = 0, eligCgst = 0, eligSgst = 0;
    let ineligIgst = 0, ineligCgst = 0, ineligSgst = 0;
    let revIgst = 0, revCgst = 0, revSgst = 0;

    filteredPurchases.forEach((p) => {
      const t = calcTax(p);
      if (t.gstin.length === 15) { eligIgst += t.igst; eligCgst += t.cgst; eligSgst += t.sgst; }
      else                        { ineligIgst += t.igst; ineligCgst += t.cgst; ineligSgst += t.sgst; }
    });

    filteredReturns.forEach((p) => {
      const t = calcTax(p);
      if (t.gstin.length === 15) { revIgst += t.igst; revCgst += t.cgst; revSgst += t.sgst; }
    });

    return {
      eligible:   { igst: eligIgst,   cgst: eligCgst,   sgst: eligSgst,   total: eligIgst   + eligCgst   + eligSgst   },
      reversed:   { igst: revIgst,    cgst: revCgst,    sgst: revSgst,    total: revIgst    + revCgst    + revSgst    },
      ineligible: { igst: ineligIgst, cgst: ineligCgst, sgst: ineligSgst, total: ineligIgst + ineligCgst + ineligSgst },
      net: {
        igst: eligIgst - revIgst, cgst: eligCgst - revCgst, sgst: eligSgst - revSgst,
        total: (eligIgst - revIgst) + (eligCgst - revCgst) + (eligSgst - revSgst),
      },
    };
  }, [filteredPurchases, filteredReturns]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Eligible ITC"  value={`₹ ${fmt(agg.eligible.total)}`}   accent />
        <KpiCard label="ITC Reversed"  value={`₹ ${fmt(agg.reversed.total)}`}   />
        <KpiCard label="Ineligible ITC" value={`₹ ${fmt(agg.ineligible.total)}`} danger />
        <KpiCard label="Net ITC"        value={`₹ ${fmt(agg.net.total)}`}        accent={agg.net.total >= 0} danger={agg.net.total < 0} />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={TH_STYLE}>ITC Type</th>
              <th style={TH_STYLE}>IGST</th>
              <th style={TH_STYLE}>CGST</th>
              <th style={TH_STYLE}>SGST</th>
              <th style={TH_STYLE}>Total ITC</th>
              <th style={TH_STYLE}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#fff" }}>
              <td style={{ ...TD_STYLE, textAlign: "left" }}>Eligible ITC</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.eligible.igst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.eligible.cgst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.eligible.sgst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700, color: "#15803d" }}>₹ {fmt(agg.eligible.total)}</td>
              <td style={TD_STYLE}><Badge color="green">Claimable</Badge></td>
            </tr>
            <tr style={{ background: "#fafafa" }}>
              <td style={{ ...TD_STYLE, textAlign: "left" }}>ITC Reversed</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.reversed.igst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.reversed.cgst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.reversed.sgst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700, color: "#b45309" }}>₹ {fmt(agg.reversed.total)}</td>
              <td style={TD_STYLE}><Badge color="amber">Reversed</Badge></td>
            </tr>
            <tr style={{ background: "#fff" }}>
              <td style={{ ...TD_STYLE, textAlign: "left" }}>Ineligible ITC</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.ineligible.igst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.ineligible.cgst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(agg.ineligible.sgst)}</td>
              <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700, color: "#b91c1c" }}>₹ {fmt(agg.ineligible.total)}</td>
              <td style={TD_STYLE}><Badge color="red">Not Claimable</Badge></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Net ITC Available</td>
              <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(agg.net.igst)}</td>
              <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(agg.net.cgst)}</td>
              <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(agg.net.sgst)}</td>
              <td style={{ ...TF_STYLE, textAlign: "right", color: agg.net.total >= 0 ? "#1d4ed8" : "#b91c1c" }}>₹ {fmt(agg.net.total)}</td>
              <td style={TF_STYLE}><Badge color={agg.net.total >= 0 ? "blue" : "red"}>{agg.net.total >= 0 ? "Available" : "Negative"}</Badge></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GSTR2Reports() {
  const { user } = useAuth();

const isGSTUser =
  user?.company?.features?.gst;
  const TABS = isGSTUser
  ? GST_TABS
  : NON_GST_TABS;
  const [activeTab,       setActiveTab]       = useState("Purchase");
  const [selectedFilter,  setSelectedFilter]  = useState("This Month");
  const [purchases,       setPurchases]       = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [debitNotes,      setDebitNotes]      = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [exporting,       setExporting]       = useState(null); // "excel" | "pdf" | null

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:8000/api/purchase");
        if (res.data.success) setPurchases(res.data.data);
      } catch (err) { console.error("Purchase fetch error:", err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/debit-note");
        if (res.data.success) setDebitNotes(res.data.data);
      } catch (err) { console.error("Debit note fetch error:", err); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/purchase-return");
        if (res.data.success) setPurchaseReturns(res.data.data);
      } catch (err) { console.error("Purchase return fetch error:", err); }
    };
    load();
  }, []);

  // ── Export handlers ──
  const handleExcelDownload = async () => {
    setExporting("excel");
    try {
      const { data, columns } = buildExportData(activeTab, purchases, purchaseReturns, debitNotes, selectedFilter);
      const dateRange = getDateRangeLabel(selectedFilter);
      const file = await generateExcelFile(data, columns, activeTab, dateRange);
      triggerDownload(file);
    } catch (err) { console.error(err); alert("Excel export failed"); }
    finally { setExporting(null); }
  };

  const handlePDFDownload = async () => {
    setExporting("pdf");
    try {
      const { data, columns } = buildExportData(activeTab, purchases, purchaseReturns, debitNotes, selectedFilter);
      const dateRange = getDateRangeLabel(selectedFilter);
      const file = await generatePDFFile(data, columns, activeTab, dateRange);
      triggerDownload(file);
    } catch (err) { console.error(err); alert("PDF export failed"); }
    finally { setExporting(null); }
  };

  // Register on window so MainLayout buttons can call them
  useEffect(() => {
    window.exportGSTR2Excel = handleExcelDownload;
    window.exportGSTR2PDF   = handlePDFDownload;
    return () => {
      delete window.exportGSTR2Excel;
      delete window.exportGSTR2PDF;
    };
  }, [purchases, purchaseReturns, debitNotes, selectedFilter, activeTab]);

  return (
    <div style={{ minHeight: "100vh", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "visible", zIndex: 1 }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>

        {/* Tab pills */}
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 3, flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "6px 16px", borderRadius: 7, fontSize: "12.5px", fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "normal", lineHeight: "1.2",
                background: activeTab === tab ? "#1e3a8a" : "transparent", color: activeTab === tab ? "#fff" : "#6b7280" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Right controls: Download buttons + Date filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* Excel download */}
          <button
            onClick={handleExcelDownload}
            disabled={!!exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: exporting ? "wait" : "pointer", opacity: exporting && exporting !== "excel" ? 0.5 : 1, transition: "all 0.15s" }}
            onMouseEnter={e => { if (!exporting) { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#9ca3af"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#d1d5db"; }}
          >
            {exporting === "excel"
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            }
            {exporting === "excel" ? "Exporting…" : "Download Excel"}
          </button>

          {/* PDF download */}
          <button
            onClick={handlePDFDownload}
            disabled={!!exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: exporting ? "wait" : "pointer", opacity: exporting && exporting !== "pdf" ? 0.5 : 1, transition: "all 0.15s" }}
            onMouseEnter={e => { if (!exporting) { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#9ca3af"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#d1d5db"; }}
          >
            {exporting === "pdf"
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            }
            {exporting === "pdf" ? "Exporting…" : "Download PDF"}
          </button>

          <DateFilter selected={selectedFilter} onChange={setSelectedFilter} />
        </div>
      </div>

      {/* Date range label */}
      <div style={{ fontSize: "11.5px", color: "#9ca3af", marginBottom: 16 }}>
        {getDateRangeLabel(selectedFilter)}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: "13px" }}>Loading data…</div>
      )}

      {/* Tab content */}
      {!loading && (
        <>
          {activeTab === "Purchase"                        && <PurchaseTab
  data={purchases}
  filter={selectedFilter}
  isGSTUser={isGSTUser}
/>}
          {activeTab === "Purchase Return / Debit Note"    && <PurchaseReturnTab data={[...purchaseReturns, ...debitNotes]} filter={selectedFilter} />}
          {activeTab === "Purchase Summary"                && <PurchaseSummaryTab data={purchases}                         filter={selectedFilter} />}
          {activeTab === "ITC Summary"                     && <ITCSummaryTab      purchases={purchases} returns={[...purchaseReturns, ...debitNotes]} filter={selectedFilter} />}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}