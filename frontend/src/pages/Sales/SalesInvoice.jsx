import { useState, useEffect } from "react";
import axios from "axios";
import SearchSelect from "../../components/SearchSelect";
import Modal from "../../components/Modal";
import { useParams, useNavigate } from "react-router-dom";
import ItemsTable from "../../components/ItemsTable";

// ─── Constants ────────────────────────────────────────────────────────────────
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
const paymentModes  = ["Cash", "Bank Transfer", "UPI", "Cheque", "NEFT/RTGS"];
const WALKIN_ID     = "__walkin__";
const emptyCustomer = {
  name: "", company_name: "", business_type: "",
  gstin: "", phone: "",
  address_line1: "", address_line2: "", city: "", state: "", state_code: "", pincode: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const numberToWords = (num) => {
  if (num == null || isNaN(num)) return "";
  if (num === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const convert = (n) => {
    if (!Number.isFinite(n) || n < 0) return "";
    if (n < 20)   return ones[n];
    if (n < 100)  return tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
    if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " "+convert(n%100) : "");
    if (n < 100000)   return convert(Math.floor(n/1000))    + " Thousand" + (n%1000   ? " "+convert(n%1000)   : "");
    if (n < 10000000) return convert(Math.floor(n/100000))  + " Lakh"     + (n%100000 ? " "+convert(n%100000) : "");
    return convert(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " "+convert(n%10000000) : "");
  };
  return convert(Math.floor(num));
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", maxWidth: "100%", padding: "9px 12px",
  border: "1.5px solid #e5e7eb", borderRadius: "8px",
  fontSize: "13.5px", color: "#111827", background: "#ffffff",
  outline: "none", boxSizing: "border-box", overflow: "hidden",
};

const Field = ({ label, required, children, className = "", hint }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "#111827", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
      {label}{required && <span style={{ color: "#ef4444" }}>*</span>}
      {!required && hint && <span style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>({hint})</span>}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = "text", readOnly }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
    style={{ ...inputStyle, background: "#ffffff", cursor: readOnly ? "not-allowed" : "text" }}
    onFocus={(e) => !readOnly && (e.target.style.borderColor = "#3b82f6")}
    onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")} />
);

const Section = ({ title, children }) => (
  <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #e5e7eb", marginBottom: "20px" }}>
    <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#374151", textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ padding: "20px" }}>{children}</div>
  </div>
);

const OtpInput = ({ value = "", onChange, length, numbersOnly = false }) => (
  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
    {Array.from({ length }).map((_, index) => (
      <input key={index} maxLength={1} value={value[index] || ""}
        onChange={(e) => {
          const raw = numbersOnly
            ? e.target.value.replace(/[^0-9]/g, "")
            : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const newVal = value.substring(0, index) + raw + value.substring(index + 1);
          onChange(newVal);
          if (raw && e.target.nextSibling) e.target.nextSibling.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !value[index] && e.target.previousSibling) e.target.previousSibling.focus();
          if (e.key === "ArrowLeft"  && e.target.previousSibling) { e.preventDefault(); e.target.previousSibling.focus(); }
          if (e.key === "ArrowRight" && e.target.nextSibling)     { e.preventDefault(); e.target.nextSibling.focus(); }
        }}
        style={{ width: "32px", height: "36px", textAlign: "center", fontSize: "14px", fontWeight: 600, border: "1.5px solid #d1d5db", borderRadius: "6px", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
        onBlur={(e)  => (e.target.style.borderColor = "#d1d5db")} />
    ))}
  </div>
);

// ─── Customer Selector Modal ──────────────────────────────────────────────────
function CustomerSelectorModal({ customers, onSelect, onClose, onCustomerCreated }) {
  const [tab, setTab]       = useState("list");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ ...emptyCustomer });

const filtered = customers.filter(c =>
  (`${c.first_name} ${c.last_name}` || "").toLowerCase().includes(search.toLowerCase()) ||
  (c.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
  (c.city || "").toLowerCase().includes(search.toLowerCase())
);

  const updateForm = (field, val) => {
    if (field === "state") {
      const st = indianStates.find(s => s.name.toLowerCase().trim() === val.toLowerCase().trim());
      setForm(f => ({ ...f, state: val, state_code: st ? st.code : "" }));
    } else {
      setForm(f => ({ ...f, [field]: val }));
    }
  };

  const handleSelectCustomer = (c) => {
    onSelect({
      id: c._id || c.id, _id: c._id,
   name: `${c.first_name} ${c.last_name}` || "", company_name: c.company_name || "",
      business_type: c.business_type || "", gstin: c.gstin || "",
    phone: c.phone || "",
      address_line1: c.address_line_1 || "", address_line2: c.address_line_2 || "",
      city: c.city || "", state: c.state || "", state_code: c.state_code || "",
      pincode: c.pincode || "",
    });
  };

  const handleWalkIn = () => {
    onSelect({
      id: WALKIN_ID, name: "", company_name: "", business_type: "",
      gstin: "", phone: "", address_line1: "", address_line2: "",
      city: "", state: "", state_code: "", pincode: "", isWalkIn: true,
    });
  };

  const handleSaveNew = async () => {
    if (!form.name.trim()) { alert("Customer name is required"); return; }
    if (!form.state)       { alert("State is required");         return; }

    setSaving(true);
    try {
      const payload = {
        customer_name:  form.name.trim(),
        company_name:   form.company_name.trim(),
        business_type:  form.business_type,
        gst:            form.gstin.trim(),
        contact_no_1:   form.phone.trim(),
        address_line_1: form.address_line1.trim(),
        address_line_2: form.address_line2.trim(),
        city:           form.city.trim(),
        state:          form.state,
        state_code:     form.state_code,
        pincode:        form.pincode.trim(),
        company_id:     localStorage.getItem("company_id"),
      };

      const res = await axios.post("http://localhost:8000/api/customers", payload);

      if (res.data.success) {
        const created = res.data.data;
        if (onCustomerCreated) onCustomerCreated(created);
        onSelect({
          id:            created._id,
          _id:           created._id,
          name:          created.customer_name  || form.name,
          company_name:  created.company_name   || form.company_name,
          business_type: created.business_type  || form.business_type,
          gstin:         created.gst            || form.gstin,
          phone:         created.contact_no_1   || form.phone,
          address_line1: created.address_line_1 || form.address_line1,
          address_line2: created.address_line_2 || form.address_line2,
          city:          created.city           || form.city,
          state:         created.state          || form.state,
          state_code:    created.state_code     || form.state_code,
          pincode:       created.pincode        || form.pincode,
        });
      } else {
        alert(res.data.message || "Failed to save customer");
      }
    } catch (err) {
      console.error("Save customer error:", err);
      alert(err.response?.data?.message || "Server error while saving customer");
    } finally {
      setSaving(false);
    }
  };

  const TAB = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
      fontSize: "13px", fontWeight: tab === key ? 700 : 500, fontFamily: "inherit",
      color: tab === key ? "#2563eb" : "#6b7280",
      borderBottom: tab === key ? "2.5px solid #2563eb" : "2.5px solid transparent",
      transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "620px", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px 0", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>Select Customer</div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = "#111827"} onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}>×</button>
          </div>
          <div style={{ display: "flex" }}>
            {TAB("list", "Customer List")}
            {TAB("new",  "+ Add New Customer")}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Tab: Customer List ── */}
          {tab === "list" && (
            <div>
              <div style={{ padding: "14px 22px 0" }}>
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, GSTIN or city..."
                  style={{ ...inputStyle, background: "#f9fafb", fontSize: "13px" }}
                  onFocus={e => e.target.style.borderColor = "#3b82f6"}
                  onBlur={e  => e.target.style.borderColor = "#e5e7eb"} />
              </div>

              {/* Walk-in row */}
              <div onClick={handleWalkIn}
                style={{ margin: "12px 22px 0", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 16px", background: "#fffbeb", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fef3c7"}
                onMouseLeave={e => e.currentTarget.style.background = "#fffbeb"}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🚶</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#92400e", fontSize: "13.5px" }}>Walk-in Customer</div>
                  <div style={{ fontSize: "12px", color: "#b45309", marginTop: "1px" }}>One-time sale — no customer record needed</div>
                </div>
                <span style={{ background: "#f59e0b", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", whiteSpace: "nowrap" }}>QUICK</span>
              </div>

              <div style={{ padding: "14px 22px 6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Saved Customers {filtered.length > 0 && `(${filtered.length})`}
                </span>
              </div>

              <div style={{ paddingBottom: "14px" }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "20px 22px", textAlign: "center", fontSize: "13px", color: "#9ca3af" }}>
                    No customers found.{" "}
                    <span onClick={() => setTab("new")} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>Add a new one?</span>
                  </div>
                ) : filtered.map(c => (
                  <div key={c._id || c.id} onClick={() => handleSelectCustomer(c)}
                    style={{ padding: "11px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid #f3f4f6" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", color: "#2563eb", flexShrink: 0 }}>
                    {(c.first_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: "13.5px" }}>
                     {`${c.first_name} ${c.last_name}`}
                        {c.company_name ? <span style={{ fontWeight: 400, color: "#6b7280" }}> ({c.company_name})</span> : ""}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                     {c.gstin && <span>{c.gstin}</span>}

                        {c.city         && <span>{c.city}{c.state ? ", " + c.state : ""}</span>}
                       {c.phone && <span>📞 {c.phone}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: "18px", color: "#d1d5db" }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Add New Customer ── */}
          {tab === "new" && (
            <div style={{ padding: "20px 22px" }}>

              {/* Row 1: Name (span 2) + Business Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="Customer Name" required>
                    <TextInput value={form.name} onChange={e => updateForm("name", e.target.value)} placeholder="Owner / Contact name" />
                  </Field>
                </div>
                <Field label="Business Type">
                  <select value={form.business_type} onChange={e => updateForm("business_type", e.target.value)} style={inputStyle}>
                    <option value="">Select type</option>
                    {businessTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 2: Company + Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <Field label="Company Name">
                  <TextInput value={form.company_name} onChange={e => updateForm("company_name", e.target.value)} placeholder="Company Pvt Ltd" />
                </Field>
                <Field label="Mobile Number">
                  <OtpInput value={form.phone} onChange={v => updateForm("phone", v)} length={10} numbersOnly />
                </Field>
              </div>

              {/* Row 3: GSTIN full width */}
              <div style={{ marginBottom: "14px" }}>
                <Field label="GSTIN">
                  <OtpInput value={form.gstin} onChange={v => updateForm("gstin", v)} length={15} />
                </Field>
              </div>

              {/* Address divider */}
              <div style={{ borderTop: "1px dashed #e5e7eb", margin: "4px 0 16px", position: "relative" }}>
                <span style={{ position: "absolute", top: "-9px", left: 0, background: "#fff", paddingRight: "8px", fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Address</span>
              </div>

              {/* Row 4: Address lines */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <Field label="Address Line 1">
                  <TextInput value={form.address_line1} onChange={e => updateForm("address_line1", e.target.value)} placeholder="Building, Street, Area" />
                </Field>
                <Field label="Address Line 2">
                  <TextInput value={form.address_line2} onChange={e => updateForm("address_line2", e.target.value)} placeholder="Landmark (optional)" />
                </Field>
              </div>

              {/* Row 5: City + State */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <Field label="City">
                  <TextInput value={form.city} onChange={e => updateForm("city", e.target.value)} placeholder="Mumbai" />
                </Field>
                <Field label="State" required>
                  <select value={form.state} onChange={e => updateForm("state", e.target.value)} style={inputStyle}>
                    <option value="">Select state</option>
                    {indianStates.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 6: State Code (read-only, auto) + Pincode */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="State Code">
                  <TextInput value={form.state_code} readOnly placeholder="Auto-filled" />
                </Field>
                <Field label="Pincode">
                  <TextInput value={form.pincode} onChange={e => updateForm("pincode", e.target.value)} placeholder="400001" />
                </Field>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#fafafa", flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: "9px 22px", border: "1.5px solid #d1d5db", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            Cancel
          </button>
          {tab === "new" && (
            <button
              onClick={handleSaveNew}
              disabled={saving}
              style={{ padding: "9px 22px", border: "none", borderRadius: "8px", background: saving ? "#93c5fd" : "#1e3a5f", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "8px", minWidth: "170px", justifyContent: "center" }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#16314d"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = saving ? "#93c5fd" : "#1e3a5f"; }}>
              {saving
                ? <><span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "vspin 0.7s linear infinite" }} /> Saving...</>
                : "Save & Select Customer"
              }
            </button>
          )}
        </div>

      </div>
      <style>{`@keyframes vspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Shipping Address Modal ───────────────────────────────────────────────────
function ShippingAddressModal({ customerForm, setCustomerForm, onStateChange, onClose }) {
  const update = (field, val) => {
    if (field === "state") {
      const st = indianStates.find(s => s.name.toLowerCase().trim() === val.toLowerCase().trim());
      setCustomerForm(v => ({ ...v, state: val, state_code: st ? st.code : "" }));
      onStateChange(val);
    } else {
      setCustomerForm(v => ({ ...v, [field]: val }));
    }
  };

  return (
    <Modal title="Edit Shipping Address" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
          <div className="text-sm font-semibold text-gray-800">{customerForm.name}</div>
          {customerForm.phone && <div className="text-xs text-gray-500">Phone: {customerForm.phone}</div>}
        </div>
        <div className="grid grid-cols-1 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Address Line 1" value={customerForm.address_line1} onChange={e => update("address_line1", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Address Line 2" value={customerForm.address_line2} onChange={e => update("address_line2", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="City"           value={customerForm.city}           onChange={e => update("city", e.target.value)} />
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={customerForm.state} onChange={e => update("state", e.target.value)}>
            <option value="">Select State</option>
            {indianStates.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
          </select>
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed" placeholder="State Code" value={customerForm.state_code} readOnly />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Pincode" value={customerForm.pincode} onChange={e => update("pincode", e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SalesInvoice() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;
  const today    = new Date().toISOString().split("T")[0];

  const [states,       setStates]       = useState([]);
  const [cities,       setCities]       = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => { fetchStates(); fetchItems(); }, []);

  const fetchStates  = async () => {
    try { const r = await axios.get("http://localhost:8000/api/states"); if (r.data.success) setStates(r.data.data); } catch (e) { console.log(e); }
  };
  const fetchCities  = async (state) => {
    try { const r = await axios.get(`http://localhost:8000/api/cities/${state}`); if (r.data.success) setCities(r.data.data); } catch (e) { console.log(e); }
  };
 const fetchCustomers = async () => {
  try { 
    const r = await axios.get("http://localhost:8000/api/customers");  if (r.data.success) setCustomers(r.data.data); } catch (e) { console.log(e); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  // Sales meta
  const [invoiceNo,     setInvoiceNo]     = useState("");
  const [invoiceDate,   setInvoiceDate]   = useState(today);
  const [dueDate,       setDueDate]       = useState("");
  const [salesType,     setSalesType]     = useState("Credit");
  const [reverseCharge, setReverseCharge] = useState("No");
  const [notes,         setNotes]         = useState("");

  // Customers
  const [customers,          setCustomers]         = useState([]);
  const [selectedCustomer,   setSelectedCustomer]  = useState(null);
  const [customerForm,       setCustomerForm]       = useState({ ...emptyCustomer });
  const [shippingForm,       setShippingForm]       = useState({ ...emptyCustomer });
  const [showCustomerModal,  setShowCustomerModal]  = useState(false);
  const [showShippingModal,  setShowShippingModal]  = useState(false);

  useEffect(() => {
    if (isEdit && customers.length > 0 && !isDataLoaded) {
      fetchSalesById();
      setIsDataLoaded(true);
    }
  }, [id, customers, isDataLoaded]);

  const handleCustomerCreated = (created) => {
    setCustomers(prev => [created, ...prev]);
  };

  const handleCustomerSelect = (c) => {
    const st = indianStates.find(s => s.name.toLowerCase().trim() === (c.state || "").toLowerCase().trim());
    setSelectedCustomer(c);
    const mapped = {
      name:          c.name          || c.customer_name  || "",
      company_name:  c.company_name                      || "",
      business_type: c.business_type                     || "",
      gstin:         c.gstin         || c.gst            || "",
      phone:         c.phone         || c.contact_no_1   || "",
      address_line1: c.address_line1 || c.address_line_1 || "",
      address_line2: c.address_line2 || c.address_line_2 || "",
      city:          c.city                              || "",
      state:         c.state                             || "",
      state_code:    c.state_code    || (st ? st.code : ""),
      pincode:       c.pincode                           || "",
    };
    setCustomerForm(mapped);
    setShippingForm(mapped);
    setShowCustomerModal(false);
  };

  // Items
const [items, setItems] = useState([]);
  const [otherCharges,  setOtherCharges]  = useState(0);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [itemList,      setItemList]      = useState([]);

 const updateItem = (i, f, v) => {
  setItems(prev => {
    const updated = [...prev];

    if (f === "qty") {
      const enteredQty = Number(v) || 0;

    const product = itemList.find(
  p => String(p._id) === String(updated[i].product_id)
);

const maxStock = Number(
  updated[i].total_stock ??
  updated[i].total ??
  updated[i].stock ??
  product?.total ??
  product?.stock ??
  0
);

      if (enteredQty > maxStock) {
        alert(`Only ${maxStock} items available in stock`);
        updated[i].qty = maxStock;
      } else {
        updated[i].qty = enteredQty;
      }
    } else {
      updated[i][f] = v;
    }

    return updated;
  });
};

const removeItem = (i) => {
  setItems(prev => prev.filter((_, idx) => idx !== i));
};
  const addItems   = (newItems) => setItems(prev => [...prev, ...newItems]);

  // ── Tax calculations ──────────────────────────────────────────────────────
  // For sales: Bill To (customer) state vs Ship To (delivery) state
  const isIntraState =
    Boolean(customerForm.state_code) &&
    Boolean(shippingForm.state_code) &&
    customerForm.state_code === shippingForm.state_code;

const itemTaxable = (item) => {
  const qty = Number(item.qty) || 0;
  const price = Number(item.salePrice) || 0;
  const discount = Number(item.discount) || 0;

return Math.max(0, qty * price - discount);
};
 const itemTaxBreakup = (item) => {
  const t = itemTaxable(item);
  const r = Number(item.gstRate) || 0;

  if (t <= 0) return { cgst: 0, sgst: 0, igst: 0 };

  return isIntraState
    ? { cgst: (t * r) / 200, sgst: (t * r) / 200, igst: 0 }
    : { cgst: 0, sgst: 0, igst: (t * r) / 100 };
};
 const itemTotal = (item) => {
  const t = itemTaxBreakup(item);
  return itemTaxable(item) + t.cgst + t.sgst + t.igst;
};
 const subtotal = items.reduce((s, i) => {
  const qty = Number(i.qty) || 0;
  const price = Number(i.salePrice) || 0;
  return s + qty * price;
}, 0);

const totalDiscount = items.reduce((s, i) => {
  return s + (Number(i.discount) || 0);
}, 0);

const taxableAmount = subtotal - totalDiscount - (Number(extraDiscount) || 0);

const totalTax = items.reduce((s, i) => {
  const t = itemTaxBreakup(i);
  return s + t.cgst + t.sgst + t.igst;
}, 0);

const beforeRound = taxableAmount + totalTax + (Number(otherCharges) || 0);

const grandTotal = Math.round(beforeRound || 0);

const roundOff = grandTotal - beforeRound;

  const taxSummary = items.reduce((acc, item) => {
    const key = item.hsn || "N/A";
    if (!acc[key]) acc[key] = { hsn: key, taxable: 0, taxAmt: 0, rate: item.gstRate, cgst: 0, sgst: 0, igst: 0 };
    acc[key].taxable += itemTaxable(item);
    const t = itemTaxBreakup(item);
    acc[key].cgst += t.cgst; acc[key].sgst += t.sgst; acc[key].igst += t.igst;
    acc[key].taxAmt += t.cgst + t.sgst + t.igst;
    return acc;
  }, {});

  // Payment
  const [amountReceived, setAmountReceived] = useState(0);
  const [paymentMode,    setPaymentMode]    = useState("Cash");
  const [paymentRef,     setPaymentRef]     = useState("");
  const balanceDue = grandTotal - Number(amountReceived);

  const fetchItems = async () => {
    try {
      const companyId = localStorage.getItem("company_id") || "69c951fadb4d82158ef524ea";
      const res = await axios.get(`http://localhost:8000/api/product/company/${companyId}`);
      if (res.data.success) setItemList(res.data.data);
    } catch (err) { console.log(err); }
  };

  const fetchSalesById = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/sales/${id}`);
      if (res.data.success) {
        const p = res.data.data;
        setInvoiceNo(p.invoice_no || "");
        setInvoiceDate(p.invoice_date?.split("T")[0] || "");
        setDueDate(p.due_date?.split("T")[0] || "");
        setSalesType(p.sales_type || "Credit");
        setReverseCharge(p.reverse_charge || "No");
        setNotes(p.notes || "");
        if (p.customer_id) {
          const cid = typeof p.customer_id === "object" ? p.customer_id._id : p.customer_id;
          const existing = customers.find(c => String(c._id) === String(cid));
          handleCustomerSelect(existing || {
            _id: cid,
            customer_name: p.customer_name || "",
            contact_no_1:  p.contact_no_1  || "",
            address_line_1: p.address_line_1 || "",
            city:           p.city          || "",
            state:          p.state         || "",
            state_code:     p.state_code    || "",
            pincode:        p.pincode       || "",
          });
        }
       const mappedItems = (p.details || []).map(it => {
  const product = itemList.find(
    p => String(p._id) === String(it.product_id)
  );

  return {
    name: it.product_name || "",
    product_id: it.product_id || null,
    qty: Number(it.qty) || 1,
    salePrice: Number(it.price) || 0,
    discount: Number(it.discount) || 0,

    hsn: it.hsn || "",
    unit: it.unit || "NOS",
    gstRate: Number(it.gst_rate) || 18,
    itemType: it.item_type || "Goods",

    total_stock: product?.total || product?.stock || 0,   // 🔥 ADD THIS
  };
});
       setItems(mappedItems.length > 0 ? mappedItems : []);
        setAmountReceived(Number(p.amount_received) || 0);
        setPaymentMode(p.payment_mode || "Cash");
      }
    } catch (err) { console.error("EDIT FETCH ERROR:", err); }
  };

  const applyOverallDiscount = (overallDiscount) => {
    if (!items.length) return;
    const perItem = overallDiscount / items.length;
    setItems(items.map(item => ({
      ...item,
      baseDiscount:  item.baseDiscount ?? item.discount ?? 0,
      extraDiscount: Number(perItem.toFixed(2)),
      discount:      Number(((item.baseDiscount ?? item.discount ?? 0) + perItem).toFixed(2)),
    })));
  };

  useEffect(() => {
    if (extraDiscount > 0 && items.length > 0) applyOverallDiscount(extraDiscount);
  }, [items.length]);

  const handleSaveSales = async () => {
    if (!customerForm.name.trim())  { alert("Customer Name is required");       return; }
    if (!customerForm.state)        { alert("Customer State is required");      return; }
    if (!customerForm.state_code)   { alert("Customer State Code is required"); return; }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name)                     { alert(`Item Name required in row ${i+1}`);   return; }
      if (!it.unit)                     { alert(`Unit required in row ${i+1}`);         return; }
      if (!it.qty || it.qty <= 0)       { alert(`Qty must be > 0 in row ${i+1}`);      return; }
      if (!it.salePrice || it.salePrice <= 0) { alert(`Price must be > 0 in row ${i+1}`); return; }
    }
    const payload = {
      company_id:     localStorage.getItem("company_id"),
      invoice_no:     invoiceNo,
      invoice_date:   invoiceDate,
      due_date:       dueDate,
      sales_type:     salesType,
      reverse_charge: reverseCharge,
      notes,
    client_id: selectedCustomer?._id || null,
customer_name: customerForm.name || "Walk-in",
      details: items.map(it => ({
        product_name: it.name, product_id: it.product_id || null, item_type: it.itemType,
        sku: it.sku, hsn: it.hsn, unit: it.unit, qty: it.qty,
        price: it.salePrice, discount: it.discount || 0, gst_rate: it.gstRate || 18, amount: itemTotal(it),
      })),
      sub_total:       subtotal,
      total_discount:  totalDiscount,
      taxable_amount:  taxableAmount,
      total_tax:       totalTax,
      other_charges:   Number(otherCharges) || 0,
      round_off:       roundOff,
      total_amount:    grandTotal,
      amount_received: Number(amountReceived),
      payment_mode:    paymentMode,
      payment_ref:     paymentRef,
      status: Number(amountReceived) >= grandTotal ? "Paid" : "Pending",
    };
    try {
      const res = isEdit
        ? await axios.put(`http://localhost:8000/api/sales/${id}`, payload)
        : await axios.post("http://localhost:8000/api/sales", payload);
      if (res.data.success) { alert("Sales Invoice Saved Successfully"); navigate("/sales-invoice-list"); }
      else alert(res.data.message || "Error saving");
    } catch (err) { console.error(err); alert("Server Error"); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", margin: "0" }}>

      {/* Modals */}
      {showCustomerModal && (
        <CustomerSelectorModal
          customers={customers}
          onSelect={handleCustomerSelect}
          onCustomerCreated={handleCustomerCreated}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
      {showShippingModal && (
        <ShippingAddressModal
          customerForm={shippingForm} setCustomerForm={setShippingForm}
          onStateChange={fetchCities}
          onClose={() => setShowShippingModal(false)}
        />
      )}

      {/* ── Bill To / Ship To / Invoice Details ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>

        <div style={{ display: "flex", borderRight: "1px solid #e5e7eb" }}>

          {/* BILL TO */}
          <div style={{ flex: 1, padding: "16px 18px", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Bill To</span>
              {selectedCustomer && (
                <button onClick={() => setShowCustomerModal(true)}
                  style={{ padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: "5px", background: "#fff", fontSize: "12px", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  Change Customer
                </button>
              )}
            </div>
            {!selectedCustomer && (
              <div onClick={() => setShowCustomerModal(true)}
                style={{ border: "1.5px dashed #93c5fd", borderRadius: "8px", padding: "22px 16px", textAlign: "center", cursor: "pointer", color: "#3b82f6" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.background = "transparent"; }}>
                <div style={{ fontSize: "22px", lineHeight: 1, marginBottom: "4px" }}>+</div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>Add Customer</div>
              </div>
            )}
            {selectedCustomer?.isWalkIn && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} placeholder="Walk-in name (optional)" style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px" }} />
                <input value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" maxLength={10} style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px" }} />
              </div>
            )}
            {selectedCustomer && !selectedCustomer.isWalkIn && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{customerForm.name}</div>
                {customerForm.company_name && <div style={{ fontSize: "12px", color: "#6b7280" }}>{customerForm.company_name}</div>}
                {customerForm.phone && <div style={{ fontSize: "13px", color: "#374151" }}>Phone: <strong>{customerForm.phone}</strong></div>}
                {customerForm.gstin && <div style={{ marginTop: "2px" }}><span style={{ fontFamily: "monospace", fontSize: "11.5px", color: "#1d4ed8", background: "#eff6ff", padding: "2px 7px", borderRadius: "4px" }}>{customerForm.gstin}</span></div>}
                {(customerForm.address_line1 || customerForm.city) && (
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", lineHeight: 1.5 }}>
                    {[customerForm.address_line1, customerForm.city].filter(Boolean).join(", ")}
                    {customerForm.state && <>{", "}{customerForm.state} ({customerForm.state_code || "--"})</>}
                    {customerForm.pincode && <> — {customerForm.pincode}</>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SHIP TO */}
          <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ship To</span>
              {selectedCustomer && (
                <button onClick={() => setShowShippingModal(true)}
                  style={{ padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: "5px", background: "#fff", fontSize: "12px", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  Change
                </button>
              )}
            </div>
            {!selectedCustomer && (
              <div style={{ border: "1.5px dashed #e5e7eb", borderRadius: "8px", padding: "22px 16px", textAlign: "center", color: "#d1d5db" }}>
                <div style={{ fontSize: "13px" }}>Select a customer first</div>
              </div>
            )}
            {selectedCustomer?.isWalkIn && (
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{customerForm.name || "Walk-in"}</div>
            )}
            {selectedCustomer && !selectedCustomer.isWalkIn && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{shippingForm.name}</div>
                {shippingForm.phone && <div style={{ fontSize: "13px", color: "#374151" }}>Phone: <strong>{shippingForm.phone}</strong></div>}
                {shippingForm.gstin && <div style={{ marginTop: "2px" }}><span style={{ fontFamily: "monospace", fontSize: "11.5px", color: "#1d4ed8", background: "#eff6ff", padding: "2px 7px", borderRadius: "4px" }}>{shippingForm.gstin}</span></div>}
                {(shippingForm.address_line1 || shippingForm.city) && (
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", lineHeight: 1.5 }}>
                    {[shippingForm.address_line1, shippingForm.city].filter(Boolean).join(", ")}
                    {shippingForm.state && <>{", "}{shippingForm.state} ({shippingForm.state_code || "--"})</>}
                    {shippingForm.pincode && <> — {shippingForm.pincode}</>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* INVOICE DETAILS */}
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#6b7280" }}>Invoice No</label>
              <input value={invoiceNo || ""} onChange={e => setInvoiceNo(e.target.value)} placeholder="e.g. INV/2526/001" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6b7280" }}>Invoice Date *</label>
              <input type="date" value={invoiceDate || ""} onChange={e => setInvoiceDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6b7280" }}>Due Date</label>
              <input type="date" value={dueDate || ""} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#6b7280" }}>Reverse Charge</label>
              <select value={reverseCharge || "No"} onChange={e => setReverseCharge(e.target.value)} style={inputStyle}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <label style={{ fontSize: "12px", color: "#6b7280" }}>Notes / Remarks</label>
            <input value={notes || ""} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this sale..." style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Items / Stock ── */}
      <Section title="Items / Stock">
      <ItemsTable
  items={items} itemList={itemList}
  updateItem={updateItem} removeItem={removeItem} addItems={addItems}
  itemTaxable={itemTaxable} itemTaxBreakup={itemTaxBreakup} itemTotal={itemTotal}
  priceField="salePrice"
  priceLabel="Sale Price"
  isSales={true}
/>

        {/* Totals panel */}
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "380px", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
              <span style={{ color: "#2563eb", fontWeight: 600 }}>+ Additional Charges</span>
              <input type="text" value={otherCharges}onChange={e => setOtherCharges(Number(e.target.value) || 0)}
                style={{ width: "70px", padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: "5px", fontSize: "12.5px", textAlign: "right", outline: "none", fontFamily: "inherit" }} />
            </div>

            {[
              { label: "Taxable Amount", value: `₹ ${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
              { label: "GST Amount",     value: `₹ ${totalTax.toLocaleString("en-IN",      { minimumFractionDigits: 2 })}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                <span style={{ color: "#374151" }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 500 }}>{value}</span>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#374151" }}>Discount</span>
                <input type="text" value={extraDiscount}
                  onChange={e => { const val = Number(e.target.value); setExtraDiscount(val); applyOverallDiscount(val); }}
                  style={{ width: "70px", padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: "5px", fontSize: "12.5px", textAlign: "right", outline: "none" }} />
              </div>
              <span style={{ color: "#374151" }}>- ₹ {Number(extraDiscount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", color: "#374151" }}>
                <input type="checkbox" style={{ width: "14px", height: "14px", accentColor: "#2563eb" }} /> Auto Round Off
              </label>
              <span style={{ color: "#374151", fontSize: "12.5px" }}>₹ {Math.abs(roundOff).toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Total Amount</span>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ padding: "6px 16px 8px", fontSize: "11.5px", color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ color: "#374151" }}>In Words: </strong>{numberToWords(Math.round(grandTotal))} Rupees Only
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", color: "#374151" }}>
                Mark as fully received
                <input type="checkbox" onChange={e => setAmountReceived(e.target.checked ? grandTotal : 0)} style={{ width: "15px", height: "15px", accentColor: "#2563eb" }} />
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
              <span style={{ color: "#374151", minWidth: "110px" }}>Amount Received</span>
              <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
                <span style={{ padding: "6px 8px", background: "#f9fafb", borderRight: "1px solid #d1d5db", color: "#374151" }}>₹</span>
                <input type="text" value={amountReceived} onChange={e => setAmountReceived(Number(e.target.value))}
                  style={{ flex: 1, padding: "6px 8px", border: "none", outline: "none", fontSize: "13px", fontFamily: "inherit" }} />
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                  style={{ padding: "6px 8px", border: "none", borderLeft: "1px solid #d1d5db", outline: "none", fontSize: "13px", background: "#f9fafb", fontFamily: "inherit", cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                  {paymentModes.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: "13.5px" }}>
              <span style={{ fontWeight: 700, color: balanceDue > 0 ? "#dc2626" : "#16a34a" }}>Balance Due</span>
              <span style={{ fontWeight: 800, color: balanceDue > 0 ? "#dc2626" : "#16a34a" }}>
                ₹ {Math.abs(balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* HSN Tax Summary */}
        {Object.keys(taxSummary).length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>Tax Summary (HSN Wise)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", border: "1px solid #e5e7eb" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {(isIntraState
                    ? ["Sr.", "HSN/SAC", "Taxable Value", "SGST %", "SGST Amt", "CGST %", "CGST Amt", "Total Tax"]
                    : ["Sr.", "HSN/SAC", "Taxable Value", "IGST %", "IGST Amt", "Total Tax"]
                  ).map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: ["Taxable Value","SGST Amt","CGST Amt","IGST Amt","Total Tax"].includes(h) ? "right" : h.includes("%") ? "center" : "left", fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(taxSummary).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 10px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600, fontFamily: "monospace" }}>{row.hsn}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>₹ {row.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    {isIntraState ? (
                      <>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{(row.rate / 2).toFixed(0)}%</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>₹ {row.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{(row.rate / 2).toFixed(0)}%</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>₹ {row.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {row.taxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{row.rate}%</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>₹ {row.taxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {row.taxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                  </tr>
                ))}
                <tr style={{ background: "#f0f4f8" }}>
                  <td colSpan={2} style={{ padding: "8px 10px", fontWeight: 700 }}>TOTAL</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  {isIntraState ? (
                    <>
                      <td />
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {Object.values(taxSummary).reduce((s, r) => s + r.sgst, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td />
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {Object.values(taxSummary).reduce((s, r) => s + r.cgst, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </>
                  ) : (
                    <>
                      <td />
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "40px" }}>
        <button style={{ padding: "11px 28px", border: "1.5px solid #d1d5db", borderRadius: "8px", background: "#fff", fontSize: "13.5px", fontWeight: 600, color: "#374151", cursor: "pointer" }}
          onMouseEnter={e => e.target.style.background = "#f9fafb"} onMouseLeave={e => e.target.style.background = "#fff"}>
          Cancel
        </button>
        <button onClick={handleSaveSales}
          style={{ padding: "11px 28px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13.5px", fontWeight: 700, color: "#fff", cursor: "pointer" }}
          onMouseEnter={e => e.target.style.background = "#16314d"} onMouseLeave={e => e.target.style.background = "#1e3a5f"}>
          {isEdit ? "Update Sales Invoice" : "Save Sales Invoice"}
        </button>
      </div>
    </div>
  );
}