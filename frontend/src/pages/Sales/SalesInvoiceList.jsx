import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSearch } from "react-icons/fi";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import InvoiceDetailPanel from "../../components/InvoiceDetailPanel";
import { FiCreditCard } from "react-icons/fi";
import ActionMenu from "../../components/ActionMenu";
import SalesReturnModal from "../../components/SalesReturnModal";
import CreditNoteModal from "../../components/CreditNoteModal";

/* ── Data ── */








const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const TABS = ["Invoice", "Collection"];


/* ─── Main Page ─── */
const SalesInvoiceList = () => {
  const [salesReturnTarget, setSalesReturnTarget] = useState(null);
const [creditNoteTarget, setCreditNoteTarget] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);


  useEffect(() => {
  fetchInvoices();
   fetchCollections();
}, []);

const fetchInvoices = async () => {
  try {
    const res = await axios.get("http://localhost:8000/api/sales");

    console.log("API RESPONSE:", res.data); // 🔍 DEBUG

    const data = res.data.data || res.data; // handle both cases

    const mapped = (data || []).map((inv) => ({
      id: inv._id,
      customer_id: inv.client_id?._id,
      invoiceNo: inv.invoice_no,
  customerName: inv.client_id
  ? `${inv.client_id.first_name || ""} ${inv.client_id.last_name || ""}`.trim()
  : "Walk-in",

companyName: inv.client_id?.company_name || "",
      date: inv.invoice_date?.split("T")[0],
      amount: inv.total_amount,
      confirmed: inv.status === "Paid",

      items: (inv.details || []).map(d => ({
        item: d.product_name,
        qty: d.qty,
        price: d.price,
        total: d.amount,
      })),
    }));

    setInvoices(mapped);

  } catch (err) {
    console.error("Fetch invoices error:", err);
  }
};

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Invoice");
 const [invoices, setInvoices] = useState([]);
 const [collections, setCollections] = useState([]);
const [selectedInvoice, setSelectedInvoice] = useState(null);
 const [search, setSearch] = useState("");

const [showCollectionModal, setShowCollectionModal] = useState(false);

const [collectionForm, setCollectionForm] = useState({
  customer: "",
  date: "",
  remark: "",
  amount: "",
  paymentMode: "Cash",
});
  const isInvoice = activeTab === "Invoice";



 const filteredInvoices = invoices.filter(
  (inv) =>
    (inv.customerName + " " + inv.companyName)
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    inv.invoiceNo.toLowerCase().includes(search.toLowerCase())
);

const fetchCollections = async () => {
  try {
    const res = await axios.get("http://localhost:8000/api/collections");

    const data = res.data.data || res.data;

    const mapped = (data || []).map((col) => ({
      id: col._id,
      customer: col.customer_name || "Walk-in",
      date: col.date?.split("T")[0],
      remark: col.remark,
      amount: col.amount,
      paymentMode: col.payment_method,
      status: col.status || "Received",
    }));

    setCollections(mapped);

  } catch (err) {
    console.error("Fetch collections error:", err);
  }
};

const filteredCollections = collections.filter(
  (col) =>
    col.customer.toLowerCase().includes(search.toLowerCase()) ||
    col.remark?.toLowerCase().includes(search.toLowerCase())
);
  const totalSales = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCollected = collections
    .filter((c) => c.status === "Received")
    .reduce((s, c) => s + c.amount, 0);

    
  return (
    <div className="space-y-5">



      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">

  {/* Tabs */}
  <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
    {TABS.map((tab) => (
      <button
        key={tab}
        onClick={() => {
          setActiveTab(tab);
          setSearch("");
        
        }}
        className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all duration-150
        ${activeTab === tab ? "bg-[#1e3a8a] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
      >
        {tab}
      </button>
    ))}
  </div>

  {/* Total Card */}
  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
      {isInvoice ? "Total Sales" : "Total Collected"}
    </p>

    <p className="text-sm font-bold text-green-600 tabular-nums">
      {fmt(isInvoice ? totalSales : totalCollected)}
    </p>
  </div>

</div>

      {/* Table Container */}
   <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">

        {/* Search */}
       <div className="flex items-center justify-between p-5 border-b border-gray-100">

  <div className="relative w-80">
    <FiSearch
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      size={14}
    />

    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder={isInvoice ? "Search invoices..." : "Search collections..."}
      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
    />
  </div>

  <Button
    variant="navy"
    size="sm"
    className="flex items-center gap-2"
    onClick={() =>
      isInvoice
        ? navigate("/sales-invoice")
        : setShowCollectionModal(true)
    }
  >
    <FiPlus size={14} />
    {isInvoice ? "New Invoice" : "Add Collection"}
  </Button>

</div>


  {isInvoice && (
  <>
 <div className="grid grid-cols-[1fr_1fr_140px_130px_130px_120px_90px_40px_40px]  border-b border-gray-200 bg-gray-50 px-6">
  <div className="py-3 text-xs font-semibold text-gray-500 uppercase">Customer</div>
<div className="py-3 text-xs font-semibold text-gray-500 uppercase">Company</div>
<div className="py-3 text-xs font-semibold text-gray-500 uppercase">Invoice No</div>
    <div className="py-3 text-xs font-semibold text-gray-500 uppercase">Date</div>
    <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-right pr-6">Amount</div>
    <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</div>
    <div className="py-3 text-xs font-semibold text-gray-500 uppercase text-center">Pay</div>
<div className="py-3 text-xs font-semibold text-gray-500 uppercase text-center"></div>

  </div>

 



  {filteredInvoices.length === 0 && (
    <p className="text-center text-sm text-gray-400 py-10">
      No invoices found.
    </p>
  )}

  {filteredInvoices.map((inv, idx) => {




    const isLast = idx === filteredInvoices.length - 1;

    return (
      <div
        key={inv.id}
        className={!isLast ? "border-b border-gray-100" : ""}
      >
        <div
          className={`grid grid-cols-[1fr_1fr_140px_130px_130px_120px_90px_40px_40px] px-6 items-center cursor-pointer transition
          ${selectedInvoice?.id === inv.id ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
          onClick={() => setSelectedInvoice(inv)}
        >
  <div className="py-4 text-sm font-semibold text-gray-800">
  {inv.customerName}
</div>

<div className="py-4 text-xs text-gray-500">
  {inv.companyName}
</div>

          <div className="py-4 text-sm text-gray-500 font-mono">
            {inv.invoiceNo}
          </div>

          <div className="py-4 text-sm text-gray-500">
            {inv.date}
          </div>

          <div className="py-4 text-sm text-right pr-6 font-semibold">
            {fmt(inv.amount)}
          </div>

          <div className="py-4 flex justify-center">
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold
              ${inv.confirmed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              {inv.confirmed ? "Paid" : "Pending"}
            </span>
          </div>

{/* PAY BUTTON */}
<div
  className="py-4 flex justify-center"
  onClick={(e) => e.stopPropagation()}
>
  <button
    onClick={() => setPaymentTarget(inv)}
    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#1e3a8a] text-[11px] font-semibold text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition"
  >
    <FiCreditCard size={11} />
    Pay
  </button>
</div>

<div
  className="py-4 flex justify-center"
  onClick={(e) => e.stopPropagation()}
>
<ActionMenu
  type="sales"   // 👈 IMPORTANT
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

{!isInvoice && (
  <>
    {filteredCollections.length === 0 && (
      <p className="text-center text-sm text-gray-400 py-10">
        No collections found.
      </p>
    )}

    {filteredCollections.map((col, idx) => (
      <div
        key={col.id}
        className={`grid grid-cols-[1fr_130px_1fr_130px_130px_100px] px-6 items-center hover:bg-gray-50 transition-colors ${
          idx !== filteredCollections.length - 1
            ? "border-b border-gray-100"
            : ""
        }`}
      >
        <div className="py-4 text-sm font-medium text-gray-800">
          {col.customer}
        </div>

        <div className="py-4 text-sm text-gray-500">
          {col.date}
        </div>

        <div className="py-4 text-sm text-gray-500">
          {col.remark || "-"}
        </div>

        <div className="py-4 text-sm text-right pr-6 font-semibold">
          {fmt(col.amount)}
        </div>

        <div className="py-4 text-sm text-gray-500">
          {col.paymentMode}
        </div>

        <div className="py-4 flex justify-center">
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
            col.status === "Received"
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}>
            {col.status}
          </span>
        </div>
      </div>
    ))}
  </>
)}
  
</div>


{showCollectionModal && (
  <Modal title="Add Collection" onClose={() => setShowCollectionModal(false)}>

    <div className="space-y-4">

      <input
        placeholder="Customer"
        value={collectionForm.customer}
        onChange={(e) =>
          setCollectionForm({ ...collectionForm, customer: e.target.value })
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />

<input
         placeholder="Outstanding"
        value={collectionForm.outstanding}
        onChange={(e) =>
          setCollectionForm({ ...collectionForm, outstanding: e.target.value })
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      <input
        type="date"
        value={collectionForm.date}
        onChange={(e) =>
          setCollectionForm({ ...collectionForm, date: e.target.value })
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />

      <input
        placeholder="Remark"
        value={collectionForm.remark}
        onChange={(e) =>
          setCollectionForm({ ...collectionForm, remark: e.target.value })
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />

      <input
        type="number"
        placeholder="Amount"
        value={collectionForm.amount}
        onChange={(e) =>
          setCollectionForm({ ...collectionForm, amount: e.target.value })
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />

      <select
        value={collectionForm.paymentMode}
        onChange={(e) =>
          setCollectionForm({
            ...collectionForm,
            paymentMode: e.target.value,
          })
        }
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option>Cash</option>
        <option>UPI</option>
        <option>Bank Transfer</option>
      </select>

      <div className="flex justify-end gap-3 pt-2">

        <button
          onClick={() => setShowCollectionModal(false)}
          className="px-4 py-2 text-sm border rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            console.log(collectionForm);
            setShowCollectionModal(false);
          }}
          className="px-4 py-2 text-sm bg-[#1e3a8a] text-white rounded-lg"
        >
          Save
        </button>

      </div>

    </div>

  </Modal>
)}


{selectedInvoice && (
  <InvoiceDetailPanel
    invoice={selectedInvoice}
    onClose={() => setSelectedInvoice(null)}
  />
)}


{salesReturnTarget && (
  <SalesReturnModal
    invoice={salesReturnTarget}
    onClose={() => setSalesReturnTarget(null)}
    onConfirm={async (data) => {
      try {
        console.log("SALES RETURN DATA:", data);

        const payload = {
          sales_id: salesReturnTarget.id,
          customer_id: salesReturnTarget.customer_id,

          date: data.date,

          details: (data.items || []).map(it => ({
            product_name: it.item,
            qty: it.returnQty,
            price: it.price,
            amount: it.returnQty * it.price
          })),

          total_amount: data.total || 0,
          reason: data.reason || ""
        };

        console.log("SALES RETURN PAYLOAD:", payload);

        const res = await axios.post(
          "http://localhost:8000/api/sales-return",
          payload
        );

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


{creditNoteTarget && (
  <CreditNoteModal
    invoice={{
      invoiceNo: creditNoteTarget.invoiceNo,
      customer: creditNoteTarget.customerName,
      date: creditNoteTarget.date,
      items: creditNoteTarget.items.map((it) => ({
        item: it.item,
        code: it.code,
        qty: it.qty,
        price: it.price
      }))
    }}
    onClose={() => setCreditNoteTarget(null)}
  onConfirm={async (data) => {
  try {
    console.log("CREDIT NOTE DATA:", data);

const payload = {
  sales_id: creditNoteTarget.id,
  customer_id: creditNoteTarget.customer_id,

  // ❌ NO credit_no here

  date: new Date(),

  details: (data.items || []).map((it) => ({
    product_name: it.item,
    qty: it.qty,
    price: it.newPrice,
    amount: it.qty * it.newPrice,
  })),

  amount: data.creditTotal,
  reason: "Credit Adjustment"
};
    console.log("CREDIT NOTE PAYLOAD:", payload);

    const res = await axios.post(
      "http://localhost:8000/api/credit-note",
      payload
    );

    if (res.data.success) {
      alert("Credit Note Created Successfully");

      setCreditNoteTarget(null);

      // 🔥 OPTIONAL: refresh list
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
} 

export default SalesInvoiceList;