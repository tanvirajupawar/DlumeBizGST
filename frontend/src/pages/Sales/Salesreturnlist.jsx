import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { HiOutlineCalendar } from "react-icons/hi";
import Button from "../../components/Button";
import Table from "../../components/Table";
import SalesReturnDetailPanel from "../../components/SalesReturnDetailPanel";
import DateFilter, { applyDateFilter } from "../../components/DateFilter";

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });




/* ─── PRINT TEMPLATE ─── */
export const getPrintHTML = (note) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Sales Return - ${note.returnNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px; }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
        .section-title { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
        .row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 500; }
        .amount-box { background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .amount-label { font-size: 11px; color: #93c5fd; margin-bottom: 4px; }
        .amount-value { font-size: 28px; font-weight: 700; color: #1e3a8a; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .items-table th { background: #f9fafb; text-align: left; padding: 8px 12px; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; }
        .items-table td { padding: 8px 12px; border: 1px solid #e5e7eb; }
        .items-table tr:nth-child(even) td { background: #f9fafb; }
        .totals { margin-left: auto; width: 260px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .total-row.grand { font-weight: 700; font-size: 15px; color: #1e3a8a; border-top: 2px solid #1e3a8a; border-bottom: none; padding-top: 10px; }
        .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Sales Return</h1>
      <p class="subtitle">Return No: ${note.returnNo} &nbsp;|&nbsp; Date: ${note.date}</p>

      <div class="amount-box">
        <div class="amount-label">Total Return Amount</div>
        <div class="amount-value">${fmt(note.amount)}</div>
      </div>

      <div class="grid">
        <div class="section">
          <div class="section-title">Party Details</div>
          <div class="row"><span class="label">Customer</span><span class="value">${note.partyName}</span></div>
          <div class="row"><span class="label">Invoice No</span><span class="value">${note.invoiceNo}</span></div>
          <div class="row"><span class="label">Return Date</span><span class="value">${note.date}</span></div>
          ${note.reason ? `<div class="row"><span class="label">Reason</span><span class="value">${note.reason}</span></div>` : ""}
        </div>
        <div class="section">
          <div class="section-title">Return Summary</div>
          <div class="row"><span class="label">Subtotal</span><span class="value">${fmt(note.subTotal || note.amount)}</span></div>
          <div class="row"><span class="label">Tax (GST)</span><span class="value">${fmt(note.taxAmount || 0)}</span></div>
          <div class="row"><span class="label">Discount</span><span class="value">${fmt(note.discount || 0)}</span></div>
          <div class="row"><span class="label">Net Amount</span><span class="value">${fmt(note.amount)}</span></div>
        </div>
      </div>

      ${note.items && note.items.length ? `
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th><th>Item</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Tax %</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${note.items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.name || item.item_name || "-"}</td>
                <td>${item.hsn || "-"}</td>
                <td>${item.qty || item.quantity || "-"}</td>
                <td>${item.unit || "-"}</td>
                <td>${fmt(item.rate || item.unit_price || 0)}</td>
                <td>${item.tax_percent || item.gst_percent || 0}%</td>
                <td>${fmt(item.amount || item.total || 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : ""}

      ${note.notes ? `<div class="section" style="margin-bottom:24px"><div class="section-title">Notes</div><p>${note.notes}</p></div>` : ""}

      <div class="footer">Generated on ${new Date().toLocaleString("en-IN")} &nbsp;|&nbsp; This is a system-generated document.</div>
    </body>
  </html>
`;

/* ─── MAIN ─── */
const SalesReturnList = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [dateFilter, setDateFilter] = useState("All");

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/sales-return");
      if (res.data.success) {
        const formatted = res.data.data.map((r) => ({
          id: r._id,
          returnNo: r.return_no,
   companyName: r.client_id?.company_name || "",
customerName: `${r.client_id?.first_name || ""} ${r.client_id?.last_name || ""}`.trim(),
         invoiceNo: r.sales_id?.invoice_no || "-",
        date: r.date,
          amount: r.total_amount || 0,

          subTotal: r.sub_total,
          taxAmount: r.tax_amount,
          discount: r.discount,
          reason: r.reason,
          notes: r.notes,

          items: (r.details || []).map((it) => ({
            name: it.product_name,
            qty: it.qty,
            rate: it.price,
            total: it.amount,
          })),

          status: r.status,
        }));
        setReturns(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  };

const filteredReturns = applyDateFilter(
  returns,
  "date",
  dateFilter
);

const totalAmount = filteredReturns.reduce(
  (s, r) => s + r.amount,
  0
);


  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this return?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`http://localhost:8000/api/sales-return/${id}`);
      setReturns((prev) => prev.filter((r) => r.id !== id));
      setSelectedReturn((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      console.error(err);
      alert("Failed to delete return");
    }
  };

  const columns = [
  {
  key: "date",
  label: "Date",
  render: (v) =>
  new Date(v).toLocaleDateString("en-GB").replace(/\//g, "-"),
},
  {
    key: "returnNo",
    label: "Sales Return No",
    render: (v) => <span className="font-mono">{v}</span>,
  },

  {
    key: "companyName",
    label: "Company Name",
    render: (v) => v || "—",
  },

  {
    key: "customerName",
    label: "Customer Name",
    render: (v) => v || "—",
  },

  { key: "invoiceNo", label: "Invoice No" },

  {
    key: "amount",
    label: "Amount",
    render: (v) => <span className="font-semibold">{fmt(v)}</span>,
  },

  {
    key: "id",
    label: "Actions",
    render: (_, row) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row.id);
        }}
        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-100 transition"
      >
        <FiTrash2 size={14} />
      </button>
    ),
  },
];

  return (
    <div className="space-y-5 relative z-10">
 <div className="flex items-center gap-3">
  
<div className="bg-green-50 px-4 py-2 rounded flex items-center gap-2">
  <span className="text-xs text-gray-400">Total Returns:</span>
  <span className="text-sm font-bold text-green-600">{fmt(totalAmount)}</span>
</div>

  <div className="ml-auto">
    <DateFilter value={dateFilter} onChange={setDateFilter} />
  </div>

</div>

      <Table
        columns={columns}
        data={filteredReturns}
        onRowClick={(row) => setSelectedReturn(row)}
        headerActions={
    <Button
  onClick={() => navigate("/sales-return/new")}
  className="flex items-center gap-2"
>
  <FiPlus size={14} />
  Create Sales Return
</Button>
        }
      />

  {selectedReturn && (
  <SalesReturnDetailPanel
    note={selectedReturn}
    onClose={() => setSelectedReturn(null)}
  />
)}
    </div>
  );
};

export default SalesReturnList;