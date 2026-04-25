import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const businessTypes = [
  "Proprietorship", "Partnership", "LLP", "Private Limited",
  "Public Limited", "OPC", "Trust", "HUF", "Other"
];

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
  vendor_name: "",
  company_name: "",
  business_type: "",
  vendor_gstin: "",
  vendor_pan: "",
  vendor_phone: "",
  vendor_alt_phone: "",
  vendor_email: "",
  vendor_website: "",
  vendor_address_line1: "",
  vendor_address_line2: "",
  vendor_city: "",
  vendor_state: "",
  vendor_state_code: "",
  vendor_pincode: "",
  opening_balance: 0,
};

const validateGST = (v) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
const validatePAN = (v) =>
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
const validateEmail = (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePhone = (v) =>
  !v || /^[6-9][0-9]{9}$/.test(v);
const validatePincode = (v) =>
  !v || /^[1-9][0-9]{5}$/.test(v);

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

export default function Vendors() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const update = (field, value) => {
    if (field === "vendor_state") {
      const st = indianStates.find((s) => s.name === value);
      setForm((prev) => ({
        ...prev,
        vendor_state: value,
        vendor_state_code: st ? st.code : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.vendor_name.trim()) e.vendor_name = "Vendor name is required";
    if (form.vendor_gstin.length === 15 && !validateGST(form.vendor_gstin)) e.vendor_gstin = "Invalid GSTIN format";
    if (form.vendor_pan.length === 10 && !validatePAN(form.vendor_pan)) e.vendor_pan = "Invalid PAN format";
    if (!validatePhone(form.vendor_phone)) e.vendor_phone = "Invalid mobile number";
    if (!validateEmail(form.vendor_email)) e.vendor_email = "Invalid email address";

    if (!form.vendor_state) e.vendor_state = "State is required";
    if (!validatePincode(form.vendor_pincode)) e.vendor_pincode = "Invalid pincode";
    return e;
  };

const handleSave = async () => {
  const e = validate();
  if (Object.keys(e).length) {
    setErrors(e);
    return;
  }

  try {
    const res = await axios.post("http://localhost:8000/api/vendor", form);

if (res.data.success) {
  alert("Vendor saved successfully"); 

  setForm(emptyForm);

  navigate("/vendor-list"); 
}

  } catch (err) {
    console.error(err);
    alert("Failed to save vendor");
  }
};

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" };

  return (
    <div style={{ width: "100%", margin: "0" }}>

     

      {/* Basic Information */}
      <Section title="Basic Information">
        <div style={grid2}>
          <Field label="Vendor Name" required>
            <TextInput
              value={form.vendor_name}
              onChange={(e) => update("vendor_name", e.target.value)}
              placeholder="Supplier name"
            />
            <ErrorMsg field="vendor_name" errors={errors} />
          </Field>

          <Field label="Company Name">
            <TextInput
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="Company Pvt Ltd"
            />
          </Field>

          <Field label="Business Type">
            <SelectInput
              value={form.business_type}
              onChange={(e) => update("business_type", e.target.value)}
              placeholder="Select Business Type"
              options={businessTypes.map((t) => ({ value: t, label: t }))}
            />
          </Field>

          <Field label="Opening Balance">
          <TextInput
  type="number"
  value={form.opening_balance === 0 ? "" : form.opening_balance}
  onChange={(e) => update("opening_balance", Number(e.target.value))}
  placeholder="0"
/>
          </Field>
        </div>
      </Section>

      {/* Tax & Identity */}
      <Section title="Tax & Identity">
        <div style={grid2}>
          <Field label="GSTIN">
            <CharBoxInput value={form.vendor_gstin} onChange={(v) => update("vendor_gstin", v)} length={15} />
            {form.vendor_gstin.length === 15 && (
              <button type="button" onClick={() => update("vendor_pan", form.vendor_gstin.substring(2, 12))}
                style={{ marginTop: "6px", background: "none", border: "none", color: "#3b82f6", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                Auto-fill PAN from GSTIN
              </button>
            )}
            <ErrorMsg field="vendor_gstin" errors={errors} />
            {form.vendor_gstin.length === 15 && validateGST(form.vendor_gstin) && (
              <span style={{ fontSize: "11px", color: "#16a34a", marginTop: "3px", display: "block" }}>✓ Valid GSTIN</span>
            )}
          </Field>

          <Field label="PAN">
            <CharBoxInput value={form.vendor_pan} onChange={(v) => update("vendor_pan", v)} length={10} />
            <ErrorMsg field="vendor_pan" errors={errors} />
            {form.vendor_pan.length === 10 && validatePAN(form.vendor_pan) && (
              <span style={{ fontSize: "11px", color: "#16a34a", marginTop: "3px", display: "block" }}>✓ Valid PAN</span>
            )}
          </Field>
        </div>
      </Section>

      {/* Contact Details */}
      <Section title="Contact Details">
        <div style={grid2}>
          <Field label="Mobile Number" required>
            <CharBoxInput value={form.vendor_phone} onChange={(v) => update("vendor_phone", v)} length={10} numericOnly />
            <ErrorMsg field="vendor_phone" errors={errors} />
          </Field>

          <Field label="Alternate Mobile">
            <CharBoxInput value={form.vendor_alt_phone} onChange={(v) => update("vendor_alt_phone", v)} length={10} numericOnly />
          </Field>

          <Field label="Email Address">
            <TextInput
              type="email"
              value={form.vendor_email}
              onChange={(e) => update("vendor_email", e.target.value)}
              placeholder="vendor@company.com"
            />
            <ErrorMsg field="vendor_email" errors={errors} />
          </Field>

          <Field label="Website">
            <TextInput
              value={form.vendor_website}
              onChange={(e) => update("vendor_website", e.target.value)}
              placeholder="https://www.vendor.com"
            />
          </Field>
        </div>
      </Section>

      {/* Address */}
      <Section title="Address">
        <div style={grid2}>
          <Field label="Address Line 1" >
            <TextInput
              value={form.vendor_address_line1}
              onChange={(e) => update("vendor_address_line1", e.target.value)}
              placeholder="Building, Street, Area"
            />
            <ErrorMsg field="vendor_address_line1" errors={errors} />
          </Field>

          <Field label="Address Line 2">
            <TextInput
              value={form.vendor_address_line2}
              onChange={(e) => update("vendor_address_line2", e.target.value)}
              placeholder="Landmark (optional)"
            />
          </Field>

          <Field label="City" >
            <TextInput
              value={form.vendor_city}
              onChange={(e) => update("vendor_city", e.target.value)}
              placeholder="Mumbai"
            />
            <ErrorMsg field="vendor_city" errors={errors} />
          </Field>

          <Field label="State" required>
            <SelectInput
              value={form.vendor_state}
              onChange={(e) => update("vendor_state", e.target.value)}
              placeholder="Select State"
              options={indianStates.map((s) => ({ value: s.name, label: s.name }))}
            />
            <ErrorMsg field="vendor_state" errors={errors} />
          </Field>

          <Field label="State Code">
            <TextInput value={form.vendor_state_code} readOnly onChange={() => {}} placeholder="27" />
          </Field>

          <Field label="Pincode" >
            <TextInput
              value={form.vendor_pincode}
              onChange={(e) => update("vendor_pincode", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="400001"
            />
            <ErrorMsg field="vendor_pincode" errors={errors} />
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
          Save Vendor
        </button>
      </div>

    </div>
  );
}