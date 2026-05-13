import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSearch, FiCreditCard, FiX } from "react-icons/fi";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import InvoiceDetailPanel from "../../components/InvoiceDetailPanel";
import ActionMenu from "../../components/ActionMenu";
import SalesReturnModal from "../../components/SalesReturnModal";
import CreditNoteModal from "../../components/CreditNoteModal";
import StatusBadge from "../../components/StatusBadge";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const TABS = ["Invoice", "Collection"];

/* ─── Payment Modal (mirrors Purchase PaymentModal) ─── */
const PaymentModal = ({ invoice, onClose, onConfirm }) => {
  const [form, setForm] = useState({
    amount: invoice.amount,
    paymentMode: "Cash",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  const handleSubmit = () => {
    if (!form.amount || !form.date) return;
    onConfirm({
      invoiceId: invoice.id,
      customer_id: invoice.customer_id,
      invoiceNo: invoice.invoiceNo,
      ...form,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-2xl w-96 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Record Collection</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.customerName} · {invoice.invoiceNo}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Mode</label>
            <select
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
            <input
              placeholder="e.g. partial payment, reference no..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

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
            Record Collection
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const SalesInvoiceList = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Invoice");
  const [invoices, setInvoices] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState("");

  // modals
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [salesReturnTarget, setSalesReturnTarget] = useState(null);
  const [creditNoteTarget, setCreditNoteTarget] = useState(null);

  const isInvoice = activeTab === "Invoice";

  useEffect(() => {
    fetchInvoices();
    fetchCollections();
  }, []);

  /* ── Fetch invoices ── */
  const fetchInvoices = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/sales");
      const data = res.data.data || res.data;

      const mapped = (data || []).map((inv) => {
        const customer = inv.client_id || {};
        return {
          id: inv._id,
          client_id: customer._id || inv.client_id?._id || inv.client_id || "",
          customer_id: customer._id || inv.client_id?._id || inv.client_id || "",
          invoiceNo: inv.invoice_no || "",
          invoiceDate: inv.invoice_date || "",
         status: inv.payment_status || inv.status || "Unpaid",
          customerName: (customer.first_name || "") + " " + (customer.last_name || ""),
          companyName: customer.company_name || "Walk-in",
          date: inv.invoice_date
            ? new Date(inv.invoice_date).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              })
            : "",
          amount: inv.total_amount || 0,
          customer: {
            _id: customer._id || "",
            company_name: customer.company_name || "Walk-in",
            gstin: customer.gstin || "",
            phone: customer.phone || "",
            email: customer.email || "",
            address_line1: customer.address_line1 || customer.address || "",
            city: customer.city || "",
            state: customer.state || "",
            pincode: customer.pincode || "",
            place_of_supply: customer.state || "",
            place_of_supply_code: "27",
          },
          shipping: {
            company_name: customer.company_name || "",
            address_line1: customer.address_line1 || customer.address || "",
            city: customer.city || "",
            state: customer.state || "",
            pincode: customer.pincode || "",
            place_of_supply: customer.state || "",
            place_of_supply_code: "27",
          },
          items: (inv.details || []).map((d) => ({
            item: d.product_name || "",
            description: d.product_name || "",
            hsn: d.hsn || "",
            unit: d.unit || "NOS",
            qty: Number(d.qty || 0),
            price: Number(d.price || 0),
            rate: Number(d.price || 0),
            discount: Number(d.discount || 0),
            gstRate: Number(d.gst || 18),
            total: Number(d.amount || 0),
          })),
          pfCharge: 0,
          supplyType: "intrastate",
          total_amount: inv.total_amount || 0,
        };
      });

      setInvoices(mapped);
    } catch (err) {
      console.error("Fetch invoices error:", err);
    }
  };

  /* ── Fetch collections ── */
  const fetchCollections = async () => {
    try {
const res = await axios.get("http://localhost:8000/api/payment-in");
      const data = res.data.data || res.data;

const mapped = (data || []).map((col) => ({
  id: col._id,

  customer: col.client_id?.first_name
    ? `${col.client_id.first_name} ${col.client_id.last_name || ""}`.trim()
    : col.customer_name || "Walk-in",

  refNo: col.payment_no || "-",

  date: col.date
    ? new Date(col.date).toLocaleDateString("en-GB")
    : "-",

  method: col.payment_mode || "-",

  amount: col.amount || 0,

  status: "Received",
}));

      setCollections(mapped);
    } catch (err) {
      console.error("Fetch collections error:", err);
    }
  };

  /* ── Record collection (mirrors handlePayment in Purchase) ── */
  const handleCollection = async (data) => {
    try {
      const payload = {
       customer_id:
  data.customer_id?._id ||
  data.customer_id ||
  data.client_id?._id ||
  data.client_id,
        amount: Number(data.amount || 0),
        payment_mode: data.paymentMode || "Cash",
        remark: data.note || "",
        invoice_ids: [data.invoiceId],
        date: data.date,
      };

      console.log("COLLECTION PAYLOAD:", payload);

      const res = await axios.post(
        "http://localhost:8000/api/payment-in",
        payload
      );

      console.log("COLLECTION RESPONSE:", res.data);

      if (res.data.success) {
        await fetchInvoices();
        await fetchCollections();

        window.dispatchEvent(new Event("collectionUpdated"));

        alert("Collection recorded successfully");
      } else {
        alert(res.data.message || "Failed to record collection");
      }
    } catch (err) {
      console.error("COLLECTION ERROR:", err);
      console.log("SERVER ERROR:", err?.response?.data);
      alert(err?.response?.data?.message || "Failed to record collection");
    } finally {
      setPaymentTarget(null);
    }
  };

  /* ── Filters & totals ── */
  const filteredInvoices = invoices.filter(
    (inv) =>
      (inv.customerName + " " + inv.companyName)
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCollections = collections.filter(
    (col) =>
      col.customer.toLowerCase().includes(search.toLowerCase()) ||
      (col.refNo || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalSales = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCollected = filteredCollections
    .filter((c) => c.status === "Received")
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearch(""); setSelectedInvoice(null); }}
              className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                ${activeTab === tab ? "bg-[#1e3a8a] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {isInvoice ? "Total Sales" : "Total Collected"}
          </p>
          <p className="text-sm font-bold text-green-600 tabular-nums">
            {fmt(isInvoice ? totalSales : totalCollected)}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">

        {/* Search + Add Button */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="relative w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isInvoice ? "Search invoices..." : "Search collections..."}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {isInvoice && (
            <Button
              variant="navy"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => navigate("/sales-invoice")}
            >
              <FiPlus size={14} />
              New Invoice
            </Button>
          )}
        </div>

        {/* ── Invoice Tab ── */}
        {isInvoice && (
          <>
            <div className="grid grid-cols-[60px_1fr_1fr_140px_130px_130px_120px_90px_40px] border-b border-gray-200 bg-gray-50 px-6">
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-center">Sr No</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase">Customer</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase">Company</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase">Invoice No</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase">Date</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-right pr-6">Amount</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-center">Pay</div>
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
                    className={`grid grid-cols-[60px_1fr_1fr_140px_130px_130px_120px_90px_40px] px-6 items-center cursor-pointer transition
                      ${selectedInvoice?.id === inv.id ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <div className="py-4 text-sm text-center text-gray-500">{idx + 1}</div>
                    <div className="py-4 text-sm font-semibold text-gray-800">{inv.customerName}</div>
                    <div className="py-4 text-sm text-gray-500">{inv.companyName}</div>
                    <div className="py-4 text-sm text-gray-500 font-mono">{inv.invoiceNo}</div>
                    <div className="py-4 text-sm text-gray-500">{inv.date}</div>
                    <div className="py-4 text-sm text-right pr-6 font-semibold">{fmt(inv.amount)}</div>
                    <div className="py-4 flex justify-center">
                      <StatusBadge status={inv.status} />
                    </div>

                    {/* Pay button */}
                    <div className="py-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setPaymentTarget(inv)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#1e3a8a] text-[11px] font-semibold text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition"
                      >
                        <FiCreditCard size={11} />
                        Pay
                      </button>
                    </div>

                    <div className="py-4 flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        type="sales"
                        invoice={inv}
                        onEdit={() => navigate(`/sales-invoice/${inv.id}/edit`)}
                        onSalesReturn={() => setSalesReturnTarget(inv)}
                        onCreditNote={() => setCreditNoteTarget(inv)}
                        onDelete={() => console.log("delete", inv.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Collection Tab (mirrors Purchase Payments tab exactly) ── */}
        {!isInvoice && (
          <>
            <div className="grid grid-cols-[1fr_130px_130px_110px_130px_100px] border-b border-gray-200 bg-gray-50 px-6">
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref No</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-6">Amount</div>
              <div className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</div>
            </div>

            {filteredCollections.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No collections found.</p>
            )}

            {filteredCollections.map((col, idx) => (
              <div
                key={col.id}
                className={`grid grid-cols-[1fr_130px_130px_110px_130px_100px] px-6 items-center hover:bg-gray-50 transition-colors
                  ${idx !== filteredCollections.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="py-4 text-sm font-medium text-gray-800">{col.customer}</div>
                <div className="py-4 text-sm font-mono text-gray-500">{col.refNo}</div>
                <div className="py-4 text-sm text-gray-500">{col.date}</div>
                <div className="py-4 text-sm text-gray-500">{col.method}</div>
                <div className="py-4 text-sm font-semibold text-gray-800 text-right pr-6 tabular-nums">{fmt(col.amount)}</div>
                <div className="py-4 flex justify-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded
                    ${col.status === "Received" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {col.status}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Payment Modal ── */}
      {paymentTarget && (
        <PaymentModal
          invoice={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onConfirm={handleCollection}
        />
      )}

      {/* ── Invoice Detail Side Panel ── */}
      {selectedInvoice && (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ── Sales Return Modal ── */}
      {salesReturnTarget && (
        <SalesReturnModal
          invoice={salesReturnTarget}
          onClose={() => setSalesReturnTarget(null)}
          onConfirm={async (data) => {
            try {
              const payload = {
                sales_id: salesReturnTarget._id || salesReturnTarget.id,
                client_id:
                  salesReturnTarget.customer?._id ||
                  salesReturnTarget.client_id ||
                  salesReturnTarget.customer_id,
                date: data.date,
                details: (data.items || [])
                  .map((it) => {
                    const qty = Number(it.returnQty);
                    const price = Number(it.price) || 0;
                    if (!qty || qty <= 0) return null;
                    return { product_id: it.product_id || null, product_name: it.item, qty, price, amount: qty * price };
                  })
                  .filter(Boolean),
                total_amount: data.total || 0,
                reason: data.reason || "",
              };

              const res = await axios.post("http://localhost:8000/api/sales-return", payload);
              if (res.data.success) {
                alert("Sales Return Created Successfully");
                setSalesReturnTarget(null);
                fetchInvoices();
              } else {
                alert(res.data.message || "Error creating sales return");
              }
            } catch (err) {
              console.error("SALES RETURN ERROR:", err);
              alert("Server Error");
            }
          }}
        />
      )}

      {/* ── Credit Note Modal ── */}
      {creditNoteTarget && (
        <CreditNoteModal
          invoice={{
            invoiceNo: creditNoteTarget.invoiceNo,
            customer: creditNoteTarget.customerName,
            date: creditNoteTarget.date,
            items: creditNoteTarget.items.map((it) => ({
              item: it.item, code: it.code, qty: it.qty, price: it.price,
            })),
          }}
          onClose={() => setCreditNoteTarget(null)}
          onConfirm={async (data) => {
            try {
              const payload = {
                sales_id: creditNoteTarget.id,
                customer_id: creditNoteTarget.customer_id,
                date: new Date(),
                details: (data.items || []).map((it) => ({
                  product_name: it.item, qty: it.qty, price: it.newPrice, amount: it.qty * it.newPrice,
                })),
                amount: data.creditTotal,
                reason: "Credit Adjustment",
              };

              const res = await axios.post("http://localhost:8000/api/credit-note", payload);
              if (res.data.success) {
                alert("Credit Note Created Successfully");
                setCreditNoteTarget(null);
                fetchInvoices();
              } else {
                alert(res.data.message || "Error creating credit note");
              }
            } catch (err) {
              console.error("CREDIT NOTE ERROR:", err);
              alert("Server Error");
            }
          }}
        />
      )}
    </div>
  );
};

export default SalesInvoiceList;