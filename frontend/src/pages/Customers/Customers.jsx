import { useState } from "react";
import axios from "axios";

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

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "13.5px",
  color: "#111827",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const emptyForm = {
 customer_name: "",  company_name: "", customer_type: "", business_type: "",
  customer_gstin: "", customer_pan: "", customer_phone: "", customer_alt_phone: "",
  customer_email: "", customer_website: "",
  customer_address_line1: "", customer_address_line2: "",
  customer_city: "", customer_state: "", customer_state_code: "", customer_pincode: "",
 
};

const validateGST = (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
const validatePAN = (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
const validateEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePhone = (v) => !v || /^[6-9][0-9]{9}$/.test(v);
const validatePincode = (v) => !v || /^[1-9][0-9]{5}$/.test(v);

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={{
        fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em",
        color: "#111827", textTransform: "uppercase", display: "block", marginBottom: "5px",
      }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", readOnly }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{ ...inputStyle, cursor: readOnly ? "not-allowed" : "text" }}
      onFocus={(e) => { if (!readOnly) e.target.style.borderColor = "#3b82f6"; }}
      onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        ...inputStyle,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #e5e7eb", overflow: "hidden", marginBottom: "20px" }}>
      <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
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
        <input
          key={index}
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => {
            const raw = numericOnly
              ? e.target.value.replace(/[^0-9]/g, "")
              : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const newVal = value.substring(0, index) + raw + value.substring(index + 1);
            onChange(newVal);
            if (raw && e.target.nextSibling) e.target.nextSibling.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[index] && e.target.previousSibling)
              e.target.previousSibling.focus();
            if (e.key === "ArrowLeft" && e.target.previousSibling) {
              e.preventDefault();
              e.target.previousSibling.focus();
            }
            if (e.key === "ArrowRight" && e.target.nextSibling) {
              e.preventDefault();
              e.target.nextSibling.focus();
            }
          }}
          style={{
            width: "32px", height: "36px", textAlign: "center",
            fontSize: "14px", fontWeight: 600,
            border: "1.5px solid #d1d5db", borderRadius: "6px",
            outline: "none", background: "#fff", color: "#111827",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; }}
          onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; }}
        />
      ))}
    </div>
  );
}

function ErrorMsg({ field, errors }) {
  if (!errors[field]) return null;
  return (
    <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "3px", display: "block" }}>
      {errors[field]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Customers() {
const [form, setForm] = useState(emptyForm);
const [errors, setErrors] = useState({});
const [submitted, setSubmitted] = useState(false);

const update = (field, value) => {
  if (field === "customer_state") {
    const st = indianStates.find((s) => s.name === value);
    setForm((prev) => ({
      ...prev,
      customer_state: value,
      customer_state_code: st ? st.code : "",
    }));
  } else {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  setErrors((prev) => ({
    ...prev,
    [field]: "",
  }));
};


  const validate = () => {
    const e = {};
if (!form.customer_name.trim())
  e.customer_name = "Customer name is required";
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

const handleSave = async () => {
  const e = validate();
  if (Object.keys(e).length) {
    setErrors(e);
    return;
  }

  try {
    const res = await axios.post("http://localhost:8000/api/customers", form);

    if (res.data.success) {
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
        window.location.href = "/customer-list"; // redirect
      }, 1000);
    }

  } catch (err) {
    console.error("SAVE ERROR:", err);
  }
};

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" };

  return (
    <div style={{ width: "100%", margin: "0" }}>

      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0b1324", letterSpacing: "-0.3px" }}>
            Add Customer
          </h1>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>
            Create a new customer record
          </p>
        </div>
        {submitted && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "8px", padding: "10px 16px" }}>
            <span style={{ fontSize: "16px" }}>✅</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a" }}>Customer saved successfully!</span>
          </div>
        )}
      </div>

    
{/* Basic Info */}
<Section title="Basic Information" >
  <div style={grid2}>
    
    {/* Customer Name (Person) */}
    <Field label="Customer Name" required>
      <TextInput
        value={form.customer_name}
        onChange={(e) => update("customer_name", e.target.value)}
        placeholder="Rahul Sharma"
      />
      <ErrorMsg field="customer_name" errors={errors} />
    </Field>

    {/* Company Name */}
    <Field label="Company Name">
      <TextInput
        value={form.company_name}
        onChange={(e) => update("company_name", e.target.value)}
        placeholder="ABC Industries Pvt Ltd"
      />
      <ErrorMsg field="company_name" errors={errors} />
    </Field>

    {/* Customer Type */}
    <Field label="Customer Type">
      <SelectInput
        value={form.customer_type}
        onChange={(e) => update("customer_type", e.target.value)}
        placeholder="Select Type"
        options={customerTypes.map((t) => ({ value: t, label: t }))}
      />
    </Field>

    {/* Business Type */}
    <Field label="Business Type">
      <SelectInput
        value={form.business_type}
        onChange={(e) => update("business_type", e.target.value)}
        placeholder="Select Business Type"
        options={businessTypes.map((t) => ({ value: t, label: t }))}
      />
    </Field>

  </div>
</Section>

      {/* Tax & Identity */}
      <Section title="Tax & Identity" >
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
            {form.customer_gstin.length === 15 && validateGST(form.customer_gstin) && (
              <span style={{ fontSize: "11px", color: "#16a34a", marginTop: "3px", display: "block" }}>✓ Valid GSTIN</span>
            )}
          </Field>
          <Field label="PAN">
            <CharBoxInput value={form.customer_pan} onChange={(v) => update("customer_pan", v)} length={10} />
            <ErrorMsg field="customer_pan" errors={errors} />
            {form.customer_pan.length === 10 && validatePAN(form.customer_pan) && (
              <span style={{ fontSize: "11px", color: "#16a34a", marginTop: "3px", display: "block" }}>✓ Valid PAN</span>
            )}
          </Field>
        </div>
      </Section>

      {/* Contact Details */}
      <Section title="Contact Details" >
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

      {/* Billing Address */}
      <Section title="Billing Address" >
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
            <SelectInput value={form.customer_state} onChange={(e) => update("customer_state", e.target.value)}
              placeholder="Select State" options={indianStates.map((s) => ({ value: s.name, label: s.name }))} />
            <ErrorMsg field="customer_state" errors={errors} />
          </Field>
          <Field label="State Code">
            <TextInput value={form.customer_state_code} readOnly onChange={() => {}} placeholder="27" />
          </Field>
          <Field label="Pincode" required>
            <TextInput value={form.customer_pincode}
              onChange={(e) => update("customer_pincode", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="400001" />
            <ErrorMsg field="customer_pincode" errors={errors} />
          </Field>
        </div>
      </Section>

    

   

      {/* Footer Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "40px" }}>
    
        <button type="button"
          style={{ padding: "11px 28px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: "#f8fafc", fontSize: "13.5px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
          Cancel
        </button>
        <button type="button" onClick={handleSave}
          style={{ padding: "11px 28px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13.5px", fontWeight: 700, color: "#fff", cursor: "pointer", letterSpacing: "0.3px" }}>
          Save Customer
        </button>
      </div>

    </div>
  );
}