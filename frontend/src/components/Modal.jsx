import { FiX } from "react-icons/fi";

const Modal = ({ title, children, onClose, maxWidth = "max-w-md" }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} mx-4 p-6 space-y-5`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export default Modal;