import { useState, useEffect } from "react";
import { FiX, FiDownload, FiPrinter, FiEdit2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const DebitNoteDetailPanel = ({ note, onClose }) => {
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

  /* PRINT */
  const getPrintHTML = () => `
  <html>
    <head>
      <title>Debit Note ${note.debitNo}</title>
      <style>
        body { font-family: Arial; padding: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f5f5f5; }
      </style>
    </head>
    <body>
      <h1>Debit Note</h1>
      <p>Vendor: ${note.partyName}</p>
      <p>Debit No: ${note.debitNo}</p>
      <p>Date: ${note.date}</p>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${(note.items || []).map(i => `
            <tr>
              <td>${i.item}</td>
              <td>${i.qty}</td>
              <td>${fmt(i.rate)}</td>
              <td>${fmt(i.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <h3>Total: ${fmt(note.amount)}</h3>
    </body>
  </html>
  `;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(getPrintHTML());
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleDownload = () => {
    const blob = new Blob([getPrintHTML()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DebitNote-${note.debitNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
      <div
        className="absolute inset-0 bg-black/20"
        style={{ opacity: visible ? 1 : 0 }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[560px] h-full bg-white shadow-2xl flex flex-col transition-transform"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-base font-semibold">{note.partyName}</p>
            <p className="text-xs font-mono text-gray-400">{note.debitNo}</p>
          </div>
          <button onClick={handleClose}><FiX /></button>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 border-b border-gray-100">
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400">Date</p>
            <p>{note.date}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400">Amount</p>
            <p>{fmt(note.amount)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400">Invoice</p>
            <p>{note.invoiceNo}</p>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-2">
            <p className="text-xs text-gray-400 uppercase">Line Items</p>
          </div>

          {!note.items?.length ? (
            <p className="text-center text-gray-400 py-10">No items</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-6 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {note.items.map((i, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3">{i.item}</td>
                    <td className="px-4 py-3 text-right">{i.qty}</td>
                    <td className="px-4 py-3 text-right">{fmt(i.rate)}</td>
                    <td className="px-6 py-3 text-right font-semibold">{fmt(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Total */}
          {note.items?.length > 0 && (
            <div className="mx-6 mt-4 pt-3 flex justify-between pb-6">
              <p className="text-xs text-gray-400">Grand Total</p>
              <p className="font-bold">{fmt(note.amount)}</p>
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

export default DebitNoteDetailPanel;