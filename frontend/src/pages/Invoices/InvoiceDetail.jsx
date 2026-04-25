import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiPrinter, FiShare2, FiArrowLeft,  FiDownload } from "react-icons/fi";
import Logo from "../../assets/logo.svg";

// ─── Mock Data ─────────────────────────────────────────────────────────────
const mockInvoices = [
  {
    id: 1,
    invoiceNo: "INV-1004",
    invoiceDate: "2025-09-15",
    invoiceType: "Tax Invoice",
    customerType: "B2B", 
    poNumber: "PO-88421",
    deliveryMode: "By Road",
    supplyType: "Outward",
    subSupplyType: "Supply",
    revCharge: "No",
    paymentTerms: "30 Days",
    dueDate: "2025-10-15",
    status: "Unpaid",
    // ── E-Way Bill fields ──
    ewayBill: {
      ewayBillNo: "EWB1234567890",
      ewayBillDate: "2025-09-15",
      ewayValidUpto: "2025-09-18",
      transportMode: "Road",
      vehicleNo: "MH12AB1234",
      transporterName: "Blue Dart Logistics",
    },
    customer: {
      company_name: "AlphaWorks Ltd",
      gstin: "27AALCA1234F1ZV",
      pan: "AALCA1234F",
      phone: "9876543210",
      email: "accounts@alphaworks.com",
      address_line1: "101 Industrial Zone, MIDC",
      address_line2: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      state_code: "27",
      pincode: "400093",
      place_of_supply: "Maharashtra",
      place_of_supply_code: "27",
    },
    shipping: {
      company_name: "AlphaWorks Ltd",
      address_line1: "101 Industrial Zone, MIDC",
      address_line2: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      state_code: "27",
      pincode: "400093",
      place_of_supply: "Maharashtra",
      place_of_supply_code: "27",
    },
    items: [
      { description: "Control Panel Wiring", itemCode: "CPW-001", hsn: "85371000", unit: "NOS", qty: 2, rate: 850, discount: 0, gstRate: 18 },
      { description: "PLC Programming & Configuration", itemCode: "PLC-002", hsn: "85340000", unit: "SET", qty: 1, rate: 4500, discount: 5, gstRate: 18 },
      { description: "Cable Tray Installation", itemCode: "CTI-003", hsn: "73089000", unit: "MTR", qty: 20, rate: 85, discount: 0, gstRate: 18 },
      
    ],
    pfCharge: 350,
    termsAndConditions: "1. Payment due within 30 days of invoice date.\n2. Goods once sold will not be taken back.\n3. Subject to Navi Mumbai Jurisdiction.",
  },
];

const businessInfo = {
  name: "GLS TECHNOLOGIST",
  address: "Plot No. PAP-A-78, TTC Industrial Area, Pawane MIDC, Turbhe, Navi Mumbai,Maharashtra  - 400709",
  state_code: "27",
  email: "glstechnologist2020@gmail.com",
  gst: "27AAUFG7297B1ZV",
  phone: "+91 98765 43210",
  bank: "ICICI BANK",
  branch: "Airoli, Navi Mumbai",
  account: "109005002301",
  ifsc: "ICIC0001090",
  accountHolder: "GLS TECHNOLOGIST",
};

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

const gstOptions = [0, 5, 12, 18, 28];
const InvoiceTypeOptions = ["Tax Invoice", "Debit Note", "Credit Note"];
const units = ["NOS", "PCS", "KG", "MTR", "LTR", "SET", "BOX", "ROLL", "PAIR"];

const numberToWords = (num) => {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };
  return convert(Math.round(num));
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmt = (n) => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const StatusBadge = ({ status }) => {
  const colors = {
    Paid: { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
    Unpaid: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    Draft: { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" },
    Cancelled: { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  };
  const s = colors[status] || colors.Draft;
  return (
    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: s.bg, color: s.color, border: `1.5px solid ${s.border}` }}>
      {status}
    </span>
  );
};

const MetaRow = ({ label, value }) => (
  <div style={{ display: "grid", gridTemplateColumns: "130px 10px 1fr", alignItems: "start", marginBottom: "4px", fontSize: "12.5px" }}>
    <span style={{ color: "#4b5563", fontWeight: 600 }}>{label}</span>
    <span style={{ fontWeight: 700 }}>:</span>
    <span style={{ color: "#111827", fontWeight: 700 }}>{value || "—"}</span>
  </div>
);

// ─── Edit Form primitives (prefixed to avoid conflicts) ────────────────────
const editInputStyle = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb",
  borderRadius: "8px", fontSize: "13.5px", color: "#111827",
  background: "#ffffff", outline: "none", boxSizing: "border-box",
};

const ETextInput = ({ value, onChange, placeholder, type = "text", readOnly }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
    style={{ ...editInputStyle, cursor: readOnly ? "not-allowed" : "text", background: readOnly ? "#f9fafb" : "#fff" }}
    onFocus={(e) => { if (!readOnly) e.target.style.borderColor = "#3b82f6"; }}
    onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
  />
);

const ESelectInput = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={onChange} style={{
    ...editInputStyle, appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
  </select>
);

const ESection = ({ title, icon, children }) => (
  <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #e5e7eb", overflow: "hidden", marginBottom: "20px" }}>
    <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "15px" }}>{icon}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#374151", textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ padding: "20px" }}>{children}</div>
  </div>
);

const EField = ({ label, required, children, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "#111827", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
      {label}
      {required && <span style={{ color: "#ef4444" }}>*</span>}
      {!required && hint && <span style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>({hint})</span>}
    </label>
    {children}
  </div>
);

const EOtpInput = ({ value, onChange, length, numbersOnly = false }) => (
  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
    {Array.from({ length }).map((_, index) => (
      <input key={index} maxLength={1} value={value[index] || ""}
        onChange={(e) => {
          const raw = numbersOnly ? e.target.value.replace(/[^0-9]/g, "") : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const newVal = value.substring(0, index) + raw + value.substring(index + 1);
          onChange(newVal);
          if (raw && e.target.nextSibling) e.target.nextSibling.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !value[index] && e.target.previousSibling) e.target.previousSibling.focus();
          if (e.key === "ArrowLeft" && e.target.previousSibling) { e.preventDefault(); e.target.previousSibling.focus(); }
          if (e.key === "ArrowRight" && e.target.nextSibling) { e.preventDefault(); e.target.nextSibling.focus(); }
        }}
        style={{ width: "30px", height: "34px", textAlign: "center", fontSize: "13px", fontWeight: 600, border: "1.5px solid #d1d5db", borderRadius: "6px", outline: "none", background: "#fff", color: "#111827" }}
        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
      />
    ))}
  </div>
);

const AddressBlock = ({ form, update, title, grid3 }) => (    <div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e3a5f", marginBottom: "14px", paddingBottom: "8px", borderBottom: "1.5px solid #f0f4f8" }}>{title}</div>
      <div style={grid3}>
        <EField label="Company / Name" required><ETextInput value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Company Name" /></EField>
        <EField label="Email"><ETextInput type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="billing@company.com" /></EField>
        <EField label="Mobile Number"><EOtpInput value={form.phone || ""} onChange={(v) => update("phone", v)} length={10} numbersOnly /></EField>
        <EField label="GSTIN"><EOtpInput value={form.gstin || ""} onChange={(v) => update("gstin", v)} length={15} /></EField>
        <EField label="PAN"><EOtpInput value={form.pan || ""} onChange={(v) => update("pan", v)} length={10} /></EField>
        <div />
        <EField label="Address Line 1" required><ETextInput value={form.address_line1} onChange={(e) => update("address_line1", e.target.value)} placeholder="Building, Street, Area" /></EField>
        <EField label="Address Line 2" hint="optional"><ETextInput value={form.address_line2} onChange={(e) => update("address_line2", e.target.value)} placeholder="Landmark (optional)" /></EField>
        <EField label="City" required><ETextInput value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" /></EField>
        <EField label="State" required>
          <ESelectInput value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="Select State" options={indianStates.map((s) => ({ value: s.name, label: s.name }))} />
        </EField>
        <EField label="State Code"><ETextInput value={form.state_code} readOnly onChange={() => {}} placeholder="27" /></EField>
        <EField label="Pincode" required><ETextInput value={form.pincode} onChange={(e) => update("pincode", e.target.value)} placeholder="400001" /></EField>
      </div>
    </div>
  );

// ─── Edit Invoice Form ──────────────────────────────────────────────────────
function EditInvoiceForm({ invoice, onSave, onCancel }) {
  const emptyAddress = {
    company_name: "", gstin: "", pan: "", address_line1: "", address_line2: "",
    city: "", state: "", state_code: "", pincode: "", email: "", phone: "",
    place_of_supply: "", place_of_supply_code: "",
  };

  const [invoiceNo, setInvoiceNo] = useState(invoice.invoiceNo);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate);
  const [invoiceType, setInvoiceType] = useState(invoice.invoiceType || "Tax Invoice");
  const [supplyType, setSupplyType] = useState(invoice.supplyType === "interstate" ? "interstate" : "intrastate");
  const [subSupplyType, setSubSupplyType] = useState(invoice.subSupplyType || "");
  const [revCharge, setRevCharge] = useState(invoice.revCharge?.toLowerCase() === "yes" ? "yes" : "no");
const [customerType, setCustomerType] = useState(invoice.customerType || "B2B");
  const [ewayEnabled, setEwayEnabled] = useState(!!(invoice.ewayBill?.ewayBillNo));
  const [docType, setDocType] = useState(invoice.ewayBill?.docType || "INV");
  const [approximateDistance, setApproximateDistance] = useState(invoice.ewayBill?.approximateDistance || "");
  const [transporterName, setTransporterName] = useState(invoice.ewayBill?.transporterName || "");
  const [transporterDocNo, setTransporterDocNo] = useState(invoice.ewayBill?.transporterDocNo || "");
  const [vehicleNo, setVehicleNo] = useState(invoice.ewayBill?.vehicleNo || "");
  const [from, setFrom] = useState(invoice.ewayBill?.from || "");
  const [deliveryMode, setDeliveryMode] = useState(invoice.ewayBill?.deliveryMode || "1");

  const [billForm, setBillForm] = useState({ ...emptyAddress, ...invoice.customer });
  const isSameAddress =
    invoice.customer.address_line1 === invoice.shipping?.address_line1 &&
    invoice.customer.city === invoice.shipping?.city &&
    invoice.customer.pincode === invoice.shipping?.pincode;
  const [sameAsBilling, setSameAsBilling] = useState(isSameAddress);
  const [shipForm, setShipForm] = useState({ ...emptyAddress, ...invoice.shipping });

  const [items, setItems] = useState(invoice.items.map((item) => ({ ...item })));
  const [pfCharge, setPfCharge] = useState(invoice.pfCharge || 0);
  const [termsAndConditions, setTermsAndConditions] = useState(invoice.termsAndConditions || "");

  const updateBillForm = (field, val) => {
    if (field === "state") {
      const st = indianStates.find((s) => s.name === val);
      setBillForm((f) => ({ ...f, state: val, state_code: st ? st.code : f.state_code }));
      if (sameAsBilling) setShipForm((f) => ({ ...f, state: val, state_code: st ? st.code : f.state_code }));
    } else {
      setBillForm((f) => ({ ...f, [field]: val }));
      if (sameAsBilling) setShipForm((f) => ({ ...f, [field]: val }));
    }
  };

  const updateShipForm = (field, val) => {
    if (field === "state") {
      const st = indianStates.find((s) => s.name === val);
      setShipForm((f) => ({ ...f, state: val, state_code: st ? st.code : f.state_code }));
    } else {
      setShipForm((f) => ({ ...f, [field]: val }));
    }
  };

  const handleSameAsBilling = (checked) => {
    setSameAsBilling(checked);
    if (checked) setShipForm({ ...billForm });
  };

  const updateItem = (i, f, v) => { const u = [...items]; u[i][f] = v; setItems(u); };
  const addItem = () => setItems([...items, { description: "", itemCode: "", hsn: "", qty: 1, rate: 0, discount: 0, unit: "NOS", gstRate: 18 }]);
  const removeItem = (i) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));

  const itemTaxable = (item) => { const g = item.qty * item.rate; return g - (g * (item.discount || 0)) / 100; };
  const itemTax = (item) => (itemTaxable(item) * item.gstRate) / 100;
  const itemTotal = (item) => itemTaxable(item) + itemTax(item);

  const subtotal = items.reduce((s, item) => s + item.qty * item.rate, 0);
  const totalDiscount = items.reduce((s, item) => s + (item.qty * item.rate * (item.discount || 0)) / 100, 0);
  const taxableAmount = subtotal - totalDiscount;
  const grandTaxable = taxableAmount + Number(pfCharge);
  const isInter = supplyType === "interstate";
  const totalItemTax = items.reduce((s, item) => s + itemTax(item), 0);
  const cgst = isInter ? 0 : totalItemTax / 2;
  const sgst = isInter ? 0 : totalItemTax / 2;
  const igst = isInter ? totalItemTax : 0;
  const grandBeforeRound = grandTaxable + cgst + sgst + igst;
  const grandTotal = Math.round(grandBeforeRound);
  const roundOff = grandTotal - grandBeforeRound;

  const taxSummary = items.reduce((acc, item) => {
    const key = item.hsn || "N/A";
    if (!acc[key]) acc[key] = { hsn: key, taxable: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, rate: item.gstRate };
    acc[key].taxable += itemTaxable(item);
    const tax = itemTax(item);
    if (isInter) acc[key].igstAmt += tax;
    else { acc[key].cgstAmt += tax / 2; acc[key].sgstAmt += tax / 2; }
    return acc;
  }, {});

  const handleSave = () => {
    onSave({
      ...invoice,
      invoiceNo, invoiceDate, invoiceType,  customerType, supplyType, subSupplyType, revCharge,
      customer: billForm,
      shipping: sameAsBilling ? billForm : shipForm,
      items, pfCharge, termsAndConditions,
      ewayBill: ewayEnabled ? { ...invoice.ewayBill, docType, approximateDistance, transporterName, transporterDocNo, vehicleNo, from, deliveryMode } : null,
    });
  };

  const grid3 = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" };
  const grid2 = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" };



  return (
    <div style={{ width: "100%", margin: "0" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button type="button" onClick={onCancel}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            <FiArrowLeft size={15} /> Back
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0b1324" }}>Edit Invoice</h1>
              <span style={{ padding: "4px 10px", background: "#fef3c7", border: "1.5px solid #fde68a", borderRadius: "20px", fontSize: "11.5px", fontWeight: 700, color: "#92400e" }}>
                ✏️ Editing {invoice.invoiceNo}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>Pre-filled with saved data · Make your changes below</p>
          </div>
        </div>
      </div>

      {/* Company Banner */}
      <div style={{ background: "#1e3a5f", borderRadius: "12px", padding: "20px 24px", marginBottom: "20px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.5px", marginBottom: "4px" }}>{businessInfo.name}</div>
            <div style={{ fontSize: "12px", opacity: 0.8, maxWidth: "420px", lineHeight: "1.5" }}>{businessInfo.address}</div>
            <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "4px" }}>{businessInfo.email} · {businessInfo.phone}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "2px", letterSpacing: "0.05em" }}>GSTIN</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, fontFamily: "monospace", letterSpacing: "1px" }}>{businessInfo.gst}</div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <ESection title="Invoice Details" icon="🧾">
        <div style={grid3}>
          <EField label="Invoice No" required><ETextInput value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-2526-001" /></EField>
          <EField label="Invoice Date" required><ETextInput type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></EField>
          <EField label="Invoice Type">
            <ESelectInput value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} options={InvoiceTypeOptions.map((p) => ({ value: p, label: p }))} />
          </EField>
          <EField label="Customer Type">
  <ESelectInput
    value={invoice.customerType || ""}
    onChange={(e) => setCustomerType(e.target.value)}
    options={[
      { value: "Registered", label: "Registered" },
      { value: "Unregistered", label: "Unregistered" },
      { value: "Export", label: "Export" }
    ]}
  />
</EField>
          <EField label="SupplyType" required>
            <ESelectInput value={supplyType} onChange={(e) => setSupplyType(e.target.value)} options={[{ value: "Outward", label: "Outward" }, { value: "Inward", label: "Inward" }]} />
          </EField>
          <EField label="Sub Supply Type">
            <ESelectInput value={subSupplyType} onChange={(e) => setSubSupplyType(e.target.value)} placeholder="Select Type" options={[
              { value: "Supply", label: "Supply" }, { value: "Import", label: "Import" }, { value: "Export", label: "Export" },
              { value: "Job Work", label: "Job Work" }, { value: "For Own Use", label: "For Own Use" },
              { value: "Sales Return", label: "Sales Return" }, { value: "Others", label: "Others" },
            ]} />
          </EField>
          <EField label="Reverse Charge">
            <ESelectInput value={revCharge} onChange={(e) => setRevCharge(e.target.value)} options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
          </EField>
        </div>
      </ESection>

      {/* Billing & Shipping */}
      <ESection title="Billing & Shipping Address" icon="🏢">
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
<AddressBlock
  form={billForm}
  update={updateBillForm}
  title="📋 Billing Address"
  grid3={grid3}
/>          <div style={{ height: "1px", background: "#f0f4f8" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", paddingBottom: "8px", borderBottom: "1.5px solid #f0f4f8" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e3a5f" }}>🚚 Shipping Address</div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                <input type="checkbox" checked={sameAsBilling} onChange={(e) => handleSameAsBilling(e.target.checked)} style={{ width: "14px", height: "14px", accentColor: "#1e3a5f", cursor: "pointer" }} />
                Same as Billing
              </label>
            </div>
            {sameAsBilling ? (
              <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1.5px dashed #d1d5db", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                ✓ Shipping address is same as billing address
              </div>
            ) : (
              <div style={grid3}>
                <EField label="Company / Name"><ETextInput value={shipForm.company_name} onChange={(e) => updateShipForm("company_name", e.target.value)} placeholder="Company Name" /></EField>
                <EField label="Address Line 1"><ETextInput value={shipForm.address_line1} onChange={(e) => updateShipForm("address_line1", e.target.value)} placeholder="Building, Street" /></EField>
                <EField label="Address Line 2"><ETextInput value={shipForm.address_line2} onChange={(e) => updateShipForm("address_line2", e.target.value)} placeholder="Landmark" /></EField>
                <EField label="City"><ETextInput value={shipForm.city} onChange={(e) => updateShipForm("city", e.target.value)} placeholder="Mumbai" /></EField>
                <EField label="State">
                  <ESelectInput value={shipForm.state} onChange={(e) => updateShipForm("state", e.target.value)} placeholder="Select State" options={indianStates.map((s) => ({ value: s.name, label: s.name }))} />
                </EField>
                <EField label="State Code"><ETextInput value={shipForm.state_code} readOnly onChange={() => {}} placeholder="27" /></EField>
                <EField label="Pincode"><ETextInput value={shipForm.pincode} onChange={(e) => updateShipForm("pincode", e.target.value)} placeholder="400001" /></EField>
              </div>
            )}
          </div>
        </div>
      </ESection>

      {/* E-Way Bill */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #e5e7eb", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: ewayEnabled ? "1.5px solid #e5e7eb" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "15px" }}>🛣️</span>
            <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#374151", textTransform: "uppercase" }}>E-Way Bill Details</span>
            <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>(Required if value &gt; ₹50,000)</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>{ewayEnabled ? "Enabled" : "Disabled"}</span>
            <div onClick={() => setEwayEnabled(!ewayEnabled)} style={{ width: "42px", height: "24px", borderRadius: "12px", background: ewayEnabled ? "#1e3a5f" : "#d1d5db", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: ewayEnabled ? "21px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </label>
        </div>
        {ewayEnabled && (
          <div style={{ padding: "20px" }}>
            <div style={{ ...grid3, marginBottom: "20px" }}>
              <EField label="Document Type" required>
                <ESelectInput value={docType} onChange={(e) => setDocType(e.target.value)} options={[{ value: "INV", label: "Tax Invoice" }, { value: "BIL", label: "Bill of Supply" }, { value: "BOE", label: "Bill of Entry" }, { value: "CHL", label: "Delivery Challan" }, { value: "OTH", label: "Others" }]} />
              </EField>
              <EField label="Approximate Distance (KM)"><ETextInput type="number" value={approximateDistance} onChange={(e) => setApproximateDistance(e.target.value)} placeholder="e.g. 150" /></EField>
            </div>
            <div style={{ height: "1px", background: "#f0f4f8", margin: "0 0 20px 0" }} />
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>Transporter Details</div>
            <div style={{ ...grid2, marginBottom: "20px" }}>
              <EField label="Transporter Name"><ETextInput value={transporterName} onChange={(e) => setTransporterName(e.target.value)} placeholder="Transporter name" /></EField>
              <EField label="Transporter Doc No"><ETextInput value={transporterDocNo} onChange={(e) => setTransporterDocNo(e.target.value)} placeholder="LR / RR / Airway Bill No." /></EField>
            </div>
            <div style={{ height: "1px", background: "#f0f4f8", margin: "0 0 20px 0" }} />
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>Vehicle Details</div>
            <div style={grid3}>
              <EField label="Mode of Transport">
                <ESelectInput value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)} options={[{ value: "1", label: "Road" }, { value: "2", label: "Rail" }, { value: "3", label: "Air" }, { value: "4", label: "Ship" }]} />
              </EField>
              <EField label="Vehicle No"><ETextInput value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="MH04AB1234" /></EField>
              <EField label="From"><ETextInput value={from} onChange={(e) => setFrom(e.target.value)} placeholder="City / Place of dispatch" /></EField>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <ESection title="Items / Services" icon="📦">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "Description", "Item Code", "HSN/SAC", "Unit", "Qty", "Rate (₹)", "Disc %", "Taxable (₹)", "GST %", "Tax (₹)", "Total (₹)", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 10px", textAlign: ["Taxable (₹)", "Tax (₹)", "Total (₹)", "Rate (₹)"].includes(h) ? "right" : "left", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", color: "#6b7280", textTransform: "uppercase", borderBottom: "1.5px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 10px", color: "#9ca3af", fontWeight: 600, fontSize: "12px" }}>{i + 1}</td>
                  <td style={{ padding: "5px 6px", minWidth: "160px" }}><input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item description" style={{ ...editInputStyle, padding: "6px 9px", fontSize: "12.5px" }} /></td>
                  <td style={{ padding: "5px 6px", width: "100px" }}><input value={item.itemCode} onChange={(e) => updateItem(i, "itemCode", e.target.value)} placeholder="Code" style={{ ...editInputStyle, padding: "6px 9px", fontSize: "12.5px" }} /></td>
                  <td style={{ padding: "5px 6px", width: "100px" }}><input value={item.hsn} onChange={(e) => updateItem(i, "hsn", e.target.value)} placeholder="HSN" style={{ ...editInputStyle, padding: "6px 9px", fontSize: "12.5px" }} /></td>
                  <td style={{ padding: "5px 6px", width: "75px" }}>
                    <select value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} style={{ ...editInputStyle, padding: "6px 7px", fontSize: "12px" }}>
                      {units.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "5px 6px", width: "65px" }}><input type="number" value={item.qty} min={1} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} style={{ ...editInputStyle, padding: "6px 8px", fontSize: "12.5px", textAlign: "center" }} /></td>
                  <td style={{ padding: "5px 6px", width: "100px" }}><input type="number" value={item.rate} onChange={(e) => updateItem(i, "rate", Number(e.target.value))} style={{ ...editInputStyle, padding: "6px 8px", fontSize: "12.5px", textAlign: "right" }} /></td>
                  <td style={{ padding: "5px 6px", width: "65px" }}><input type="number" value={item.discount} min={0} max={100} onChange={(e) => updateItem(i, "discount", Number(e.target.value))} style={{ ...editInputStyle, padding: "6px 8px", fontSize: "12.5px", textAlign: "center" }} /></td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap", fontSize: "12.5px" }}>₹ {itemTaxable(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: "5px 6px", width: "70px" }}>
                    <select value={item.gstRate} onChange={(e) => updateItem(i, "gstRate", Number(e.target.value))} style={{ ...editInputStyle, padding: "6px 7px", fontSize: "12px" }}>
                      {gstOptions.map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", color: "#374151", whiteSpace: "nowrap", fontSize: "12.5px" }}>₹ {itemTax(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "#1e3a5f", whiteSpace: "nowrap", fontSize: "12.5px" }}>₹ {itemTotal(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: "5px 6px", textAlign: "center" }}>
                    <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "16px", padding: "4px 6px", borderRadius: "6px" }} title="Remove">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={addItem} style={{ marginTop: "12px", padding: "8px 16px", border: "1.5px dashed #d1d5db", borderRadius: "8px", background: "none", fontSize: "13px", fontWeight: 600, color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "16px" }}>+</span> Add Item
        </button>

        {/* Totals */}
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "340px", background: "#f8fafc", borderRadius: "10px", padding: "16px", border: "1.5px solid #e5e7eb" }}>
            {[["Subtotal (Gross)", `₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`], ["Total Discount", `- ₹ ${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`], ["Taxable Amount", `₹ ${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`]].map((row) => (
              <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px", color: "#374151" }}>
                <span>{row[0]}</span><span style={{ fontWeight: 600 }}>{row[1]}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", fontSize: "13px", color: "#374151" }}>
              <span>P & F / Transport Charge</span>
              <input type="number" value={pfCharge} onChange={(e) => setPfCharge(e.target.value)} style={{ width: "100px", padding: "5px 8px", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "13px", textAlign: "right", background: "#fff" }} />
            </div>
            <div style={{ height: "1px", background: "#e5e7eb", margin: "12px 0" }} />
            {!isInter ? (
              <><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#374151" }}><span>CGST</span><span>₹ {cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#374151" }}><span>SGST</span><span>₹ {sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div></>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#374151" }}><span>IGST</span><span>₹ {igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#374151" }}><span>Total Tax Amount</span><span style={{ fontWeight: 600 }}>₹ {(cgst + sgst + igst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#374151" }}>
              <span>Round Off</span>
              <span style={{ color: roundOff >= 0 ? "#10b981" : "#ef4444" }}>{roundOff >= 0 ? "+" : ""}₹ {roundOff.toFixed(2)}</span>
            </div>
            <div style={{ background: "#1e3a5f", borderRadius: "8px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>Grand Total</span>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px" }}>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ marginTop: "10px", fontSize: "11.5px", color: "#6b7280", lineHeight: "1.5" }}>
              <span style={{ fontWeight: 700, color: "#374151" }}>In Words: </span>{numberToWords(Math.round(grandTotal))} Rupees Only
            </div>
          </div>
        </div>
      </ESection>

      {/* Tax Summary */}
      <ESection title="Tax Summary (HSN-wise)" icon="📊">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Sr.", "HSN/SAC", "Taxable Value", ...(isInter ? ["IGST Rate", "IGST Amount"] : ["CGST Rate", "CGST Amount", "SGST Rate", "SGST Amount"]), "Total Tax"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: ["Taxable Value", "IGST Amount", "CGST Amount", "SGST Amount", "Total Tax"].includes(h) ? "right" : "left", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", color: "#6b7280", textTransform: "uppercase", borderBottom: "1.5px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(taxSummary).map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{i + 1}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.hsn}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>₹ {row.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  {isInter ? (<><td style={{ padding: "10px 12px" }}>{row.rate}%</td><td style={{ padding: "10px 12px", textAlign: "right" }}>₹ {row.igstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></>) : (
                    <><td style={{ padding: "10px 12px" }}>{row.rate / 2}%</td><td style={{ padding: "10px 12px", textAlign: "right" }}>₹ {row.cgstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td><td style={{ padding: "10px 12px" }}>{row.rate / 2}%</td><td style={{ padding: "10px 12px", textAlign: "right" }}>₹ {row.sgstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></>
                  )}
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#1e3a5f" }}>₹ {(row.cgstAmt + row.sgstAmt + row.igstAmt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr style={{ background: "#f0f4f8" }}>
                <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>TOTAL</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹ {taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                {isInter ? (<><td></td><td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹ {igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></>) : (
                  <><td></td><td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹ {cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td><td></td><td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>₹ {sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></>
                )}
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#1e3a5f" }}>₹ {(cgst + sgst + igst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ESection>

      {/* Terms & Conditions */}
      <ESection title="Terms & Conditions" icon="📝">
        <textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)}
          rows={4} placeholder="Enter terms and conditions..."
          style={{ ...editInputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: "1.6" }} />
      </ESection>

      {/* Footer Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "40px" }}>
        <button type="button" onClick={onCancel}
          style={{ padding: "11px 28px", border: "1.5px solid #d1d5db", borderRadius: "8px", background: "#fff", fontSize: "13.5px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
          Cancel
        </button>
        <button type="button" onClick={handleSave}
          style={{ padding: "11px 28px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13.5px", fontWeight: 700, color: "#fff", cursor: "pointer", letterSpacing: "0.3px" }}>
          💾 Update Invoice
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ────────────────────────────────────────────────────────────
export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Added: mode & invoice state for edit toggle ──
  const [mode, setMode] = useState("view");
  const [invoice, setInvoice] = useState(
    mockInvoices.find((inv) => inv.id === Number(id)) || mockInvoices[0]
  );
  const [toast, setToast] = useState(false);

  const handleSave = (updated) => {
    setInvoice(updated);
    setMode("view");
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  // ── Edit mode: render edit form ──
  if (mode === "edit") {
    return <EditInvoiceForm invoice={invoice} onSave={handleSave} onCancel={() => setMode("view")} />;
  }

  // ── View mode: 100% original code, zero changes ──
  const { customer, shipping, items, pfCharge, supplyType, ewayBill } = invoice;

  const itemTaxable = (item) => {
    const gross = item.qty * item.rate;
    return gross - (gross * (item.discount || 0)) / 100;
  };
  const itemTax = (item) => (itemTaxable(item) * item.gstRate) / 100;
  const itemTotal = (item) => itemTaxable(item) + itemTax(item);
  const itemDiscount = (item) => (item.qty * item.rate * (item.discount || 0)) / 100;

  const subtotal = items.reduce((s, item) => s + item.qty * item.rate, 0);
  const totalDiscount = items.reduce((s, item) => s + itemDiscount(item), 0);
  const taxableAmount = subtotal - totalDiscount;
  const grandTaxable = taxableAmount + Number(pfCharge);

  const isInter = supplyType === "interstate";
  const totalItemTax = items.reduce((s, item) => s + itemTax(item), 0);
  const cgst = isInter ? 0 : totalItemTax / 2;
  const sgst = isInter ? 0 : totalItemTax / 2;
  const igst = isInter ? totalItemTax : 0;
  const grandBeforeRound = grandTaxable + cgst + sgst + igst;
  const grandTotal = Math.round(grandBeforeRound);
  const roundOff = grandTotal - grandBeforeRound;

  const taxSummary = items.reduce((acc, item) => {
    const key = item.hsn || "N/A";
    if (!acc[key]) acc[key] = { hsn: key, taxable: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, rate: item.gstRate };
    acc[key].taxable += itemTaxable(item);
    const tax = itemTax(item);
    if (isInter) acc[key].igstAmt += tax;
    else { acc[key].cgstAmt += tax / 2; acc[key].sgstAmt += tax / 2; }
    return acc;
  }, {});

  const cell = (extra = {}) => ({ border: "1px solid #d1d5db", padding: "7px 10px", fontSize: "12px", ...extra });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { width: 100% !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div style={{ width: "100%", margin: "0" }}>

        {/* Toast — only addition to original view */}
        {toast && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", padding: "10px 16px" }}>
              <span style={{ fontSize: "16px" }}>✅</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a" }}>Invoice updated successfully!</span>
            </div>
          </div>
        )}

        {/* ── Top Action Bar ── */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="button" onClick={() => navigate(-1)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
              <FiArrowLeft size={15} /> Back
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0b1324" }}>Invoice {invoice.invoiceNo}</h1>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>{formatDate(invoice.invoiceDate)} · {customer.company_name}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
         
            <button type="button" 
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", border: "1.5px solid #e0e7ff", borderRadius: "8px", background: "#eef2ff", fontSize: "13px", fontWeight: 700, color: "#3730a3", cursor: "pointer" }}>
              <FiDownload size={15} /> Download PDF
            </button>
            <button type="button" 
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
              <FiPrinter size={15} /> Print
            </button>
            <button type="button" 
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              <FiShare2 size={15} /> Share
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            INVOICE DOCUMENT
        ══════════════════════════════════════════════════════════════ */}
        <div className="print-area" style={{
          background: "#fff",
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          borderRadius: "10px",
          border: "1.5px solid #e5e7eb",
       overflow: "visible",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
        }}>

          {/* ── HEADER ── */}
          <div style={{ background: "#fff", padding: "20px 28px", borderBottom: "3px solid #1e3a5f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
<img
  src={Logo}
  alt="Logo"
  style={{
    width: "60px",
    height: "auto",
    maxHeight: "60px",
    objectFit: "contain"
  }}
/>                <div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#1e3a5f", letterSpacing: "0.5px" }}>{businessInfo.name}</div>
                  <div style={{ fontSize: "11px", color: "#6b7280", maxWidth: "380px", lineHeight: "1.3", marginTop: "2px" }}>{businessInfo.address}</div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>State Code: <strong>{businessInfo.state_code}</strong></div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>{businessInfo.email} | {businessInfo.phone}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>GSTIN/UIN</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e3a5f", fontFamily: "monospace", letterSpacing: "1px" }}>{businessInfo.gst}</div>
              </div>
            </div>
          </div>

          {/* ── INVOICE TITLE BAR ── */}
          <div style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb", padding: "9px 28px", textAlign: "center" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827", letterSpacing: "1px", textTransform: "uppercase" }}>
              {invoice.invoiceType || "Tax Invoice"}
            </span>
          </div>

          {/* ── BILLING / SHIPPING / INVOICE META ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1.5px solid #d1d5db" }}>

            {/* Billing Address */}
            <div style={{ padding: "16px 18px", borderRight: "1px solid #d1d5db" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", paddingBottom: "5px", borderBottom: "1.5px solid #e5e7eb" }}>
                Billing Address
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0b1324", marginBottom: "4px" }}>{customer.company_name}</div>
              <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.6" }}>
                {customer.address_line1}
                {customer.address_line2 && <>, {customer.address_line2}</>}
                <br />{customer.city}, {customer.state}, India
                <br />Pincode: {customer.pincode}
                {customer.place_of_supply && (
                  <div style={{ fontSize: "11.5px", color: "#374151", marginTop: "2px" }}>
                    State Code : <strong> {customer.place_of_supply_code}</strong>
                  </div>
                )}
              </div>
              {customer.gstin && <div style={{ fontSize: "11.5px", color: "#374151", marginBottom: "2px" }}>GSTIN: <strong>{customer.gstin}</strong></div>}
              {customer.pan && <div style={{ fontSize: "11.5px", color: "#374151", marginBottom: "4px" }}>PAN: <strong>{customer.pan}</strong></div>}
              {customer.phone && <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "4px" }}>Mo: +91-{customer.phone}</div>}
              {customer.email && <div style={{ fontSize: "12px", color: "#4b5563" }}>{customer.email}</div>}
            </div>

            {/* Shipping Address */}
            <div style={{ padding: "16px 18px", borderRight: "1px solid #d1d5db" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", paddingBottom: "5px", borderBottom: "1.5px solid #e5e7eb" }}>
                Shipping Address
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0b1324", marginBottom: "4px" }}>{shipping.company_name}</div>
              <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.6" }}>
                {shipping.address_line1}
                {shipping.address_line2 && <>, {shipping.address_line2}</>}
                <br />{shipping.city}, {shipping.state}, India
                <br />Pincode: {shipping.pincode}
              </div>
              {shipping.place_of_supply && (
                <div style={{ fontSize: "11.5px", color: "#374151", marginTop: "4px" }}>
                  State Code: <strong>{shipping.place_of_supply_code}</strong>
                </div>
              )}
            </div>

            {/* Invoice Meta */}
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", paddingBottom: "5px", borderBottom: "1.5px solid #e5e7eb" }}>
                Invoice Details
              </div>
              <MetaRow label="Invoice No." value={invoice.invoiceNo} />
              <MetaRow label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
              <MetaRow label="Invoice Type" value={invoice.invoiceType} />
              <MetaRow label="Customer Type" value={invoice.customerType} />
              <MetaRow label="Supply Type" value={invoice.supplyType ? invoice.supplyType.charAt(0).toUpperCase() + invoice.supplyType.slice(1) : "—"} />
              <MetaRow label="Sub-Supply Type" value={invoice.subSupplyType} />
              <MetaRow label="Rev. Charge" value={invoice.revCharge} />
              <MetaRow label="Place of Supply" value={`${customer.place_of_supply} (${customer.place_of_supply_code})`} />

              {/* ── E-Way Bill No. ── */}
              {ewayBill?.ewayBillNo && (
                <>
                  <div style={{ height: "1px", background: "#e5e7eb", margin: "7px 0" }} />
                  <MetaRow label="E-Way Bill No." value={ewayBill.ewayBillNo} />
                </>
              )}
            </div>
          </div>

     
          {/* ── ITEMS TABLE ── */}
          <div style={{ padding: "0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["#", "Description", "HSN/SAC", "Unit", "Qty", "Unit Price", "Discount", "Taxable", "GST %", "Tax", "Total"].map((h, i) => (
                    <th key={h} style={{
                      padding: "9px 8px",
                      textAlign: i >= 4 ? "right" : "left",
                      fontSize: "10.5px", fontWeight: 700,
                      color: "#374151",
                      letterSpacing: "0.04em",
                      borderRight: i < 10 ? "1px solid #e5e7eb" : "none",
                      borderBottom: "2px solid #d1d5db",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ ...cell(), textAlign: "center", color: "#6b7280", width: "28px" }}>{i + 1}</td>
                    <td style={{ ...cell(), fontWeight: 500, color: "#111827" }}>{item.description}</td>
                    <td style={{ ...cell(), color: "#6b7280", fontFamily: "monospace", fontSize: "11px" }}>{item.hsn || "—"}</td>
                    <td style={{ ...cell() }}>{item.unit}</td>
                    <td style={{ ...cell(), textAlign: "right" }}>{item.qty}</td>
                    <td style={{ ...cell(), textAlign: "right" }}> {fmt(item.rate)}</td>
                    <td style={{ ...cell(), textAlign: "right", color: "#dc2626" }}>{item.discount ? `${item.discount}%` : "0.00%"}</td>
                    <td style={{ ...cell(), textAlign: "right", fontWeight: 600 }}>{fmt(itemTaxable(item))}</td>
                    <td style={{ ...cell(), textAlign: "right" }}>{item.gstRate}%</td>
                    <td style={{ ...cell(), textAlign: "right" }}>{fmt(itemTax(item))}</td>
                    <td style={{ ...cell({ borderRight: "none" }), textAlign: "right", fontWeight: 700, color: "#1e3a5f" }}>{fmt(itemTotal(item))}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f0f4f8", borderBottom: "1.5px solid #d1d5db", borderTop: "1.5px solid #d1d5db" }}>
                  <td colSpan={4} style={{ ...cell(), fontWeight: 800, fontSize: "12px", color: "#374151" }}>Total :</td>
                  <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}>{items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}>{fmt(items.reduce((s, i) => s + i.rate, 0))}</td>
                  <td style={{ ...cell(), textAlign: "right", fontWeight: 700, color: "#dc2626" }}>{fmt(totalDiscount)}</td>
                  <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}>{fmt(grandTaxable)}</td>
                  <td style={{ ...cell() }}></td>
                  <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}>{fmt(cgst + sgst + igst)}</td>
                  <td style={{ ...cell({ borderRight: "none" }), textAlign: "right", fontWeight: 800, color: "#1e3a5f" }}>{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── BANK + SUMMARY ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", borderTop: "1.5px solid #d1d5db" }}>
            <div style={{ padding: "18px 24px", borderRight: "1.5px solid #d1d5db" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px", paddingBottom: "5px", borderBottom: "1.5px solid #e5e7eb" }}>
                Bank Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 20px", fontSize: "12.5px" }}>
                {[
                  ["Name", businessInfo.accountHolder],
                    ["Bank Name", businessInfo.bank],
                  ["Branch Name", businessInfo.branch],
                  ["Account No", businessInfo.account],
                  ["Branch IFSC", businessInfo.ifsc],
                ].map(([label, val]) => (
                  <>
                    <span key={label + "l"} style={{ color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
                    <span key={label + "v"} style={{ color: "#111827", fontWeight: 700 }}>: {val}</span>
                  </>
                ))}
              </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px", paddingBottom: "5px", borderBottom: "1.5px solid #e5e7eb" }}>
                Summary
              </div>
              {[
                ["Subtotal (Gross)", ` ${fmt(subtotal)}`],
                ["Total Discount", `-  ${fmt(totalDiscount)}`],
                ["Taxable Amount", ` ${fmt(taxableAmount)}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12px", color: "#374151" }}>
                  <span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
              <div style={{ height: "1px", background: "#d1d5db", margin: "8px 0" }} />
              {!isInter ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>CGST</span><span>{fmt(cgst)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>SGST</span><span>{fmt(sgst)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                  <span style={{ color: "#6b7280" }}>IGST</span><span>{fmt(igst)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                <span style={{ color: "#6b7280" }}>Tax Amount</span><span style={{ fontWeight: 600 }}>{fmt(cgst + sgst + igst)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
                <span style={{ color: "#6b7280" }}>Round Off</span>
                <span style={{ color: roundOff >= 0 ? "#16a34a" : "#dc2626" }}>{roundOff >= 0 ? "+" : ""}{Math.abs(roundOff).toFixed(2)}</span>
              </div>
              <div style={{ background: "#f0f4f8", border: "1.5px solid #d1d5db", borderRadius: "6px", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#1e3a5f", fontSize: "14px" }}>
                <span>Net Amount</span><span>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* ── TAX SUMMARY ── */}
          <div style={{ borderTop: "1.5px solid #d1d5db", padding: "0" }}>
            <div style={{ padding: "10px 24px 6px", fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Tax Summary
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["Sr. No.", "HSN/SAC", "Taxable Value",
                    ...(isInter
                      ? ["IGST Rate", "IGST Amount"]
                      : ["Central Tax Rate", "Central Tax Amount", "State Tax Rate", "State Tax Amount"]),
                    "Cess Rate", "Cess Amount"
                  ].map((h, i) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: i >= 2 ? "right" : "left", fontSize: "10.5px", fontWeight: 700, color: "#374151", letterSpacing: "0.04em", border: "1px solid #d1d5db" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(taxSummary).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ ...cell(), textAlign: "center" }}>{i + 1}</td>
                    <td style={{ ...cell(), fontFamily: "monospace" }}>{row.hsn}</td>
                    <td style={{ ...cell(), textAlign: "right", fontWeight: 600 }}> {fmt(row.taxable)}</td>
                    {isInter ? (
                      <>
                        <td style={{ ...cell(), textAlign: "right" }}>{row.rate}%</td>
                        <td style={{ ...cell(), textAlign: "right" }}>{fmt(row.igstAmt)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...cell(), textAlign: "right" }}>{row.rate / 2}%</td>
                        <td style={{ ...cell(), textAlign: "right" }}> {fmt(row.cgstAmt)}</td>
                        <td style={{ ...cell(), textAlign: "right" }}>{row.rate / 2}%</td>
                        <td style={{ ...cell(), textAlign: "right" }}> {fmt(row.sgstAmt)}</td>
                      </>
                    )}
                    <td style={{ ...cell(), textAlign: "right", color: "#9ca3af" }}>N.A.</td>
                    <td style={{ ...cell({ borderRight: "none" }), textAlign: "right", color: "#9ca3af" }}>N.A.</td>
                  </tr>
                ))}
                <tr style={{ background: "#f3f4f6", borderTop: "1.5px solid #d1d5db" }}>
                  <td colSpan={2} style={{ ...cell(), fontWeight: 800, color: "#374151" }}>Total</td>
                  <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}>{fmt(taxableAmount)}</td>
                  {isInter ? (
                    <>
                      <td style={{ ...cell() }}></td>
                      <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}>{fmt(igst)}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...cell() }}></td>
                      <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}> {fmt(cgst)}</td>
                      <td style={{ ...cell() }}></td>
                      <td style={{ ...cell(), textAlign: "right", fontWeight: 700 }}> {fmt(sgst)}</td>
                    </>
                  )}
                  <td style={{ ...cell(), textAlign: "right", color: "#9ca3af" }}>N.A.</td>
                  <td style={{ ...cell({ borderRight: "none" }), textAlign: "right", color: "#9ca3af" }}>N.A.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── AMOUNT IN WORDS ── */}
          <div style={{ borderTop: "1.5px solid #e5e7eb", padding: "12px 24px", background: "#f8fafc" }}>
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151" }}>Amount in Words: </span>
            <span style={{ fontSize: "12.5px", color: "#111827", fontStyle: "italic" }}>
              {numberToWords(grandTotal)} Rupees Only
            </span>
          </div>

          {/* ── TERMS + SIGNATURE ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", borderTop: "1.5px solid #d1d5db" }}>
            <div style={{ padding: "16px 24px", borderRight: "1.5px solid #d1d5db" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                Terms & Conditions
              </div>
              <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.8", whiteSpace: "pre-line" }}>
                {invoice.termsAndConditions || "1. Payment due within 30 days.\n2. Goods once sold will not be taken back.\n3. Subject to Navi Mumbai Jurisdiction."}
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
                  For {businessInfo.name}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>GSTIN: {businessInfo.gst}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ height: "60px", borderBottom: "1px solid #d1d5db", marginBottom: "6px" }} />
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ background: "#f8fafc", borderTop: "1.5px solid #e5e7eb", padding: "10px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<span style={{ fontSize: "11px", color: "#9ca3af" }}>
  Generated by <strong>D&apos;Lume Billing Software</strong>.
</span>            <span style={{ fontSize: "11px", color: "#9ca3af" }}>Page 1 of 1</span>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>E.O.E.</span>
          </div>

        </div>
        {/* END INVOICE DOCUMENT */}

        {/* Bottom action bar — only change: onClick now sets mode="edit" instead of navigating */}
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "20px", paddingBottom: "40px" }}>
          <button type="button" onClick={() => setMode("edit")}
            style={{ padding: "11px 28px", border: "1.5px solid #d1d5db", borderRadius: "8px", background: "#fff", fontSize: "13.5px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            ✏️ Edit Invoice
          </button>
        </div>

      </div>
    </>
  );
}