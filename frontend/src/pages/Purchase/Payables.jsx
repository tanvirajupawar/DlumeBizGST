import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import Table from "../../components/Table";
import Button from "../../components/Button";

const payables = [
  {
    id: 1,
    refNo: "PAY-001",
    vendor: "ABC Traders",
    date: "10/03/2026",
    amount: 25500,
    method: "NEFT",
    status: "Paid",
  },
  {
    id: 2,
    refNo: "PAY-002",
    vendor: "Global Supplies",
    date: "11/03/2026",
    amount: 12800,
    method: "Cash",
    status: "Pending",
  },
  {
    id: 3,
    refNo: "PAY-003",
    vendor: "Sunrise Packaging",
    date: "12/03/2026",
    amount: 9450,
    method: "UPI",
    status: "Paid",
  },
  {
    id: 4,
    refNo: "PAY-004",
    vendor: "Metro Distributors",
    date: "13/03/2026",
    amount: 32100,
    method: "RTGS",
    status: "Pending",
  },
];

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const Payables = () => {
  const navigate = useNavigate();

  const columns = [
    {
      key: "vendor",
      label: "Vendor",
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
            value === "Paid"
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
            Payables
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Vendor payment records
          </p>
        </div>

        <Button
          variant="navy"
          size="sm"
          className="flex items-center gap-1.5"
          onClick={() => navigate("/purchase-payable")}
        >
          <FiPlus size={14} />
          Add Payable
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={payables}
        searchPlaceholder="Search payables..."
        onRowClick={(row) => navigate(`/payable/${row.id}`)}
        onDelete={(row) => console.log("Delete payable:", row)}
      />

    </div>
  );
};

export default Payables;