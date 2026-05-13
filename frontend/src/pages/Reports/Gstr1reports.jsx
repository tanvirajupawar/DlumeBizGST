import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { downloadExcel, downloadPDF } from "../../utils/exportUtils";

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Sales Report", "B2B", "B2CL", "B2CS", "Credit Note / Sales Return", "HSN Summary", "Sales Summary"];

const FILTERS = [
  "Today", "Yesterday", "This Week", "Last Week", "Last 7 Days",
  "This Month", "Previous Month", "Last 30 Days", "This Quarter",
  "Previous Quarter", "Current Fiscal Year", "Previous Fiscal Year",
  "Last 365 Days",
];

const SELLER_STATE = "27"; // Maharashtra

const TAB_DESCRIPTIONS = {
  B2B:
    "Details of invoices of taxable supplies made to other registered taxpayers.",

  B2CL:
    "Invoices for taxable outward supplies to consumers where (a) place of supply is outside the supplier state and (b) invoice value is more than ₹2,50,000.",

  B2CS:
    "Supplies made to consumers and unregistered persons. (a) Intra-state: any value (b) Inter-state: invoice value ₹2.5 lakh or less.",

  "Credit Note / Sales Return":
    "Credit/Debit notes issued to registered taxpayers during the tax period against original invoices reported earlier.",

  "HSN Summary":
    "Summary of outward supplies grouped by HSN code including quantity, taxable value and GST.",

  "Sales Summary":
    "Overall sales summary with GST slab-wise taxable value and tax breakup.",

  "Sales Report":
    "Complete sales register including invoice details, customer GSTIN and tax breakup.",
};

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

function extractCustomerInfo(s) {
  const c = typeof s.client_id === "object" && s.client_id !== null ? s.client_id : null;
  const gstin = c?.gst || s.customer_gst || s.gstin || s.gst || "";
  const customerName =
    c?.company_name ||
    `${c?.first_name || ""} ${c?.last_name || ""}`.trim() ||
    s.customer_name ||
    "—";
  return { gstin: gstin.trim(), customerName };
}

const STATE_NAMES = {
  "01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh",
  "05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh",
  "10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur",
  "15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal",
  "20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat",
  "27":"Maharashtra","29":"Karnataka","30":"Goa","32":"Kerala","33":"Tamil Nadu",
  "34":"Puducherry","36":"Telangana","37":"Andhra Pradesh",
};

function calcSalesTax(s) {
  const { gstin, customerName } = extractCustomerInfo(s);
  const customerState = gstin.substring(0, 2);
  const isIntra = customerState === SELLER_STATE || !customerState;

  const taxable =
    (s.details?.length > 0
      ? s.details.reduce((sum, i) => sum + (i.amount || (Number(i.qty || 0) * Number(i.price || 0) - Number(i.discount || 0))), 0)
      : 0) ||
    Number(s.taxable_amount) || 0;

  const gstRate = s.details?.[0]?.gst_rate || 18;

  let igst = 0, cgst = 0, sgst = 0;
  if (isIntra) {
    cgst = (taxable * gstRate) / 200;
    sgst = (taxable * gstRate) / 200;
  } else {
    igst = (taxable * gstRate) / 100;
  }

  const posCode = customerState || "";
  const placeOfSupply = posCode && STATE_NAMES[posCode]
    ? `${posCode} – ${STATE_NAMES[posCode]}` : "—";

  // Derive GST category from invoice_category + amount + interstate logic
  let invoiceType = s.invoice_category || "B2CS";
  if (invoiceType === "B2C") {
    // Auto-classify: interstate + > 2.5L = B2CL, everything else = B2CS
    if (!isIntra && (s.total_amount || 0) > 250000) {
      invoiceType = "B2CL";
    } else {
      invoiceType = "B2CS";
    }
  }

  const reverseCharge = s.reverse_charge === true || s.reverse_charge === "Y" ? "Y" : "N";
  const hsn = s.details?.[0]?.hsn || s.details?.[0]?.hsn_code || "—";
 const ecomGstin = "";

  return {
    gstin, customerName, isIntra, taxable, gstRate,
    igst, cgst, sgst, total: igst + cgst + sgst,
    placeOfSupply, invoiceType, reverseCharge, hsn, ecomGstin,
  };
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
  const st = colors[color] || colors.gray;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 9px",
      borderRadius: "20px", fontSize: "10.5px", fontWeight: 700,
      background: st.background, color: st.color,
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
  padding: "8px 10px", fontSize: "10px", fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.05em",
  borderBottom: "1px solid #e5e7eb", background: "#f9fafb",
  textAlign: "center", whiteSpace: "nowrap",
};
const TD_STYLE = { 
  padding: "10px 10px", fontSize: "12.5px", color: "#111827", 
  textAlign: "center", borderTop: "1px solid #f3f4f6", 
  whiteSpace: "nowrap"   // ← add this
};
const TF_STYLE = { 
  padding: "9px 10px", fontSize: "12px", fontWeight: 700, 
  background: "#f9fafb", borderTop: "2px solid #e5e7eb", 
  textAlign: "center", whiteSpace: "nowrap"   // ← add this
};

// ─── Tab: Sales Report ────────────────────────────────────────────────────────

function SalesReportTab({ data, filter }) {
  const rows = filterByDate(data, filter, "invoice_date");

  const totals = useMemo(() => rows.reduce((acc, s) => {
    const t = calcSalesTax(s);
    return {
      value:   acc.value   + (s.total_amount || 0),
      taxable: acc.taxable + t.taxable,
      igst:    acc.igst    + t.igst,
      cgst:    acc.cgst    + t.cgst,
      sgst:    acc.sgst    + t.sgst,
      total:   acc.total   + t.total,
    };
  }, { value: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 }), [rows]);

  // KPI extras
  const b2bCount  = rows.filter(s => s.invoice_category === "B2B").length;
  const b2cCount  = rows.filter(s => s.invoice_category !== "B2B").length;
  const rcCount   = rows.filter(s => s.reverse_charge === true || s.reverse_charge === "Y").length;

const TYPE_COLORS = {
  B2B: "blue", B2CL: "purple", B2CS: "gray",
};

  const COLUMNS = [
    "GSTIN / UIN",
    "Customer Name",
    "Invoice No.",
    "Invoice Date",
    "Invoice Type",
    "Place of Supply",
    "Rev. Charge",
    "Rate %",
    "HSN / SAC",
    "Invoice Value",
    "Taxable Value",
    "IGST",
    "CGST",
    "SGST",
    "Total Tax",
  ];

  return (
    <>
      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 18 }}>
        <KpiCard label="Total Invoices"      value={rows.length} />
        <KpiCard label="B2B Invoices"        value={b2bCount} />
        <KpiCard label="B2C Invoices"        value={b2cCount} />
        <KpiCard label="Reverse Charge"      value={rcCount} danger={rcCount > 0} />
        <KpiCard label="Total Taxable Value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total GST Collected" value={`₹ ${fmt(totals.total)}`} accent />
      </div>

      {/* ── Table ── */}
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflowX: "auto", overflowY: "visible" }}>

<table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
          <thead>
            {/* Group row */}
            <tr>
              <th colSpan={4} style={{ ...TH_STYLE, textAlign: "left", paddingLeft: 12 }}>Recipient & Invoice</th>
              <th colSpan={4} style={{ ...TH_STYLE, borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb" }}>GST Classification</th>
              <th colSpan={2} style={{ ...TH_STYLE, borderRight: "1px solid #e5e7eb" }}>Values</th>
<th colSpan={5} style={{ ...TH_STYLE }}>Tax Breakdown</th>           
            </tr>
            {/* Column row */}
            <tr>
              {COLUMNS.map(h => <th key={h} style={TH_STYLE}>{h}</th>)}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0
              ? <EmptyState colSpan={COLUMNS.length} />
              : rows.map((s, i) => {
                  const t = calcSalesTax(s);
                  const typeColor = TYPE_COLORS[t.invoiceType] || "gray";
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      {/* GSTIN */}
                      <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "10.5px", color: t.gstin ? "#111827" : "#9ca3af" }}>
                        {t.gstin || "-"}
                      </td>
                      {/* Customer Name */}
                      <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.customerName}
                      </td>
                      {/* Invoice No */}
                      <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>
                        {s.invoice_no || s.order_no || "—"}
                      </td>
                      {/* Invoice Date */}
                      <td style={TD_STYLE}>{fmtDate(s.invoice_date)}</td>

                      {/* Invoice Type */}
                      <td style={TD_STYLE}>
                        <Badge color={typeColor}>{t.invoiceType}</Badge>
                      </td>
                      {/* Place of Supply */}
                      <td style={TD_STYLE}>{t.placeOfSupply}</td>
                      {/* Reverse Charge */}
                      <td style={{ ...TD_STYLE }}>
                        <Badge color={t.reverseCharge === "Y" ? "red" : "gray"}>
                          {t.reverseCharge}
                        </Badge>
                      </td>
                      {/* Rate % */}
                      <td style={TD_STYLE}>
                        <Badge color="blue">{t.gstRate}%</Badge>
                      </td>

                      {/* HSN/SAC */}
                      <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>{t.hsn}</td>
                      {/* Invoice Value */}
                      <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.total_amount)}</td>

                      {/* Taxable Value */}
                      <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                      {/* IGST */}
                      <td style={{ ...TD_STYLE, textAlign: "right", color: t.igst > 0 ? "#111827" : "#d1d5db" }}>
                        ₹ {fmt(t.igst)}
                      </td>
                      {/* CGST */}
                      <td style={{ ...TD_STYLE, textAlign: "right", color: t.cgst > 0 ? "#111827" : "#d1d5db" }}>
                        ₹ {fmt(t.cgst)}
                      </td>
                      {/* SGST */}
                      <td style={{ ...TD_STYLE, textAlign: "right", color: t.sgst > 0 ? "#111827" : "#d1d5db" }}>
                        ₹ {fmt(t.sgst)}
                      </td>
                      {/* Total Tax */}
                      <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(t.total)}</td>

                    
                    </tr>
                  );
                })
            }
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={9} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 12 }}>
                  Totals ({rows.length} invoices)
                </td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.value)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.igst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.cgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.sgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(totals.total)}</td>
                <td style={TF_STYLE} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

{/* ── CA Note ── */}
<div style={{
  marginTop: 12, padding: "8px 14px", background: "#fffbeb",
  border: "1px solid #fde68a", borderRadius: 8,
  fontSize: "11px", color: "#92400e", lineHeight: 1.6,
}}>
  <strong>CA Note:</strong> Invoice Type is auto-derived from your B2B/B2C selection —{" "}
  <strong>B2B</strong> Registered buyer (has GSTIN) ·{" "}
  <strong>B2CL</strong> Unregistered, interstate &gt; ₹2.5L ·{" "}
  <strong>B2CS</strong> Unregistered, all others.{" "}
  Rev. Charge <strong>Y</strong> = recipient liable to pay GST.
</div>
    </>
  );
}

// ─── Tab: B2B ─────────────────────────────────────────────────────────────────

function B2BTab({ data, filter }) {
  const allRows = filterByDate(data, filter, "invoice_date");
const rows = allRows.filter(
  (s) => s.invoice_category === "B2B"
);

  const totals = useMemo(() => rows.reduce((acc, s) => {
    const t = calcSalesTax(s);
    return {
      value:   acc.value   + (s.total_amount || 0),
      taxable: acc.taxable + t.taxable,
      igst:    acc.igst    + t.igst,
      cgst:    acc.cgst    + t.cgst,
      sgst:    acc.sgst    + t.sgst,
      total:   acc.total   + t.total,
    };
  }, { value: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 }), [rows]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Number of Recipients" value={new Set(rows.map(s => extractCustomerInfo(s).gstin)).size} />
        <KpiCard label="Number of Invoices"   value={rows.length} />
        <KpiCard label="Total Invoice Value"  value={`₹ ${fmt(totals.value)}`} />
        <KpiCard label="Total Taxable Value"  value={`₹ ${fmt(totals.taxable)}`} />
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: 1100 }}>
          <thead>
            <tr>
              {[
  "GSTIN/UIN of Recipient",
  "Receiver Name",
  "Invoice No.",
  "Invoice Date",
  "Place of Supply",
  "Invoice Value",
  "Rate",
  "Taxable Value",
  "IGST",
  "CGST",
  "SGST",
].map(h => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyState colSpan={13} message="No B2B invoices for the selected period" />
            ) : rows.map((s, i) => {
              const t = calcSalesTax(s);
              const rate = s.details?.[0]?.gst_rate ?? 18;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>{t.gstin}</td>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500 }}>{t.customerName}</td>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>{s.invoice_no || "—"}</td>
                  <td style={TD_STYLE}>{fmtDate(s.invoice_date)}</td>
                <td style={TD_STYLE}>
  {t.placeOfSupply}
</td>

<td style={{ ...TD_STYLE, textAlign: "right" }}>
  ₹ {fmt(s.total_amount)}
</td>

<td style={TD_STYLE}>
  <Badge color="blue">{rate}%</Badge>
</td>
                  
                
               
                 
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>
  ₹ {fmt(t.igst)}
</td>

<td style={{ ...TD_STYLE, textAlign: "right" }}>
  ₹ {fmt(t.cgst)}
</td>

<td style={{ ...TD_STYLE, textAlign: "right" }}>
  ₹ {fmt(t.sgst)}
</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
          <tfoot>
  <tr>

    <td
      colSpan={5}
      style={{
        ...TF_STYLE,
        textAlign: "left",
        paddingLeft: 10,
      }}
    >
      Totals
    </td>

    <td style={{ ...TF_STYLE, textAlign: "right" }}>
      ₹ {fmt(totals.value)}
    </td>

    <td style={TF_STYLE}></td>

    <td style={{ ...TF_STYLE, textAlign: "right" }}>
      ₹ {fmt(totals.taxable)}
    </td>

    <td style={{ ...TF_STYLE, textAlign: "right" }}>
      ₹ {fmt(totals.igst)}
    </td>

    <td style={{ ...TF_STYLE, textAlign: "right" }}>
      ₹ {fmt(totals.cgst)}
    </td>

    <td style={{ ...TF_STYLE, textAlign: "right" }}>
      ₹ {fmt(totals.sgst)}
    </td>

  </tr>
</tfoot>
          )}
        </table>
      </div>
    </>
  );
}

// ─── Tab: B2CL ────────────────────────────────────────────────────────────────

function B2CLTab({ data, filter }) {

  const allRows = filterByDate(data, filter, "invoice_date");

  const rows = allRows.filter(
    (s) => s.invoice_category === "B2CL"
  );

  const totals = useMemo(() =>
    rows.reduce((acc, s) => {

      const t = calcSalesTax(s);

      return {
        value: acc.value + (s.total_amount || 0),
        taxable: acc.taxable + t.taxable,
        igst: acc.igst + t.igst,
        total: acc.total + t.total,
      };

    }, {
      value: 0,
      taxable: 0,
      igst: 0,
      total: 0,
    }),
  [rows]);

  return (
    <>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <KpiCard
          label="Number of Invoices"
          value={rows.length}
        />

        <KpiCard
          label="Total Invoice Value"
          value={`₹ ${fmt(totals.value)}`}
        />

        <KpiCard
          label="Total Taxable Value"
          value={`₹ ${fmt(totals.taxable)}`}
        />
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "auto",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            minWidth: 900,
          }}
        >

          <thead>
            <tr>
              {[
                "Invoice No.",
                "Invoice Date",
                "Place of Supply",
                "Invoice Value",
                "Rate",
                "Taxable Value",
                "IGST",
              ].map((h) => (
                <th key={h} style={TH_STYLE}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>

            {rows.length === 0 ? (

              <EmptyState
                colSpan={7}
                message="No B2CL invoices (interstate unregistered > ₹2.5L)"
              />

            ) : rows.map((s, i) => {

              const t = calcSalesTax(s);

              const rate =
                s.details?.[0]?.gst_rate ?? 18;

              return (

                <tr
                  key={i}
                  style={{
                    background:
                      i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  }}
                >

                  <td
                    style={{
                      ...TD_STYLE,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.invoice_no || "—"}
                  </td>

                  <td style={TD_STYLE}>
                    {fmtDate(s.invoice_date)}
                  </td>

                  <td style={TD_STYLE}>
                    {t.placeOfSupply}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                    }}
                  >
                    ₹ {fmt(s.total_amount)}
                  </td>

                  <td style={TD_STYLE}>
                    <Badge color="blue">
                      {rate}%
                    </Badge>
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                    }}
                  >
                    ₹ {fmt(t.taxable)}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                    }}
                  >
                    ₹ {fmt(t.igst)}
                  </td>

                </tr>
              );
            })}

          </tbody>

          {rows.length > 0 && (

            <tfoot>

              <tr>

                <td
                  colSpan={4}
                  style={{
                    ...TF_STYLE,
                    textAlign: "left",
                    paddingLeft: 10,
                  }}
                >
                  Totals
                </td>

                <td style={TF_STYLE}></td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.taxable)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.igst)}
                </td>

              </tr>

            </tfoot>

          )}

        </table>

      </div>

    </>
  );
}

// ─── Tab: B2CS ────────────────────────────────────────────────────────────────

function B2CSTab({ data, filter }) {

  const allRows = filterByDate(
    data,
    filter,
    "invoice_date"
  );

  const rows = allRows.filter(
    (s) => s.invoice_category === "B2CS"
  );

  const slabMap = useMemo(() => {

    const map = {};

    rows.forEach((s) => {

      const t = calcSalesTax(s);

      const rate =
        s.details?.[0]?.gst_rate || 18;

      const key =
        `${rate}_${t.placeOfSupply}`;

      if (!map[key]) {

        map[key] = {
          rate,
          placeOfSupply: t.placeOfSupply,
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
        };
      }

      map[key].taxable += t.taxable;
      map[key].igst += t.igst;
      map[key].cgst += t.cgst;
      map[key].sgst += t.sgst;

    });

    return Object.values(map);

  }, [rows]);

  const totals = useMemo(() =>
    slabMap.reduce((a, r) => ({

      taxable: a.taxable + r.taxable,

      igst: a.igst + r.igst,

      cgst: a.cgst + r.cgst,

      sgst: a.sgst + r.sgst,

    }), {
      taxable: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
    }),
  [slabMap]);

  return (
    <>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >

        <KpiCard
          label="Total Invoice Value"
          value={`₹ ${fmt(
            rows.reduce(
              (a, s) => a + (s.total_amount || 0),
              0
            )
          )}`}
        />

        <KpiCard
          label="Total Taxable Value"
          value={`₹ ${fmt(totals.taxable)}`}
        />

        <KpiCard
          label="Total IGST"
          value={`₹ ${fmt(totals.igst)}`}
        />

      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "auto",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            minWidth: 700,
          }}
        >

          <thead>

            <tr>

              {[
                "Place of Supply",
                "Rate",
                "Taxable Value",
                "IGST",
                "CGST",
                "SGST",
              ].map((h) => (

                <th
                  key={h}
                  style={TH_STYLE}
                >
                  {h}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {slabMap.length === 0 ? (

              <EmptyState
                colSpan={6}
                message="No B2CS invoices for selected period"
              />

            ) : slabMap.map((r, i) => (

              <tr
                key={i}
                style={{
                  background:
                    i % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                }}
              >

                <td style={TD_STYLE}>
                  {r.placeOfSupply}
                </td>

                <td style={TD_STYLE}>
                  <Badge color="blue">
                    {r.rate}%
                  </Badge>
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.taxable)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.igst)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.cgst)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.sgst)}
                </td>

              </tr>

            ))}

          </tbody>

          {slabMap.length > 0 && (

            <tfoot>

              <tr>

                <td
                  colSpan={2}
                  style={{
                    ...TF_STYLE,
                    textAlign: "left",
                    paddingLeft: 10,
                  }}
                >
                  Total
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.taxable)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.igst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.cgst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.sgst)}
                </td>

              </tr>

            </tfoot>

          )}

        </table>

      </div>

    </>
  );
}
// ─── Tab: CDNR (Credit Notes / Sales Return) ──────────────────────────────────

function CDNRTab({ data, filter }) {

  const rows = filterByDate(
    data,
    filter,
    (row) => row.invoice_date || row.date
  );

  const totals = useMemo(() =>
    rows.reduce((acc, s) => {

      const t = calcSalesTax(s);

      return {
        value: acc.value + (s.total_amount || 0),
        taxable: acc.taxable + t.taxable,
        igst: acc.igst + t.igst,
        cgst: acc.cgst + t.cgst,
        sgst: acc.sgst + t.sgst,
        total: acc.total + t.total,
      };

    }, {
      value: 0,
      taxable: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      total: 0,
    }),
  [rows]);

  return (
    <>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >

        <KpiCard
          label="Total Returns"
          value={rows.length}
        />

        <KpiCard
          label="Total Taxable Value"
          value={`₹ ${fmt(totals.taxable)}`}
        />

        <KpiCard
          label="GST Credit Notes"
          value={`₹ ${fmt(totals.total)}`}
          danger
        />

      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "auto",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            minWidth: 1200,
          }}
        >

          <thead>

            <tr>

              {[
                "GSTIN/UIN of Recipient",
                "Receiver Name",
                "Note Number",
                "Note Date",
                "Note Type",
                "Place of Supply",
                "Rate",
                "Taxable Value",
                "IGST",
                "CGST",
                "SGST",
              ].map((h, i) => (

                <th
                  key={i}
                  style={TH_STYLE}
                >
                  {h}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {rows.length === 0 ? (

              <EmptyState colSpan={11} />

            ) : rows.map((s, i) => {

              const t = calcSalesTax(s);

              const rate =
                s.details?.[0]?.gst_rate ?? 18;

              const noteType =
                s.note_type ||
                (s.return_no
                  ? "Credit Note"
                  : "Debit Note");

              return (

                <tr
                  key={i}
                  style={{
                    background:
                      i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                  }}
                >

                  <td
                    style={{
                      ...TD_STYLE,
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  >
                    {t.gstin || "—"}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    {t.customerName}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.return_no ||
                      s.credit_note_no ||
                      "—"}
                  </td>

                  <td style={TD_STYLE}>
                    {fmtDate(
                      s.invoice_date || s.date
                    )}
                  </td>

                  <td style={TD_STYLE}>
                    <Badge
                      color={
                        noteType === "Credit Note"
                          ? "red"
                          : "amber"
                      }
                    >
                      {noteType}
                    </Badge>
                  </td>

                  <td style={TD_STYLE}>
                    {t.placeOfSupply}
                  </td>

                  <td style={TD_STYLE}>
                    <Badge color="blue">
                      {rate}%
                    </Badge>
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ₹ {fmt(t.taxable)}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ₹ {fmt(t.igst)}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ₹ {fmt(t.cgst)}
                  </td>

                  <td
                    style={{
                      ...TD_STYLE,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ₹ {fmt(t.sgst)}
                  </td>

                </tr>
              );
            })}

          </tbody>

          {rows.length > 0 && (

            <tfoot>

              <tr>

                <td
                  colSpan={7}
                  style={{
                    ...TF_STYLE,
                    textAlign: "left",
                    paddingLeft: 10,
                  }}
                >
                  Totals
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹ {fmt(totals.taxable)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹ {fmt(totals.igst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹ {fmt(totals.cgst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹ {fmt(totals.sgst)}
                </td>

              </tr>

            </tfoot>

          )}

        </table>

      </div>

    </>
  );
}
// ─── Tab: HSN Summary ─────────────────────────────────────────────────────────

function HSNTab({ data, filter }) {

  const rows = filterByDate(
    data,
    filter,
    "invoice_date"
  );

  const hsnMap = useMemo(() => {

    const map = {};

    rows.forEach((s) => {

      const isIntra =
        s.invoice_category !== "B2CL";

      (s.details || []).forEach((item) => {

        const hsn =
          item.hsn ||
          item.hsn_code ||
          "—";

        const desc =
          item.product_name ||
          item.name ||
          "—";

        const uqc =
          item.unit || "NOS";

        const qty =
          Number(item.qty) || 0;

        const taxable =
          ((Number(item.qty) || 0) *
          (Number(item.price) || 0))
          - (Number(item.discount) || 0);

        const rate =
          Number(item.gst_rate) || 0;

        const tax =
          (taxable * rate) / 100;

        const igst =
          isIntra ? 0 : tax;

        const cgst =
          isIntra ? tax / 2 : 0;

        const sgst =
          isIntra ? tax / 2 : 0;

        if (!map[hsn]) {

          map[hsn] = {
            hsn,
            desc,
            uqc,
            qty: 0,
            taxable: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            total: 0,
          };
        }

        map[hsn].qty += qty;

        map[hsn].taxable += taxable;

        map[hsn].igst += igst;

        map[hsn].cgst += cgst;

        map[hsn].sgst += sgst;

        map[hsn].total +=
          taxable + igst + cgst + sgst;

      });

    });

    return Object
      .values(map)
      .sort((a, b) => b.taxable - a.taxable);

  }, [rows]);

  const totals = useMemo(() =>
    hsnMap.reduce((a, r) => ({

      qty: a.qty + r.qty,

      taxable:
        a.taxable + r.taxable,

      igst:
        a.igst + r.igst,

      cgst:
        a.cgst + r.cgst,

      sgst:
        a.sgst + r.sgst,

      total:
        a.total + r.total,

    }), {
      qty: 0,
      taxable: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      total: 0,
    }),
  [hsnMap]);

  return (
    <>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >

        <KpiCard
          label="HSN Codes"
          value={hsnMap.length}
        />

        <KpiCard
          label="Total Taxable Value"
          value={`₹ ${fmt(totals.taxable)}`}
        />

        <KpiCard
          label="Total Tax"
          value={`₹ ${fmt(
            totals.igst +
            totals.cgst +
            totals.sgst
          )}`}
          accent
        />

      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >

          <thead>

            <tr>

              {[
                "HSN Code",
                "Description",
                "UQC",
                "Total Qty",
                "Taxable Value",
                "IGST",
                "CGST",
                "SGST",
                "Total Value",
              ].map((h) => (

                <th
                  key={h}
                  style={TH_STYLE}
                >
                  {h}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {hsnMap.length === 0 ? (

              <EmptyState
                colSpan={9}
                message="No HSN data — add HSN codes to your items"
              />

            ) : hsnMap.map((r, i) => (

              <tr
                key={i}
                style={{
                  background:
                    i % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                }}
              >

                <td
                  style={{
                    ...TD_STYLE,
                    fontWeight: 600,
                    fontFamily: "monospace",
                  }}
                >
                  {r.hsn}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "left",
                  }}
                >
                  {r.desc}
                </td>

                <td style={TD_STYLE}>
                  {r.uqc}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  {r.qty.toLocaleString("en-IN")}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.taxable)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.igst)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.cgst)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(r.sgst)}
                </td>

                <td
                  style={{
                    ...TD_STYLE,
                    textAlign: "right",
                    fontWeight: 700,
                  }}
                >
                  ₹ {fmt(r.total)}
                </td>

              </tr>

            ))}

          </tbody>

          {hsnMap.length > 0 && (

            <tfoot>

              <tr>

                <td
                  colSpan={3}
                  style={{
                    ...TF_STYLE,
                    textAlign: "left",
                    paddingLeft: 10,
                  }}
                >
                  Total
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  {totals.qty.toLocaleString("en-IN")}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.taxable)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.igst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.cgst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.sgst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                    color: "#1d4ed8",
                  }}
                >
                  ₹ {fmt(totals.total)}
                </td>

              </tr>

            </tfoot>

          )}

        </table>

      </div>

    </>
  );
}

// ─── Tab: Sales Summary ───────────────────────────────────────────────────────

function SalesSummaryTab({ data, filter }) {

  const rows = filterByDate(
    data,
    filter,
    "invoice_date"
  );

  const slabs = useMemo(() => {

    const map = {};

    rows.forEach((s) => {

      const isIntra =
        s.invoice_category !== "B2CL";

      const details = s.details || [];

      if (details.length > 0) {

        details.forEach((item) => {

          const rate =
            Number(item.gst_rate) || 0;

          const taxable =
            ((Number(item.qty) || 0) *
            (Number(item.price) || 0))
            - (Number(item.discount) || 0);

          const tax =
            (taxable * rate) / 100;

          if (!map[rate]) {

            map[rate] = {
              rate,
              taxable: 0,
              igst: 0,
              cgst: 0,
              sgst: 0,
              count: 0,
            };
          }

          map[rate].taxable += taxable;

          map[rate].count += 1;

          if (isIntra) {

            map[rate].cgst += tax / 2;

            map[rate].sgst += tax / 2;

          } else {

            map[rate].igst += tax;
          }

        });

      } else {

        const key = "g";

        if (!map[key]) {

          map[key] = {
            rate: null,
            taxable: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            count: 0,
          };
        }

        map[key].taxable +=
          Number(s.taxable_amount) || 0;

        map[key].igst +=
          Number(s.igst) || 0;

        map[key].cgst +=
          Number(s.cgst) || 0;

        map[key].sgst +=
          Number(s.sgst) || 0;

        map[key].count += 1;
      }

    });

    return Object
      .values(map)
      .sort((a, b) =>
        a.rate === null
          ? 1
          : b.rate === null
          ? -1
          : a.rate - b.rate
      );

  }, [rows]);

  const totals = useMemo(() =>
    slabs.reduce(
      (acc, r) => ({

        taxable:
          acc.taxable + r.taxable,

        igst:
          acc.igst + r.igst,

        cgst:
          acc.cgst + r.cgst,

        sgst:
          acc.sgst + r.sgst,

      }),
      {
        taxable: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
      }
    ),
  [slabs]);

  const totalGST =
    totals.igst +
    totals.cgst +
    totals.sgst;

  const totalSales =
    totals.taxable + totalGST;

  const slabColors = {
    0: "gray",
    5: "green",
    12: "blue",
    18: "purple",
    28: "amber",
  };

  return (
    <>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >

        <KpiCard
          label="Total Sales Value"
          value={`₹ ${fmt(totalSales)}`}
        />

        <KpiCard
          label="Total Taxable Value"
          value={`₹ ${fmt(totals.taxable)}`}
        />

        <KpiCard
          label="Total GST Collected"
          value={`₹ ${fmt(totalGST)}`}
          accent
        />

        <KpiCard
          label="Total Invoices"
          value={rows.length}
        />

      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >

        <div
          style={{
            padding: "9px 16px",
            fontSize: "10.5px",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            background: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Tax-wise Sales Breakup
        </div>

        {slabs.length === 0 ? (

          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            No sales data for the selected period
          </div>

        ) : (

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >

            <thead>

              <tr>

                {[
                  "GST Rate",
                  "Taxable Value",
                  "IGST",
                  "CGST",
                  "SGST",
                  "Total GST",
                ].map((h) => (

                  <th
                    key={h}
                    style={TH_STYLE}
                  >
                    {h}
                  </th>

                ))}

              </tr>

            </thead>

            <tbody>

              {slabs.map((s, i) => {

                const tax =
                  s.igst +
                  s.cgst +
                  s.sgst;

                const col =
                  slabColors[s.rate] || "blue";

                return (

                  <tr
                    key={i}
                    style={{
                      background:
                        i % 2 === 0
                          ? "#fff"
                          : "#fafafa",
                    }}
                  >

                    <td style={TD_STYLE}>
                      <Badge color={col}>
                        {s.rate !== null
                          ? `${s.rate}%`
                          : "—"}
                      </Badge>
                    </td>

                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "right",
                      }}
                    >
                      ₹ {fmt(s.taxable)}
                    </td>

                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "right",
                      }}
                    >
                      ₹ {fmt(s.igst)}
                    </td>

                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "right",
                      }}
                    >
                      ₹ {fmt(s.cgst)}
                    </td>

                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "right",
                      }}
                    >
                      ₹ {fmt(s.sgst)}
                    </td>

                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      ₹ {fmt(tax)}
                    </td>

                  </tr>

                );
              })}

            </tbody>

            <tfoot>

              <tr>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "left",
                    paddingLeft: 10,
                  }}
                >
                  Total
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.taxable)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.igst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.cgst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                  }}
                >
                  ₹ {fmt(totals.sgst)}
                </td>

                <td
                  style={{
                    ...TF_STYLE,
                    textAlign: "right",
                    color: "#1d4ed8",
                  }}
                >
                  ₹ {fmt(totalGST)}
                </td>

              </tr>

            </tfoot>

          </table>

        )}

      </div>

    </>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export default function GSTR1Reports() {
  const [activeTab,      setActiveTab]      = useState("B2B");
  const [selectedFilter, setSelectedFilter] = useState("This Month");
  const [sales,          setSales]          = useState([]);
  const [salesReturns,   setSalesReturns]   = useState([]);
  const [loading,        setLoading]        = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:8000/api/sales");
        if (res.data.success) {
          console.log("SALES RECORD SAMPLE 👉", res.data.data?.[0]);
          setSales(res.data.data);
        }
      } catch (err) { console.error("Sales fetch error:", err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/sales-return");
        if (res.data.success) setSalesReturns(res.data.data);
      } catch (err) { console.error("Sales return fetch error:", err); }
    };
    load();
  }, []);

 
const getExportData = () => {

  // SALES REPORT
if (activeTab === "Sales Report") {
  const rows = filterByDate(sales, selectedFilter, "invoice_date");
  return rows.map((s) => {
    const t = calcSalesTax(s);
    return {
      gstin: t.gstin || "-",
      name: t.customerName,
      invoice: s.invoice_no || "-",
      date: fmtDate(s.invoice_date),
      invoice_type: t.invoiceType,
      place: t.placeOfSupply,
      reverse_charge: t.reverseCharge,
      rate: `${t.gstRate}%`,
      hsn: t.hsn,
      value: s.total_amount || 0,
      taxable: t.taxable,
      igst: t.igst,
      cgst: t.cgst,
      sgst: t.sgst,
      total_tax: t.total,
      ecom_gstin: t.ecomGstin,
    };
  });
}

  // B2B
  if (activeTab === "B2B") {
    const rows = filterByDate(sales, selectedFilter, "invoice_date")
     .filter((s) => s.invoice_category === "B2B");

    return rows.map((s) => {
      const t = calcSalesTax(s);

      return {
        gstin: t.gstin,
        name: t.customerName,
        invoice: s.invoice_no,
        date: fmtDate(s.invoice_date),
        value: s.total_amount,
        taxable: t.taxable,
      };
    });
  }

  // B2CL
if (activeTab === "B2CL") {

  const rows = filterByDate(
    sales,
    selectedFilter,
    "invoice_date"
  ).filter(
    (s) => s.invoice_category === "B2CL"
  );

    return rows.map((s) => {
      const t = calcSalesTax(s);
      return {
        invoice: s.invoice_no,
        date: fmtDate(s.invoice_date),
        value: s.total_amount,
        place: t.placeOfSupply,
        taxable: t.taxable,
      };
    });
  }

  // B2CS
if (activeTab === "B2CS") {

  const rows = filterByDate(
    sales,
    selectedFilter,
    "invoice_date"
  ).filter(
    (s) => s.invoice_category === "B2CS"
  );

    return rows.map((s) => {
      const t = calcSalesTax(s);
      return {
        place: t.placeOfSupply,
        taxable: t.taxable,
        igst: t.igst,
        cgst: t.cgst,
        sgst: t.sgst,
      };
    });
  }

  // CREDIT NOTE
  if (activeTab === "Credit Note / Sales Return") {
    const rows = filterByDate(salesReturns, selectedFilter, (r) => r.invoice_date || r.date);

    return rows.map((s) => {
      const t = calcSalesTax(s);

      return {
        gstin: t.gstin,
        name: t.customerName,
        note_no: s.return_no || s.credit_note_no,
        date: fmtDate(s.invoice_date || s.date),
        taxable: t.taxable,
        total: t.total,
      };
    });
  }

  // HSN SUMMARY
  if (activeTab === "HSN Summary") {
    return sales.flatMap((s) =>
      (s.details || []).map((item) => ({
        hsn: item.hsn,
        name: item.product_name,
        qty: item.qty,
        taxable: item.qty * item.price,
      }))
    );
  }

  // SALES SUMMARY
// SALES SUMMARY
if (activeTab === "Sales Summary") {

  return sales.map((s) => {

    const t = calcSalesTax(s);

    return {
      invoice: s.invoice_no,
      date: fmtDate(s.invoice_date),
      taxable: t.taxable,
      igst: t.igst,
      cgst: t.cgst,
      sgst: t.sgst,
      total: s.total_amount,
    };

  });
}

return [];
};


const getExportColumns = () => {
  if (activeTab === "Sales Report") {
    return [
      { key: "gstin",          label: "GSTIN / UIN" },
      { key: "name",           label: "Customer Name" },
      { key: "invoice",        label: "Invoice No." },
      { key: "date",           label: "Invoice Date" },
      { key: "invoice_type",   label: "Invoice Type" },
      { key: "place",          label: "Place of Supply" },
      { key: "reverse_charge", label: "Rev. Charge" },
      { key: "rate",           label: "Rate %" },
      { key: "hsn",            label: "HSN / SAC" },
      { key: "value",          label: "Invoice Value" },
      { key: "taxable",        label: "Taxable Value" },
      { key: "igst",           label: "IGST" },
      { key: "cgst",           label: "CGST" },
      { key: "sgst",           label: "SGST" },
      { key: "total_tax",      label: "Total Tax" },
    ];
  }

  if (activeTab === "B2B") {
    return [
      { key: "gstin",   label: "GSTIN/UIN of Recipient" },
      { key: "name",    label: "Receiver Name" },
      { key: "invoice", label: "Invoice No." },
      { key: "date",    label: "Invoice Date" },
      { key: "value",   label: "Invoice Value" },
      { key: "taxable", label: "Taxable Value" },
      { key: "igst",    label: "IGST" },
      { key: "cgst",    label: "CGST" },
      { key: "sgst",    label: "SGST" },
    ];
  }

  if (activeTab === "B2CL") {
    return [
      { key: "invoice", label: "Invoice No." },
      { key: "date",    label: "Invoice Date" },
      { key: "place",   label: "Place of Supply" },
      { key: "value",   label: "Invoice Value" },
      { key: "taxable", label: "Taxable Value" },
      { key: "igst",    label: "IGST" },
    ];
  }

  if (activeTab === "B2CS") {
    return [
      { key: "place",   label: "Place of Supply" },
      { key: "taxable", label: "Taxable Value" },
      { key: "igst",    label: "IGST" },
      { key: "cgst",    label: "CGST" },
      { key: "sgst",    label: "SGST" },
    ];
  }

  if (activeTab === "Credit Note / Sales Return") {
    return [
      { key: "gstin",   label: "GSTIN/UIN of Recipient" },
      { key: "name",    label: "Receiver Name" },
      { key: "note_no", label: "Note Number" },
      { key: "date",    label: "Note Date" },
      { key: "taxable", label: "Taxable Value" },
      { key: "igst",    label: "IGST" },
      { key: "cgst",    label: "CGST" },
      { key: "sgst",    label: "SGST" },
      { key: "total",   label: "Total Tax" },
    ];
  }

  if (activeTab === "HSN Summary") {
    return [
      { key: "hsn",     label: "HSN Code" },
      { key: "name",    label: "Description" },
      { key: "qty",     label: "Total Qty" },
      { key: "taxable", label: "Taxable Value" },
    ];
  }

  if (activeTab === "Sales Summary") {
    return [
      { key: "invoice", label: "Invoice No" },
      { key: "date",    label: "Date" },
      { key: "taxable", label: "Taxable Value" },
      { key: "igst",    label: "IGST" },
      { key: "cgst",    label: "CGST" },
      { key: "sgst",    label: "SGST" },
      { key: "total",   label: "Invoice Value" },
    ];
  }

  return [];
};

useEffect(() => {
  window.exportGSTR1Excel = () =>
    downloadExcel(getExportData(), activeTab);

  window.exportGSTR1PDF = () =>
downloadPDF(getExportData(), getExportColumns(), activeTab);
  return () => {
    delete window.exportGSTR1Excel;
    delete window.exportGSTR1PDF;
  };
}, [sales, salesReturns, selectedFilter, activeTab]);
return (
  <>
    <style>
      {`
      .report-tab-tooltip:hover .report-tooltip-box {
        opacity: 1 !important;
        visibility: visible;
        transform: translateX(-50%) translateY(-6px);
      }

      .report-tooltip-box {
        visibility: hidden;
      }
      `}
    </style>

    <div
  style={{
    minHeight: "100vh",
    padding: "24px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    position: "relative",
    overflow: "visible",
    zIndex: 1,
  }}
>

      {/* Header row: tabs + date filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 3, flexWrap: "wrap" }}>
   {TABS.map((tab) => (
  <div
    key={tab}
    style={{
      position: "relative",
      display: "inline-block",
    }}
    className="report-tab-tooltip"
  >
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: "6px 14px",
        borderRadius: 7,
        fontSize: "12.5px",
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        background:
          activeTab === tab
            ? "#1e3a8a"
            : "transparent",

        color:
          activeTab === tab
            ? "#fff"
            : "#6b7280",
      }}
    >
      {tab}
    </button>

    {/* TOOLTIP */}
<div
  className="report-tooltip-box"
  style={{
    position: "absolute",
    top: "48px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "270px",
    background: "#1f2937",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "11px",
    lineHeight: "1.5",
    zIndex: 999999,
    opacity: 0,
    pointerEvents: "none",
    transition: "0.2s",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    whiteSpace: "normal",
  }}
>
      {TAB_DESCRIPTIONS[tab]}
    </div>
  </div>
))}
</div>

<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  <DateFilter
    selected={selectedFilter}
    onChange={setSelectedFilter}
  />
</div>

</div>

<div
  style={{
    fontSize: "11.5px",
    color: "#9ca3af",
    marginBottom: 16,
  }}
>
  {getDateRangeLabel(selectedFilter)}
</div>

{loading && (
  <div
    style={{
      textAlign: "center",
      padding: "60px 0",
      color: "#9ca3af",
      fontSize: "13px",
    }}
  >
    Loading data…
  </div>
)}
      {!loading && (
        <>
          {activeTab === "Sales Report"                && <SalesReportTab data={sales}        filter={selectedFilter} />}
          {activeTab === "B2B"                         && <B2BTab         data={sales}        filter={selectedFilter} />}
          {activeTab === "B2CL"                        && <B2CLTab        data={sales}        filter={selectedFilter} />}
          {activeTab === "B2CS"                        && <B2CSTab        data={sales}        filter={selectedFilter} />}
          {activeTab === "Credit Note / Sales Return"  && <CDNRTab        data={salesReturns} filter={selectedFilter} />}
          {activeTab === "HSN Summary"                 && <HSNTab         data={sales}        filter={selectedFilter} />}
          {activeTab === "Sales Summary"               && <SalesSummaryTab data={sales}       filter={selectedFilter} />}
        </>
      )}
    </div>
  </>
);
}