import {
  FiChevronDown,
  FiCheck,
  FiEdit2,
  FiEye,
  FiTrash2,
  FiCreditCard,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const ExpandableTable = ({
  invoices,
  expandedId,
  setExpandedId,
  onToggleConfirm,
}) => {
  const navigate = useNavigate();

  const toggleRow = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <>
      {/* Table Head */}
      <div className="grid grid-cols-[32px_1fr_140px_130px_130px_120px] border-b border-gray-200 bg-gray-50 px-6">
        <div className="py-3" />
        <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Customer
        </div>
        <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Invoice No
        </div>
        <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Date
        </div>
        <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-6">
          Amount
        </div>
        <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
          Status
        </div>
      </div>

      {invoices.map((inv, idx) => {
        const isExpanded = expandedId === inv.id;
        const isLast = idx === invoices.length - 1;

        return (
          <div
            key={inv.id}
            className={!isLast ? "border-b border-gray-100" : ""}
          >
            {/* Main row */}
            <div
              onClick={() => toggleRow(inv.id)}
              className={`grid grid-cols-[32px_1fr_140px_130px_130px_120px] px-6 cursor-pointer items-center transition-colors
              ${isExpanded ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
            >
              {/* Checkbox */}
              <div className="flex items-center py-4">
                <button
                  onClick={(e) => onToggleConfirm(e, inv)}
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center flex-shrink-0 transition-all
                  ${
                    inv.confirmed
                      ? "bg-green-500 border-green-500"
                      : "border-gray-400 bg-white hover:border-green-400"
                  }`}
                >
                  {inv.confirmed && (
                    <FiCheck
                      size={9}
                      className="text-white"
                      strokeWidth={3}
                    />
                  )}
                </button>
              </div>

              {/* Customer */}
              <div className="py-4 pr-4">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {inv.customer}
                </p>
              </div>

              {/* Invoice */}
              <div className="py-4">
                <p className="text-sm text-gray-500 font-mono">
                  {inv.invoiceNo}
                </p>
              </div>

              {/* Date */}
              <div className="py-4">
                <p className="text-sm text-gray-500">{inv.date}</p>
              </div>

              {/* Amount */}
              <div className="py-4 text-right pr-6">
                <p className="text-sm font-semibold text-gray-800 tabular-nums">
                  {fmt(inv.amount)}
                </p>
              </div>

              {/* Status */}
              <div className="py-4 flex items-center justify-center gap-1.5">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded
                  ${
                    inv.confirmed
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {inv.confirmed ? "Confirmed" : "Pending"}
                </span>

                <FiChevronDown
                  size={12}
                  className={`text-gray-400 transition-transform duration-200 flex-shrink-0
                  ${isExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {/* Expanded Panel */}
            {isExpanded && (
              <div className="bg-gray-50/80 border-t border-gray-100 py-3">
                {/* Nested items table */}
                <table className="w-full mb-3 table-fixed">
                  <colgroup>
                    <col style={{ width: "32px" }} />
                    <col />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "120px" }} />
                  </colgroup>

                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 pb-2" />
                      <th className="text-left px-0 pb-2 text-xs font-semibold text-gray-400 pr-4">
                        Item
                      </th>
                      <th className="text-left px-0 pb-2 text-xs font-semibold text-gray-400">
                        Bags
                      </th>
                      <th className="text-left px-0 pb-2 text-xs font-semibold text-gray-400">
                        Qty
                      </th>
                      <th className="text-right px-0 pb-2 text-xs font-semibold text-gray-400 pr-6">
                        Price
                      </th>
                      <th className="text-center px-0 pb-2 text-xs font-semibold text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inv.items.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-6" />

                        <td className="py-2 text-xs text-gray-700 font-medium pr-4">
                          {row.item}
                        </td>

                        <td className="py-2 text-xs text-gray-500">
                          {row.bags}
                        </td>

                        <td className="py-2 text-xs text-gray-700">
                          {row.qty}
                        </td>

                        <td className="py-2 text-xs text-gray-500 text-right pr-6">
                          {fmt(row.price)}
                        </td>

                        <td className="py-2 text-xs font-semibold text-green-600 text-center">
                          {fmt(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Row Actions */}
                <div className="flex items-center gap-2 px-6 pt-1">
                  <button
                    onClick={() =>
                      navigate(`/sales-invoice/${inv.id}/edit`)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 transition"
                  >
                    <FiEdit2 size={11} /> Edit
                  </button>

                  <button
                    onClick={() => navigate(`/invoice/${inv.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 transition"
                  >
                    <FiEye size={11} /> View
                  </button>

                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-200 text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 transition"
                  >
                    <FiCreditCard size={11} /> Account
                  </button>

                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-200 text-xs font-medium text-red-500 bg-white hover:bg-red-50 transition ml-auto"
                  >
                    <FiTrash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default ExpandableTable;