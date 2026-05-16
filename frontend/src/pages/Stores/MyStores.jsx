import axios from "axios";
import { useState, useRef, useEffect } from "react";



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

// ── Shared ────────────────────────────────────────────────────────────────────
const ActiveBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-red-400"}`} />
    {active ? "Active" : "Inactive"}
  </span>
);

const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f1e3d]/20 focus:border-[#0f1e3d] transition bg-white";

const TextInput = ({ value, onChange, placeholder, type = "text", readOnly }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
    className={`${inputCls} ${readOnly ? "bg-gray-50 cursor-not-allowed text-gray-400" : ""}`} />
);

const SelectInput = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={onChange} className={inputCls}>
    <option value="">{placeholder}</option>
    {options.map(o => { const v = o.value ?? o; const l = o.label ?? o; return <option key={v} value={v}>{l}</option>; })}
  </select>
);

const TextArea = ({ value, onChange, placeholder, rows = 4 }) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`${inputCls} resize-none`} />
);

const CharBoxInput = ({ length, value, onChange, numeric }) => {
  const refs = useRef([]);
  const handleChange = (e, i) => {
    let v = e.target.value;
    v = numeric ? v.replace(/[^0-9]/g, "") : v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    onChange(value.substring(0, i) + v + value.substring(i + 1));
    if (v && refs.current[i + 1]) refs.current[i + 1].focus();
  };
  const handleKeyDown = (e, i) => {
    if (e.key === "Backspace" && !value[i] && refs.current[i - 1]) refs.current[i - 1].focus();
    if (e.key === "ArrowLeft" && refs.current[i - 1]) { e.preventDefault(); refs.current[i - 1].focus(); }
    if (e.key === "ArrowRight" && refs.current[i + 1]) { e.preventDefault(); refs.current[i + 1].focus(); }
  };
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={el => refs.current[i] = el} maxLength={1}
          value={value[i] || ""}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          className="w-8 h-9 text-center text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-[#0f1e3d] focus:ring-2 focus:ring-[#0f1e3d]/20 transition bg-white"
        />
      ))}
    </div>
  );
};

// ── Edit Store Modal ──────────────────────────────────────────────────────────
const TABS = [
  { id: "business", label: "Business Info", icon: "🏢" },
  { id: "address",  label: "Address",       icon: "📍" },
  { id: "bank",     label: "Bank Details",  icon: "🏦" },
  { id: "invoice",  label: "Invoice",       icon: "🧾" },
];

const EditStoreModal = ({ profile, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState("business");
  const [form, setForm] = useState({ ...profile });
  const [headerImage, setHeaderImage] = useState(profile.headerImage || null);

  const update = (field, val) => {
    if (field === "state") {
      const st = indianStates.find(s => s.name === val);
      setForm(p => ({ ...p, state: val, state_code: st ? st.code : p.state_code }));
    } else {
      setForm(p => ({ ...p, [field]: val }));
    }
  };

  const handleHeaderUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHeaderImage(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* light backdrop, no blur */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* fixed size modal — does NOT grow with content */}
      <div className="relative bg-white rounded-2xl shadow-xl mx-4 flex flex-col"
        style={{ width: "680px", height: "560px" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">Edit Store Profile</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                activeTab === t.id
                  ? "bg-[#0f1e3d] text-white border-[#0f1e3d]"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="border-b border-gray-100 mx-6 shrink-0" />

        {/* Scrollable content — fixed height */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Business Info ── */}
          {activeTab === "business" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Business / Trade Name" required>
                  <TextInput value={form.business_name} onChange={e => update("business_name", e.target.value)} placeholder="Your Company Name" />
                </Field>
                <Field label="Business Type">
                  <SelectInput value={form.business_type} onChange={e => update("business_type", e.target.value)}
                    placeholder="Select type"
                    options={["Proprietorship", "Partnership", "Private Limited", "Public Limited", "LLP", "OPC", "Trust / NGO"]} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="GSTIN" required>
                  <CharBoxInput length={15} value={form.gstin} onChange={val => update("gstin", val)} />
                </Field>
                <Field label="PAN" required>
                  <CharBoxInput length={10} value={form.pan} onChange={val => update("pan", val)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mobile Number" required>
                  <CharBoxInput length={10} value={form.phone} onChange={val => update("phone", val)} numeric />
                </Field>
                <Field label="Email Address" required>
                  <TextInput type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="billing@company.com" />
                </Field>
                <Field label="Website">
                  <TextInput value={form.website} onChange={e => update("website", e.target.value)} placeholder="https://yourcompany.com" />
                </Field>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-4 bg-gray-50/50">
                <div className="w-24 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {headerImage
                    ? <img src={headerImage} alt="Header" className="w-full h-full object-contain" />
                    : <span className="text-[10px] text-gray-400">No Header</span>}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700 mb-1">Invoice Header Image</p>
                  <p className="text-[11px] text-gray-400 mb-2">Appears at the top of every invoice</p>
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 bg-[#0f1e3d] text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-[#1a2f5a] transition">
                      Upload <input type="file" accept="image/*" onChange={handleHeaderUpload} className="hidden" />
                    </label>
                    {headerImage && (
                      <button onClick={() => setHeaderImage(null)} className="px-3 py-1.5 border border-red-200 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-50 transition">Remove</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Address ── */}
          {activeTab === "address" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Address Line 1" required>
                <TextInput value={form.address_line1} onChange={e => update("address_line1", e.target.value)} placeholder="Building No., Street, Area" />
              </Field>
              <Field label="Address Line 2">
                <TextInput value={form.address_line2} onChange={e => update("address_line2", e.target.value)} placeholder="Landmark (optional)" />
              </Field>
              <Field label="City" required>
                <TextInput value={form.city} onChange={e => update("city", e.target.value)} placeholder="Navi Mumbai" />
              </Field>
              <Field label="State" required>
                <SelectInput value={form.state} onChange={e => update("state", e.target.value)}
                  placeholder="Select State"
                  options={indianStates.map(s => ({ value: s.name, label: s.name }))} />
              </Field>
              <Field label="State Code">
                <TextInput value={form.state_code} readOnly={!!form.state} placeholder="27" onChange={e => update("state_code", e.target.value)} />
              </Field>
              <Field label="Pincode" required>
                <TextInput value={form.pincode} onChange={e => update("pincode", e.target.value)} placeholder="400709" />
              </Field>
            </div>
          )}

          {/* ── Bank Details ── */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                <span>ℹ️</span>
                <span>These bank details will be printed on every invoice for customer payments.</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Bank Name" required>
                  <TextInput value={form.bank_name} onChange={e => update("bank_name", e.target.value)} placeholder="ICICI Bank" />
                </Field>
                <Field label="Branch Name">
                  <TextInput value={form.branch} onChange={e => update("branch", e.target.value)} placeholder="Airoli, Navi Mumbai" />
                </Field>
                <Field label="Account Number" required>
                  <TextInput value={form.account_no} onChange={e => update("account_no", e.target.value)} placeholder="109005002301" />
                </Field>
                <Field label="IFSC Code" required>
                  <TextInput value={form.ifsc} onChange={e => update("ifsc", e.target.value.toUpperCase())} placeholder="ICIC0001090" />
                </Field>
                <Field label="Account Type">
                  <SelectInput value={form.account_type} onChange={e => update("account_type", e.target.value)}
                    placeholder="Select type"
                    options={["Current", "Savings", "OD / CC"]} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Invoice ── */}
          {activeTab === "invoice" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Invoice Prefix" required>
                  <TextInput value={form.invoice_prefix} onChange={e => update("invoice_prefix", e.target.value.toUpperCase())} placeholder="INV" />
                </Field>
                <Field label="Financial Year Series" required>
                  <TextInput value={form.invoice_series} onChange={e => update("invoice_series", e.target.value)} placeholder="2526" />
                </Field>
                <Field label="Preview">
                  <div className={`${inputCls} bg-gray-50 font-mono font-bold text-[#0f1e3d] tracking-wide cursor-default`}>
                    {form.invoice_prefix || "INV"}-{form.invoice_series || "2526"}-001
                  </div>
                </Field>
              </div>
              <Field label="Terms & Conditions">
                <TextArea value={form.terms} onChange={e => update("terms", e.target.value)}
                  placeholder="Enter standard terms and conditions..." rows={6} />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={() => onSave({ ...form, headerImage })}
            className="flex-1 bg-[#0f1e3d] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#1a2f5a] active:scale-95 transition-all">
            💾 Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

// ── User Modal ────────────────────────────────────────────────────────────────
const UserModal = ({ editingUser, userForm, setUserForm, onSave, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/20" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900">{editingUser ? "Edit User" : "Add New User"}</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">✕</button>
      </div>
      <div className="px-6 py-5 space-y-4">
        <Field label="Full Name" required>
          <TextInput value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tanvi Pawar" />
        </Field>
        <Field label="Role" required>
          <SelectInput value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}
            placeholder="Select role" options={["Manager", "Operator", "Admin", "Accountant"]} />
        </Field>
        <Field label="Phone">
          <TextInput value={userForm.phone} onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" />
        </Field>
        <div className="flex items-center justify-between py-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active</span>
          <button onClick={() => setUserForm(p => ({ ...p, active: !p.active }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${userForm.active ? "bg-[#0f1e3d]" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${userForm.active ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onSave} className="flex-1 bg-[#0f1e3d] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#1a2f5a] active:scale-95 transition-all">
            {editingUser ? "Update User" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyStore = () => {
const [store, setStore] = useState({});


  const [editingStore, setEditingStore] = useState(false);

  useEffect(() => {

  fetchCompany();

}, []);

const fetchCompany = async () => {
  try {

    const res = await axios.get(
      "http://localhost:5000/api/company"
    );
if (res.data.data && res.data.data.length > 0) {

  const company = res.data.data[0];

  setStore({
    ...company,

    business_name: company.name || "",
    phone: company.mobile || "",
    gstin: company.gst || "",
    bank_name: company.bank || "",

    business_type: company.business_type || "",
    email: company.email || "",
    website: company.website || "",

    address_line1: company.address || "",
    address_line2: company.area || "",

    city: company.city || "",
    state: company.state || "",
    pincode: company.pincode || "",

    pan: company.pan || "",

    branch: company.branch || "",
    account_no: company.account_no || "",
    ifsc: company.ifsc || "",

    headerImage: company.logo || "",
  });

}


  } catch (err) {
    console.error("Fetch Company Error:", err);
  }
};


  const [users, setUsers] = useState([
    { id: 1, name: "Vinod Sarode",  role: "Manager",  phone: "",           email: "vs10301020@dlume.com", active: true },
    { id: 2, name: "Sale Manager",  role: "Operator", phone: "",           email: "falak@sales.com",      active: true },
    { id: 3, name: "Tanvi Pawar",   role: "Manager",  phone: "8169708224", email: "",                     active: true },
  ]);
  const [search, setSearch] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", role: "Operator", phone: "", email: "", active: true });


const saveStore = async (updated) => {
  try {

    // COMPANY PAYLOAD
    const payload = {
      ...updated,

      name: updated.business_name,
      mobile: updated.phone,
      gst: updated.gstin,
      bank: updated.bank_name,

      address: updated.address_line1,
      area: updated.address_line2,
    };

    let companyResponse;

    // UPDATE COMPANY
    if (updated._id) {

      companyResponse = await axios.post(
        `http://localhost:5000/api/company/${updated._id}`,
        payload
      );

    } else {

      // CREATE COMPANY
      companyResponse = await axios.post(
        "http://localhost:5000/api/company",
        payload
      );

    }

    // FINAL COMPANY DATA
    const savedCompany =
      companyResponse?.data?.data || payload;

    // UPDATE STAFF COLLECTION
    const companyId =
      savedCompany._id || updated.company_id;

    if (companyId) {

      await axios.put(
        `http://localhost:5000/api/staffs/company/${companyId}`,
        {
          company_name: updated.business_name,
          company_gstin: updated.gstin,
          company_phone: updated.phone,
          company_email: updated.email,
          company_address: [
            updated.address_line1,
            updated.address_line2,
            updated.city,
            updated.state,
            updated.pincode,
          ]
            .filter(Boolean)
            .join(", "),
        }
      );

    }

    // UPDATE UI
    setStore({
      ...updated,
      ...payload,
      _id: savedCompany._id,
      company_id: companyId,
    });

    setEditingStore(false);

    // SUCCESS ALERT
    setAlert({
      show: true,
      message: "Profile saved successfully",
      type: "success",
    });

    setTimeout(() => {
      setAlert({
        show: false,
        message: "",
        type: "success",
      });
    }, 3000);

  } catch (err) {

    console.error(err);

    setAlert({
      show: true,
      message: "Failed to save profile",
      type: "error",
    });

  }
};



  const openNew = () => { setEditingUser(null); setUserForm({ name: "", role: "Operator", phone: "", email: "", active: true }); setShowUserModal(true); };
  const openEdit = (u) => { setEditingUser(u); setUserForm({ name: u.name, role: u.role, phone: u.phone, email: u.email, active: u.active }); setShowUserModal(true); };
  const saveUser = () => {
    if (!userForm.name.trim()) return;
    setUsers(prev => editingUser
      ? prev.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u)
      : [...prev, { id: Date.now(), ...userForm }]
    );
    setShowUserModal(false);

    setAlert({
  show: true,
  message: editingUser
    ? "User updated successfully"
    : "User added successfully",
  type: "success",
});

setTimeout(() => {
  setAlert({ show: false, message: "", type: "success" });
}, 3000);

  };
const [deleteId, setDeleteId] = useState(null);

const deleteUser = (id) => {
  setDeleteId(id);
};

const confirmDelete = () => {
  setUsers(prev => prev.filter(u => u.id !== deleteId));
  setDeleteId(null);

  setAlert({
  show: true,
  message: "User deleted successfully",
  type: "error",
});

setTimeout(() => {
  setAlert({ show: false, message: "", type: "success" });
}, 3000);

};

const [alert, setAlert] = useState({
  show: false,
  message: "",
  type: "success",
});
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const fullAddress = [store.address_line1, store.address_line2, store.city, store.state, store.pincode].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">

    
{alert.show && (
  <div className={`fixed top-5 right-5 z-[100] min-w-[320px] rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3 text-sm font-semibold animate-[fadeIn_.3s_ease]
    ${
      alert.type === "success"
        ? "bg-green-50 border border-green-200 text-green-700"
        : "bg-red-50 border border-red-200 text-red-600"
    }`}>
    
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
      ${
        alert.type === "success"
          ? "bg-green-100"
          : "bg-red-100"
      }`}>
      {alert.type === "success" ? "✓" : "✕"}
    </div>

    <div className="flex-1">
      {alert.message}
    </div>

    <button
      onClick={() => setAlert({ show: false, message: "", type: "success" })}
      className="text-lg opacity-60 hover:opacity-100"
    >
      ×
    </button>
  </div>
)}
      {/* ── Store Info Card (simple white, like before) ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">My Store</p>
            <h2 className="text-lg font-bold text-gray-900">{store.business_name || "—"}</h2>

            <div className="flex flex-col gap-0.5 mt-2">
              {store.email && (
                <p className="text-sm text-gray-500"><span className="font-medium text-gray-600">Email:</span> {store.email}</p>
              )}
              {store.phone && (
                <p className="text-sm text-gray-500"><span className="font-medium text-gray-600">Contact:</span> {store.phone}</p>
              )}
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-600">Address:</span>{" "}
                {fullAddress || <span className="italic text-gray-300">—</span>}
              </p>
              {store.gstin && (
                <p className="text-sm text-gray-500"><span className="font-medium text-gray-600">GSTIN:</span> <span className="font-mono">{store.gstin}</span></p>
              )}
              {store.bank_name && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-600">Bank:</span> {store.bank_name}
                  {store.account_no && <span className="font-mono"> · {store.account_no}</span>}
                  {store.ifsc && <span className="font-mono"> · {store.ifsc}</span>}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setEditingStore(true)}
            className="flex items-center gap-2 bg-[#0f1e3d] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#1a2f5a] active:scale-95 transition-all shrink-0"
          >
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* ── User List Card ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">User List</h2>
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                className="pl-8 pr-4 py-1.5 border border-gray-200 rounded-full text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f1e3d]/20 focus:border-[#0f1e3d] transition w-44" />
            </div>
            <button onClick={openNew} className="flex items-center gap-1.5 border border-gray-200 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
              <span className="text-base leading-none">+</span> New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[60px_1.5fr_1fr_1fr_1.5fr_90px_80px] gap-3 px-6 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Sr. No.", "Name", "Role", "Phone", "Email", "Active", "Action"].map((h, i) => (
            <span key={h} className={`text-[10px] font-bold uppercase tracking-wider text-[#0f1e3d]/60 ${i === 5 || i === 6 ? "text-center" : ""}`}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="mb-3 opacity-40">
              <circle cx="24" cy="18" r="10" fill="#c5d0e6"/>
              <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#c5d0e6" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium">No users found</p>
          </div>
        ) : (
          filtered.map((user, idx) => (
            <div key={user.id} className="grid grid-cols-[60px_1.5fr_1fr_1fr_1.5fr_90px_80px] gap-3 px-6 py-3.5 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/60 transition">
              <p className="text-sm text-gray-500">{idx + 1}</p>
              <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-sm text-gray-600">{user.role}</p>
              <p className="text-sm text-gray-500 font-mono">{user.phone || "—"}</p>
              <p className="text-sm text-gray-500 truncate">{user.email || "—"}</p>
              <div className="flex justify-center"><ActiveBadge active={user.active} /></div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => openEdit(user)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-500 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button onClick={() => deleteUser(user.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingStore && <EditStoreModal profile={store} onSave={saveStore} onClose={() => setEditingStore(false)} />}
      {showUserModal && <UserModal editingUser={editingUser} userForm={userForm} setUserForm={setUserForm} onSave={saveUser} onClose={() => setShowUserModal(false)} />}


        {deleteId && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/30"
      onClick={() => setDeleteId(null)}
    />

    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <span className="text-2xl">🗑️</span>
        </div>

        <h3 className="text-lg font-bold text-gray-800">
          Delete User?
        </h3>

        <p className="text-sm text-gray-500 mt-2">
          This action cannot be undone.
        </p>

        <div className="flex gap-3 w-full mt-6">
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={confirmDelete}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default MyStore;