import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiDownload, FiShare2 } from "react-icons/fi";
import { HiOutlineDocumentText } from "react-icons/hi";
import { TbReportAnalytics } from "react-icons/tb";

const indianStates = [
  { code: "01", name: "Jammu & Kashmir" }, { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" }, { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" }, { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" }, { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" }, { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" }, { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" }, { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" }, { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" }, { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" }, { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" }, { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" }, { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" }, { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" }, { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" }, { code: "34", name: "Puducherry" },
  { code: "36", name: "Telangana" }, { code: "37", name: "Andhra Pradesh" },
];

const businessTypes = ["Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "OPC", "Trust", "HUF", "Other"];
const customerTypes = ["Regular", "Composition", "Consumer", "Overseas", "SEZ", "Deemed Export"];

const validateGST = (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
const validatePAN = (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
const validateEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePhone = (v) => !v || /^[6-9][0-9]{9}$/.test(v);
const validatePincode = (v) => !v || /^[1-9][0-9]{5}$/.test(v);
const getInitials = (name) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const fmtCurrency = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// ─── Sample Data ────────────────────────────────────────────────────────────
const sampleCustomer = {
  customer_name: "Rahul Sharma",
  company_name: "Ganesh Footwear",
  customer_type: "Regular",
  business_type: "Private Limited",
  customer_gstin: "27AABCU9603R1ZX",
  customer_pan: "AABCU9603R",
  customer_phone: "9920164759",
  customer_alt_phone: "9123456780",
  customer_email: "rahul@ganeshfootwear.com",
  customer_website: "https://www.ganeshfootwear.com",
  customer_address_line1: "Thakkar Bappa Colony",
  customer_address_line2: "Near Bus Depot",
  customer_city: "Mumbai",
  customer_state: "Maharashtra",
  customer_state_code: "27",
  customer_pincode: "400071",
  same_as_billing: false,
  shipping_address_line1: "Plot 45, MIDC Industrial Area",
  shipping_address_line2: "Andheri East",
  shipping_city: "Mumbai",
  shipping_state: "Maharashtra",
  shipping_state_code: "27",
  shipping_pincode: "400093",
};

const sampleTransactions = [
  {
    id: "INV-00632", type: "invoice", date: "06/03/2026",
    invoiceAmt: 18000, paidAmt: 0, outstanding: 18000, status: "Unpaid",
    items: [{ name: "S Rocky", bags: "1×120", qty: 120, price: 150, total: 18000 }],
  },
  {
    id: "PAY-001", type: "payment", date: "02/03/2026",
    amount: 100000, method: "UPI", account: "Falak Traders",
  },
  {
    id: "INV-00595", type: "invoice", date: "28/02/2026",
    invoiceAmt: 17400, paidAmt: 0, outstanding: 17400, status: "Completed",
    items: [{ name: "Skechers", bags: "1×120", qty: 120, price: 145, total: 17400 }],
  },
  {
    id: "INV-00553", type: "invoice", date: "23/02/2026",
    invoiceAmt: 43800, paidAmt: 0, outstanding: 43800, status: "Completed",
    items: [
      { name: "Nike Air", bags: "1×60", qty: 60, price: 380, total: 22800 },
      { name: "Adidas Run", bags: "1×60", qty: 60, price: 350, total: 21000 },
    ],
  },
  {
    id: "INV-00544", type: "invoice", date: "21/02/2026",
    invoiceAmt: 17400, paidAmt: 0, outstanding: 17400, status: "Completed",
    items: [{ name: "Puma Flex", bags: "1×120", qty: 120, price: 145, total: 17400 }],
  },
  {
    id: "PAY-002", type: "payment", date: "18/02/2026",
    amount: 50000, method: "NEFT", account: "HDFC Bank",
  },
  {
    id: "INV-00539", type: "invoice", date: "19/02/2026",
    invoiceAmt: 21750, paidAmt: 0, outstanding: 21750, status: "Completed",
    items: [{ name: "Bata Casual", bags: "1×150", qty: 150, price: 145, total: 21750 }],
  },
  {
    id: "INV-00528", type: "invoice", date: "18/02/2026",
    invoiceAmt: 10800, paidAmt: 0, outstanding: 10800, status: "Completed",
    items: [{ name: "Woodland Trek", bags: "1×60", qty: 60, price: 180, total: 10800 }],
  },
];

const totalOutstanding = sampleTransactions
  .filter(t => t.type === "invoice")
  .reduce((sum, t) => sum + t.outstanding, 0);

// ─── Shared Styles ───────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #cbd5e1",   // darker border
  borderRadius: "8px",
  fontSize: "13.5px",
  color: "#0f172a",                // darker text
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "#111827", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", readOnly }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
      style={{ ...inputStyle, cursor: readOnly ? "not-allowed" : "text" }}
      onFocus={(e) => { if (!readOnly) e.target.style.borderColor = "#3b82f6"; }}
      onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={onChange} style={{ ...inputStyle, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Section({ title, icon, children }) {
  return (
   <div style={{
  background: "#ffffff",
  borderRadius: "12px",
  border: "1.5px solid #cbd5e1",   // darker
  overflow: "hidden",
  marginBottom: "20px"
}}>
      <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "15px" }}>{icon}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#374151", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function CharBoxInput({ value, onChange, length, numericOnly = false }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {Array.from({ length }).map((_, index) => (
        <input key={index} maxLength={1} value={value[index] || ""}
          onChange={(e) => {
            const raw = numericOnly ? e.target.value.replace(/[^0-9]/g, "") : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const newVal = value.substring(0, index) + raw + value.substring(index + 1);
            onChange(newVal);
            if (raw && e.target.nextSibling) e.target.nextSibling.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[index] && e.target.previousSibling) e.target.previousSibling.focus();
            if (e.key === "ArrowLeft" && e.target.previousSibling) { e.preventDefault(); e.target.previousSibling.focus(); }
            if (e.key === "ArrowRight" && e.target.nextSibling) { e.preventDefault(); e.target.nextSibling.focus(); }
          }}
          style={{ width: "32px", height: "36px", textAlign: "center", fontSize: "14px", fontWeight: 600, border: "1.5px solid #d1d5db", borderRadius: "6px", outline: "none", background: "#fff", color: "#111827" }}
          onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; }}
          onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; }}
        />
      ))}
    </div>
  );
}

function ErrorMsg({ field, errors }) {
  if (!errors[field]) return null;
  return <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>{errors[field]}</span>;
}



// ─── Invoice Card ─────────────────────────────────────────────────────────────
function InvoiceCard({ txn }){
  const statusColor =
    txn.status === "Unpaid"
      ? { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" }
      : { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" };

  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #cbd5e1",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "12px",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "14px 20px",
          background: "#f1f5f9",
          borderBottom: "1.5px solid #cbd5e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left Side */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
         

          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1e40af",
              }}
            >
              {txn.date}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              {txn.id}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11.5px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "20px",
              background: statusColor.bg,
              color: statusColor.text,
              border: `1px solid ${statusColor.border}`,
            }}
          >
            {txn.status}
          </span>

          <button
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1.5px solid #e5e7eb",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#1e40af",
            }}
          >
            <FiDownload size={14} />
          </button>

          <button
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1.5px solid #e5e7eb",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#1e40af",
            }}
          >
            <FiShare2 size={14} />
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ padding: "12px 16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              {["Item", "Bags", "Qty", "Price", "Total"].map((h) => (
                <th
                  key={h}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "6px 8px",
                    textAlign: h === "Item" ? "left" : "right",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {txn.items.map((item, i) => (
              <tr
                key={i}
                style={{
                  borderBottom:
                    i < txn.items.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <td
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#111827",
                    padding: "8px 8px",
                  }}
                >
                  {item.name}
                </td>

                <td
                  style={{
                    fontSize: "13px",
                    color: "#374151",
                    padding: "8px 8px",
                    textAlign: "right",
                  }}
                >
                  {item.bags}
                </td>

                <td
                  style={{
                    fontSize: "13px",
                    color: "#374151",
                    padding: "8px 8px",
                    textAlign: "right",
                  }}
                >
                  {item.qty}
                </td>

                <td
                  style={{
                    fontSize: "13px",
                    color: "#374151",
                    padding: "8px 8px",
                    textAlign: "right",
                  }}
                >
                  ₹{item.price}
                </td>

                <td
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#16a34a",
                    padding: "8px 8px",
                    textAlign: "right",
                  }}
                >
                  ₹{item.total.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Section */}
        <div
          style={{
            borderTop: "1.5px solid #e5e7eb",
            marginTop: "8px",
            paddingTop: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "20px" }}>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                }}
              >
                Invoice Amt
              </div>

              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {fmtCurrency(txn.invoiceAmt)}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                }}
              >
                Paid
              </div>

              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#16a34a",
                }}
              >
                {fmtCurrency(txn.paidAmt)}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
              }}
            >
              Outstanding
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: txn.outstanding > 0 ? "#dc2626" : "#16a34a",
              }}
            >
              {fmtCurrency(txn.outstanding)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Card ─────────────────────────────────────────────────────────────
function PaymentCard({ txn }) {
  return (
    <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e40af" }}>{txn.date}</div>
        <div style={{ fontSize: "12.5px", color: "#374151", marginTop: "3px" }}>
          <span style={{ fontWeight: 600 }}>{txn.method}</span>
          <span style={{ color: "#6b7280" }}> · In account </span>
          <span style={{ fontWeight: 600 }}>{txn.account}</span>
        </div>
      </div>
      <div style={{ fontSize: "17px", fontWeight: 800, color: "#16a34a" }}>
        − ₹{txn.amount.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────
function ProfileView({ c, onEdit, onBack }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [selectedInvoices, setSelectedInvoices] = useState([]);




  const toggleInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };
    const filtered = sampleTransactions.filter((t) => {
    const matchSearch =
      !search || t.id?.toLowerCase().includes(search.toLowerCase());

    if (activeTab === "invoices") return t.type === "invoice" && matchSearch;
    if (activeTab === "payments") return t.type === "payment" && matchSearch;

    return matchSearch;
  });



  return (
    <div style={{ width: "100%" }}>

      {/* ── Top Action Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button type="button" onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            <FiArrowLeft size={15} /> Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1e3a5f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 800, flexShrink: 0, letterSpacing: "0.05em" }}>
              {getInitials(c.customer_name)}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0b1324" }}>{c.customer_name}</h1>
              {c.company_name && <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>{c.company_name}</p>}
            </div>
          </div>
        </div>
        <button onClick={onEdit} style={{ padding: "11px 28px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13.5px", fontWeight: 700, color: "#fff", cursor: "pointer" }}>
          Edit Customer
        </button>
      </div>

      {/* ── Store Info + Outstanding Card ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Store Info */}
        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "20px 24px" }}>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0b1324", marginBottom: "10px" }}>
            Store Name: {c.company_name}
          </div>
          <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.8" }}>
            <div>Email: <span style={{ color: "#6b7280" }}>{c.customer_email || "—"}</span></div>
            <div>Contact: <span style={{ color: "#6b7280" }}>{c.customer_phone}</span></div>
            <div>Address: <span style={{ color: "#6b7280" }}>{c.customer_address_line1}, {c.customer_city} {c.customer_pincode}</span></div>
          </div>
        </div>

        {/* Outstanding */}
        <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Total Outstanding</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#dc2626", letterSpacing: "-0.5px" }}>
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </div>
          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
              {sampleTransactions.filter(t => t.type === "invoice" && t.outstanding > 0).length} unpaid invoices
            </span>
          </div>
        </div>
      </div>

      {/* ── Invoices & Payments Section ── */}
      <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>

        {/* Section Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0b1324" }}>Invoices &amp; Payments</h2>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <FiSearch size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{ paddingLeft: "30px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", outline: "none", width: "180px", color: "#374151" }}
              />
            </div>

            {/* Action Buttons */}
            <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "8px", background: "#0ea5e9", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              <TbReportAnalytics size={15} /> Sales Reports
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "8px", background: "#0ea5e9", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              <HiOutlineDocumentText size={15} /> Receipts
            </button>
          
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0", borderBottom: "1.5px solid #e5e7eb", padding: "0 20px" }}>
          {[["all", "All"], ["invoices", "Invoices"], ["payments", "Payments"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: "10px 18px", border: "none", borderBottom: activeTab === key ? "2.5px solid #1e3a5f" : "2.5px solid transparent", background: "none", fontSize: "13px", fontWeight: activeTab === key ? 700 : 500, color: activeTab === key ? "#1e3a5f" : "#6b7280", cursor: "pointer", marginBottom: "-1.5px" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Transaction Cards */}
<div style={{ padding: "20px" }}>

 
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "14px" }}>No transactions found</div>
          )}
          {filtered.map(t =>
            t.type === "invoice"
              ? <InvoiceCard
  key={t.id}
  txn={t}
  checked={selectedInvoices.includes(t.id)}
  onToggle={() => toggleInvoice(t.id)}
/>
              : <PaymentCard key={t.id} txn={t} />
          )}
        </div>
      </div>

     

    

    </div>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────
function EditForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState({ ...customer });
  const [errors, setErrors] = useState({});

  const update = (field, val) => {
    if (field === "customer_state") {
      const st = indianStates.find((s) => s.name === val);
      setForm((f) => ({ ...f, customer_state: val, customer_state_code: st ? st.code : f.customer_state_code }));
    } else if (field === "shipping_state") {
      const st = indianStates.find((s) => s.name === val);
      setForm((f) => ({ ...f, shipping_state: val, shipping_state_code: st ? st.code : f.shipping_state_code }));
    } else {
      setForm((f) => ({ ...f, [field]: val }));
    }
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = "Customer name is required";
    if (form.customer_gstin.length === 15 && !validateGST(form.customer_gstin)) e.customer_gstin = "Invalid GSTIN format";
    if (form.customer_pan.length === 10 && !validatePAN(form.customer_pan)) e.customer_pan = "Invalid PAN format";
    if (!validatePhone(form.customer_phone)) e.customer_phone = "Invalid mobile number";
    if (!validateEmail(form.customer_email)) e.customer_email = "Invalid email address";
    if (!form.customer_address_line1.trim()) e.customer_address_line1 = "Address is required";
    if (!form.customer_city.trim()) e.customer_city = "City is required";
    if (!form.customer_state) e.customer_state = "State is required";
    if (!validatePincode(form.customer_pincode)) e.customer_pincode = "Invalid pincode";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0b1324" }}>Edit Customer</h1>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>Update customer record</p>
        </div>
      </div>

      <Section title="Basic Information" icon="🏢">
        <div style={grid2}>
          <Field label="Customer Name" required>
            <TextInput value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Rahul Sharma" />
            <ErrorMsg field="customer_name" errors={errors} />
          </Field>
          <Field label="Company Name">
            <TextInput value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="ABC Industries Pvt Ltd" />
          </Field>
          <Field label="Customer Type">
            <SelectInput value={form.customer_type} onChange={(e) => update("customer_type", e.target.value)} placeholder="Select Type" options={customerTypes.map(t => ({ value: t, label: t }))} />
          </Field>
          <Field label="Business Type">
            <SelectInput value={form.business_type} onChange={(e) => update("business_type", e.target.value)} placeholder="Select Business Type" options={businessTypes.map(t => ({ value: t, label: t }))} />
          </Field>
        </div>
      </Section>

      <Section title="Tax & Identity" icon="📋">
        <div style={grid2}>
          <Field label="GSTIN">
            <CharBoxInput value={form.customer_gstin} onChange={(v) => update("customer_gstin", v)} length={15} />
            {form.customer_gstin.length === 15 && (
              <button type="button" onClick={() => update("customer_pan", form.customer_gstin.substring(2, 12))}
                style={{ marginTop: "6px", background: "none", border: "none", color: "#3b82f6", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                Auto-fill PAN from GSTIN
              </button>
            )}
            <ErrorMsg field="customer_gstin" errors={errors} />
          </Field>
          <Field label="PAN">
            <CharBoxInput value={form.customer_pan} onChange={(v) => update("customer_pan", v)} length={10} />
            <ErrorMsg field="customer_pan" errors={errors} />
          </Field>
        </div>
      </Section>

      <Section title="Contact Details" icon="📞">
        <div style={grid2}>
          <Field label="Mobile Number" required>
            <CharBoxInput value={form.customer_phone} onChange={(v) => update("customer_phone", v)} length={10} numericOnly />
            <ErrorMsg field="customer_phone" errors={errors} />
          </Field>
          <Field label="Alternate Mobile">
            <CharBoxInput value={form.customer_alt_phone} onChange={(v) => update("customer_alt_phone", v)} length={10} numericOnly />
          </Field>
          <Field label="Email Address">
            <TextInput type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} placeholder="billing@company.com" />
            <ErrorMsg field="customer_email" errors={errors} />
          </Field>
          <Field label="Website">
            <TextInput value={form.customer_website} onChange={(e) => update("customer_website", e.target.value)} placeholder="https://www.company.com" />
          </Field>
        </div>
      </Section>

      <Section title="Billing Address" icon="📍">
        <div style={grid2}>
          <Field label="Address Line 1" required>
            <TextInput value={form.customer_address_line1} onChange={(e) => update("customer_address_line1", e.target.value)} placeholder="Building, Street, Area" />
            <ErrorMsg field="customer_address_line1" errors={errors} />
          </Field>
          <Field label="Address Line 2">
            <TextInput value={form.customer_address_line2} onChange={(e) => update("customer_address_line2", e.target.value)} placeholder="Landmark (optional)" />
          </Field>
          <Field label="City" required>
            <TextInput value={form.customer_city} onChange={(e) => update("customer_city", e.target.value)} placeholder="Mumbai" />
            <ErrorMsg field="customer_city" errors={errors} />
          </Field>
          <Field label="State" required>
            <SelectInput value={form.customer_state} onChange={(e) => update("customer_state", e.target.value)} placeholder="Select State" options={indianStates.map(s => ({ value: s.name, label: s.name }))} />
            <ErrorMsg field="customer_state" errors={errors} />
          </Field>
          <Field label="State Code">
            <TextInput value={form.customer_state_code} readOnly onChange={() => {}} placeholder="27" />
          </Field>
          <Field label="Pincode" required>
            <TextInput value={form.customer_pincode} onChange={(e) => update("customer_pincode", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="400001" />
            <ErrorMsg field="customer_pincode" errors={errors} />
          </Field>
        </div>
      </Section>

   

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "40px" }}>
        <button type="button" onClick={onCancel}
          style={{ padding: "11px 28px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#f8fafc", fontSize: "13.5px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
          Cancel
        </button>
        <button type="button" onClick={handleSave}
          style={{ padding: "11px 28px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13.5px", fontWeight: 700, color: "#fff", cursor: "pointer" }}>
          💾 Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CustomerProfile() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("profile");
  const [customer, setCustomer] = useState(sampleCustomer);
  const [toast, setToast] = useState(false);

  const handleSave = (updated) => {
    setCustomer(updated);
    setMode("profile");
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div style={{ width: "100%" }}>
      {toast && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", padding: "10px 16px" }}>
            <span style={{ fontSize: "16px" }}>✅</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a" }}>Customer saved successfully!</span>
          </div>
        </div>
      )}
      {mode === "profile"
        ? <ProfileView c={customer} onEdit={() => setMode("edit")} onBack={() => navigate(-1)} />
        : <EditForm customer={customer} onSave={handleSave} onCancel={() => setMode("profile")} />
      }
    </div>
  );
}