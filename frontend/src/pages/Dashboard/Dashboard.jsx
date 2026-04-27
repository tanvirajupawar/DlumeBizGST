import { useNavigate } from "react-router-dom";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import { HiOutlineDocumentText } from "react-icons/hi";
import { FaRupeeSign } from "react-icons/fa";
import { useEffect, useState } from "react";
import axios from "axios";
import StatusBadge from "../../components/StatusBadge";

const Dashboard = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);

  // ✅ Fetch + MAP data like SalesInvoiceList
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/sales");

        const data = res.data.data || res.data;

        const mapped = (data || []).map((inv) => ({
          id: inv._id,
          customerName: inv.client_id
            ? `${inv.client_id.first_name || ""} ${inv.client_id.last_name || ""}`.trim()
            : "Walk-in",
          companyName: inv.client_id?.company_name || "",
          invoiceNo: inv.invoice_no,
          date: inv.invoice_date?.split("T")[0],
          amount: inv.total_amount,
         status:
  inv.status === "Paid"
    ? "Paid"
    : inv.status === "Partial"
    ? "Partial"
    : "Unpaid",
        }));

        setInvoices(mapped);
      } catch (err) {
        console.log("FETCH INVOICE ERROR:", err);
      }
    };

    fetchInvoices();
  }, []);

  // ✅ Totals
  const totalInvoices = invoices.length;

  const totalPaid = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const totalUnpaid = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // ✅ Latest 10 invoices
  const recentInvoicesData = [...invoices]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // ✅ ₹ formatter
  const formatCurrency = (num) =>
    "₹" + Number(num || 0).toLocaleString("en-IN");

  // ✅ Table Columns (same style as sales)
 const columns = [
  {
    key: "customerName",
    label: "Customer",
    render: (value) => (
      <div className="font-medium text-gray-800">{value}</div>
    ),
  },
  {
    key: "companyName",
    label: "Company",
    render: (value) => (
      <div className="text-gray-500 text-sm">{value || "-"}</div>
    ),
  },
  {
    key: "invoiceNo",
    label: "Invoice No",
  },
{
  key: "date",
  label: "Date",
  render: (value) =>
    new Date(value).toLocaleDateString("en-GB").replace(/\//g, "-"),
},
  {
    key: "amount",
    label: "Amount",
    render: (value) => formatCurrency(value),
  },
 {
  key: "status",
  label: "Status",
  render: (value) => <StatusBadge status={value} />,
},
];
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Invoices"
          value={totalInvoices}
          icon={HiOutlineDocumentText}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={FaRupeeSign}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        <StatCard
          title="Total Unpaid"
          value={formatCurrency(totalUnpaid)}
          icon={FaRupeeSign}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Recent Invoices
          </h2>

          <button
          onClick={() => navigate("/sales-invoice-list")}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            View All
          </button>
        </div>

        <Table
          columns={columns}
          data={recentInvoicesData}
          searchPlaceholder="Search invoices..."
          onRowClick={(row) => navigate(`/invoice/${row.id}`)}
        />
      </div>
    </div>
  );
};

export default Dashboard;