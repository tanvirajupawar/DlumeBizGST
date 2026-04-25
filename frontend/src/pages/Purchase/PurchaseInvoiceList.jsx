import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FiPlus, FiChevronDown, FiCheck, FiEye,
  FiEdit2, FiTrash2, FiCreditCard, FiSearch,
  FiMoreVertical, FiClock, FiCopy, FiFileText, FiX
} from "react-icons/fi";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import PurchaseReturnModal from "../../components/Purchasereturnmodal";
import DebitNoteModal from "../../components/DebitNoteModal";
import InvoiceDetailPanel from "../../components/InvoiceDetailPanel";
import ActionMenu from "../../components/ActionMenu";

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const TABS = ["Invoices", "Payables"];

/* ─── Confirm Dialog ─── */
const ConfirmDialog = ({ invoice, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onCancel}>
    <div className="bg-white border border-gray-200 rounded-lg shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
      <p className="text-sm font-semibold text-gray-800 mb-1">Confirm Invoice</p>
      <p className="text-xs text-gray-500 mb-5">
        Mark <strong>{invoice.invoiceNo}</strong> for <strong>{invoice.vendor}</strong> as confirmed?
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel}
          className="px-4 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="px-4 py-1.5 rounded bg-[#1e3a8a] text-xs font-medium text-white hover:bg-blue-900 transition">
          Confirm
        </button>
      </div>
    </div>
  </div>
);

/* ─── Payment Modal ─── */
const PaymentModal = ({ invoice, onClose, onConfirm }) => {
  const [form, setForm] = useState({
    amount: invoice.amount,
    paymentMode: "Cash",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  const handleSubmit = () => {
    if (!form.amount || !form.date) return;
    onConfirm({ invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, ...form });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-2xl w-96 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Record Payment</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.vendor} · {invoice.invoiceNo}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Mode</label>
            <select
              value={form.paymentMode}
              onChange={e => setForm({ ...form, paymentMode: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
            <input
              placeholder="e.g. partial payment, reference no..."
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Outstanding hint */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-blue-600 font-medium">Invoice Total</span>
          <span className="text-xs font-bold text-blue-700 tabular-nums">{fmt(invoice.amount)}</span>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 rounded-lg bg-[#1e3a8a] text-xs font-medium text-white hover:bg-blue-900 transition flex items-center gap-1.5"
          >
            <FiCreditCard size={12} />
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const PurchaseInvoiceList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]               = useState("Invoices");
  const [invoices, setInvoices]                 = useState([]);
  const [confirmTarget, setConfirmTarget]       = useState(null);
  const [search, setSearch]                     = useState("");
  const [payables, setPayables]                 = useState([]);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [purchaseReturnTarget, setPurchaseReturnTarget] = useState(null);
  const [selectedInvoice, setSelectedInvoice]   = useState(null);
  // ↓ NEW
  const [paymentTarget, setPaymentTarget]       = useState(null);
  const [payableForm, setPayableForm] = useState({
    vendor: "", outstanding: "", date: "", remark: "", amount: "", paymentMode: "Cash",
  });

  const isInvoice = activeTab === "Invoices";
  const [debitNoteTarget, setDebitNoteTarget] = useState(null);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this invoice?");
    if (!confirmDelete) return;
    try {
      axios.delete(`/api/purchase/${id}`);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      setSelectedInvoice(prev => prev?.id === id ? null : prev);
    } catch (err) {
      console.error(err);
      alert("Failed to delete invoice");
    }
  };

  // ↓ NEW
  const handlePayment = async (data) => {
    try {
      await axios.post(`/api/purchase/${data.invoiceId}/payment`, data);
      // Optionally mark invoice as confirmed/paid in UI:
      setInvoices(prev =>
        prev.map(inv => inv.id === data.invoiceId ? { ...inv, confirmed: true } : inv)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to record payment");
    } finally {
      setPaymentTarget(null);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    (inv.vendor || "").toLowerCase().includes(search.toLowerCase()) ||
    (inv.invoiceNo || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredPayables = payables.filter(pay =>
    (pay.vendor || "").toLowerCase().includes(search.toLowerCase()) ||
    (pay.refNo || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchases = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPayables  = payables.reduce((s, p) => s + p.amount, 0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/purchase");
      if (res.data.success) {
        const formatted = res.data.data.map((p) => ({
          id: p._id,
          invoiceNo: p.supplier_invoice_no,
vendor_id: p.vendor_id?._id,
vendor: p.vendor_id?.company_name || "Vendor",
          companyName: p.vendor_id?.company_name || "No Company",
          date: new Date(p.invoice_date).toLocaleDateString("en-GB"),
          amount: p.total_amount,
          confirmed: p.status === "Paid",
          items: (p.details || []).map((it) => ({
            item: it.product_name,
            bags: "-",
            qty: it.qty,
            price: it.price,
            total: it.amount,
          })),
        }));
        setInvoices(formatted);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
          {TABS.map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSearch(""); setSelectedInvoice(null); }}
              className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${activeTab === tab ? "bg-[#1e3a8a] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {isInvoice ? "Total Purchases" : "Total Payables"}
          </p>
          <p className="text-sm font-bold text-green-600 tabular-nums">
            {fmt(isInvoice ? totalPurchases : totalPayables)}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">

        {/* Search + Add Button */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="relative w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isInvoice ? "Search purchase invoices..." : "Search payables..."}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <Button variant="navy" size="sm" className="flex items-center gap-2"
            onClick={() => isInvoice ? navigate("/purchase-invoice") : setShowPayableModal(true)}>
            <FiPlus size={14} />
            {isInvoice ? "New Invoice" : "Add Payable"}
          </Button>
        </div>

        {isInvoice ? (
          <>
            {/* ↓ Added 90px column for Pay button before the actions column */}
            <div className="grid grid-cols-[1fr_1fr_140px_130px_130px_120px_90px_40px] border-b border-gray-200 bg-gray-50 px-6">
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice No</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-6">Amount</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</div>
              <div className="py-3" />
              <div className="py-3" />
            </div>

            {filteredInvoices.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No invoices found.</p>
            )}

            {filteredInvoices.map((inv, idx) => {
              const isLast = idx === filteredInvoices.length - 1;
              return (
                <div key={inv.id} className={!isLast ? "border-b border-gray-100" : ""}>
                  <div
                    className={`grid grid-cols-[1fr_1fr_140px_130px_130px_120px_90px_40px] px-6 items-center transition-colors cursor-pointer
                      ${selectedInvoice?.id === inv.id ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <div className="py-4 pr-4">
                      <p className="text-sm font-medium text-gray-800 truncate">{inv.vendor}</p>
                    </div>
                    <div className="py-4 pr-4">
                      <p className="text-sm text-gray-600 truncate">{inv.companyName}</p>
                    </div>
                    <div className="py-4">
                      <p className="text-sm text-gray-500 font-mono">{inv.invoiceNo}</p>
                    </div>
                    <div className="py-4">
                      <p className="text-sm text-gray-500">{inv.date}</p>
                    </div>
                    <div className="py-4 text-right pr-6">
                      <p className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(inv.amount)}</p>
                    </div>
                    <div className="py-4 flex items-center justify-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded
                        ${inv.confirmed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {inv.confirmed ? "Confirmed" : "Pending"}
                      </span>
                    </div>

                    {/* ↓ NEW — Pay button */}
                    <div className="py-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setPaymentTarget(inv)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#1e3a8a] text-[11px] font-semibold text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-colors"
                      >
                        <FiCreditCard size={11} />
                        Pay
                      </button>
                    </div>

                    <div className="py-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                   <ActionMenu
  type="purchase"   
  invoice={inv}
  onEdit={() => navigate(`/purchase-invoice/${inv.id}/edit`)}
  onPurchaseReturn={() => setPurchaseReturnTarget(inv)}
  onDebitNote={() => setDebitNoteTarget(inv)}
  onDelete={() => handleDelete(inv.id)}
/>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_130px_130px_110px_130px_100px] border-b border-gray-200 bg-gray-50 px-6">
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref No</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-6">Amount</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</div>
            </div>

            {filteredPayables.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No payables found.</p>
            )}

            {filteredPayables.map((pay, idx) => (
              <div key={pay.id}
                className={`grid grid-cols-[1fr_130px_130px_110px_130px_100px] px-6 items-center hover:bg-gray-50 transition-colors
                  ${idx !== filteredPayables.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className="py-4"><p className="text-sm font-medium text-gray-800">{pay.vendor}</p></div>
                <div className="py-4 text-sm font-mono text-gray-500">{pay.refNo}</div>
                <div className="py-4 text-sm text-gray-500">{pay.date}</div>
                <div className="py-4 text-sm text-gray-500">{pay.method}</div>
                <div className="py-4 text-sm font-semibold text-gray-800 text-right pr-6 tabular-nums">{fmt(pay.amount)}</div>
                <div className="py-4 flex justify-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded
                    ${pay.status === "Paid" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {pay.status}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Add Payable Modal ── */}
      {showPayableModal && (
        <Modal title="Add Payable" onClose={() => setShowPayableModal(false)}>
          <div className="space-y-4">
            <input placeholder="Vendor" value={payableForm.vendor}
              onChange={(e) => setPayableForm({ ...payableForm, vendor: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Outstanding" value={payableForm.outstanding}
              onChange={(e) => setPayableForm({ ...payableForm, outstanding: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={payableForm.date}
              onChange={(e) => setPayableForm({ ...payableForm, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Remark" value={payableForm.remark}
              onChange={(e) => setPayableForm({ ...payableForm, remark: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Amount" value={payableForm.amount}
              onChange={(e) => setPayableForm({ ...payableForm, amount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <select value={payableForm.paymentMode}
              onChange={(e) => setPayableForm({ ...payableForm, paymentMode: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPayableModal(false)}
                className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={() => { console.log(payableForm); setShowPayableModal(false); }}
                className="px-4 py-2 text-sm bg-[#1e3a8a] text-white rounded-lg">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Purchase Return Modal ── */}
      {purchaseReturnTarget && (
        <PurchaseReturnModal
          invoice={purchaseReturnTarget}
          onClose={() => setPurchaseReturnTarget(null)}
onConfirm={async (data) => {
  try {

    console.log("CONFIRM DATA:", data); // ✅ DEBUG

    const safeItems = data?.items || [];

    const payload = {
      purchase_id: purchaseReturnTarget.id,
      vendor_id: purchaseReturnTarget.vendor_id,

      date: data?.date,

    details: safeItems.map(it => ({
  product_name: it.item, // OK if modal uses 'item'
  qty: it.returnQty,
  price: it.price,
  amount: it.returnQty * it.price
})),

      total_amount: data?.total || 0,
      reason: data?.reason || ""
    };

    console.log("RETURN PAYLOAD:", payload);

    const res = await axios.post(
      "http://localhost:8000/api/purchase-return",
      payload
    );

    if (res.data.success) {
      alert("Purchase Return Created Successfully");
      setPurchaseReturnTarget(null);
      fetchInvoices();
    } else {
      alert(res.data.message || "Error creating return");
    }

  } catch (err) {
    console.error("RETURN ERROR:", err);
    alert("Server Error");
  }
}}
        />
      )}

      {debitNoteTarget && (
        <DebitNoteModal
          invoice={debitNoteTarget}
          onClose={() => setDebitNoteTarget(null)}
      onConfirm={async (data) => {
  try {
    console.log("DEBIT DATA:", data);

   const payload = {
  purchase_id: debitNoteTarget.id,
  vendor_id: debitNoteTarget.vendor_id,

  // ✅ ADD THIS (MAIN FIX)
  details: data.items.map(i => ({
    product_id: i.product_id || null,
    product_name: i.item,
    qty: i.qty,
    price: i.newPrice,
    amount: i.qty * i.newPrice
  })),

  amount: Number(data.debitTotal),
  reason: data.reason || "",
  date: new Date().toISOString()
};

    console.log("DEBIT PAYLOAD:", payload);

    const res = await axios.post(
      "http://localhost:8000/api/debit-note",
      payload
    );

    if (res.data.success) {
      alert("Debit Note Created Successfully");
      setDebitNoteTarget(null);
    } else {
      alert("Error creating debit note");
    }

  } catch (err) {
    console.error("DEBIT ERROR:", err);
    alert("Server Error");
  }
}}
        />
      )}

      {/* ── Payment Modal ── */}
      {paymentTarget && (
        <PaymentModal
          invoice={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onConfirm={handlePayment}
        />
      )}

      {/* ── Invoice Detail Side Panel ── */}
      {selectedInvoice && (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ── Confirm Dialog ── */}
      {confirmTarget && (
        <ConfirmDialog invoice={confirmTarget} onConfirm={handleConfirm} onCancel={() => setConfirmTarget(null)} />
      )}
    </div>
  );
};

export default PurchaseInvoiceList;