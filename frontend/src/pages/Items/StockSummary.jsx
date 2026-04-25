import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiSearch, FiCalendar, FiChevronDown,
} from "react-icons/fi";
import { LuPackage, LuBoxes } from "react-icons/lu";
import Table from "../../components/Table";

const fmt = (n) =>
  n === 0 ? "₹0" : "₹" + Number(n).toLocaleString("en-IN");

const fmtCompact = (n) =>
  "₹" + Number(n).toLocaleString("en-IN");

export default function StockSummary() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCategory, setSearchCategory] = useState("");
  const [showDateMenu, setShowDateMenu] = useState(false);


  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
   const company_id = localStorage.getItem("company_id");

const res = await axios.get(
  `http://localhost:8000/api/product/company/${company_id}`
);
 setItems(
  (res.data.data || []).map((item) => ({
    id: item._id,

    name: item.product || "",
    hsn: item.hsn || "-",   // ✅ ADD THIS

    purchasePrice: Number(
      item.purchase_price ??
      item.purchasePrice ??
      item.price ??
      item.cost ??
      0
    ),

    sellingPrice: Number(item.mrp ?? 0),

    stockQuantity: Number(item.total ?? item.total_stock ?? 0),

    unit: item.unit || "PCS",
    category: item.category || "",
  }))
);
    } catch (err) {
      console.error("Error fetching items:", err);
   
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      searchCategory === "" ||
      item.category.toLowerCase().includes(searchCategory.toLowerCase()) ||
      item.name.toLowerCase().includes(searchCategory.toLowerCase())
  );

  const totalStockValue = filteredItems.reduce(
    (sum, item) => sum + item.stockQuantity * item.purchasePrice, 0
  );
  const totalStockQty = filteredItems.reduce(
    (sum, item) => sum + item.stockQuantity, 0
  );


  const columns = [
  { key: "sr", label: "Sr No" },
  { key: "name", label: "Item Name" },
{ key: "hsn", label: "HSN Code" },
  { key: "purchasePrice", label: "Purchase Price", render: (v) => fmt(v) },
  { key: "sellingPrice", label: "Selling Price", render: (v) => fmt(v) },
  { key: "stockQuantity", label: "Stock Qty" },
  {
    key: "stockValue",
    label: "Stock Value",
    render: (_, row) => fmt(row.stockQuantity * row.purchasePrice),
  },
];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-5">

        {/* ── Single row: Cards on left, filters on right ── */}
        <div className="flex items-center gap-4 flex-wrap">

          {/* Total Stock Value card */}
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 mb-1.5">
              <LuBoxes size={13} />
              Total Stock Value
            </div>
            <p className="text-xl font-bold text-gray-800 tabular-nums">
              {loading ? "—" : fmt(totalStockValue)}
            </p>
          </div>

          {/* Total Stock Quantity card */}
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 mb-1.5">
              <LuPackage size={13} />
              Total Stock Quantity
            </div>
            <p className="text-xl font-bold text-gray-800 tabular-nums">
              {loading ? "—" : totalStockQty.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Push filters to the right */}
          <div className="flex-1" />

          {/* Search Category */}
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Category"
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-indigo-300 w-48"
            />
          </div>

      
        </div>
<Table
  columns={columns}
  data={filteredItems.map((item, i) => ({
    ...item,
    sr: i + 1,
  }))}
  searchPlaceholder="Search items..."
/>
      
      </div>
    </div>
  );
}