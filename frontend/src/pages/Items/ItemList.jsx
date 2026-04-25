import { useState, useEffect } from "react";
import axios from "axios";
import { FiEdit2, FiPlus, FiX } from "react-icons/fi";
import { LuTag, LuLayoutGrid, LuDatabase } from "react-icons/lu";
import Table from "../../components/Table";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";

const fmt = (n) =>
  n === 0
    ? "₹0.00"
    : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const LOW_STOCK_THRESHOLD = 100;

const defaultForm = {
  product: "",
  hsn: "",
  type: "",
  category: "",
  code: "",
  size: "",
  unit: "PCS",
  purchasePrice: "",
  mrp: "",
  addStock: "",
  subtractStock: "",
  totalStock: ""
};

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function ItemModal({ editItem, form, setForm, onClose, onSave, onDelete }) {
  const isNew = editItem?.__isNew === true;

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition";

  const currentStock = Number(form.totalStock || 0);
  const add = Number(form.addStock || 0);
  const subtract = Number(form.subtractStock || 0);
  const liveTotal = Math.max(currentStock + add - subtract, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-[860px] h-[580px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isNew ? "Create New Item" : `Edit — ${editItem.product}`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

            <Field label="Product Name *">
              <input
                type="text"
                value={form.product}
                onChange={(e) => setForm(prev => ({ ...prev, product: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Type">
                <input
                  type="text"
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Item Code">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="HSN No">
                <input
                  type="text"
                  value={form.hsn}
                  onChange={(e) => setForm(prev => ({ ...prev, hsn: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Size / Pack">
                <input
                  type="text"
                  value={form.size}
                  onChange={(e) => setForm(prev => ({ ...prev, size: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Unit">
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm(prev => ({ ...prev, unit: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Total Stock */}
            <Field label="Total Stock">
              <input
                type="number"
                min="0"
                value={isNew ? form.totalStock || "" : liveTotal}
                onChange={(e) =>
                  isNew && setForm((prev) => ({ ...prev, totalStock: e.target.value }))
                }
                disabled={!isNew}
                className={`${inputCls} ${!isNew ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
            </Field>

            {!isNew && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Add Stock">
                  <input
                    type="number"
                    min="0"
                    value={form.addStock || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, addStock: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Subtract Stock">
                  <input
                    type="number"
                    min="0"
                    value={form.subtractStock || ""}
                    onChange={(e) => setForm(prev => ({ ...prev, subtractStock: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>
            )}

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Purchase Price (₹)">
                <input
                  type="number"
                  value={form.purchasePrice}
                  onChange={(e) => setForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="MRP (₹)">
                <input
                  type="number"
                  value={form.mrp}
                  onChange={(e) => setForm(prev => ({ ...prev, mrp: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-gray-100 bg-gray-50">
          {!isNew && (
            <Button
              variant="ghost"
              onClick={() => onDelete(editItem.id)}
              className="text-red-600 hover:bg-red-50"
            >
              Delete Item
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => onSave(form)}>
              {isNew ? "Save Item" : "Save Changes"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ItemList() {
  const navigate = useNavigate();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(defaultForm);

  const stockValue = items.reduce((s, i) => s + i.total * i.purchasePrice, 0);

  const openEdit = (item, e) => {
    e?.stopPropagation();
    setEditItem(item);
    setForm({
      product:       item.product,
      hsn:           item.hsn,
      type:          item.type,
      size:          item.size,
      mrp:           item.mrp,
      purchasePrice: item.purchasePrice,
      category:      item.category,
      code:          item.code,
      unit:          item.unit,
      addStock:      "",
      subtractStock: "",
      totalStock:    item.total,
    });
  };

  const handleAddNew = () => {
    setEditItem({ __isNew: true });
    setForm(defaultForm);
  };

  const closeEdit = () => {
    setEditItem(null);
    setForm(defaultForm);
  };

  const handleSave = async (formData) => {
    try {
      const isNew = editItem?.__isNew === true;

      const payload = {
        product:        formData.product,
        hsn:            formData.hsn,
        type:           formData.type,
        category:       formData.category,
        code:           formData.code,
        size:           formData.size,
        unit:           formData.unit,
        purchase_price: Number(formData.purchasePrice),
        mrp:            Number(formData.mrp),
        company_id:     localStorage.getItem("company_id") || "69c951fadb4d82158ef524ea",
      };

      if (isNew) {
        await axios.post("http://localhost:8000/api/product", {
          ...payload,
          qty: Number(formData.totalStock || 0),
        });
      } else {
        const addQty = Number(form.addStock || 0);
        const subQty = Number(form.subtractStock || 0);

        await axios.put(`http://localhost:8000/api/product/${editItem.id}`, {
          ...payload,
          stock_in:  addQty,
          stock_out: subQty,
        });
      }

      await fetchItems();
      closeEdit();
    } catch (err) {
      console.error("Error saving item:", err);
    }
  };

  // ✅ FIX: renamed `in` → `stockIn`, `out` → `stockOut` (reserved word safe)
  const columns = [
    { key: "sr",            label: "Sr No" },
    { key: "product",       label: "Product" },
    { key: "hsn",           label: "HSN No",         render: (val) => val || "—" },
    { key: "type",          label: "Type",            render: (val) => val || "—" },
    { key: "size",          label: "Size/Pack",       render: (val) => val || "—" },
    { key: "purchasePrice", label: "Purchased Price", render: (val) => fmt(val) },
    { key: "mrp",           label: "MRP",             render: (val) => fmt(val) },
    { key: "stockIn",       label: "In" },
    { key: "stockOut",      label: "Out" },
    {
      key: "total",
      label: "Total",
      render: (val) => {
        const isLow = val > 0 && val < LOW_STOCK_THRESHOLD;
        return (
          <span className={isLow ? "text-amber-600 font-medium" : ""}>
            {val.toLocaleString("en-IN")}
            {isLow && (
              <span className="ml-1.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                Low
              </span>
            )}
          </span>
        );
      },
    },
  ];

  useEffect(() => { fetchItems(); }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:8000/api/product/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      closeEdit();
      alert("Item deleted successfully ✅");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete item ❌");
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const company_id = localStorage.getItem("company_id") || "69c951fadb4d82158ef524ea";
      const res = await axios.get(`http://localhost:8000/api/product/company/${company_id}`);
      console.log("RAW ITEM 👉", res.data.data?.[0]);
      setItems(
        (res.data.data || []).map((item) => ({
          id:            item._id || item.id,
          product:       item.product || item.name || "",
          code:          item.code || "",
          category:      item.category || "",
          hsn:           item.hsn || "",
          type:          item.type || item.item_type || "",
          size:          item.size || "",
        purchasePrice: Number(
  item.purchase_price ??
  item.purchasePrice ??
  item.price ??              // 🔥 ADD THIS
  item.cost ??               // 🔥 ADD THIS
  0
),
          mrp:           Number(item.mrp || item.sale_price || item.salePrice || 0),
          // ✅ FIX: safe key names — no reserved word `in`
       stockIn: Number(item.in ?? 0),
stockOut: Number(item.out ?? 0),
total: Number(item.total ?? item.total_stock ?? 0),
          unit:          item.unit || "PCS",
        }))
      );
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading items...</div>;

  return (
    <div className="space-y-5 p-6 bg-gray-50 min-h-screen">
      <Table
        columns={columns}
        data={items.map((item, i) => ({ ...item, sr: i + 1 }))}
        searchPlaceholder="Search items..."
        headerActions={
          <Button
            variant="primary"
            size="md"
            onClick={handleAddNew}
            className="flex items-center gap-2"
          >
            <FiPlus size={14} /> Add Item
          </Button>
        }
        renderActions={(row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => openEdit(row, e)}
            className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <FiEdit2 size={12} /> Edit
          </Button>
        )}
      />

      {editItem !== null && (
        <ItemModal
          editItem={editItem}
          form={form}
          setForm={setForm}
          onClose={closeEdit}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}