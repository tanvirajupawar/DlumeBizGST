import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Purchase", "Purchase Return / Debit Note", "Purchase Summary", "ITC Summary"];

const FILTERS = [
  "Today", "Yesterday", "This Week", "Last Week", "Last 7 Days",
  "This Month", "Previous Month", "Last 30 Days", "This Quarter",
  "Previous Quarter", "Current Fiscal Year", "Previous Fiscal Year",
  "Last 365 Days",
];

const BUYER_STATE = "27"; // Maharashtra

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
// ─── Tab: Purchase ────────────────────────────────────────────────────────────
// Columns (13 total):
// [1] GSTIN | [2] Vendor name |
// -- GSTR-2B group (4): [3] Invoice no. | [4] Invoice date | [5] Place of supply | [6] Invoice value --
// [7] Taxable value |
// -- Amount of tax group (4): [8] IGST | [9] CGST | [10] SGST | [11] Total tax --
// [12] Tax % | [13] ITC eligible

function PurchaseTab({ data, filter }) {
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total invoices"      value={rows.length} />
        <KpiCard label="Total taxable value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="Total GST paid"      value={`₹ ${fmt(totals.total)}`} accent />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "9.5%" }} />{/* GSTIN */}
            <col style={{ width: "10%"  }} />{/* Vendor name */}
            <col style={{ width: "7%"   }} />{/* Invoice no. */}
            <col style={{ width: "7.5%" }} />{/* Invoice date */}
            <col style={{ width: "9%"   }} />{/* Place of supply */}
            <col style={{ width: "8%"   }} />{/* Invoice value */}
            <col style={{ width: "8%"   }} />{/* Taxable value */}
            <col style={{ width: "7%"   }} />{/* IGST */}
            <col style={{ width: "7%"   }} />{/* CGST */}
            <col style={{ width: "7%"   }} />{/* SGST */}
            <col style={{ width: "7.5%" }} />{/* Total tax */}
            <col style={{ width: "5.5%" }} />{/* Tax % */}
            <col style={{ width: "7%"   }} />{/* ITC eligible */}
          </colgroup>
          <thead>
            {/* ── Group header row ── 2 + 4 + 1 + 4 + 1 + 1 = 13 */}
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Invoice details from GSTR-2B</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Amount of tax</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={1} style={TH_STYLE}></th>
            </tr>
            {/* ── Column header row ── 13 columns */}
            <tr>
              {[
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
              ].map((h) => (
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
                    <td style={TD_STYLE}>{p.supplier_invoice_no || p.order_no || "—"}</td>
                    <td style={TD_STYLE}>{fmtDate(p.invoice_date)}</td>
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

// ─── Tab: Purchase Return ─────────────────────────────────────────────────────
// Columns (13 total):
// [1] GSTIN | [2] Vendor name |
// -- GSTR-2B group (4): [3] Return/DN no. | [4] Return/DN date | [5] Place of supply | [6] Invoice value --
// [7] Taxable value |
// -- Amount of tax group (4): [8] IGST | [9] CGST | [10] SGST | [11] Total tax --
// [12] Tax % | [13] ITC eligible

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
            <col style={{ width: "9.5%" }} />{/* GSTIN */}
            <col style={{ width: "10%"  }} />{/* Vendor name */}
            <col style={{ width: "7.5%" }} />{/* Return/DN no. */}
            <col style={{ width: "7.5%" }} />{/* Return/DN date */}
            <col style={{ width: "9%"   }} />{/* Place of supply */}
            <col style={{ width: "8%"   }} />{/* Invoice value */}
            <col style={{ width: "8%"   }} />{/* Taxable value */}
            <col style={{ width: "7%"   }} />{/* IGST */}
            <col style={{ width: "7%"   }} />{/* CGST */}
            <col style={{ width: "7%"   }} />{/* SGST */}
            <col style={{ width: "7.5%" }} />{/* Total tax */}
            <col style={{ width: "5.5%" }} />{/* Tax % */}
            <col style={{ width: "6.5%" }} />{/* ITC eligible */}
          </colgroup>
          <thead>
            {/* ── Group header row ── 2 + 4 + 1 + 4 + 1 + 1 = 13 */}
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Return / Debit Note details from GSTR-2B</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={4} style={TH_GROUP_STYLE}>Amount of tax</th>
              <th colSpan={1} style={TH_STYLE}></th>
              <th colSpan={1} style={TH_STYLE}></th>
            </tr>
            {/* ── Column header row ── 13 columns */}
            <tr>
              {[
                "GSTIN",
                "Vendor name",
                "Return / Debit Note no.",
                "Return / Debit Note date",
                "Place of supply",
                "Invoice value",
                "Taxable value",
                "IGST",
                "CGST",
                "SGST",
                "Total tax",
                "Tax %",
                "ITC eligible",
              ].map((h) => (
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
                {["GST slab","Taxable value","Integrated tax (IGST)","Central tax (CGST)","State/UT tax (SGST)","Total tax"].map((h) => (
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

// ─── Tab: ITC Summary ─────────────────────────────────────────────────────────

function ITCSummaryTab({ purchases, returns, filter }) {
  const filteredPurchases = filterByDate(purchases, filter, "invoice_date");
  const filteredReturns   = filterByDate(returns,   filter, (r) => r.date || r.debit_date);

  // ── Aggregate from purchases ──────────────────────────────────────────────
  const agg = useMemo(() => {
    let eligIgst = 0, eligCgst = 0, eligSgst = 0;
    let ineligIgst = 0, ineligCgst = 0, ineligSgst = 0;
    let revIgst = 0, revCgst = 0, revSgst = 0;

    filteredPurchases.forEach((p) => {
      const t    = calcTax(p);
      const elig = t.gstin.length === 15;
      if (elig) {
        eligIgst += t.igst; eligCgst += t.cgst; eligSgst += t.sgst;
      } else {
        ineligIgst += t.igst; ineligCgst += t.cgst; ineligSgst += t.sgst;
      }
    });

    filteredReturns.forEach((p) => {
      const t    = calcTax(p);
      const elig = t.gstin.length === 15;
      if (elig) {
        revIgst += t.igst; revCgst += t.cgst; revSgst += t.sgst;
      }
    });

    const netIgst = eligIgst - revIgst;
    const netCgst = eligCgst - revCgst;
    const netSgst = eligSgst - revSgst;

    return {
      eligIgst, eligCgst, eligSgst,
      ineligIgst, ineligCgst, ineligSgst,
      revIgst, revCgst, revSgst,
      netIgst, netCgst, netSgst,
      totalElig:   eligIgst + eligCgst + eligSgst,
      totalInelig: ineligIgst + ineligCgst + ineligSgst,
      totalRev:    revIgst + revCgst + revSgst,
      totalNet:    netIgst + netCgst + netSgst,
    };
  }, [filteredPurchases, filteredReturns]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const sectionHeader = {
    padding: "10px 16px", fontSize: "12px", fontWeight: 700,
    color: "#1e3a8a", background: "#eff6ff",
    borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb",
  };
  const detailLabel = {
    padding: "11px 16px", fontSize: "12.5px", color: "#374151",
    borderBottom: "1px solid #f3f4f6", background: "#fff",
  };
  const numCell = (color = "#111827") => ({
    padding: "11px 16px", fontSize: "12.5px", fontWeight: 600,
    textAlign: "right", color,
    borderBottom: "1px solid #f3f4f6", background: "#fff",
  });
  const totalLabel = {
    padding: "11px 16px", fontSize: "12.5px", fontWeight: 700,
    color: "#111827", background: "#f9fafb",
    borderTop: "2px solid #e5e7eb",
  };
  const totalNum = (color = "#1d4ed8") => ({
    padding: "11px 16px", fontSize: "12.5px", fontWeight: 700,
    textAlign: "right", color,
    background: "#f9fafb", borderTop: "2px solid #e5e7eb",
  });

  const Row = ({ label, igst, cgst, sgst, isTotal, color }) => (
    <tr>
      <td style={isTotal ? totalLabel : detailLabel}>{label}</td>
      <td style={isTotal ? totalNum(color) : numCell(color)}>₹ {fmt(igst)}</td>
      <td style={isTotal ? totalNum(color) : numCell(color)}>₹ {fmt(cgst)}</td>
      <td style={isTotal ? totalNum(color) : numCell(color)}>₹ {fmt(sgst)}</td>
      <td style={isTotal ? totalNum(color) : numCell(color)}>₹ {fmt(igst + cgst + sgst)}</td>
    </tr>
  );

  return (
    <>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Eligible ITC"   value={`₹ ${fmt(agg.totalElig)}`}   accent />
        <KpiCard label="Ineligible ITC" value={`₹ ${fmt(agg.totalInelig)}`} danger />
        <KpiCard label="Reversed ITC"   value={`₹ ${fmt(agg.totalRev)}`}    danger />
        <KpiCard label="Net ITC"        value={`₹ ${fmt(agg.totalNet)}`}    accent />
      </div>

      {/* GSTR-3B style table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ ...TH_STYLE, textAlign: "left", padding: "10px 16px", width: "45%" }}>Details</th>
              <th style={TH_STYLE}>Integrated Tax (IGST)</th>
              <th style={TH_STYLE}>Central Tax (CGST)</th>
              <th style={TH_STYLE}>State/UT Tax (SGST)</th>
              <th style={TH_STYLE}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Section A — ITC Available */}
            <tr><td colSpan={5} style={sectionHeader}>(A) ITC Available (Whether in full or in part)</td></tr>
            <Row label="(1) Import of goods"                                             igst={0}              cgst={0}              sgst={0} />
            <Row label="(2) Import of services"                                          igst={0}              cgst={0}              sgst={0} />
            <Row label="(3) Inward supplies liable for reverse charge (other than 1 & 2)" igst={0}             cgst={0}              sgst={0} />
            <Row label="(4) Inward supplies from ISD"                                    igst={0}              cgst={0}              sgst={0} />
            <Row label="(5) All other ITC (from purchases)"                              igst={agg.eligIgst}   cgst={agg.eligCgst}   sgst={agg.eligSgst} />

            {/* Section B — ITC Reversed */}
            <tr><td colSpan={5} style={sectionHeader}>(B) ITC Reversed</td></tr>
            <Row label="(1) As per rules 42 & 43 of CGST Rules"                          igst={0}              cgst={0}              sgst={0} />
            <Row label="(2) Others (purchase returns / debit notes)"                     igst={agg.revIgst}    cgst={agg.revCgst}    sgst={agg.revSgst} />

            {/* Section C — Net ITC */}
            <tr><td colSpan={5} style={sectionHeader}>(C) Net ITC Available (A) – (B)</td></tr>
            <Row label="Net eligible ITC"                                                igst={agg.netIgst}    cgst={agg.netCgst}    sgst={agg.netSgst}  color={agg.totalNet >= 0 ? "#15803d" : "#b91c1c"} />

            {/* Section D — Ineligible */}
            <tr><td colSpan={5} style={sectionHeader}>(D) Ineligible ITC</td></tr>
            <Row label="(1) As per section 17(5)"                                        igst={agg.ineligIgst} cgst={agg.ineligCgst} sgst={agg.ineligSgst} color="#b91c1c" />
            <Row label="(5) Others"                                                       igst={0}              cgst={0}              sgst={0} />

            {/* Grand total */}
            <Row
              label="Total ITC (Eligible + Ineligible)"
              igst={agg.eligIgst + agg.ineligIgst}
              cgst={agg.eligCgst + agg.ineligCgst}
              sgst={agg.eligSgst + agg.ineligSgst}
              isTotal color="#1d4ed8"
            />
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GSTR2Reports() {
  const [activeTab,       setActiveTab]       = useState("Purchase");
  const [selectedFilter,  setSelectedFilter]  = useState("This Month");
  const [purchases,       setPurchases]       = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [debitNotes,      setDebitNotes]      = useState([]);
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:8000/api/purchase");
        if (res.data.success) {
          console.log("PURCHASE RECORD SAMPLE 👉", res.data.data?.[0]);
          setPurchases(res.data.data);
        }
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

  const exportToExcel = () => {
    const sourceData =
      activeTab === "Purchase" ? filterByDate(purchases, selectedFilter, "invoice_date") :
      activeTab === "Purchase Return / Debit Note"
        ? filterByDate([...purchaseReturns, ...debitNotes], selectedFilter, (row) => row.date || row.debit_date)
        : filterByDate(purchases, selectedFilter, "invoice_date");

    if (!sourceData.length) return;

    const excelData = sourceData.map((p) => {
      const t = calcTax(p);
      return {
        GSTIN:             t.gstin || "—",
        "Vendor Name":     t.vendorName,
        "Invoice No":      activeTab === "Purchase Return / Debit Note"
                             ? (p.return_no || p.debit_note_no || "—")
                             : (p.supplier_invoice_no || p.order_no || "—"),
        "Invoice Date":    fmtDate(activeTab === "Purchase Return / Debit Note" ? (p.date || p.debit_date) : p.invoice_date),
        "Place of Supply": t.placeOfSupply,
        "Invoice Value":   p.total_amount,
        "Taxable Value":   t.taxable,
        "IGST":            parseFloat(t.igst.toFixed(2)),
        "CGST":            parseFloat(t.cgst.toFixed(2)),
        "SGST":            parseFloat(t.sgst.toFixed(2)),
        "Total Tax":       parseFloat(t.total.toFixed(2)),
        "ITC Eligible":    t.gstin.length === 15 ? "Yes" : "No",
      };
    });

    const ws  = XLSX.utils.json_to_sheet(excelData);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, `GSTR2_${activeTab.replace(/ /g, "_")}_${selectedFilter.replace(/ /g, "_")}.xlsx`);
  };

  useEffect(() => { window.exportGSTR2Excel = exportToExcel; }, [purchases, purchaseReturns, selectedFilter, activeTab]);

  return (
    <div style={{ minHeight: "100vh", padding: "16px 12px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 3 }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "6px 16px", borderRadius: 7, fontSize: "12.5px", fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "normal", lineHeight: "1.2",
                background: activeTab === tab ? "#1e3a8a" : "transparent", color: activeTab === tab ? "#fff" : "#6b7280" }}>
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
          {activeTab === "Purchase" &&
            <PurchaseTab data={purchases} filter={selectedFilter} />}
          {activeTab === "Purchase Return / Debit Note" &&
            <PurchaseReturnTab data={[...purchaseReturns, ...debitNotes]} filter={selectedFilter} />}
          {activeTab === "Purchase Summary" &&
            <PurchaseSummaryTab data={purchases} filter={selectedFilter} />}
          {activeTab === "ITC Summary" &&
            <ITCSummaryTab purchases={purchases} returns={[...purchaseReturns, ...debitNotes]} filter={selectedFilter} />}
        </>
      )}
    </div>
  );
}