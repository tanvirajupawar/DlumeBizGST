import { useState, useEffect } from "react";
import { FiX, FiDownload, FiPrinter, FiEdit2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const PurchaseReturnDetailPanel = ({ note, onClose }) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ───── PRINT HTML ───── */
  const getPrintHTML = () => `
  <html>
    <head>
      <title>Purchase Return ${note.returnNo}</title>
      <style>
        body { font-family: Arial; padding: 30px; }
        h1 { font-size: 20px; }
        .meta { margin-bottom: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f5f5f5; }
        .total { text-align: right; margin-top: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Purchase Return</h1>
      <div class="meta">
        Vendor: ${note.partyName} <br/>
        Return No: ${note.returnNo} <br/>
        Date: ${note.date}
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${note.items?.map(i => `
            <tr>
         <td>${i.item || i.name || i.item_name}</td>
              <td>${i.qty}</td>
              <td>${fmt(i.rate || i.price)}</td>
              <td>${fmt(i.amount || i.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="total">
        Total: ${fmt(note.amount)}
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
    a.download = `PurchaseReturn-${note.returnNo}.html`;
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
          <p className="text-base font-semibold text-gray-800">{note.partyName}</p>
          <p className="text-xs font-mono text-gray-400 mt-0.5">{note.returnNo}</p>
        </div>
        <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
          <FiX size={15} />
        </button>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-3">
          <p className="text-[10px] uppercase text-gray-400">Date</p>
          <p className="text-sm font-medium">{note.date}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[10px] uppercase text-gray-400">Amount</p>
          <p className="text-sm font-medium">{fmt(note.amount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[10px] uppercase text-gray-400">Status</p>
          <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
            {note.status || "—"}
          </span>
        </div>
      </div>

      {/* Items Table (EXACT SAME AS INVOICE) */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-5 pb-2">
          <p className="text-[10px] uppercase text-gray-400">Line Items</p>
        </div>

        {(!note.items || note.items.length === 0) ? (
          <p className="text-sm text-gray-400 text-center py-12">No items found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
             <tr className="bg-gray-50">
                <th className="text-left px-6 py-2.5 text-xs text-gray-500 w-full">Item</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-500">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-500">Rate</th>
                <th className="text-right px-6 py-2.5 text-xs text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-xs font-medium">
                 {row.item}
                  </td>
                  <td className="px-4 py-3 text-xs text-right">{row.qty}</td>
                  <td className="px-4 py-3 text-xs text-right">
                    {fmt(row.rate || row.price)}
                  </td>
                  <td className="px-6 py-3 text-xs font-semibold text-right">
                    {fmt(row.amount || row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Total */}
        {note.items?.length > 0 && (
         <div className="mx-6 mt-4 pt-3 flex justify-between pb-6">
            <p className="text-xs uppercase text-gray-400">Grand Total</p>
            <p className="text-base font-bold">{fmt(note.amount)}</p>
          </div>
        )}
      </div>

      {/* Footer (same as before) */}
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
      onClick={() => navigate(`/purchase-return/${note.id}/edit`)}
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

export default PurchaseReturnDetailPanel;