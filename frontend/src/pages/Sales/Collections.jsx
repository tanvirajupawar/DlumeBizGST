import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import Table from "../../components/Table";
import Button from "../../components/Button";

const collections = [
  {
    id: 1,
    refNo: "COL-001",
    customer: "International Footwear",
    date: "08/03/2026",
    amount: 35000,
    method: "UPI",
    status: "Received",
  },
  {
    id: 2,
    refNo: "COL-002",
    customer: "Prem Footwear",
    date: "07/03/2026",
    amount: 20000,
    method: "Cash",
    status: "Received",
  },
  {
    id: 3,
    refNo: "COL-003",
    customer: "Hitesh Bhai",
    date: "07/03/2026",
    amount: 20000,
    method: "Cash",
    status: "Received",
  },
  {
    id: 4,
    refNo: "COL-004",
    customer: "Sagar Footwear",
    date: "06/03/2026",
    amount: 12500,
    method: "NEFT",
    status: "Pending",
  },
];

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const Collection = () => {
  const navigate = useNavigate();

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (value, row) => (
        <div>
          <p className="font-medium text-gray-800">{value}</p>
          <p className="text-xs text-gray-400">{row.method}</p>
        </div>
      ),
    },
    {
      key: "refNo",
      label: "Reference No",
      render: (value) => (
        <span className="font-mono text-gray-500">{value}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
    },
    {
      key: "amount",
      label: "Amount",
      render: (value) => (
        <span className="font-semibold text-gray-800 tabular-nums">
          {fmt(value)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded
          ${
            value === "Received"
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Collections
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Customer payment records
          </p>
        </div>

        <Button
          variant="navy"
          size="sm"
          className="flex items-center gap-1.5"
          onClick={() => navigate("/sales-collection")}
        >
          <FiPlus size={14} />
          Add Collection
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={collections}
        searchPlaceholder="Search collections..."
        onRowClick={(row) => navigate(`/collection/${row.id}`)}
        onDelete={(row) => console.log("Delete collection:", row)}
      />

    </div>
  );
};

export default Collection;