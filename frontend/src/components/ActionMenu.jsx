import { useState, useEffect, useRef } from "react";
import {
  FiMoreVertical,
  FiEdit2,
  FiFileText,
  FiTrash2
} from "react-icons/fi";

/**
 * ActionMenu
 *
 * GST User:
 * - Edit
 * - Return
 * - Credit/Debit Note
 * - Delete
 *
 * Non GST User:
 * - Edit
 * - Delete
 */

const ActionMenu = ({
  invoice,
  type = "purchase",
  isGST = true,

  onEdit,
  disableEdit = false,
  onPurchaseReturn,
  onDebitNote,
  onSalesReturn,
  onCreditNote,
  onDelete
}) => {

  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {

    const handleClickOutside = (e) => {

      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };

  }, [open]);

  return (

    <div
      className="relative"
      ref={menuRef}
    >

      {/* Three Dot Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <FiMoreVertical size={15} />
      </button>

      {/* Dropdown */}
      {open && (

        <div
          className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-48 py-1 overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >

       {/* Edit */}
<button

  disabled={disableEdit}

  onClick={() => {

    if (!disableEdit) {
      onEdit?.();
    }

    setOpen(false);

  }}

  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors

    ${
      disableEdit
        ? "text-gray-400 bg-gray-50 cursor-not-allowed"
        : "text-gray-700 hover:bg-gray-50"
    }
  `}
>
  <FiEdit2
    size={13}
    className={
      disableEdit
        ? "text-gray-400"
        : "text-gray-500"
    }
  />

  Edit
</button>

          {/* GST ONLY OPTIONS */}
          {isGST && (
            <>

              {/* Return */}
              <button
                onClick={() => {

                  type === "sales"
                    ? onSalesReturn?.()
                    : onPurchaseReturn?.();

                  setOpen(false);

                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiFileText
                  size={13}
                  className="text-gray-500"
                />

                {type === "sales"
                  ? "Issue Sales Return"
                  : "Issue Purchase Return"}
              </button>

              {/* Credit / Debit Note */}
              <button
                onClick={() => {

                  type === "sales"
                    ? onCreditNote?.()
                    : onDebitNote?.();

                  setOpen(false);

                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiFileText
                  size={13}
                  className="text-gray-500"
                />

                {type === "sales"
                  ? "Issue Credit Note"
                  : "Issue Debit Note"}
              </button>

            </>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 my-1" />

          {/* Delete */}
          <button
            onClick={() => {

              onDelete?.();

              setOpen(false);

            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <FiTrash2
              size={13}
              className="text-red-400"
            />

            Delete
          </button>

        </div>
      )}

    </div>
  );
};

export default ActionMenu;