import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Sales Report", "B2B", "B2CL", "B2CS", "Credit Note / Sales Return", "HSN Summary", "Sales Summary"];

const FILTERS = [
  "Today", "Yesterday", "This Week", "Last Week", "Last 7 Days",
  "This Month", "Previous Month", "Last 30 Days", "This Quarter",
  "Previous Quarter", "Current Fiscal Year", "Previous Fiscal Year",
  "Last 365 Days",
];

const SELLER_STATE = "27"; // Maharashtra

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
    Number(s.taxable_amount) ||
    0;

  const gstRate = s.details?.[0]?.gst_rate || 18;

  let igst = 0, cgst = 0, sgst = 0;
  if (isIntra) {
    cgst = (taxable * gstRate) / 200;
    sgst = (taxable * gstRate) / 200;
  } else {
    igst = (taxable * gstRate) / 100;
  }

  const posCode = customerState || "";
  const placeOfSupply = posCode && STATE_NAMES[posCode] ? `${posCode} – ${STATE_NAMES[posCode]}` : "—";

  return { gstin, customerName, isIntra, taxable, gstRate, igst, cgst, sgst, total: igst + cgst + sgst, placeOfSupply };
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
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 270, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" }}>
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
const TD_STYLE = { padding: "10px 10px", fontSize: "12.5px", color: "#111827", textAlign: "center", borderTop: "1px solid #f3f4f6" };
const TF_STYLE = { padding: "9px 10px", fontSize: "12px", fontWeight: 700, background: "#f9fafb", borderTop: "2px solid #e5e7eb", textAlign: "center" };


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

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total Invoices"      value={rows.length} />
        <KpiCard label="Total Invoice Value" value={`₹ ${fmt(totals.value)}`} />
        <KpiCard label="Total Taxable Value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total GST Collected" value={`₹ ${fmt(totals.total)}`} accent />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              <th colSpan={3} style={{ ...TH_STYLE, textAlign: "center", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb" }}>Invoice Details</th>
              <th colSpan={4} style={{ ...TH_STYLE, textAlign: "center" }}>Tax Breakdown</th>
            </tr>
            <tr>
              {["GSTIN", "Customer Name", "Invoice No.", "Invoice Date", "Place of Supply", "Invoice Value", "Taxable Value", "IGST", "CGST", "SGST", "Total Tax", "Type"].map(h => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyState colSpan={12} /> : rows.map((s, i) => {
              const t = calcSalesTax(s);
              const isB2B = t.gstin.length === 15;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>{t.gstin || "—"}</td>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500 }}>{t.customerName}</td>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>{s.invoice_no || s.order_no || "—"}</td>
                  <td style={TD_STYLE}>{fmtDate(s.invoice_date)}</td>
                  <td style={TD_STYLE}>{t.placeOfSupply}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.total_amount)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.igst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.cgst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.sgst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(t.total)}</td>
                  <td style={TD_STYLE}>
                    <Badge color={isB2B ? "blue" : "gray"}>{isB2B ? "B2B" : "B2C"}</Badge>
                  </td>
                </tr>
              );
            })}
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
                <td style={TF_STYLE}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

// ─── Tab: B2B ─────────────────────────────────────────────────────────────────

function B2BTab({ data, filter }) {
  const allRows = filterByDate(data, filter, "invoice_date");
  const rows = allRows.filter((s) => {
    const { gstin } = extractCustomerInfo(s);
    return gstin.length === 15;
  });

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
                "Receivers Name",
                "Invoice No.",
                "Invoice Date",
                "Invoice Value",
                "Place of Supply",
                "Reverse Charge",
                "Applicable Tax %",
                "Invoice Type",
                "Rate",
                "Taxable Value",
                "CESS",
                "Ecommerce GSTIN",
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
              const invoiceType = t.isIntra ? "Regular" : "Inter-State";
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>{t.gstin}</td>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500 }}>{t.customerName}</td>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>{s.invoice_no || "—"}</td>
                  <td style={TD_STYLE}>{fmtDate(s.invoice_date)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.total_amount)}</td>
                  <td style={TD_STYLE}>{t.placeOfSupply}</td>
                  <td style={TD_STYLE}>
                    <Badge color={s.reverse_charge ? "amber" : "gray"}>{s.reverse_charge ? "Y" : "N"}</Badge>
                  </td>
                  <td style={TD_STYLE}>
                    <Badge color="blue">{rate}%</Badge>
                  </td>
                  <td style={TD_STYLE}>
                    <Badge color={t.isIntra ? "green" : "purple"}>{invoiceType}</Badge>
                  </td>
                  <td style={TD_STYLE}>
                    <Badge color="blue">{rate}%</Badge>
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.cess || 0)}</td>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>{s.ecommerce_gstin || "—"}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Totals</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.value)}</td>
                <td colSpan={5} style={TF_STYLE}></td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={TF_STYLE}>₹ 0.00</td>
                <td style={TF_STYLE}></td>
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
  const rows = allRows.filter((s) => {
    const { gstin } = extractCustomerInfo(s);
    const customerState = gstin.substring(0, 2);
    const isInter = customerState && customerState !== SELLER_STATE;
    return gstin.length !== 15 && isInter && (s.total_amount || 0) > 250000;
  });

  const totals = useMemo(() => rows.reduce((acc, s) => {
    const t = calcSalesTax(s);
    return { value: acc.value + (s.total_amount || 0), taxable: acc.taxable + t.taxable, igst: acc.igst + t.igst, total: acc.total + t.total };
  }, { value: 0, taxable: 0, igst: 0, total: 0 }), [rows]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Number of Invoices"  value={rows.length} />
        <KpiCard label="Total Invoice Value" value={`₹ ${fmt(totals.value)}`} />
        <KpiCard label="Total Taxable Value" value={`₹ ${fmt(totals.taxable)}`} />
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: 900 }}>
          <thead>
            <tr>
              {[
                "Invoice No.",
                "Invoice Date",
                "Invoice Value",
                "Place of Supply",
                "Reverse Charge",
                "Applicable Tax %",
                "Rate",
                "Taxable Value",
                "CESS",
                "Ecommerce GSTIN",
              ].map(h => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <EmptyState colSpan={10} message="No B2CL invoices (interstate unregistered > ₹2.5L)" />
              : rows.map((s, i) => {
                const t = calcSalesTax(s);
                const rate = s.details?.[0]?.gst_rate ?? 18;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>{s.invoice_no || "—"}</td>
                    <td style={TD_STYLE}>{fmtDate(s.invoice_date)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.total_amount)}</td>
                    <td style={TD_STYLE}>{t.placeOfSupply}</td>
                    <td style={TD_STYLE}>
                      <Badge color={s.reverse_charge ? "amber" : "gray"}>{s.reverse_charge ? "Y" : "N"}</Badge>
                    </td>
                    <td style={TD_STYLE}>
                      <Badge color="blue">{rate}%</Badge>
                    </td>
                    <td style={TD_STYLE}>
                      <Badge color="blue">{rate}%</Badge>
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(s.cess || 0)}</td>
                    <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>{s.ecommerce_gstin || "—"}</td>
                  </tr>
                );
              })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Totals</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.value)}</td>
                <td colSpan={4} style={TF_STYLE}></td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={TF_STYLE}>₹ 0.00</td>
                <td style={TF_STYLE}></td>
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
  const allRows = filterByDate(data, filter, "invoice_date");
  const rows = allRows.filter((s) => {
    const { gstin } = extractCustomerInfo(s);
    const customerState = gstin.substring(0, 2);
    const isInter = customerState && customerState !== SELLER_STATE;
    const isSmallInter = gstin.length !== 15 && isInter && (s.total_amount || 0) <= 250000;
    const isIntra = gstin.length !== 15 && (!customerState || customerState === SELLER_STATE);
    return isSmallInter || isIntra;
  });

  const slabMap = useMemo(() => {
    const map = {};
    rows.forEach((s) => {
      const t = calcSalesTax(s);
      const rate = s.details?.[0]?.gst_rate || 18;
      const key = `${rate}_${t.placeOfSupply}`;
      if (!map[key]) map[key] = { rate, placeOfSupply: t.placeOfSupply, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
      map[key].taxable += t.taxable;
      map[key].igst    += t.igst;
      map[key].cgst    += t.cgst;
      map[key].sgst    += t.sgst;
      map[key].cess    += Number(s.cess || 0);
    });
    return Object.values(map);
  }, [rows]);

  const totals = useMemo(() => slabMap.reduce((a, r) => ({
    taxable: a.taxable + r.taxable, igst: a.igst + r.igst, cgst: a.cgst + r.cgst, sgst: a.sgst + r.sgst, cess: a.cess + r.cess
  }), { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }), [slabMap]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total Invoice Value" value={`₹ ${fmt(rows.reduce((a, s) => a + (s.total_amount || 0), 0))}`} />
        <KpiCard label="Total Taxable Value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total CESS"          value={`₹ ${fmt(totals.cess)}`} />
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: 700 }}>
          <thead>
            <tr>
              {[
                "Type",
                "Place of Supply",
                "Applicable Tax %",
                "Rate",
                "Taxable Value",
                "CESS",
                "Ecommerce GSTIN",
              ].map(h => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slabMap.length === 0
              ? <EmptyState colSpan={7} message="No B2CS invoices for selected period" />
              : slabMap.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={TD_STYLE}><Badge color="gray">OE</Badge></td>
                  <td style={TD_STYLE}>{r.placeOfSupply}</td>
                  <td style={TD_STYLE}><Badge color="blue">{r.rate}%</Badge></td>
                  <td style={TD_STYLE}><Badge color="blue">{r.rate}%</Badge></td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(r.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(r.cess)}</td>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>—</td>
                </tr>
              ))}
          </tbody>
          {slabMap.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Total</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.cess)}</td>
                <td style={TF_STYLE}></td>
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
  const rows = filterByDate(data, filter, (row) => row.invoice_date || row.date);

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total Returns"       value={rows.length} />
        <KpiCard label="Total Taxable Value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="GST Credit Notes"    value={`₹ ${fmt(totals.total)}`} danger />
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: 1200 }}>
          <thead>
            <tr>
              {[
                "GSTIN/UIN of Recipient",
                "Receivers Name",
                "Note Number",
                "Note Date",
                "Note Type",
                "Place of Supply",
                "Reverse Charge",
                "Note Supply Type",
                "Note Value",
                "Applicable Tax %",
                "Rate",
                "Taxable Value",
                "CESS Amount",
              ].map((h, i) => (
                <th key={i} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyState colSpan={13} />
            ) : rows.map((s, i) => {
              const t = calcSalesTax(s);
              const isB2B = t.gstin.length === 15;
              const rate = s.details?.[0]?.gst_rate ?? 18;
              const noteType = s.note_type || (s.return_no ? "Credit Note" : "Debit Note");
              const noteSupplyType = t.isIntra ? "Intra-State" : "Inter-State";
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace", fontSize: "11px" }}>{t.gstin || "—"}</td>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500 }}>{t.customerName}</td>
                  <td style={{ ...TD_STYLE, fontFamily: "monospace" }}>{s.return_no || s.credit_note_no || "—"}</td>
                  <td style={TD_STYLE}>{fmtDate(s.invoice_date || s.date)}</td>
                  <td style={TD_STYLE}>
                    <Badge color={noteType === "Credit Note" ? "red" : "amber"}>{noteType}</Badge>
                  </td>
                  <td style={TD_STYLE}>{t.placeOfSupply}</td>
                  <td style={TD_STYLE}>
                    <Badge color={s.reverse_charge ? "amber" : "gray"}>{s.reverse_charge ? "Y" : "N"}</Badge>
                  </td>
                  <td style={TD_STYLE}>
                    <Badge color={t.isIntra ? "green" : "purple"}>{noteSupplyType}</Badge>
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right", whiteSpace: "nowrap" }}>
                    ₹ {fmt(s.total_amount)}
                  </td>
                  <td style={TD_STYLE}>
                    <Badge color="blue">{rate}%</Badge>
                  </td>
                  <td style={TD_STYLE}>
                    <Badge color="blue">{rate}%</Badge>
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right", whiteSpace: "nowrap" }}>
                    ₹ {fmt(t.taxable)}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right", whiteSpace: "nowrap" }}>
                    ₹ {fmt(s.cess || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={8} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Totals</td>
                <td style={{ ...TF_STYLE, textAlign: "right", whiteSpace: "nowrap" }}>₹ {fmt(totals.value)}</td>
                <td colSpan={2} style={TF_STYLE}></td>
                <td style={{ ...TF_STYLE, textAlign: "right", whiteSpace: "nowrap" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#b91c1c", whiteSpace: "nowrap" }}>₹ 0.00</td>
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
  const rows = filterByDate(data, filter, "invoice_date");

  const hsnMap = useMemo(() => {
    const map = {};
    rows.forEach((s) => {
      const { gstin } = extractCustomerInfo(s);
      const customerState = gstin.substring(0, 2);
      const isIntra = customerState === SELLER_STATE || !customerState;

      (s.details || []).forEach((item) => {
        const hsn     = item.hsn || item.hsn_code || "—";
        const desc    = item.product_name || item.name || "—";
        const uqc     = item.unit || "NOS";
        const qty     = Number(item.qty) || 0;
        const taxable = (Number(item.qty) || 0) * (Number(item.price) || 0) - (Number(item.discount) || 0);
        const rate    = Number(item.gst_rate) || 0;
        const tax     = (taxable * rate) / 100;
        const igst    = isIntra ? 0 : tax;
        const cgst    = isIntra ? tax / 2 : 0;
        const sgst    = isIntra ? tax / 2 : 0;

        if (!map[hsn]) map[hsn] = { hsn, desc, uqc, qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 };
        map[hsn].qty     += qty;
        map[hsn].taxable += taxable;
        map[hsn].igst    += igst;
        map[hsn].cgst    += cgst;
        map[hsn].sgst    += sgst;
        map[hsn].total   += taxable + igst + cgst + sgst;
      });
    });
    return Object.values(map).sort((a, b) => b.taxable - a.taxable);
  }, [rows]);

  const totals = useMemo(() => hsnMap.reduce((a, r) => ({
    qty: a.qty + r.qty, taxable: a.taxable + r.taxable,
    igst: a.igst + r.igst, cgst: a.cgst + r.cgst, sgst: a.sgst + r.sgst, total: a.total + r.total
  }), { qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 }), [hsnMap]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="HSN Codes"           value={hsnMap.length} />
        <KpiCard label="Total Taxable Value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total Tax"           value={`₹ ${fmt(totals.igst + totals.cgst + totals.sgst)}`} accent />
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              {["HSN Code", "Description", "UQC", "Total Qty", "Taxable Value", "IGST", "CGST", "SGST", "Total Tax Value"].map(h => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hsnMap.length === 0
              ? <EmptyState colSpan={9} message="No HSN data — add HSN codes to your items" />
              : hsnMap.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...TD_STYLE, fontWeight: 600, fontFamily: "monospace" }}>{r.hsn}</td>
                  <td style={{ ...TD_STYLE, textAlign: "left" }}>{r.desc}</td>
                  <td style={TD_STYLE}>{r.uqc}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>{r.qty.toLocaleString("en-IN")}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(r.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(r.igst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(r.cgst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(r.sgst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(r.total)}</td>
                </tr>
              ))}
          </tbody>
          {hsnMap.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Total</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>{totals.qty.toLocaleString("en-IN")}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.taxable)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.igst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.cgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(totals.sgst)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(totals.total)}</td>
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
  const rows = filterByDate(data, filter, "invoice_date");

  const slabs = useMemo(() => {
    const map = {};
    rows.forEach((s) => {
      const { gstin } = extractCustomerInfo(s);
      const customerState = gstin.substring(0, 2);
      const isIntra = customerState === SELLER_STATE || !customerState;
      const details = s.details || [];

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
        map[key].taxable += Number(s.taxable_amount) || 0;
        map[key].igst    += Number(s.igst)           || 0;
        map[key].cgst    += Number(s.cgst)           || 0;
        map[key].sgst    += Number(s.sgst)            || 0;
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

  const totalGST   = totals.igst + totals.cgst + totals.sgst;
  const totalSales = totals.taxable + totalGST;
  const slabColors = { 0: "gray", 5: "green", 12: "blue", 18: "purple", 28: "amber" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total sales value"   value={`₹ ${fmt(totalSales)}`} />
        <KpiCard label="Total taxable value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total GST collected" value={`₹ ${fmt(totalGST)}`} accent />
        <KpiCard label="Total invoices"      value={rows.length} />
      </div>

      {/* Tax-wise breakdown */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "9px 16px", fontSize: "10.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          Tax-wise sales breakup
        </div>
        {slabs.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>No sales data for the selected period</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                {["GST slab", "Taxable value", "Integrated tax (IGST)", "Central tax (CGST)", "State/UT tax (SGST)", "Total tax"].map((h) => (
                  <th key={h} style={TH_STYLE}>{h}</th>
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

  const exportToExcel = () => {
    const sourceData =
      activeTab === "Credit Note / Sales Return"
        ? filterByDate(salesReturns, selectedFilter, (r) => r.invoice_date || r.date)
        : filterByDate(sales, selectedFilter, "invoice_date");

    if (!sourceData.length) return;

    const excelData = sourceData.map((s) => {
      const t = calcSalesTax(s);
      return {
        GSTIN:             t.gstin || "—",
        "Customer Name":   t.customerName,
        "Invoice No":      activeTab === "Credit Note / Sales Return" ? (s.return_no || s.credit_note_no || "—") : (s.invoice_no || s.order_no || "—"),
        "Invoice Date":    fmtDate(activeTab === "Credit Note / Sales Return" ? (s.invoice_date || s.date) : s.invoice_date),
        "Place of Supply": t.placeOfSupply,
        "Invoice Value":   s.total_amount,
        "Taxable Value":   t.taxable,
        "IGST":            parseFloat(t.igst.toFixed(2)),
        "CGST":            parseFloat(t.cgst.toFixed(2)),
        "SGST":            parseFloat(t.sgst.toFixed(2)),
        "Total Tax":       parseFloat(t.total.toFixed(2)),
        "B2B / B2C":       t.gstin.length === 15 ? "B2B" : "B2C",
      };
    });

    const ws  = XLSX.utils.json_to_sheet(excelData);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.substring(0, 31));
    const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, `GSTR1_${activeTab.replace(/ /g, "_")}_${selectedFilter.replace(/ /g, "_")}.xlsx`);
  };

  useEffect(() => { window.exportGSTR1Excel = exportToExcel; }, [sales, salesReturns, selectedFilter, activeTab]);

  return (
    <div style={{ minHeight: "100vh", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header row: tabs + date filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 3, flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px", borderRadius: 7, fontSize: "12.5px", fontWeight: 500,
                border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                background: activeTab === tab ? "#1e3a8a" : "transparent",
                color: activeTab === tab ? "#fff" : "#6b7280",
              }}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DateFilter selected={selectedFilter} onChange={setSelectedFilter} />
        </div>
      </div>

      <div style={{ fontSize: "11.5px", color: "#9ca3af", marginBottom: 16 }}>
        {getDateRangeLabel(selectedFilter)}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: "13px" }}>Loading data…</div>
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
  );
}