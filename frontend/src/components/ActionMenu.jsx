import { useState, useEffect, useRef } from "react";
import { FiMoreVertical, FiEdit2, FiFileText, FiTrash2 } from "react-icons/fi";

/**
 * ActionMenu — three-dot dropdown for invoice rows
 *
 * Props:
 *  - invoice         {object}   The invoice the menu belongs to
 *  - onEdit          {function} Called when Edit is clicked
 *  - onPurchaseReturn{function} Called when Issue Purchase Return is clicked
 *  - onDebitNote     {function} Called when Issue Debit Note is clicked
 *  - onDelete        {function} Called when Delete is clicked
 *
 * Usage:
 *  <ActionMenu
 *    invoice={inv}
 *    onEdit={() => navigate(`/purchase-invoice/${inv.id}/edit`)}
 *    onPurchaseReturn={() => setPurchaseReturnTarget(inv)}
 *    onDebitNote={() => setDebitNoteTarget(inv)}
 *    onDelete={() => console.log("Delete", inv)}
 *  />
 */
const ActionMenu = ({
  invoice,
  type = "purchase",   
  onEdit,
  onPurchaseReturn,
  onDebitNote,
  onSalesReturn,
  onCreditNote,
  onDelete
}) => {  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <FiMoreVertical size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-48 py-1 overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onEdit?.(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FiEdit2 size={13} className="text-gray-500" /> Edit
          </button>

          <button
            onClick={() => {
  type === "sales" ? onSalesReturn?.() : onPurchaseReturn?.();
  setOpen(false);
}}            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
             <FiFileText size={13} className="text-gray-500" />
  {type === "sales" ? "Issue Sales Return" : "Issue Purchase Return"}
          </button>

          <button
          onClick={() => {
  type === "sales" ? onCreditNote?.() : onDebitNote?.();
  setOpen(false);
}}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FiFileText size={13} className="text-gray-500" />
  {type === "sales" ? "Issue Credit Note" : "Issue Debit Note"}
          </button>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => { onDelete?.(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <FiTrash2 size={13} className="text-red-400" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;