import { useNavigate } from "react-router-dom";
import { FiPlus, FiX, FiCheckCircle, FiTruck } from "react-icons/fi";
import { useState } from "react";
import Table from "../../components/Table";
import Button from "../../components/Button";

const initialInvoices = [
  { id: 1, number: "INV-1004", client: "AlphaWorks Ltd", amount: "$2510.00", dueDate: "Sep 30, 2025", status: "Unpaid", ewayBill: null },
  { id: 2, number: "INV-1005", client: "BetaForge Inc", amount: "$1855.00", dueDate: "Sep 30, 2025", status: "Unpaid", ewayBill: null },
  { id: 3, number: "INV-1002", client: "John", amount: "$5426.33", dueDate: "Sep 11, 2025", status: "Paid", ewayBill: null },
];

const transportModes = ["Road", "Rail", "Air", "Ship"];

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#111827",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  cursor: "pointer",
};

const Field = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "#374151", textTransform: "uppercase" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const Err = ({ field, errors }) =>
  errors[field]
    ? (
        <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "2px" }}>
          {errors[field]}
        </span>
      )
    : null;

// ─── E-Way Bill Modal ────────────────────────────────────────────────────────
function EWayBillModal({ invoice, onClose, onGenerate }) {
  const [form, setForm] = useState({
    ewayBillNo: "", ewayBillDate: "", ewayValidUpto: "",
    transportMode: "Road", vehicleNo: "", transporterName: "",
  });
  const [errors, setErrors] = useState({});

  const update = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.ewayBillNo.trim()) e.ewayBillNo = "E-Way Bill No. is required";
    if (!form.ewayBillDate) e.ewayBillDate = "E-Way Bill Date is required";
    if (!form.ewayValidUpto) e.ewayValidUpto = "Valid Upto date is required";
    if (!form.vehicleNo.trim()) e.vehicleNo = "Vehicle No. is required";
    return e;
  };

  const handleGenerate = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onGenerate(invoice.id, { ...form, generatedAt: new Date().toISOString() });
  };



  const inp = (field) => ({ ...inputStyle, borderColor: errors[field] ? "#ef4444" : "#e5e7eb" });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, width: "min(520px, 95vw)", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1.5px solid #e5e7eb", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiTruck size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#0b1324" }}>E-Way Bill Details</div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", marginTop: "1px" }}>{invoice.number} · {invoice.client}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f3f4f6", borderRadius: "8px", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
            <FiX size={16} />
          </button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Field label="E-Way Bill No." required>
            <input value={form.ewayBillNo} onChange={(e) => update("ewayBillNo", e.target.value)} placeholder="e.g. 331234567890"
              style={{ ...inp("ewayBillNo"), fontFamily: "monospace" }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = errors.ewayBillNo ? "#ef4444" : "#e5e7eb"} />
<Err field="ewayBillNo" errors={errors} />          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Field label="E-Way Bill Date" required>
              <input type="date" value={form.ewayBillDate} onChange={(e) => update("ewayBillDate", e.target.value)} style={inp("ewayBillDate")}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = errors.ewayBillDate ? "#ef4444" : "#e5e7eb"} />
              <Err field="ewayBillDate" errors={errors} />
            </Field>
            <Field label="Valid Upto" required>
              <input type="date" value={form.ewayValidUpto} onChange={(e) => update("ewayValidUpto", e.target.value)} style={inp("ewayValidUpto")}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = errors.ewayValidUpto ? "#ef4444" : "#e5e7eb"} />
              <Err field="ewayValidUpto" errors={errors} />
            </Field>
          </div>
          <Field label="Transport Mode">
            <select value={form.transportMode} onChange={(e) => update("transportMode", e.target.value)} style={selectStyle}>
              {transportModes.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Vehicle No." required>
            <input value={form.vehicleNo} onChange={(e) => update("vehicleNo", e.target.value.toUpperCase())} placeholder="MH12AB1234"
              style={{ ...inp("vehicleNo"), fontFamily: "monospace" }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = errors.vehicleNo ? "#ef4444" : "#e5e7eb"} />
            <Err field="vehicleNo" errors={errors} />
          </Field>
          <Field label="Transporter Name">
            <input value={form.transporterName} onChange={(e) => update("transporterName", e.target.value)} placeholder="e.g. Blue Dart Logistics"
              style={inputStyle} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = "#e5e7eb"} />
          </Field>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1.5px solid #e5e7eb", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleGenerate} style={{ padding: "10px 24px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiTruck size={14} /> Save E-Way Bill
          </button>
        </div>
      </div>
    </>
  );
}

// ─── E-Way Bill Button ───────────────────────────────────────────────────────
function EWayBillButton({ invoice, onOpen }) {
  if (invoice.ewayBill) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: "#f0fdf4", border: "1.5px solid #86efac", fontSize: "12px", fontWeight: 700, color: "#16a34a", whiteSpace: "nowrap" }}>
        <FiCheckCircle size={13} /> E-Way 
      </div>
    );
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); onOpen(invoice); }}
      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: "#eff6ff", border: "1.5px solid #bfdbfe", fontSize: "12px", fontWeight: 700, color: "#1d4ed8", cursor: "pointer", whiteSpace: "nowrap" }}>
      <FiTruck size={13} /> E-Way 
    </button>
  );
}

// ─── Mark as Paid Button ─────────────────────────────────────────────────────
function MarkAsPaidButton({ invoice, onMarkPaid }) {
  const isPaid = invoice.status === "Paid";
  return (
    <button
      disabled={isPaid}
      onClick={(e) => { e.stopPropagation(); onMarkPaid(invoice.id); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: isPaid ? "default" : "pointer",
        border: isPaid ? "1.5px solid #86efac" : "1.5px solid #fed7aa",
        background: isPaid ? "#f0fdf4" : "#fff7ed",
        color: isPaid ? "#16a34a" : "#ea580c",
        opacity: isPaid ? 0.8 : 1,
        transition: "all 0.2s ease",
      }}
    >
      <FiCheckCircle size={13} />
      {isPaid ? "Paid" : "Mark as Paid"}
    </button>
  );
}

// ─── Main Invoices Page ──────────────────────────────────────────────────────


const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [ewayModal, setEwayModal] = useState(null);

  const handleDelete = (invoice) => {
    setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
  };

  const handleMarkPaid = (invoiceId) => {
    setInvoices((prev) =>
      prev.map((inv) => inv.id === invoiceId ? { ...inv, status: "Paid" } : inv)
    );
  };

  const handleGenerateEway = (invoiceId, ewayData) => {
    setInvoices((prev) =>
      prev.map((inv) => inv.id === invoiceId ? { ...inv, ewayBill: ewayData } : inv)
    );
    setEwayModal(null);
  };
const columns = [
  { key: "number", label: "Invoice #" },
  { key: "client", label: "Client" },
  { key: "amount", label: "Amount" },
  { key: "dueDate", label: "Due Date" },

  {
    key: "status",
    label: "Status",
    render: (_, row) => (
      <MarkAsPaidButton
        invoice={row}
        onMarkPaid={handleMarkPaid}
      />
    ),
  },

  {
    key: "ewayBill",
    label: "E-Way Bill",
    render: (_, row) => (
      <EWayBillButton invoice={row} onOpen={setEwayModal} />
    ),
  },
];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">All Invoices</h1>
          <p className="text-sm text-gray-400">Manage all your invoices in one place.</p>
        </div>
        <Button variant="navy" size="md" className="flex items-center gap-2" onClick={() => navigate("/sales-invoice")}>
          <FiPlus size={16} /> Create Invoice
        </Button>
      </div>

      <Table
        columns={columns}
        data={invoices}
        searchPlaceholder="Search invoices..."
        onRowClick={(row) => navigate(`/invoice/${row.id}`)}
        onDelete={handleDelete}
      
      />

      {ewayModal && (
        <EWayBillModal
          invoice={ewayModal}
          onClose={() => setEwayModal(null)}
          onGenerate={handleGenerateEway}
        />
      )}
    </div>
  );
};

export default Invoices;