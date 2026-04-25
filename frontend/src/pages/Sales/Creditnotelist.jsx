import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { HiOutlineCalendar } from "react-icons/hi";
import Button from "../../components/Button";
import CreditNoteDetailPanel from "../../components/CreditNoteDetailPanel";

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const DATE_FILTERS = ["Last 30 Days", "Last 90 Days", "Last 365 Days", "All Time"];

/* ─── Date Filter Dropdown ─── */
const DateFilter = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 transition"
      >
        <HiOutlineCalendar size={15} className="text-gray-400" />
        <span className="text-gray-600">{selected}</span>
      </button>

      {open && (
        <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg w-44 z-20 py-1">
          {DATE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { onChange(f); setOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm transition
                ${selected === f ? "text-green-700 font-medium bg-green-50" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
const CreditNoteList = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("Last 365 Days");
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/credit-note");

      if (res.data.success) {
        const formatted = res.data.data.map((n) => ({
          id: n._id,
          creditNo: n.credit_no,
          partyName:
            n.customer_id?.customer_name ||
            n.customer_id?.company_name ||
            "Unknown Customer",
          invoiceNo: n.sales_id?.invoice_no || "-",
          date: new Date(n.date).toLocaleDateString("en-GB"),
          amount: n.amount || 0,
          reason: n.reason || "",

          items: (n.details || []).map((d) => ({
            item: d.product_name,
            qty: d.qty,
            rate: d.price,
            total: d.amount,
          })),
        }));
        setNotes(formatted);
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error("FETCH CREDIT ERROR:", err);
      setNotes([]);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this credit note?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`http://localhost:8000/api/credit-note/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setSelectedNote((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      console.error(err);
      alert("Failed to delete credit note");
    }
  };

  const filteredNotes = notes.filter((n) =>
    (n.partyName || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.creditNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.invoiceNo || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = notes.reduce((s, n) => s + n.amount, 0);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <DateFilter selected={dateFilter} onChange={setDateFilter} />

        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Total Credit Notes
          </p>
          <p className="text-sm font-bold text-green-600 tabular-nums">
            {fmt(totalAmount)}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">

        {/* Search + Button */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="relative w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by party, credit no, invoice no..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
          <Button
            variant="navy"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => navigate("/credit-note/new")}
          >
            <FiPlus size={14} />
            Create Credit Note
          </Button>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[130px_1fr_1fr_150px_130px_60px] border-b border-gray-200 bg-gray-50 px-6">
          <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</div>
          <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit Note No</div>
          <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Party Name</div>
          <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice No</div>
          <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-6">Amount</div>
          <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Actions</div>
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">No credit notes found.</p>
        )}

        {/* Rows */}
        {filteredNotes.map((note, idx) => {
          const isLast = idx === filteredNotes.length - 1;
          const isSelected = selectedNote?.id === note.id;
          return (
            <div key={note.id} className={!isLast ? "border-b border-gray-100" : ""}>
              <div
                className={`grid grid-cols-[130px_1fr_1fr_150px_130px_60px] px-6 items-center transition-colors cursor-pointer
                  ${isSelected ? "bg-green-50/60" : "hover:bg-gray-50"}`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="py-4">
                  <p className="text-sm text-gray-500">{note.date}</p>
                </div>
                <div className="py-4 pr-4">
                  <p className="text-sm font-mono text-gray-500">{note.creditNo}</p>
                </div>
                <div className="py-4 pr-4">
                  <p className="text-sm font-medium text-gray-800 truncate">{note.partyName}</p>
                </div>
                <div className="py-4">
                  <p className="text-sm font-mono text-gray-500">{note.invoiceNo}</p>
                </div>
                <div className="py-4 text-right pr-6">
                  <p className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(note.amount)}</p>
                </div>
                <div
                  className="py-3 flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail Side Panel ── */}
     {selectedNote && (
  <CreditNoteDetailPanel
    note={selectedNote}
    onClose={() => setSelectedNote(null)}
  />
)}
    </div>
  );
};

export default CreditNoteList;