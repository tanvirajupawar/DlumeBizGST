import { useState, useRef } from "react";

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

const Field = ({ label, required, children, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label style={{
      fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em",
      color: "#111827", textTransform: "uppercase",
    }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = "text", readOnly }) => (
  <input
    type={type} value={value} onChange={onChange}
    placeholder={placeholder} readOnly={readOnly}
    style={{ ...inputStyle, cursor: readOnly ? "not-allowed" : "text" }}
    onFocus={e => !readOnly && (e.target.style.borderColor = "#3b82f6")}
    onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
  />
);

const TextArea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
    onFocus={e => (e.target.style.borderColor = "#3b82f6")}
    onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
  />
);

const SelectInput = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={onChange}
    style={{
      ...inputStyle, appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
    }}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
  </select>
);

const CharBoxInput = ({ length, value, onChange, numeric }) => {
  const refs = useRef([]);
  const handleChange = (e, index) => {
    let val = e.target.value;
    val = numeric
      ? val.replace(/[^0-9]/g, "")
      : val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newVal = value.substring(0, index) + val + value.substring(index + 1);
    onChange(newVal);
    if (val && refs.current[index + 1]) refs.current[index + 1].focus();
  };
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !value[index] && refs.current[index - 1]) refs.current[index - 1].focus();
    if (e.key === "ArrowLeft" && refs.current[index - 1]) { e.preventDefault(); refs.current[index - 1].focus(); }
    if (e.key === "ArrowRight" && refs.current[index + 1]) { e.preventDefault(); refs.current[index + 1].focus(); }
  };
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          maxLength={1}
          value={value[i] || ""}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          style={{
            width: "32px", height: "36px", textAlign: "center",
            fontSize: "14px", fontWeight: 600,
            border: "1.5px solid #d1d5db", borderRadius: "6px",
            outline: "none", background: "#fff",
          }}
          onFocus={e => (e.target.style.borderColor = "#3b82f6")}
          onBlur={e => (e.target.style.borderColor = "#d1d5db")}
        />
      ))}
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #e5e7eb", overflow: "hidden", marginBottom: "20px" }}>
    <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "15px" }}>{icon}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#374151", textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ padding: "20px" }}>{children}</div>
  </div>
);

const SavedBadge = ({ show }) =>
  show ? (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      background: "#ecfdf5", border: "1.5px solid #6ee7b7", borderRadius: "8px",
      padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "#059669",
    }}>
      <span>✓</span> Profile saved successfully!
    </div>
  ) : null;

export default function Profile() {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
const [headerImage, setHeaderImage] = useState(null);

const handleHeaderUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    setHeaderImage(reader.result);
  };
  reader.readAsDataURL(file);
};
  const [profile, setProfile] = useState({
    // Business Identity
    business_name: "GLS TECHNOLOGIST",
    business_type: "Private Limited",
    pan: "AAUFG7297B",
    gstin: "27AAUFG7297B1ZV",
    // Address
    address_line1: "Plot No. PAP-A-78, TTC Industrial Area",
    address_line2: "Pawane MIDC, Turbhe",
    city: "Navi Mumbai",
    state: "Maharashtra",
    state_code: "27",
    pincode: "400709",
    // Contact
    phone: "9876543210",
    email: "glstechnologist2020@gmail.com",
    website: "",
    // Bank
    bank_name: "ICICI BANK",
    branch: "Airoli, Navi Mumbai",
    account_no: "109005002301",
    ifsc: "ICIC0001090",
    account_type: "Current",
    // Invoice Defaults
    default_supply: "intrastate",
    default_gst: "18",
    invoice_prefix: "INV",
    invoice_series: "2526",
    terms: "Payment due within 30 days of invoice date.\nGoods once sold will not be taken back.\nSubject to Navi Mumbai jurisdiction.",
    signature_name: "",
  });

  const update = (field, val) => {
    if (field === "state") {
      const st = indianStates.find(s => s.name === val);
      setProfile(p => ({ ...p, state: val, state_code: st ? st.code : p.state_code }));
    } else {
      setProfile(p => ({ ...p, [field]: val }));
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: "business", label: "Business Info", icon: "🏢" },
    { id: "address", label: "Address", icon: "📍" },
    { id: "bank", label: "Bank Details", icon: "🏦" },
    { id: "invoice", label: "Invoice Defaults", icon: "🧾" },
  ];

  const completionFields = [
    profile.business_name, profile.gstin, profile.pan,
    profile.address_line1, profile.city, profile.state, profile.pincode,
    profile.phone, profile.email,
    profile.bank_name, profile.account_no, profile.ifsc,
  ];
  const filled = completionFields.filter(Boolean).length;
  const pct = Math.round((filled / completionFields.length) * 100);

  return (
    <div style={{ width: "100%", margin: "0", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#0b1324", letterSpacing: "-0.3px" }}>
            Business Profile
          </h1>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>
            Manage your business identity, bank details & invoice defaults
          </p>
        </div>
        <SavedBadge show={saved} />
      </div>

      {/* Company Banner */}
      <div style={{ background: "#1e3a5f", borderRadius: "12px", padding: "20px 24px", marginBottom: "20px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.5px", marginBottom: "4px" }}>
              {profile.business_name || "Your Business Name"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.8, maxWidth: "420px", lineHeight: "1.5" }}>
              {[profile.address_line1, profile.address_line2, profile.city, profile.state, profile.pincode].filter(Boolean).join(", ") || "Business address will appear here"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "4px" }}>
              {profile.email || "email"}{profile.phone ? ` · +91 ${profile.phone}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "2px", letterSpacing: "0.05em" }}>GSTIN</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, fontFamily: "monospace", letterSpacing: "1px" }}>
              {profile.gstin || "— — — — — — — — —"}
            </div>
            {/* Profile Completion */}
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px" }}>Profile {pct}% complete</div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "4px", width: "160px" }}>
                <div style={{ height: "4px", background: pct === 100 ? "#34d399" : "#60a5fa", borderRadius: "4px", width: `${pct}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "#f8fafc", borderRadius: "10px", padding: "4px", border: "1.5px solid #e5e7eb" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: "9px 12px", border: "none", borderRadius: "8px", cursor: "pointer",
              fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.03em",
              background: activeTab === t.id ? "#1e3a5f" : "transparent",
              color: activeTab === t.id ? "#fff" : "#6b7280",
              transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB: BUSINESS INFO ─── */}
      {activeTab === "business" && (
        <>
          <Section title="Business Identity" icon="🏢">

            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Business / Trade Name" required>
                <TextInput value={profile.business_name} onChange={e => update("business_name", e.target.value)} placeholder="Your Company Name" />
              </Field>
              <Field label="Business Type">
                <SelectInput value={profile.business_type} onChange={e => update("business_type", e.target.value)}
                  placeholder="Select type"
                  options={["Proprietorship", "Partnership", "Private Limited", "Public Limited", "LLP", "OPC", "Trust / NGO"]} />
              </Field>
            </div>

            <div style={{ height: "1px", background: "#f3f4f6", margin: "16px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="GSTIN" required>
                <CharBoxInput length={15} value={profile.gstin} onChange={val => update("gstin", val)} />
              </Field>
              <Field label="PAN" required>
                <CharBoxInput length={10} value={profile.pan} onChange={val => update("pan", val)} />
              </Field>
            </div>
          </Section>

          <Section title="Contact Details" icon="📞">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Mobile Number" required>
                <CharBoxInput length={10} value={profile.phone} onChange={val => update("phone", val)} numeric />
              </Field>
              <Field label="Email Address" required>
                <TextInput type="email" value={profile.email} onChange={e => update("email", e.target.value)} placeholder="billing@company.com" />
              </Field>
              <Field label="Website">
                <TextInput value={profile.website} onChange={e => update("website", e.target.value)} placeholder="https://yourcompany.com" />
              </Field>
            </div>
          </Section>

                      {/* Header Upload Card */}
<div style={{
  border: "1.5px dashed #d1d5db",
  borderRadius: "10px",
  padding: "18px",
  marginBottom: "20px",
  background: "#fafafa",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap"
}}>

  {/* Preview */}
  <div style={{
    width: "120px",
    height: "70px",
    borderRadius: "8px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  }}>
    {headerImage ? (
      <img
        src={headerImage}
        alt="Header"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain"
        }}
      />
    ) : (
      <span style={{ fontSize: "11px", color: "#9ca3af" }}>
        No Header
      </span>
    )}
  </div>

  {/* Upload Info */}
  <div style={{ flex: 1 }}>
    <div style={{
      fontSize: "12px",
      fontWeight: 700,
      color: "#374151",
      marginBottom: "4px",
      letterSpacing: "0.05em"
    }}>
      Invoice Header 
    </div>

    <div style={{
      fontSize: "11.5px",
      color: "#6b7280",
      marginBottom: "8px"
    }}>
      Upload your business header. This will appear on invoices.
    </div>

    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <label
        style={{
          padding: "7px 14px",
          background: "#1e3a5f",
          color: "#fff",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        Upload Header
        <input
          type="file"
          accept="image/*"
          onChange={handleHeaderUpload}
          style={{ display: "none" }}
        />
      </label>

      {headerImage && (
        <button
          onClick={() => setHeaderImage(null)}
          style={{
            padding: "7px 14px",
            background: "#fff",
            border: "1.5px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            color: "#ef4444"
          }}
        >
          Remove
        </button>
      )}
    </div>
  </div>

</div>
        </>
      )}

      {/* ─── TAB: ADDRESS ─── */}
      {activeTab === "address" && (
        <Section title="Registered Business Address" icon="📍">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Field label="Address Line 1" required>
              <TextInput value={profile.address_line1} onChange={e => update("address_line1", e.target.value)} placeholder="Building No., Street, Area" />
            </Field>
            <Field label="Address Line 2">
              <TextInput value={profile.address_line2} onChange={e => update("address_line2", e.target.value)} placeholder="Landmark (optional)" />
            </Field>
            <Field label="City" required>
              <TextInput value={profile.city} onChange={e => update("city", e.target.value)} placeholder="Navi Mumbai" />
            </Field>
            <Field label="State" required>
              <SelectInput value={profile.state} onChange={e => update("state", e.target.value)}
                placeholder="Select State"
                options={indianStates.map(s => ({ value: s.name, label: s.name }))} />
            </Field>
            <Field label="State Code" required>
              <TextInput value={profile.state_code} readOnly={!!profile.state} placeholder="27" onChange={e => update("state_code", e.target.value)} />
            </Field>
            <Field label="Pincode" required>
              <TextInput value={profile.pincode} onChange={e => update("pincode", e.target.value)} placeholder="400709" />
            </Field>
          </div>
        </Section>
      )}

      {/* ─── TAB: BANK DETAILS ─── */}
      {activeTab === "bank" && (
        <Section title="Bank Account Details" icon="🏦">
          <div style={{
            background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px",
            padding: "12px 16px", marginBottom: "20px", fontSize: "12.5px", color: "#1d4ed8",
            display: "flex", gap: "8px", alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "14px" }}>ℹ️</span>
            <span>These bank details will be printed on every invoice for customer payments.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Field label="Bank Name" required>
              <TextInput value={profile.bank_name} onChange={e => update("bank_name", e.target.value)} placeholder="ICICI Bank" />
            </Field>
            <Field label="Branch Name" required>
              <TextInput value={profile.branch} onChange={e => update("branch", e.target.value)} placeholder="Airoli, Navi Mumbai" />
            </Field>
            <Field label="Account Number" required>
              <TextInput value={profile.account_no} onChange={e => update("account_no", e.target.value)} placeholder="109005002301" />
            </Field>
            <Field label="IFSC Code" required>
              <TextInput value={profile.ifsc} onChange={e => update("ifsc", e.target.value.toUpperCase())} placeholder="ICIC0001090" />
            </Field>
            <Field label="Account Type">
              <SelectInput value={profile.account_type} onChange={e => update("account_type", e.target.value)}
                placeholder="Select type"
                options={["Current", "Savings", "OD / CC"]} />
            </Field>
          </div>

          {/* Bank Preview Card */}
          {/* {profile.bank_name && (
            <div style={{ marginTop: "20px", background: "#1e3a5f", borderRadius: "12px", padding: "18px 20px", color: "#fff", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", opacity: 0.6, letterSpacing: "0.08em", marginBottom: "4px", textTransform: "uppercase" }}>Bank</div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>{profile.bank_name}</div>
                <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "2px" }}>{profile.branch}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", opacity: 0.6, letterSpacing: "0.08em", marginBottom: "4px", textTransform: "uppercase" }}>Account No.</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "14px", letterSpacing: "1px" }}>{profile.account_no}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", opacity: 0.6, letterSpacing: "0.08em", marginBottom: "4px", textTransform: "uppercase" }}>IFSC</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "14px", letterSpacing: "1px" }}>{profile.ifsc}</div>
              </div>
            </div>
          )} */}
        </Section>
      )}

      {/* ─── TAB: INVOICE DEFAULTS ─── */}
      {activeTab === "invoice" && (
        <>
          <Section title="Invoice Numbering" icon="🔢">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <Field label="Invoice Prefix" required>
                <TextInput value={profile.invoice_prefix} onChange={e => update("invoice_prefix", e.target.value.toUpperCase())} placeholder="INV" />
              </Field>
              <Field label="Financial Year Series" required>
                <TextInput value={profile.invoice_series} onChange={e => update("invoice_series", e.target.value)} placeholder="2526" />
              </Field>
              <Field label="Preview">
                <div style={{
                  ...inputStyle, background: "#f8fafc", color: "#1e3a5f",
                  fontWeight: 700, fontFamily: "monospace", letterSpacing: "1px",
                  cursor: "default",
                }}>
                  {profile.invoice_prefix || "INV"}-{profile.invoice_series || "2526"}-001
                </div>
              </Field>
            </div>
          </Section>

        

          <Section title="Invoice Footer" icon="📝">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Terms & Conditions">
                <TextArea value={profile.terms} onChange={e => update("terms", e.target.value)}
                  placeholder="Enter standard terms and conditions..." rows={5} />
              </Field>
              {/* <Field label="Authorised Signatory Name">
                <TextInput value={profile.signature_name} onChange={e => update("signature_name", e.target.value)} placeholder="e.g. Rahul Sharma" />
                <div style={{ marginTop: "8px", border: "1.5px dashed #d1d5db", borderRadius: "8px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>Signature Box (optional upload)</span>
                </div>
              </Field> */}
            </div>
          </Section>
        </>
      )}

      {/* Footer Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingBottom: "40px" }}>
        <button
          style={{ padding: "11px 28px", border: "1.5px solid #d1d5db", borderRadius: "8px", background: "#fff", fontSize: "13.5px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
          Reset
        </button>
        <button onClick={handleSave}
          style={{ padding: "11px 28px", border: "none", borderRadius: "8px", background: "#1e3a5f", fontSize: "13.5px", fontWeight: 700, color: "#fff", cursor: "pointer", letterSpacing: "0.3px" }}>
          💾 Save Profile
        </button>
      </div>
    </div>
  );
}