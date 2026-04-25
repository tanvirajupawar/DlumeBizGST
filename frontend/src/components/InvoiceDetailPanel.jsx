import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { FiDownload, FiPrinter, FiEdit2 } from "react-icons/fi";

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const InvoiceDetailPanel = ({ invoice, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);



  const getPrintHTML = () => `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    body { font-family: Arial; padding: 30px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 5px; }
    .meta { margin-bottom: 20px; font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
    th { background: #f5f5f5; text-align: left; }
    .total { text-align: right; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Invoice</h1>
  <div class="meta">
    Vendor: ${invoice.vendor} <br/>
    Invoice No: ${invoice.invoiceNo} <br/>
    Date: ${invoice.date}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(i => `
        <tr>
          <td>${i.item}</td>
          <td>${i.qty}</td>
          <td>${fmt(i.price)}</td>
          <td>${fmt(i.total)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="total">
    Grand Total: ${fmt(invoice.amount)}
  </div>
</body>
</html>
`;


const handlePrint = () => {
  const win = window.open("", "_blank");
  win.document.write(getPrintHTML());
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
};

const handleDownload = () => {
  const blob = new Blob([getPrintHTML()], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${invoice.invoiceNo}.html`;
  a.click();

  URL.revokeObjectURL(url);
};

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
      <div
        className="absolute inset-0 bg-black/20 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[560px] h-full bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-base font-semibold text-gray-800">{invoice.vendor}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{invoice.invoiceNo || "—"}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition mt-0.5"
          >
            <FiX size={15} />
          </button>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: "Date",   value: invoice.date },
            { label: "Amount", value: fmt(invoice.amount), mono: true },
            {
              label: "Status",
              value: invoice.confirmed ? "Confirmed" : "Pending",
              badge: invoice.confirmed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            },
          ].map(({ label, value, mono, badge }) => (
            <div key={label} className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
              {badge ? (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge}`}>{value}</span>
              ) : (
                <p className={`text-sm font-medium text-gray-800 ${mono ? "tabular-nums" : ""}`}>{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Items table */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Line Items</p>
          </div>

          {(!invoice.items || invoice.items.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-12">No items found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 w-full">Item</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">Qty</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">Unit Price</th>
                  <th className="text-right px-6 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      i === invoice.items.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-6 py-3 text-xs font-medium text-gray-800">{row.item}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-right tabular-nums">{row.qty}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-right tabular-nums">{fmt(row.price)}</td>
                    <td className="px-6 py-3 text-xs font-semibold text-gray-800 text-right tabular-nums">{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Grand total */}
          {invoice.items?.length > 0 && (
            <div className="mx-6 mt-4 pt-3.5 border-t border-gray-200 flex items-center justify-between pb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Grand Total</p>
              <p className="text-base font-bold text-gray-900 tabular-nums">{fmt(invoice.amount)}</p>
            </div>
          )}
        </div>

        {/* ── Footer Buttons ── */}
<div className="p-4 border-t border-gray-100 space-y-2">

  {/* Download + Print */}
  <div className="flex gap-2">
 <button
  onClick={handleDownload}
  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 text-gray-600"
>
  <FiDownload size={14} />
  Download
</button>


  <button
  onClick={handlePrint}
  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 text-gray-600"
>
  <FiPrinter size={14} />
  Print
</button>
  </div>

  {/* Close + Edit */}
  <div className="flex gap-2">
    <button
      onClick={handleClose}
      className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 text-gray-700"
    >
      Close
    </button>

    <button
      className="flex-1 bg-[#2b3f8f] text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2 hover:bg-[#1e2e6f]"
    >
       <FiEdit2 size={14} />
      Edit
    </button>
  </div>

</div>
      </div>
    </div>
  );
};

export default InvoiceDetailPanel;