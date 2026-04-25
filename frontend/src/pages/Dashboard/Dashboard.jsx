import { useNavigate } from "react-router-dom";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import {
HiOutlineDocumentText,
HiOutlineCurrencyDollar,
} from "react-icons/hi";

const recentInvoices = [
{
id: 1,
number: "INV-1004",
client: "AlphaWorks Ltd",
amount: "$2510.00",
dueDate: "Sep 30, 2025",
status: "Paid",
},
{
id: 2,
number: "INV-1005",
client: "BetaForge Inc",
amount: "$1855.00",
dueDate: "Sep 30, 2025",
status: "Unpaid",
},
{
id: 3,
number: "INV-1002",
client: "John",
amount: "$5426.33",
dueDate: "Sep 11, 2025",
status: "Paid",
},
];

const columns = [
{
key: "client",
label: "Client",
render: (value, row) => ( <div> <div className="font-medium text-gray-800">{value}</div> <div className="text-gray-400 text-xs">#{row.number}</div> </div>
),
},
{ key: "amount", label: "Amount" },
{
key: "status",
label: "Status",
render: (value) => (
<span
className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === "Paid"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-600"
        }`}
>
{value} </span>
),
},
{ key: "dueDate", label: "Due Date" },
];

const Dashboard = () => {
const navigate = useNavigate();

return ( <div className="space-y-6">

  {/* Stats */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <StatCard
      title="Total Invoices"
      value="6"
      icon={HiOutlineDocumentText}
      iconBg="bg-blue-100"
      iconColor="text-blue-600"
    />
    <StatCard
      title="Total Paid"
      value="$10,756.83"
      icon={HiOutlineCurrencyDollar}
      iconBg="bg-green-100"
      iconColor="text-green-600"
    />
    <StatCard
      title="Total Unpaid"
      value="$69,460.00"
      icon={HiOutlineCurrencyDollar}
      iconBg="bg-red-100"
      iconColor="text-red-600"
    />
  </div>



  {/* Recent Invoices */}
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800">
        Recent Invoices
      </h2>

      <button
        onClick={() => navigate("/invoices")}
        className="text-sm font-medium text-gray-500 hover:text-gray-700 transition"
      >
        View All
      </button>
    </div>

    {/* Table */}
    <Table
      columns={columns}
      data={recentInvoices}
      searchPlaceholder="Search invoices..."
      onRowClick={(row) => navigate(`/invoice/${row.id}`)}
    />

  </div>

</div>


);
};

export default Dashboard;
