import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { FiMoreVertical } from "react-icons/fi";
import InvoiceDetailPanel from "../../components/InvoiceDetailPanel";
import PurchaseReturnModal from "../../components/Purchasereturnmodal";
import DebitNoteModal from "../../components/DebitNoteModal";
import ActionMenu from "../../components/ActionMenu";

const FILTERS = [
  "Today","Yesterday","This Week","Last Week","Last 7 Days",
  "This Month","Previous Month","Last 30 Days",
  "This Quarter","Previous Quarter",
  "Current Fiscal Year","Previous Fiscal Year",
  "Last 365 Days","Custom Date Range",
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = {
  Back:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Receipt:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  User:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Ledger:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  Items:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  Edit:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Msg:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Chevron:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  Sort:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="5 8 12 1 19 8" opacity=".45"/><polyline points="5 16 12 23 19 16" opacity=".45"/></svg>,
  Calendar: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Print:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Share:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Plus:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Bank:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  Custom:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Doc:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Card:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Office:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
};

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

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

// ── Shared primitives ─────────────────────────────────────────────────────────
const DateFilter = ({ showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) => (
  <div ref={filterRef} className="relative">
    <div
      onClick={(e) => { e.stopPropagation(); setShowFilter(prev => !prev); }}
      className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-[7px] cursor-pointer hover:border-gray-400"
    >
      <Ico.Calendar />
      <span className="text-[13px] text-gray-700">{selectedFilter}</span>
      <Ico.Chevron />
    </div>
    {showFilter && (
      <div className="absolute mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400 border-b bg-gray-50">SELECT DATE RANGE</div>
        <div className="max-h-80 overflow-y-auto">
          {FILTERS.map((f, i) => (
            <div key={i}
              onMouseEnter={() => setHoveredFilter(f)}
              onMouseLeave={() => setHoveredFilter(null)}
              onClick={(e) => { e.stopPropagation(); setSelectedFilter(f); setShowFilter(false); }}
              className={`flex justify-between px-4 py-3 text-sm cursor-pointer
                ${selectedFilter === f ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <span>{f}</span>
              <span className={`text-xs transition ${hoveredFilter === f || selectedFilter === f ? "opacity-100 text-gray-500" : "opacity-0"}`}>
                {getDateRange(f)}
              </span>
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
      ${square ? "px-[9px]" : ""}`}
  >
    {Icon && <Icon />} {label}
  </button>
);

// Table with optional row highlighting
const Table = ({ cols, rows, onRowClick, noHighlight }) => (
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
          <tr>
            <td colSpan={cols.length} className="px-4 py-10 text-center text-sm text-gray-400">No records found</td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i}
            onClick={() => onRowClick && onRowClick(row)}
            className={`border-b border-gray-100 last:border-0 transition
              ${onRowClick ? "hover:bg-gray-50/60 cursor-pointer" : ""}`}
          >
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-[11px] text-gray-700">
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProfileCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`border border-gray-200 rounded-xl p-5 ${className}`}>
    <div className="flex items-center gap-2 text-[13.5px] font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
      <Icon /> {title}
    </div>
    {children}
  </div>
);

const PField = ({ label, value }) => (
  <div>
    <p className="text-[11.5px] text-gray-400 mb-0.5">{label}</p>
    <p className="text-[13px] font-medium text-gray-900">{value || "-"}</p>
  </div>
);

// ── Shared export helpers ─────────────────────────────────────────────────────
const downloadCSV = (filename, headers, rows) => {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const openPrintWindow = (title, tableHTML) => {
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; padding: 32px; }
          h2 { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f5f5f5; padding: 9px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
          td { padding: 9px 12px; border-bottom: 1px solid #ebebeb; }
          tr:last-child td { border-bottom: none; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        ${tableHTML}
      </body>
    </html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
};

const shareLink = () => {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
  } else {
    prompt("Copy this link:", url);
  }
};

// ── Tab: Transactions ─────────────────────────────────────────────────────────
function TransactionsTab({ vendorId, showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [purchaseReturnTarget, setPurchaseReturnTarget] = useState(null);
  const [debitNoteTarget, setDebitNoteTarget] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    axios.get(`http://localhost:8000/api/purchase?vendor_id=${vendorId}`)
      .then(res => { if (res.data.success) setInvoices(res.data.data); })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [vendorId]);

  const toggleRow = (id) => setSelected(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === invoices.length ? [] : invoices.map(r => r._id));

  // ── Action handlers ──
  const handleDownload = () => {
    const headers = ["Date", "Invoice No", "Amount", "Balance", "Status"];
    const rows = invoices.map(r => [
      fmtDate(r.invoice_date),
      r.supplier_invoice_no || "—",
      r.total_amount || 0,
      r.balance_amount || 0,
      r.payment_status || "—",
    ]);
    downloadCSV("invoices.csv", headers, rows);
  };

  const handlePrint = () => {
    const tableHTML = `
      <table>
        <thead><tr><th>Date</th><th>Invoice No</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
        <tbody>
          ${invoices.map(r => `
            <tr>
              <td>${fmtDate(r.invoice_date)}</td>
              <td>${r.supplier_invoice_no || "—"}</td>
              <td>₹${Number(r.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td>${r.balance_amount > 0 ? "₹" + Number(r.balance_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</td>
              <td>${r.payment_status || "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    openPrintWindow("Invoices", tableHTML);
  };

  const cols = [
    {
      key: "select",
      label: <input type="checkbox" checked={selected.length === invoices.length && invoices.length > 0} onChange={toggleAll} onClick={e => e.stopPropagation()} />,
      render: (r) => <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleRow(r._id)} onClick={e => e.stopPropagation()} />,
    },
    { key: "invoice_date", label: "Date", sortable: true, render: r => fmtDate(r.invoice_date) },
    { key: "supplier_invoice_no", label: "Invoice No" },
    {
      key: "total_amount",
      label: "Amount",
      render: r => (
        <>
          {fmt(r.total_amount)}
          {r.balance_amount > 0 && <span className="block text-[12px] text-gray-500 mt-0.5">({fmt(r.balance_amount)} unpaid)</span>}
        </>
      ),
    },
    {
      key: "payment_status",
      label: "Status",
      render: r => r.payment_status ? (
        <span className={`inline-block px-2.5 py-[3px] text-[12px] font-medium rounded-full border
          ${r.payment_status === "Paid" ? "bg-green-100 text-green-800 border-green-300"
          : r.payment_status === "Unpaid" ? "bg-red-100 text-red-700 border-red-200"
          : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}>
          {r.payment_status}
        </span>
      ) : null,
    },
    {
      key: "actions",
      label: "",
      render: r => (
        <ActionMenu
          invoice={r}
          onEdit={() => console.log("Edit", r)}
          onPurchaseReturn={() => setPurchaseReturnTarget(r)}
          onDebitNote={() => setDebitNoteTarget(r)}
          onDelete={() => console.log("Delete", r)}
        />
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <DateFilter showFilter={showFilter} setShowFilter={setShowFilter} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} hoveredFilter={hoveredFilter} setHoveredFilter={setHoveredFilter} filterRef={filterRef} />
        <ActionBtn icon={Ico.Download} label="Download" onClick={handleDownload} />
        <ActionBtn icon={Ico.Print}    label="Print"    onClick={handlePrint} />
        <button
          onClick={shareLink}
          className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition"
        >
          <Ico.Share /> Share <Ico.Chevron />
        </button>
        <button
          disabled={selected.length === 0}
          className={`px-4 py-[7px] text-[13px] font-medium rounded-md transition
            ${selected.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}
          onClick={() => { if (selected.length > 0) alert(`Paying ${selected.length} invoices`); }}
        >
          Pay ({selected.length})
        </button>
      </div>

      {loading
        ? <p className="text-sm text-gray-400 py-8 text-center">Loading...</p>
        : <Table cols={cols} rows={invoices} onRowClick={row => setSelectedInvoice(row)} noHighlight />
      }

      {selectedInvoice && <InvoiceDetailPanel invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
      {purchaseReturnTarget && (
        <PurchaseReturnModal invoice={purchaseReturnTarget} onClose={() => setPurchaseReturnTarget(null)}
          onConfirm={data => { console.log("Return:", data); setPurchaseReturnTarget(null); }} />
      )}
      {debitNoteTarget && (
        <DebitNoteModal invoice={debitNoteTarget} onClose={() => setDebitNoteTarget(null)}
          onConfirm={data => { console.log("Debit:", data); setDebitNoteTarget(null); }} />
      )}
    </>
  );
}

// ── Tab: Profile ──────────────────────────────────────────────────────────────
function ProfileTab({ vendor }) {
  const addr = [vendor.address_line_1, vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(", ");

  return (
    <div className="grid grid-cols-2 gap-4">
      <ProfileCard title="General Details" icon={Ico.Doc}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          <PField label="Party Name"     value={vendor.vendor_name} />
          <PField label="Party Type"     value={vendor.party_type || "Supplier"} />
          <PField label="Mobile Number"  value={vendor.contact_no_1} />
          <PField label="Party Category" value={vendor.party_category} />
        </div>
        <div className="mb-3"><PField label="Email" value={vendor.email} /></div>
        <PField label="Opening Balance" value={`₹${vendor.opening_balance ?? 0}`} />
      </ProfileCard>

      <ProfileCard title="Business Details" icon={Ico.Office}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          <PField label="GSTIN"      value={vendor.gstin} />
          <PField label="PAN Number" value={vendor.pan_number} />
        </div>
        <div className="mb-3">
          <p className="text-[11.5px] text-gray-400 mb-0.5">Billing Address</p>
          <p className="text-[13px] font-medium text-gray-900">{addr || "-"}</p>
        </div>
        <div className="mb-3">
          <p className="text-[11.5px] text-gray-400 mb-0.5">Shipping Address</p>
          <p className="text-[13px] font-medium text-gray-900">{vendor.vendor_name}</p>
          <p className="text-[13px] text-gray-700">{addr || "-"}</p>
        </div>
        <span className="text-[13px] font-medium text-indigo-600 cursor-pointer hover:underline">
          Manage Shipping Addresses (1)
        </span>
      </ProfileCard>

      <div className="border border-gray-200 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition col-span-1">
        <div className="flex items-center gap-3">
          <Ico.Bank />
          <div>
            <p className="text-[13px] font-semibold text-gray-700">Party Bank Details</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Add bank information to manage transactions with this party.</p>
          </div>
        </div>
        <button className="w-7 h-7 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 flex-shrink-0">
          <Ico.Plus />
        </button>
      </div>
    </div>
  );
}

// ── Tab: Ledger ───────────────────────────────────────────────────────────────
function LedgerTab({ vendor, vendorId, showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalReceivable: 0, dateRange: "" });

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);

    Promise.all([
      axios.get(`http://localhost:8000/api/purchase?vendor_id=${vendorId}`).catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:8000/api/purchase-return?vendor_id=${vendorId}`).catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:8000/api/debit-note?vendor_id=${vendorId}`).catch(() => ({ data: { data: [] } })),
      axios.get(`http://localhost:8000/api/payment-out?vendor_id=${vendorId}`).catch(() => ({ data: { data: [] } })),
    ]).then(([purchaseRes, returnRes, debitRes, paymentRes]) => {
      const purchases = (purchaseRes.data.data || []).map(r => ({
        _id: r._id,
        date: r.invoice_date,
        voucher: "Purchase Invoice",
        number: r.supplier_invoice_no || r.return_no || "—",
        credit: r.total_amount || 0,
        debit: 0,
        _type: "purchase",
      }));

      const returns = (returnRes.data.data || []).map(r => ({
        _id: r._id,
        date: r.date || r.createdAt,
        voucher: "Purchase Return",
        number: r.return_no || "—",
        credit: 0,
        debit: r.total_amount || 0,
        _type: "return",
      }));

      const debits = (debitRes.data.data || []).map(r => ({
        _id: r._id,
        date: r.date || r.createdAt,
        voucher: "Debit Note",
        number: r.debit_note_no || r.return_no || "—",
        credit: 0,
        debit: r.amount || r.total_amount || 0,
        _type: "debit",
      }));

      const payments = (paymentRes.data.data || []).map(r => ({
        _id: r._id,
        date: r.date || r.payment_date || r.createdAt,
        voucher: "Payment Out",
        number: r.payment_no || r.reference_no || "—",
        credit: 0,
        debit: r.amount || r.total_amount || 0,
        _type: "payment",
      }));

      const all = [...purchases, ...returns, ...debits, ...payments].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      let balance = vendor.opening_balance || 0;
      const withBalance = all.map(row => {
        balance = balance + row.credit - row.debit;
        return { ...row, runningBalance: balance };
      });

      const totalReceivable = balance;
      const dates = all.map(r => new Date(r.date)).filter(d => !isNaN(d));
      const minDate = dates.length ? new Date(Math.min(...dates)) : null;
      const maxDate = dates.length ? new Date(Math.max(...dates)) : null;
      const fmtD = d => d?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) || "";

      setSummary({
        totalReceivable,
        dateRange: minDate && maxDate ? `${fmtD(minDate)} – ${fmtD(maxDate)}` : "—",
      });

      setEntries(withBalance);
    }).finally(() => setLoading(false));
  }, [vendorId]);

  // ── Action handlers ──
  const handleDownload = () => {
    const headers = ["Date", "Voucher", "Ref No", "Credit (₹)", "Debit (₹)", "Balance (₹)"];
    const rows = entries.map(r => [
      fmtDate(r.date),
      r.voucher,
      r.number,
      r.credit > 0 ? r.credit : "—",
      r.debit > 0 ? r.debit : "—",
      r.runningBalance,
    ]);
    downloadCSV("ledger.csv", headers, rows);
  };

  const handlePrint = () => {
    const fmtNum = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const tableHTML = `
      <table>
        <thead><tr><th>Date</th><th>Voucher</th><th>Ref No</th><th>Credit (₹)</th><th>Debit (₹)</th><th>Balance (₹)</th></tr></thead>
        <tbody>
          ${entries.map(r => `
            <tr>
              <td>${fmtDate(r.date)}</td>
              <td>${r.voucher}</td>
              <td>${r.number}</td>
              <td>${r.credit > 0 ? fmtNum(r.credit) : "—"}</td>
              <td>${r.debit > 0 ? fmtNum(r.debit) : "—"}</td>
              <td>${r.runningBalance < 0 ? "("+fmtNum(Math.abs(r.runningBalance))+")" : fmtNum(r.runningBalance)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    openPrintWindow(`Party Ledger — ${vendor.vendor_name}`, tableHTML);
  };

  const VOUCHER_COLORS = {
    "Purchase Invoice": "text-blue-700 bg-blue-50",
    "Purchase Return":  "text-orange-700 bg-orange-50",
    "Debit Note":       "text-red-700 bg-red-50",
    "Payment Out":      "text-green-700 bg-green-50",
  };

  const cols = [
    { key: "date",    label: "Date",    render: r => fmtDate(r.date) },
    {
      key: "voucher", label: "Voucher",
      render: r => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${VOUCHER_COLORS[r.voucher] || "text-gray-600 bg-gray-100"}`}>
          {r.voucher}
        </span>
      ),
    },
    { key: "number",  label: "Ref No" },
    {
      key: "credit",  label: "Credit (₹)",
      render: r => r.credit > 0
        ? <span className="text-gray-800 font-medium tabular-nums">{fmt(r.credit)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: "debit",   label: "Debit (₹)",
      render: r => r.debit > 0
        ? <span className="text-green-700 font-medium tabular-nums">{fmt(r.debit)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: "runningBalance", label: "Balance (₹)",
      render: r => (
        <span className={`font-semibold tabular-nums ${r.runningBalance < 0 ? "text-red-600" : r.runningBalance > 0 ? "text-gray-800" : "text-gray-400"}`}>
          {r.runningBalance < 0 ? `(${fmt(Math.abs(r.runningBalance))})` : fmt(r.runningBalance)}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <DateFilter showFilter={showFilter} setShowFilter={setShowFilter} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} hoveredFilter={hoveredFilter} setHoveredFilter={setHoveredFilter} filterRef={filterRef} />
        <ActionBtn icon={Ico.Download} label="Download" onClick={handleDownload} />
        <ActionBtn icon={Ico.Print}    label="Print"    onClick={handlePrint} />
        <button
          onClick={shareLink}
          className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition"
        >
          <Ico.Share /> Share <Ico.Chevron />
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-visible">
        {/* Ledger header */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-[17px] font-bold text-gray-900">D&apos;Lume</p>
            <p className="text-[12px] text-indigo-500 mt-0.5">Phone no: &nbsp;9137826646</p>
          </div>
          <p className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">Party Ledger</p>
        </div>

        <div className="px-5 pt-4 pb-4 flex justify-between items-start">
          <div>
            <p className="text-[12px] text-gray-500">To,</p>
            <p className="text-[14px] font-bold text-gray-900 mt-0.5">{vendor.vendor_name}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{vendor.contact_no_1}</p>
          </div>
          <div className="border border-gray-200 rounded-lg px-4 py-3 text-right min-w-[220px]">
            <p className="text-[12px] text-gray-500 pb-2 mb-2 border-b border-gray-200">{summary.dateRange}</p>
            <p className="text-[12px] text-gray-500">Total Payable</p>
            <p className={`text-[16px] font-bold mt-0.5 ${summary.totalReceivable < 0 ? "text-red-600" : "text-gray-900"}`}>
              {fmt(Math.abs(summary.totalReceivable))}
            </p>
          </div>
        </div>

        {/* Opening Balance row */}
        <div className="mx-0 border-t border-gray-100">
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="bg-gray-50 border-b border-gray-200">
                <td className="px-4 py-3 text-gray-400 italic" colSpan={3}>Opening Balance</td>
                <td className="px-4 py-3 text-gray-300">—</td>
                <td className="px-4 py-3 text-gray-300">—</td>
                <td className="px-4 py-3 font-semibold text-gray-700 tabular-nums">{fmt(vendor.opening_balance || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {loading
          ? <p className="text-sm text-gray-400 py-10 text-center">Loading ledger...</p>
          : <Table cols={cols} rows={entries} noHighlight />
        }
      </div>
    </>
  );
}

// ── Tab: Payments ─────────────────────────────────────────────────────────────
function PaymentsTab({ vendorId, showFilter, setShowFilter, selectedFilter, setSelectedFilter, hoveredFilter, setHoveredFilter, filterRef }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    axios.get(`http://localhost:8000/api/payment-out?vendor_id=${vendorId}`)
      .then(res => { if (res.data.success) setPayments(res.data.data); })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [vendorId]);

  // ── Action handlers ──
  const handleDownload = () => {
    const headers = ["Date", "Payment No", "Amount", "Payment Mode", "Status"];
    const rows = payments.map(r => [
      fmtDate(r.date || r.payment_date),
      r.payment_no || r.reference_no || "—",
      r.amount || r.total_amount || 0,
      r.payment_mode || "—",
      "Paid",
    ]);
    downloadCSV("payments.csv", headers, rows);
  };

  const handlePrint = () => {
    const fmtNum = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const tableHTML = `
      <table>
        <thead><tr><th>Date</th><th>Payment No</th><th>Amount</th><th>Payment Mode</th><th>Status</th></tr></thead>
        <tbody>
          ${payments.map(r => `
            <tr>
              <td>${fmtDate(r.date || r.payment_date)}</td>
              <td>${r.payment_no || r.reference_no || "—"}</td>
              <td>${fmtNum(r.amount || r.total_amount)}</td>
              <td>${r.payment_mode || "—"}</td>
              <td>Paid</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    openPrintWindow("Payments", tableHTML);
  };

  const cols = [
    { key: "date",         label: "Date",         render: r => fmtDate(r.date || r.payment_date) },
    { key: "payment_no",   label: "Payment No",   render: r => r.payment_no || r.reference_no || "—" },
    { key: "amount",       label: "Amount",       render: r => fmt(r.amount || r.total_amount) },
    { key: "payment_mode", label: "Payment Mode", render: r => r.payment_mode || "—" },
    {
      key: "status", label: "Status",
      render: r => (
        <span className="px-2 py-[3px] text-xs rounded-full bg-green-100 text-green-700 border border-green-300">
          Paid
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <DateFilter showFilter={showFilter} setShowFilter={setShowFilter} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} hoveredFilter={hoveredFilter} setHoveredFilter={setHoveredFilter} filterRef={filterRef} />
        <ActionBtn icon={Ico.Download} label="Download" onClick={handleDownload} />
        <ActionBtn icon={Ico.Print}    label="Print"    onClick={handlePrint} />
        <button
          onClick={shareLink}
          className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition"
        >
          <Ico.Share /> Share <Ico.Chevron />
        </button>
      </div>
      {loading
        ? <p className="text-sm text-gray-400 py-8 text-center">Loading...</p>
        : <Table cols={cols} rows={payments} />
      }
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const [filters, setFilters] = useState({
    invoices: { show: false, selected: "Last 365 Days", hovered: null },
    payments: { show: false, selected: "Last 365 Days", hovered: null },
    ledger:   { show: false, selected: "Last 365 Days", hovered: null },
  });

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

  useEffect(() => { fetchVendor(); }, []);

  const fetchVendor = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/vendor/${id}`);
      if (res.data.success) setVendor(res.data.data);
    } catch { setVendor(null); }
  };

  if (!vendor) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  const TABS = [
    { key: "invoices", label: "Invoices",            icon: Ico.Receipt },
    { key: "payments", label: "Payments",            icon: Ico.Bank    },
    { key: "profile",  label: "Profile",             icon: Ico.User    },
    { key: "ledger",   label: "Ledger (Statement)",  icon: Ico.Ledger  },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-visible">

      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600">
            <Ico.Back />
          </button>
          <span className="text-[17px] font-semibold text-gray-900">{vendor.vendor_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn icon={Ico.Edit}  label="Edit" />
          <ActionBtn icon={Ico.Trash} danger square />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-between px-6 border-b border-gray-200">
        <div className="flex">
          {TABS.filter(t => t.key !== "profile").map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13.5px] border-b-2 -mb-px transition whitespace-nowrap
                ${activeTab === key ? "border-indigo-600 text-indigo-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon /> {label}
            </button>
          ))}
        </div>
        {TABS.filter(t => t.key === "profile").map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13.5px] border-b-2 -mb-px transition whitespace-nowrap
              ${activeTab === key ? "border-indigo-600 text-indigo-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "invoices" && (
          <TransactionsTab
            vendorId={id}
            showFilter={filters.invoices.show}
            setShowFilter={v => updateFilter("invoices", "show", v)}
            selectedFilter={filters.invoices.selected}
            setSelectedFilter={v => updateFilter("invoices", "selected", v)}
            hoveredFilter={filters.invoices.hovered}
            setHoveredFilter={v => updateFilter("invoices", "hovered", v)}
            filterRef={filterRef}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsTab
            vendorId={id}
            showFilter={filters.payments.show}
            setShowFilter={v => updateFilter("payments", "show", v)}
            selectedFilter={filters.payments.selected}
            setSelectedFilter={v => updateFilter("payments", "selected", v)}
            hoveredFilter={filters.payments.hovered}
            setHoveredFilter={v => updateFilter("payments", "hovered", v)}
            filterRef={filterRef}
          />
        )}

        {activeTab === "profile" && <ProfileTab vendor={vendor} />}

        {activeTab === "ledger" && (
          <LedgerTab
            vendor={vendor}
            vendorId={id}
            showFilter={filters.ledger.show}
            setShowFilter={v => updateFilter("ledger", "show", v)}
            selectedFilter={filters.ledger.selected}
            setSelectedFilter={v => updateFilter("ledger", "selected", v)}
            hoveredFilter={filters.ledger.hovered}
            setHoveredFilter={v => updateFilter("ledger", "hovered", v)}
            filterRef={filterRef}
          />
        )}
      </div>
    </div>
  );
}