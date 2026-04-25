import { useState } from "react";
import axios from "axios";

// ─── Constants ────────────────────────────────────────────────────────────────
const gstOptions = [0, 5, 12, 18, 28];
const units      = ["NOS", "PCS", "KG", "MTR", "LTR", "SET", "BOX", "ROLL", "PAIR"];
const itemTypes  = ["Goods", "Service", "Raw Material", "Finished Goods", "Semi-Finished", "Consumable", "Asset"];

const inputStyle = {
  width: "100%",
  padding: "6px 8px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#111827",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

// ─── Add Items Modal ──────────────────────────────────────────────────────────
function AddItemsModal({ itemList, onAdd, onClose, isSales }) {
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState({});
  const [newItemForm, setNewItemForm] = useState(null);

const catalog = itemList.map((item, index) => ({
  id: item._id || item.id || `${item.product}-${index}`, 
    name:          item.product,
    code:          item.code          || "",
    hsn:           item.hsn           || "",
    size:          item.size          || "",
    // ✅ FIX: read both possible field names from API
purchasePrice: Number(
  item.purchase_price ??
  item.purchasePrice ??
  item.price ??      // 🔥 ADD THIS
  0
),
    salesPrice:    Number(item.mrp            || item.salePrice     || 0),
    gstRate:       Number(item.gst_rate       || item.gstRate       || 18),
    stock:         Number(item.total          || item.stock         || 0),
    unit:          item.unit || "NOS",
    itemType:      item.item_type || item.itemType || "Goods",
  }));

  const filtered = catalog.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.hsn.toLowerCase().includes(search.toLowerCase())
  );

  const toggleItem = (item) => {
    const key = String(item.id);
    if (selected[key]) {
      const s = { ...selected };
      delete s[key];
      setSelected(s);
    } else {
      setSelected((s) => ({ ...s, [key]: { item, qty: 1 } }));
    }
  };

  const setQty = (id, qty) => {
    const key = String(id);
    if (qty <= 0) {
      const s = { ...selected };
      delete s[key];
      setSelected(s);
    } else {
      setSelected((s) => ({ ...s, [key]: { ...s[key], qty } }));
    }
  };

  const selectedCount = Object.keys(selected).length;

  // ✅ FIX: all fields correctly mapped — purchasePrice, gstRate, itemType from catalog
 const handleAddToBill = () => {
  const toAdd = Object.values(selected).map(({ item, qty }) => {
return {
  name: item.name,
  product_id: item.id,
  qty,

  salePrice: item.salesPrice || 0,   // ✅ ADD THIS

  purchasePrice: item.purchasePrice || 0,
  gstRate: item.gstRate || 18,
  unit: item.unit || "NOS",
  discount: 0,
  itemType: item.itemType || "Goods",
  hsn: item.hsn || "",

  total_stock: item.stock || 0,   // 🔥🔥 MOST IMPORTANT FIX
};
  });

  onAdd(toAdd);
  onClose();
};

  // ✅ FIX: itemType included, all fields present
  const handleSaveNewItem = async () => {
    if (!newItemForm?.name?.trim()) { alert("Item name is required"); return; }
    try {
      const payload = {
        product:        newItemForm.name,
        hsn:            newItemForm.hsn,
        size:           newItemForm.size,
        unit:           newItemForm.unit,
        purchase_price: newItemForm.purchasePrice,
        mrp:            newItemForm.salePrice || 0,
        gst_rate:       newItemForm.gstRate   || 18,
        company_id:     localStorage.getItem("company_id"),
      };
      const res = await axios.post("http://localhost:8000/api/product", payload);
if (res.data.success) {
  const created = res.data.data;

  // ✅ ADD THIS
  itemList.unshift(created);   // 🔥 add new item to catalog

  onAdd([{
    name: created.product,
    product_id: created._id,
    itemType: newItemForm.itemType || "Goods",
    hsn: created.hsn || "",
    size: created.size || "",
    unit: created.unit || "NOS",
    qty: newItemForm.qty,

    purchasePrice: Number(
      created.purchase_price ??
      created.price ??   // 🔥 fallback
      newItemForm.purchasePrice ??
      0
    ),

    salePrice: Number(created.mrp || 0),
    discount: 0,
    baseDiscount: 0,
    extraDiscount: 0,
    gstRate: Number(created.gst_rate || newItemForm.gstRate || 18),
  }]);

  onClose();
}
    } catch (err) { console.error(err); alert("Error saving item"); }
  };

  const inp = {
    padding: "6px 9px", border: "1.5px solid #e5e7eb", borderRadius: "6px",
    fontSize: "13px", color: "#111827", background: "#fff", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "860px", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "88vh", overflow: "hidden" }}>

        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>Add Items to Bill</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", color: "#9ca3af", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "14px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <svg style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Item / HSN code"
              style={{ ...inp, width: "100%", padding: "9px 12px 9px 38px", fontSize: "13.5px" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
          </div>
          {!isSales && (
            <button
              onClick={() => !newItemForm && setNewItemForm({ name: "", itemType: "Goods", hsn: "", size: "", qty: 1, unit: "NOS", purchasePrice: 0, salePrice: 0, gstRate: 18 })}
              style={{ padding: "9px 18px", border: "none", borderRadius: "7px", background: "#1e3a5f", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              + Create New Item
            </button>
          )}
        </div>

        {/* ✅ New item form — added GST Rate + Item Type fields */}
        {!isSales && newItemForm && (
          <div style={{ padding: "14px 24px", background: "#f0f7ff", borderBottom: "1px solid #bfdbfe", flexShrink: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>New Item Details</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
              {[
                { label: "Item Name *", flex: "2 1 160px", field: "name",    placeholder: "Item name"      },
                { label: "HSN",         flex: "1 1 80px",  field: "hsn",     placeholder: "HSN code"       },
                { label: "Size / Pack", flex: "1 1 80px",  field: "size",    placeholder: "e.g. 1kg, 500ml"},
              ].map(({ label, flex, field, placeholder }) => (
                <div key={field} style={{ flex }}>
                  <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>{label}</label>
                  <input style={{ ...inp, width: "100%" }} value={newItemForm[field]} onChange={(e) => setNewItemForm((f) => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
                </div>
              ))}

              {/* Item Type */}
              <div style={{ flex: "1 1 100px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>Type</label>
                <select style={{ ...inp, width: "100%" }} value={newItemForm.itemType} onChange={(e) => setNewItemForm((f) => ({ ...f, itemType: e.target.value }))}>
                  {itemTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Unit */}
              <div style={{ flex: "1 1 80px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>Unit</label>
                <select style={{ ...inp, width: "100%" }} value={newItemForm.unit} onChange={(e) => setNewItemForm((f) => ({ ...f, unit: e.target.value }))}>
                  {units.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>

              {/* Qty */}
              <div style={{ flex: "0.7 1 60px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>Qty *</label>
                <input type="number" min="1" style={{ ...inp, width: "100%" }} value={newItemForm.qty} onChange={(e) => setNewItemForm((f) => ({ ...f, qty: Number(e.target.value) }))}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
              </div>

              {/* Purchase Price */}
              <div style={{ flex: "1 1 100px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>Purchase Price *</label>
                <input type="number" min="0" style={{ ...inp, width: "100%" }} value={newItemForm.purchasePrice} onChange={(e) => setNewItemForm((f) => ({ ...f, purchasePrice: Number(e.target.value) }))}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
              </div>

              {/* Sale Price */}
              <div style={{ flex: "1 1 100px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>Sale Price</label>
                <input type="number" min="0" style={{ ...inp, width: "100%" }} value={newItemForm.salePrice} onChange={(e) => setNewItemForm((f) => ({ ...f, salePrice: Number(e.target.value) }))}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")} onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")} />
              </div>

              {/* GST Rate */}
              <div style={{ flex: "0.8 1 70px" }}>
                <label style={{ fontSize: "10px", color: "#6b7280", display: "block", marginBottom: "3px", textTransform: "uppercase", fontWeight: 600 }}>GST %</label>
                <select style={{ ...inp, width: "100%" }} value={newItemForm.gstRate} onChange={(e) => setNewItemForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}>
                  {gstOptions.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignSelf: "flex-end" }}>
                <button onClick={handleSaveNewItem} style={{ padding: "6px 14px", border: "none", borderRadius: "6px", background: "#2563eb", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
                <button onClick={() => setNewItemForm(null)} style={{ padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#fff", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>×</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: "#fff", borderBottom: "2px solid #e5e7eb" }}>
                {["Item Name", "HSN", "Size/Pack", "Stock", "GST%", "Sale Price", "Purchase Price", "Quantity"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: ["Quantity"].includes(h) ? "center" : ["Sale Price", "Purchase Price"].includes(h) ? "right" : "left", fontSize: "13px", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>No items found.</td></tr>
              )}
              {filtered.map((item) => {
                const key     = String(item.id);
                const isAdded = !!selected[key];
                const qty     = selected[key]?.qty || 0;
                return (
                  <tr key={key} style={{ borderBottom: "1px solid #f3f4f6", background: isAdded ? "#f0f7ff" : "#fff" }}
                    onMouseEnter={(e) => { if (!isAdded) e.currentTarget.style.background = "#fafafa"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isAdded ? "#f0f7ff" : "#fff"; }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "#111827" }}>{item.name}</td>
                    <td style={{ padding: "12px 16px", color: "#6b7280", fontFamily: "monospace", fontSize: "12.5px" }}>{item.hsn || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>{item.size || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#6b7280" }}>{item.stock != null ? item.stock + " " + (item.unit || "") : "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#6b7280", textAlign: "center" }}>{item.gstRate}%</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#374151" }}>{item.salesPrice > 0 ? "₹" + item.salesPrice.toLocaleString("en-IN") : "₹0"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#374151" }}>{item.purchasePrice > 0 ? "₹" + item.purchasePrice.toLocaleString("en-IN") : "₹0"}</td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      {!isAdded ? (
                        <button
                          onClick={() => {
                            if (isSales && item.stock <= 0) { alert("Out of stock"); return; }
                            toggleItem(item);
                          }}
                          style={{
                            padding: "7px 20px", border: "1.5px solid #bfdbfe", borderRadius: "7px",
                            background: (isSales && item.stock <= 0) ? "#e5e7eb" : "#eff6ff",
                            cursor:     (isSales && item.stock <= 0) ? "not-allowed" : "pointer",
                            color: (isSales && item.stock <= 0) ? "#9ca3af" : "#2563eb",
                            fontSize: "13px", fontWeight: 700, fontFamily: "inherit", minWidth: "80px",
                          }}
                          onMouseEnter={(e) => { if (!(isSales && item.stock <= 0)) { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.color = "#fff"; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = (isSales && item.stock <= 0) ? "#e5e7eb" : "#eff6ff"; e.currentTarget.style.color = (isSales && item.stock <= 0) ? "#9ca3af" : "#2563eb"; }}>
                          {(isSales && item.stock <= 0) ? "Out of stock" : "+ Add"}
                        </button>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #2563eb", borderRadius: "7px", overflow: "hidden", background: "#fff" }}>
                          <button onClick={() => setQty(item.id, qty - 1)} style={{ width: "30px", height: "32px", border: "none", background: "#eff6ff", color: "#2563eb", fontSize: "16px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <input type="text" value={qty} onChange={(e) => setQty(item.id, Number(e.target.value))} style={{ width: "44px", height: "32px", border: "none", textAlign: "center", fontSize: "13.5px", fontWeight: 700, color: "#111827", outline: "none", fontFamily: "inherit" }} />
                          <button onClick={() => setQty(item.id, qty + 1)} style={{ width: "30px", height: "32px", border: "none", background: "#eff6ff", color: "#2563eb", fontSize: "16px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fafafa" }}>
          <div style={{ fontSize: "13px", color: selectedCount > 0 ? "#2563eb" : "#6b7280", fontWeight: selectedCount > 0 ? 600 : 400 }}>
            {selectedCount > 0 ? `${selectedCount} item(s) selected` : "0 items selected"}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "9px 20px", border: "1.5px solid #d1d5db", borderRadius: "7px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleAddToBill} disabled={selectedCount === 0}
              style={{ padding: "9px 22px", border: "none", borderRadius: "7px", background: selectedCount > 0 ? "#1e3a5f" : "#e5e7eb", color: selectedCount > 0 ? "#fff" : "#9ca3af", fontSize: "13px", fontWeight: 700, cursor: selectedCount > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              Add to Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Items Table Component ────────────────────────────────────────────────────
export default function ItemsTable({
  items,
  itemList,
  updateItem,
  removeItem,
  addItems,
  itemTaxable,
  itemTaxBreakup,
  itemTotal,
  isSales,
}) {
  const [showItemModal, setShowItemModal] = useState(false);

  const colWidths = {
    num: "3%", name: "16%", type: "10%", hsn: "6%", unit: "6%",
    qty: "5%", price: "9%", discount: "7%", taxable: "9%",
    gst: "5%", tax: "8%", total: "9%", del: "3%",
  };

  const thStyle = (align = "left") => ({
    padding: "9px 8px", textAlign: align, fontSize: "11px", fontWeight: 700,
    color: "#6b7280", letterSpacing: "0.04em", textTransform: "uppercase",
    whiteSpace: "nowrap", borderBottom: "2px solid #e5e7eb", background: "#f8fafc",
  });

  const tdStyle = (align = "left", extra = {}) => ({
    padding: "5px 6px", verticalAlign: "middle", textAlign: align,
    fontSize: "12px", color: "#111827", borderBottom: "1px solid #f3f4f6", ...extra,
  });

  const cellInput = (value, onChange, extra = {}) => (
    <input value={value ?? ""} onChange={onChange}
      style={{ ...inputStyle, ...extra }}
      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
      onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")} />
  );

  return (
    <>
      {showItemModal && (
        <AddItemsModal
          itemList={itemList}
          onAdd={(newItems) => addItems(newItems)}
          onClose={() => setShowItemModal(false)}
          isSales={isSales}
        />
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "12px" }}>
        <colgroup>
          {Object.values(colWidths).map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle("center")}>#</th>
            <th style={thStyle()}>Item Name</th>
            <th style={thStyle()}>Type</th>
            <th style={thStyle()}>HSN</th>
            <th style={thStyle("center")}>Unit</th>
            <th style={thStyle("center")}>Qty</th>
            {/* ✅ Header label switches based on context */}
            <th style={thStyle("right")}>{isSales ? "Sale Price (₹)" : "Purchase Price (₹)"}</th>
            <th style={thStyle("right")}>Disc (₹)</th>
            <th style={thStyle("right")}>Taxable (₹)</th>
            <th style={thStyle("center")}>GST%</th>
            <th style={thStyle("right")}>Tax (₹)</th>
            <th style={thStyle("right")}>Total (₹)</th>
            <th style={thStyle()}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const tax      = itemTaxBreakup(item);
            const taxTotal = tax.cgst + tax.sgst + tax.igst;

            return (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                {/* # */}
                <td style={tdStyle("center", { color: "#9ca3af", fontWeight: 600 })}>{i + 1}</td>

                {/* Item Name */}
                <td style={tdStyle()}>
                  {cellInput(item.name, (e) => updateItem(i, "name", e.target.value), { padding: "5px 7px" })}
                </td>

                {/* Type */}
                <td style={tdStyle()}>
                  <select
                    value={item.itemType || "Goods"}  // ✅ fallback prevents blank select
                    onChange={(e) => updateItem(i, "itemType", e.target.value)}
                    style={{ ...inputStyle, padding: "5px 5px", fontSize: "11.5px", appearance: "none" }}>
                    {itemTypes.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>

                {/* HSN */}
                <td style={tdStyle()}>
                  {cellInput(item.hsn, (e) => updateItem(i, "hsn", e.target.value), { padding: "5px 7px" })}
                </td>

                {/* Unit */}
                <td style={tdStyle("center")}>
                  <select
                    value={item.unit || "NOS"}  // ✅ fallback
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    style={{ ...inputStyle, padding: "5px 5px", fontSize: "11.5px", appearance: "none", textAlign: "center" }}>
                    {units.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </td>

                {/* Qty */}
                <td style={tdStyle("center")}>
                  {cellInput(item.qty, (e) => updateItem(i, "qty", Number(e.target.value)), { padding: "5px 6px", textAlign: "center" })}
                </td>

                {/* ✅ FIX: purchasePrice for purchase, salePrice for sales */}
                <td style={tdStyle("right")}>
                  {isSales
                    ? cellInput(item.salePrice,     (e) => updateItem(i, "salePrice",     Number(e.target.value)), { padding: "5px 7px", textAlign: "right" })
                    : cellInput(item.purchasePrice, (e) => updateItem(i, "purchasePrice", Number(e.target.value)), { padding: "5px 7px", textAlign: "right" })
                  }
                </td>

                {/* Discount */}
                <td style={tdStyle("right")}>
                  <input type="text" value={item.discount ?? 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateItem(i, "baseDiscount", val);
                      updateItem(i, "discount",     val);
                    }}
                    placeholder="₹"
                    style={{ ...inputStyle, padding: "5px 7px", textAlign: "right" }}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                    onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")} />
                </td>

                {/* Taxable */}
                <td style={tdStyle("right", { fontWeight: 600, color: "#374151", fontSize: "12px" })}>
                  {itemTaxable(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>

                {/* GST % */}
                <td style={tdStyle("center")}>
                  <select
                    value={item.gstRate ?? 18}  // ✅ fallback
                    onChange={(e) => updateItem(i, "gstRate", Number(e.target.value))}
                    style={{ ...inputStyle, padding: "5px 4px", fontSize: "11.5px", appearance: "none", textAlign: "center" }}>
                    {gstOptions.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </td>

                {/* Tax */}
                <td style={tdStyle("right", { color: "#374151", fontSize: "12px" })}>
                  {taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>

                {/* Total */}
                <td style={tdStyle("right", { fontWeight: 700, color: "#1e3a5f", fontSize: "12px" })}>
                  {itemTotal(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>

                {/* Delete */}
                <td style={tdStyle("center")}>
                  <button onClick={() => removeItem(i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "16px", padding: "2px 4px", borderRadius: "4px", lineHeight: 1 }}
                    title="Remove">×
                  </button>
                </td>
              </tr>
            );
          })}

          {items.length === 0 && (
            <tr>
              <td colSpan={13} style={{ padding: "28px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                No items added yet.{" "}
                <span onClick={() => setShowItemModal(true)} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>
                  Add from catalog?
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <button onClick={() => setShowItemModal(true)}
        style={{ marginTop: "12px", padding: "8px 18px", border: "1.5px dashed #d1d5db", borderRadius: "8px", background: "none", fontSize: "13px", fontWeight: 600, color: "#3b82f6", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "inherit" }}>
        <span style={{ fontSize: "16px" }}>+</span> Add Item
      </button>
    </>
  );
}