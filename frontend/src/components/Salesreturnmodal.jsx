import { useState, useRef } from "react";
import { FiTrash2 } from "react-icons/fi";
import Modal from "./Modal";

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

/**
 * SalesReturnModal
 *
 * Props:
 *  - invoice   {object}   The invoice to return against (see shape below)
 *  - onClose   {function} Called when modal requests to close
 *  - onConfirm {function} Called with { items, total, date, reason }
 *
 * Invoice shape:
 *  {
 *    invoiceNo: string,
 *    customer:  string,
 *    date:      string,
 *    items: [{ item, code, qty, price }]
 *  }
 *
 * Usage:
 *  {salesReturnTarget && (
 *    <SalesReturnModal
 *      invoice={salesReturnTarget}
 *      onClose={() => setSalesReturnTarget(null)}
 *      onConfirm={(data) => {
 *        console.log(data);
 *        setSalesReturnTarget(null);
 *      }}
 *    />
 *  )}
 */
const SalesReturnModal = ({ invoice, onClose, onConfirm }) => {
  const returnNumber = useRef(
    `SR-${invoice.invoiceNo}-${Date.now().toString().slice(-4)}`
  );

  const [returnItems, setReturnItems] = useState(
    invoice.items.map((item) => ({ ...item, returnQty: item.qty }))
  );

  const handleQtyChange = (index, value) => {
    const parsed = Math.max(0, Math.min(Number(value), returnItems[index].qty));
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, returnQty: parsed } : item))
    );
  };

  const handleDelete = (index) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const returnTotal = returnItems.reduce(
    (sum, item) => sum + item.returnQty * item.price,
    0
  );

  return (
    <Modal title="Issue Sales Return" onClose={onClose} maxWidth="max-w-4xl">

      {/* Header meta row */}
      <div className="flex items-start justify-between -mt-3 gap-4">
       <p className="text-xs text-gray-400">
  {invoice.customerName || "Walk-in"} &nbsp;·&nbsp; {invoice.date}
</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Invoice No
            </p>
            <p className="text-xs font-bold text-gray-700 font-mono">
              {invoice.invoiceNo}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Return No
            </p>
            <p className="text-xs font-bold text-green-800 font-mono">
              {returnNumber.current}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="-mx-6">
        <div className="grid grid-cols-[minmax(0,2fr)_110px_130px_110px_44px] border-y border-gray-200 bg-white px-6">
          <div className="py-3 text-sm font-semibold text-gray-800">Item Name</div>
          <div className="py-3 text-sm font-semibold text-gray-800 text-right">Sale Price</div>
          <div className="py-3 text-sm font-semibold text-gray-800 text-right">Quantity</div>
          <div className="py-3 text-sm font-semibold text-gray-800 text-right">Total</div>
          <div className="py-3" />
        </div>

        {returnItems.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">No items remaining.</p>
        )}

        {returnItems.map((item, idx) => (
          <div
            key={idx}
            className={`grid grid-cols-[minmax(0,2fr)_110px_130px_110px_44px] px-6 items-center
              ${idx !== returnItems.length - 1 ? "border-b border-gray-100" : ""}`}
          >
            <div className="py-3.5">
              <p className="text-sm font-medium text-gray-800">{item.item}</p>
            </div>

            <div className="py-3.5 text-sm text-gray-500 text-right tabular-nums">
              {fmt(item.price)}
            </div>
            <div className="py-3.5 flex items-center justify-end">
              <input
                type="number"
                min={0}
                max={item.qty}
                value={item.returnQty}
                onChange={(e) => handleQtyChange(idx, e.target.value)}
                className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div className="py-3.5 text-right">
              <span className="text-sm font-semibold text-gray-800 tabular-nums">
                {fmt(item.returnQty * item.price)}
              </span>
            </div>
            <div className="py-3.5 flex justify-center">
              <button
                onClick={() => handleDelete(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between -mx-6 px-6 pt-4 border-t border-gray-200 -mb-5 pb-5">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span>Return Total:</span>
          <span className="font-bold text-green-800 tabular-nums text-base">
            {fmt(returnTotal)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            disabled={returnItems.length === 0 || returnTotal === 0}
            onClick={() =>
              onConfirm({
                items: returnItems,
                total: returnTotal,
                date: new Date().toISOString(),
                reason: ""
              })
            }
            className="px-5 py-2 text-sm bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Confirm Return
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SalesReturnModal;