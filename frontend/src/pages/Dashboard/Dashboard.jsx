import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import StatusBadge from "../../components/StatusBadge";

const BASE_URL = "http://localhost:8000";

const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return (
    String(d.getDate()).padStart(2, "0") +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    d.getFullYear()
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [collections, setCollections] = useState([]);

  const now = new Date();
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const todayStr = now.toISOString().split("T")[0];
  const dateLabel = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => {
    fetchInvoices();
    fetchCollections();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/sales`);
      const data = res.data.data || res.data || [];
      const mapped = data.map((inv) => {
        const cust = inv.client_id || {};
        return {
          id: inv._id,
          customerName: ((cust.first_name || "") + " " + (cust.last_name || "")).trim() || "Walk-in",
          invoiceNo: inv.invoice_no || "",
          date: inv.invoice_date || "",
          amount: inv.total_amount || 0,
          status: inv.status === "Paid" ? "Paid" : inv.status === "Partial" ? "Partial" : "Unpaid",
          isToday: (inv.invoice_date || "").startsWith(todayStr),
        };
      });
      setInvoices(mapped);
    } catch (err) {
      console.log("Fetch invoices error:", err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/collections`);
      const data = res.data.data || res.data || [];
      const mapped = data.map((col) => ({
        id: col._id,
        customer: col.customer_name || "Walk-in",
        date: col.date || "",
        remark: col.remark || "",
        amount: col.amount || 0,
        paymentMode: col.payment_method || "",
        status: col.status || "Received",
        isToday: (col.date || "").startsWith(todayStr),
      }));
      setCollections(mapped);
    } catch (err) {
      console.log("Fetch collections error:", err);
    }
  };

  const todaySales = invoices.filter((i) => i.isToday).reduce((s, i) => s + i.amount, 0);

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  const recentCollections = [...collections].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const activeItems = activeTab === "invoices" ? recentInvoices : recentCollections;

  return (
    <div className="space-y-6">

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/purchase-invoice")}
          className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:shadow-md hover:border-gray-300 active:scale-[0.98] transition-all text-center group"
        >
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <span className="text-4xl">📦</span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Add Stocks</p>
            <p className="text-sm text-gray-400 mt-0.5">Update inventory</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/sales-invoice")}
          className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:shadow-md hover:border-gray-300 active:scale-[0.98] transition-all text-center group"
        >
          <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
            <span className="text-4xl">💰</span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Add Sales</p>
            <p className="text-sm text-gray-400 mt-0.5">Record transaction</p>
          </div>
        </button>
      </div>

      {/* Today's Activity Panel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Today's Activity</h2>
            <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sales</p>
            <p className="text-xl font-bold text-gray-900">{fmt(todaySales)}</p>
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
          <div className="flex gap-1 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === "invoices"
                  ? "bg-[#0f1e3d] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab("collections")}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === "collections"
                  ? "bg-[#0f1e3d] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Collections
            </button>
          </div>
          <button
            onClick={() => navigate("/sales-invoice-list")}
            className="ml-auto text-xs text-blue-600 border border-blue-200 rounded-full px-4 py-1.5 hover:bg-blue-50 transition font-medium"
          >
            View All →
          </button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_100px] gap-3 px-6 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Customer", "Amount", "Date", "Status"].map((h, i) => (
            <span
              key={h}
              className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider ${
                i === 1 ? "text-right" : i === 2 ? "text-right" : i === 3 ? "text-center" : ""
              }`}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-3 opacity-40">
              <rect x="8" y="4" width="32" height="40" rx="3" fill="#c5d0e6"/>
              <rect x="13" y="13" width="22" height="2.5" rx="1.25" fill="#e8eef8"/>
              <rect x="13" y="19" width="16" height="2.5" rx="1.25" fill="#e8eef8"/>
              <rect x="13" y="25" width="19" height="2.5" rx="1.25" fill="#e8eef8"/>
              <path d="M9 38 Q24 34 39 38" stroke="#e8eef8" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium">No {activeTab} today</p>
          </div>
        ) : (
          activeItems.map((item) => (
            <div
              key={item.id}
              onClick={() => activeTab === "invoices" ? navigate(`/invoice/${item.id}`) : undefined}
              className={`grid grid-cols-[2fr_1fr_1fr_100px] gap-3 px-6 py-3.5 border-b border-gray-50 last:border-0 transition items-center ${
                activeTab === "invoices" ? "hover:bg-gray-50 cursor-pointer" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {activeTab === "invoices" ? item.customerName : item.customer}
                </p>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  {activeTab === "invoices" ? item.invoiceNo : item.remark || item.paymentMode}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-800 text-right">{fmt(item.amount)}</p>
              <p className="text-xs text-gray-400 text-right">{formatDate(item.date)}</p>
              <div className="flex justify-center">
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Dashboard;