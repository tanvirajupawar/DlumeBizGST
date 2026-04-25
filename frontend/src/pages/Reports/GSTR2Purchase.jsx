import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Purchase", "Purchase Return", "Purchase Summary", "ITC Summary"];

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

// ─── ✅ FIXED: robust GSTIN + vendor name extraction ─────────────────────────
// Handles all cases:
//   1. vendor_id is a populated object  → read gst / gstin / gst_no from it
//   2. vendor_id is just an ID string   → fall back to flat fields on the purchase doc
//   3. GSTIN stored directly on the purchase doc itself
function extractVendorInfo(p) {
  const v = typeof p.vendor_id === "object" && p.vendor_id !== null ? p.vendor_id : null;

  // GSTIN — try every possible field name the backend might use
  const gstin =
    v?.gst        ||
    v?.gstin      ||
    v?.gst_no     ||
    v?.gst_number ||
    p.vendor_gst  ||
    p.gstin       ||
    p.gst         ||
    "";

  // Vendor name — try every possible field name
  const vendorName =
    v?.company_name ||
    v?.vendor_name  ||
    v?.name         ||
    p.vendor_name   ||
    p.company_name  ||
    "—";

  return { gstin: gstin.trim(), vendorName };
}

function calcTax(p) {
  const { gstin, vendorName } = extractVendorInfo(p);

  const vendorState = gstin.substring(0, 2);
  const isIntra     = vendorState === BUYER_STATE;

  // taxable: sum item amounts first, fallback to stored taxable_amount
  const taxable =
    (p.details?.length > 0
      ? p.details.reduce((s, i) => s + (i.amount || (Number(i.qty || 0) * Number(i.price || 0) - Number(i.discount || 0))), 0)
      : 0) ||
    Number(p.taxable_amount) ||
    0;

  const gstRate = p.details?.[0]?.gst_rate || 18;

  let igst = 0, cgst = 0, sgst = 0;
  if (isIntra) {
    cgst = (taxable * gstRate) / 200;
    sgst = (taxable * gstRate) / 200;
  } else {
    igst = (taxable * gstRate) / 100;
  }

  // place of supply: vendor's state_code → state name
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
  padding: "8px 10px", fontSize: "10px", fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.05em",
  borderBottom: "1px solid #e5e7eb", background: "#f9fafb",
  textAlign: "center", whiteSpace: "nowrap",
};
const TD_STYLE = { padding: "10px 10px", fontSize: "12.5px", color: "#111827", textAlign: "center", borderTop: "1px solid #f3f4f6" };
const TF_STYLE = { padding: "9px 10px", fontSize: "12px", fontWeight: 700, background: "#f9fafb", borderTop: "2px solid #e5e7eb", textAlign: "center" };

// ─── Tab: Purchase ────────────────────────────────────────────────────────────

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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              {/* ✅ colSpan 4 to include Place of Supply */}
              <th colSpan={4} style={{ ...TH_STYLE, textAlign: "center" }}>Invoice details from GSTR-2B</th>
              <th style={TH_STYLE}></th>
              <th colSpan={4} style={{ ...TH_STYLE, textAlign: "center" }}>Amount of tax</th>
              <th style={TH_STYLE}></th>
            </tr>
            <tr>
              {["GSTIN","Vendor name","Invoice no.","Invoice date","Place of supply","Invoice value","Taxable value","IGST","CGST","SGST","Total tax","ITC eligible"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyState colSpan={12} /> : rows.map((p, i) => {
              const t = calcTax(p);
              const eligible = t.gstin.length === 15;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {/* ✅ t.gstin and t.vendorName from fixed calcTax */}
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
                  <td style={TD_STYLE}>
                    <Badge color={eligible ? "green" : "red"}>{eligible ? "Yes" : "No"}</Badge>
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

// ─── Tab: Purchase Return ─────────────────────────────────────────────────────

function PurchaseReturnTab({ data, filter }) {
  const rows = filterByDate(data, filter, "date");

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
        <KpiCard label="Total returns"      value={rows.length} />
        <KpiCard label="Total taxable value" value={`₹ ${fmt(totals.taxable)}`} />
        <KpiCard label="GST reversed"        value={`₹ ${fmt(totals.total)}`} accent />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th colSpan={2} style={TH_STYLE}></th>
              <th colSpan={4} style={{ ...TH_STYLE, textAlign: "center" }}>Return details from GSTR-2B</th>
              <th style={TH_STYLE}></th>
              <th colSpan={4} style={{ ...TH_STYLE, textAlign: "center" }}>Amount of tax</th>
              <th style={TH_STYLE}></th>
            </tr>
            <tr>
              {["GSTIN","Vendor name","Return no.","Return date","Place of supply","Invoice value","Taxable value","IGST","CGST","SGST","Total tax","ITC eligible"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyState colSpan={12} /> : rows.map((p, i) => {
              const t = calcTax(p);
              const eligible = t.gstin.length === 15;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={TD_STYLE}>{t.gstin || "—"}</td>
                  <td style={{ ...TD_STYLE, textAlign: "left" }}>{t.vendorName}</td>
                  <td style={TD_STYLE}>{p.return_no || "—"}</td>
                  <td style={TD_STYLE}>{fmtDate(p.date)}</td>
                  <td style={TD_STYLE}>{t.placeOfSupply}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(p.total_amount)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.igst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.cgst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(t.sgst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(t.total)}</td>
                  <td style={TD_STYLE}>
                    <Badge color={eligible ? "green" : "red"}>{eligible ? "Yes" : "No"}</Badge>
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

// ─── Tab: Purchase Summary ────────────────────────────────────────────────────

function PurchaseSummaryTab({ data, filter }) {
  const rows = filterByDate(data, filter, "invoice_date");

  const slabs = useMemo(() => {
    const map = {};
    rows.forEach((p) => {
      // ✅ use extractVendorInfo instead of p.vendor_id?.gst directly
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

  const vendorMap = useMemo(() => {
    const map = {};
    rows.forEach((p) => {
      const key              = (typeof p.vendor_id === "object" ? p.vendor_id?._id : p.vendor_id) || "unknown";
      const t                = calcTax(p); // ✅ vendorName + gstin from fixed helper
      if (!map[key]) map[key] = { name: t.vendorName, gstin: t.gstin, count: 0, taxable: 0, gst: 0, value: 0 };
      map[key].count   += 1;
      map[key].taxable += t.taxable;
      map[key].gst     += t.total;
      map[key].value   += Number(p.total_amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
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

      {/* Tax-wise breakdown */}
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

      {/* Vendor-wise */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "9px 16px", fontSize: "10.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          Vendor-wise summary
        </div>
        {vendorMap.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>No data</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                {["Vendor name","GSTIN","No. of invoices","Taxable value","Total GST","Invoice value"].map((h) => (
                  <th key={h} style={TH_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorMap.map((v, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500 }}>{v.name}</td>
                  {/* ✅ v.gstin now populated from extractVendorInfo */}
                  <td style={TD_STYLE}>{v.gstin || "—"}</td>
                  <td style={TD_STYLE}>{v.count}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(v.taxable)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>₹ {fmt(v.gst)}</td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700 }}>₹ {fmt(v.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Total</td>
                <td style={TF_STYLE}>{vendorMap.reduce((a, v) => a + v.count, 0)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(vendorMap.reduce((a, v) => a + v.taxable, 0))}</td>
                <td style={{ ...TF_STYLE, textAlign: "right" }}>₹ {fmt(vendorMap.reduce((a, v) => a + v.gst, 0))}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(vendorMap.reduce((a, v) => a + v.value, 0))}</td>
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
  const filteredReturns   = filterByDate(returns,   filter, "date");

  const itcData = useMemo(() => {
    const purchaseRows = filteredPurchases.map((p) => {
      const t    = calcTax(p);
      const elig = t.gstin.length === 15;
      return {
        key:           p._id || p.order_no || Math.random(),
        vendor:        t.vendorName, // ✅ fixed
        invoiceNo:     p.supplier_invoice_no || p.order_no || "—",
        date:          fmtDate(p.invoice_date),
        eligibleITC:   elig ? t.total : 0,
        ineligibleITC: elig ? 0 : t.total,
        reverseITC:    0,
      };
    });

    const returnRows = filteredReturns.map((p) => {
      const t    = calcTax(p);
      const elig = t.gstin.length === 15;
      return {
        key:           p._id || p.return_no || Math.random(),
        vendor:        t.vendorName, // ✅ fixed
        invoiceNo:     p.return_no || "—",
        date:          fmtDate(p.date),
        eligibleITC:   0,
        ineligibleITC: 0,
        reverseITC:    elig ? t.total : 0,
      };
    });

    const allRows         = [...purchaseRows, ...returnRows];
    const totalEligible   = allRows.reduce((s, r) => s + r.eligibleITC,   0);
    const totalIneligible = allRows.reduce((s, r) => s + r.ineligibleITC, 0);
    const totalReversed   = allRows.reduce((s, r) => s + r.reverseITC,    0);
    const netITC          = totalEligible - totalReversed;

    return { allRows, totalEligible, totalIneligible, totalReversed, netITC };
  }, [filteredPurchases, filteredReturns]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Eligible ITC"   value={`₹ ${fmt(itcData.totalEligible)}`}   accent />
        <KpiCard label="Ineligible ITC" value={`₹ ${fmt(itcData.totalIneligible)}`} danger />
        <KpiCard label="Reverse ITC"    value={`₹ ${fmt(itcData.totalReversed)}`}   danger />
        <KpiCard label="Net ITC"        value={`₹ ${fmt(itcData.netITC)}`}          accent />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              {["Vendor name","Invoice / Return no.","Date","Eligible ITC","Ineligible ITC","Reverse ITC","Net ITC"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itcData.allRows.length === 0 ? (
              <EmptyState colSpan={7} />
            ) : (
              itcData.allRows.map((r, i) => {
                const net = r.eligibleITC - r.reverseITC;
                return (
                  <tr key={r.key} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 500 }}>{r.vendor}</td>
                    <td style={TD_STYLE}>{r.invoiceNo}</td>
                    <td style={TD_STYLE}>{r.date}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right", color: r.eligibleITC > 0 ? "#15803d" : "#9ca3af" }}>₹ {fmt(r.eligibleITC)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right", color: r.ineligibleITC > 0 ? "#b91c1c" : "#9ca3af" }}>₹ {fmt(r.ineligibleITC)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right", color: r.reverseITC > 0 ? "#b91c1c" : "#9ca3af" }}>₹ {fmt(r.reverseITC)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right", fontWeight: 700, color: net >= 0 ? "#1d4ed8" : "#b91c1c" }}>₹ {fmt(net)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {itcData.allRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ ...TF_STYLE, textAlign: "left", paddingLeft: 10 }}>Totals</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#15803d" }}>₹ {fmt(itcData.totalEligible)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#b91c1c" }}>₹ {fmt(itcData.totalIneligible)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#b91c1c" }}>₹ {fmt(itcData.totalReversed)}</td>
                <td style={{ ...TF_STYLE, textAlign: "right", color: "#1d4ed8" }}>₹ {fmt(itcData.netITC)}</td>
              </tr>
            </tfoot>
          )}
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
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:8000/api/purchase");
        if (res.data.success) {
          // ✅ debug: log first record so you can see exact field names from your backend
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
        const res = await axios.get("http://localhost:8000/api/purchase-return");
        if (res.data.success) setPurchaseReturns(res.data.data);
      } catch (err) { console.error("Purchase return fetch error:", err); }
    };
    load();
  }, []);

  const exportToExcel = () => {
    const sourceData =
      activeTab === "Purchase"        ? filterByDate(purchases,       selectedFilter, "invoice_date") :
      activeTab === "Purchase Return" ? filterByDate(purchaseReturns, selectedFilter, "date")         :
      filterByDate(purchases, selectedFilter, "invoice_date");

    if (!sourceData.length) return;

    const excelData = sourceData.map((p) => {
      const t = calcTax(p);
      return {
        GSTIN:           t.gstin || "—",
        "Vendor Name":   t.vendorName,
        "Invoice No":    activeTab === "Purchase Return" ? (p.return_no || "—") : (p.supplier_invoice_no || p.order_no || "—"),
        "Invoice Date":  fmtDate(activeTab === "Purchase Return" ? p.date : p.invoice_date),
        "Place of Supply": t.placeOfSupply,
        "Invoice Value": p.total_amount,
        "Taxable Value": t.taxable,
        "IGST":          parseFloat(t.igst.toFixed(2)),
        "CGST":          parseFloat(t.cgst.toFixed(2)),
        "SGST":          parseFloat(t.sgst.toFixed(2)),
        "Total Tax":     parseFloat(t.total.toFixed(2)),
        "ITC Eligible":  t.gstin.length === 15 ? "Yes" : "No",
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
    <div style={{ minHeight: "100vh", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 3 }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "6px 16px", borderRadius: 7, fontSize: "12.5px", fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", background: activeTab === tab ? "#1e3a8a" : "transparent", color: activeTab === tab ? "#fff" : "#6b7280" }}>
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
          {activeTab === "Purchase"         && <PurchaseTab        data={purchases}       filter={selectedFilter} />}
          {activeTab === "Purchase Return"  && <PurchaseReturnTab  data={purchaseReturns} filter={selectedFilter} />}
          {activeTab === "Purchase Summary" && <PurchaseSummaryTab data={purchases}       filter={selectedFilter} />}
          {activeTab === "ITC Summary"      && <ITCSummaryTab purchases={purchases} returns={purchaseReturns} filter={selectedFilter} />}
        </>
      )}
    </div>
  );
}