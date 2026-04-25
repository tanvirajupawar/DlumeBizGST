import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiChevronDown, FiX, FiPlus } from "react-icons/fi";
import { HiOutlineSearch } from "react-icons/hi";
import Button from "../../components/Button";

const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const toWords = (amount) => {
  if (amount === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
    return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
  };
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result = numToWords(rupees) + " Rupees";
  if (paise > 0) result += " and " + numToWords(paise) + " Paise";
  return result + " Only";
};

/* ─── Customer Dropdown ─── */
const CustomerSelector = ({ value, onChange }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState("");
  const [open, setOpen]           = useState(false);

  useEffect(() => {
   axios.get("http://localhost:8000/api/customers")
      .then((res) => { if (res.data.success) setCustomers(res.data.data); })
      .catch((err) => {
        console.error("CUSTOMER FETCH ERROR:", err);
        setCustomers([]);
      });
  }, []);

  const filtered = customers.filter((c) =>
    (`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company_name|| "").toLowerCase().includes(search.toLowerCase())
  );
  const select = (c) => { onChange(c); setOpen(false); setSearch(""); };
  const clear  = (e) => { e.stopPropagation(); onChange(null); };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-sm transition
          ${value ? "border-blue-200 bg-blue-50/40 text-gray-800" : "border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:bg-blue-50/20"}`}>
        <span className={value ? "font-medium text-gray-800" : ""}>
        {value
  ? `${value.first_name || ""} ${value.last_name || ""}`.trim() || value.company_name
  : "+ Select Customer"}
        </span>
        <div className="flex items-center gap-1">
          {value && <span onClick={clear} className="p-0.5 hover:text-red-400 transition text-gray-400"><FiX size={13} /></span>}
          <FiChevronDown size={14} className={`text-gray-400 transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-full min-w-[280px]">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No customers found</p>
                : filtered.map((c) => (
                  <button key={c._id} onClick={() => select(c)}
                    className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-blue-50 transition text-left">
                    <div>
                   <p className="text-sm font-medium text-gray-800">
  {`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company_name}
</p>
                      <p className="text-xs text-gray-400">{c.gstin || "No GSTIN"}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Invoice Dropdown ─── */
const InvoiceSelector = ({ customerId, value, onChange }) => {
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!customerId) { setInvoices([]); onChange(null); return; }
    setLoading(true);
   axios.get(`http://localhost:8000/api/sales?client_id=${customerId}`)
      .then((res) => { if (res.data.success) setInvoices(res.data.data); })
      .catch((err) => {
        console.error("INVOICE FETCH ERROR:", err);
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const select = (inv) => { onChange(inv); setOpen(false); };
  const clear  = (e)   => { e.stopPropagation(); onChange(null); };

  if (!customerId) return (
    <div className="w-full flex items-center justify-center px-3.5 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-300">
      Select a customer first
    </div>
  );

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-sm transition
          ${value ? "border-blue-200 bg-blue-50/40 text-gray-800" : "border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:bg-blue-50/20"}`}>
        <span className={value ? "font-medium font-mono text-gray-800" : ""}>
          {loading ? "Loading..." : value ? value.invoice_no : "+ Link Invoice"}
        </span>
        <div className="flex items-center gap-1">
          {value && <span onClick={clear} className="p-0.5 hover:text-red-400 transition text-gray-400"><FiX size={13} /></span>}
          <FiChevronDown size={14} className={`text-gray-400 transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && !loading && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-full min-w-[320px]">
            <div className="max-h-56 overflow-y-auto py-1">
              {invoices.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No invoices found</p>
                : invoices.map((inv) => (
                  <button key={inv._id} onClick={() => select(inv)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition text-left border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold font-mono text-gray-800">{inv.invoice_no}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(inv.invoice_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        &nbsp;·&nbsp;{inv.details?.length || 0} items
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{fmt(inv.total_amount)}</span>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
const CreateSalesReturn = () => {
  const navigate = useNavigate();
  const [customer, setCustomer]     = useState(null);
  const [invoice, setInvoice]       = useState(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [returnNumber, setReturnNumber] = useState("SR-001");
  const [reason, setReason]         = useState("");
  const [rows, setRows]             = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Additional charges
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [showAdditional, setShowAdditional]       = useState(false);

  // Payment
  const [amountPaid, setAmountPaid]       = useState(0);
  const [paymentMode, setPaymentMode]     = useState("Cash");
  const [markFullyPaid, setMarkFullyPaid] = useState(false);
  const [autoRoundOff, setAutoRoundOff]   = useState(false);
  const [discount, setDiscount]           = useState(0);

  useEffect(() => {
    if (invoice) {
      setRows((invoice.details || []).map((d) => ({ ...d, returnQty: 0, maxQty: d.qty })));
    } else {
      setRows([]);
    }
  }, [invoice]);

  useEffect(() => {
    axios.get("http://localhost:8000/api/sales-return/next-number")
      .then((res) => {
        if (res.data.success) setReturnNumber(res.data.return_no);
      })
      .catch(() => {
        setReturnNumber("SR-001");
      });
  }, []);

  const handleCustomerChange = (c) => { setCustomer(c); setInvoice(null); };

  const updateQty = (idx, val) => {
    const parsed = Math.max(0, Math.min(Number(val) || 0, rows[idx].maxQty));
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, returnQty: parsed } : r)));
  };

  useEffect(() => {
    if (markFullyPaid) setAmountPaid(totalAmount);
  }, [markFullyPaid]);

  const taxableAmount = rows.reduce((s, r) => s + r.returnQty * r.price, 0);
  const gstAmount     = rows.reduce((s, r) => s + (r.returnQty * r.price * (r.gst_percent || 0)) / 100, 0);
  const discountAmt   = (taxableAmount * discount) / 100;
  const roundOffVal   = autoRoundOff
    ? Math.round(taxableAmount + gstAmount + Number(additionalCharges || 0) - discountAmt)
      - (taxableAmount + gstAmount + Number(additionalCharges || 0) - discountAmt)
    : 0;
  const totalAmount   = taxableAmount + gstAmount + Number(additionalCharges || 0) - discountAmt + roundOffVal;
  const balanceAmount = totalAmount - Number(amountPaid || 0);
  const hasItems      = rows.some((r) => r.returnQty > 0);

  const handleSubmit = async () => {
    if (!customer) { alert("Please select customer"); return; }
    if (!invoice)  { alert("Please select invoice");  return; }
    if (!hasItems) { alert("Enter return quantity");  return; }

    setSubmitting(true);
    try {
   await axios.post("http://localhost:8000/api/sales-return", {
  customer_id: customer._id,
  sales_id: invoice._id,   
  date: returnDate,
  reason,
  details: rows.filter((r) => r.returnQty > 0).map((r) => ({
    product_name: r.product_name,
    qty: r.returnQty,
    price: r.price,
    amount: r.returnQty * r.price,
  })),
  additional_charges: additionalCharges,
  discount,
  amount_paid: amountPaid,
  payment_mode: paymentMode,
  total_amount: totalAmount,
});
    navigate("/sales-return");
    } catch (err) {
      console.error("SAVE ERROR:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Top Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
        <div className="grid grid-cols-3 divide-x divide-gray-100">

          {/* BILL TO */}
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Bill To</p>
            <CustomerSelector value={customer} onChange={handleCustomerChange} />
            {customer && (
              <div className="mt-3 space-y-0.5">
                {customer.gstin && (
                  <p className="text-xs text-gray-500 font-mono">GSTIN: {customer.gstin}</p>
                )}
                <div className="text-xs text-gray-500 leading-relaxed">
                  {[customer.address_line_1, customer.address_line_2]
                    .filter(Boolean)
                    .join(", ")}
                  <br />
                  {[customer.city, customer.state, customer.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}
          </div>

          {/* LINK INVOICE */}
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Link Invoice</p>
            <InvoiceSelector customerId={customer?._id} value={invoice} onChange={setInvoice} />
            {invoice?.ship_to && <p className="text-xs text-gray-500 mt-3">{invoice.ship_to}</p>}
          </div>

          {/* Right details */}
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Invoice No</p>
                <p className="text-sm font-mono font-semibold text-gray-600">{invoice?.invoice_no || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Invoice Date</p>
                <p className="text-sm text-gray-600">
                  {invoice
                    ? new Date(invoice.invoice_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Return No</p>
              <input
                value={returnNumber}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-gray-50 text-gray-600 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Reason / Remarks</p>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Damaged goods, Wrong item..."
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      {invoice && rows.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Items / Stock</p>
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-700 font-medium">Only <strong>Return Qty</strong> is editable</p>
            </div>
          </div>

          {/* Table head */}
          <div className="grid grid-cols-[40px_1fr_110px_90px_80px_90px_100px_90px_90px_110px] bg-gray-50 border-b border-gray-200">
            {["#", "Item Name", "Item Type", "SKU / Code", "Unit"].map((h) => (
              <div key={h} className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</div>
            ))}
            <div className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Orig Qty</div>
            <div className="px-2 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wide text-center bg-blue-50 border-x border-blue-100">Return Qty ✎</div>
            <div className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Price (₹)</div>
            <div className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">GST %</div>
            <div className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right pr-5">Total (₹)</div>
          </div>

          {rows.map((row, idx) => {
            const returnAmt = row.returnQty * row.price;
            const gstAmt    = (returnAmt * (row.gst_percent || 0)) / 100;
            const rowTotal  = returnAmt + gstAmt;
            return (
              <div key={idx}
                className={`grid grid-cols-[40px_1fr_110px_90px_80px_90px_100px_90px_90px_110px] items-center
                  ${idx !== rows.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className="px-3 py-4 text-xs text-gray-400">{idx + 1}</div>
                <div className="px-3 py-4 pr-3"><p className="text-sm text-gray-800 font-medium truncate">{row.product_name}</p></div>
                <div className="px-3 py-4"><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{row.item_type || "Goods"}</span></div>
                <div className="px-3 py-4"><span className="text-xs font-mono text-gray-500">{row.sku || row.hsn || "—"}</span></div>
                <div className="px-3 py-4"><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{row.unit || "NOS"}</span></div>
                <div className="px-3 py-4 text-right"><span className="text-sm text-gray-500 tabular-nums">{row.qty}</span></div>
                <div className="px-2 py-3 flex justify-center bg-blue-50/70 border-x border-blue-100">
                  <input type="number" min={0} max={row.maxQty}
                    value={row.returnQty === 0 ? "" : row.returnQty}
                    onChange={(e) => updateQty(idx, e.target.value)}
                    placeholder="0"
                    className="w-16 text-center border border-blue-200 rounded-lg px-2 py-1.5 text-sm font-bold text-blue-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 tabular-nums" />
                </div>
                <div className="px-3 py-4 text-right"><span className="text-sm text-gray-500 tabular-nums">{fmt(row.price)}</span></div>
                <div className="px-3 py-4 text-right"><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{row.gst_percent || 0}%</span></div>
                <div className="px-3 py-4 text-right pr-5">
                  <span className={`text-sm font-semibold tabular-nums ${rowTotal > 0 ? "text-red-500" : "text-gray-300"}`}>{fmt(rowTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !invoice && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">Select a customer and link an invoice above to load items</p>
          </div>
        )
      )}

      {/* ── Total Box + Actions ── */}
      {invoice && (
        <div className="flex justify-end gap-6 pb-6">
          <div className="w-full max-w-sm">

            {/* Total card */}
            <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-5">

              {/* Additional Charges */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <button
                  onClick={() => setShowAdditional((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800 transition"
                >
                  <FiPlus size={14} /> Add Additional Charges
                </button>
                <input
                  type="number"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(e.target.value)}
                  className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200 tabular-nums"
                />
              </div>

              {/* Taxable Amount */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Taxable Amount</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(taxableAmount)}</span>
              </div>

              {/* GST Amount */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">GST Amount</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(gstAmount)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0} max={100}
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 tabular-nums"
                  />
                  <span className="text-sm text-red-500 tabular-nums font-medium">- {fmt(discountAmt)}</span>
                </div>
              </div>

              {/* Auto Round Off */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200 cursor-pointer" />
                  <span className="text-sm text-gray-600">Auto Round Off</span>
                </label>
                <span className="text-sm text-gray-500 tabular-nums">{fmt(roundOffVal)}</span>
              </div>

              {/* Total Amount */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
                <span className="text-sm font-bold text-gray-800">Total Amount</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{fmt(totalAmount)}</span>
              </div>

              {/* In Words */}
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-600">In Words: </span>
                  {toWords(Math.round(totalAmount))}
                </p>
              </div>

              {/* Mark as fully paid */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600">Mark as fully paid</span>
                  <input type="checkbox" checked={markFullyPaid}
                    onChange={(e) => {
                      setMarkFullyPaid(e.target.checked);
                      if (e.target.checked) setAmountPaid(totalAmount);
                      else setAmountPaid(0);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200 cursor-pointer" />
                </label>
              </div>

              {/* Amount Paid */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Amount Paid</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <span className="px-3 py-1.5 bg-gray-50 text-sm text-gray-500 border-r border-gray-200">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={amountPaid}
                    onChange={(e) => { setAmountPaid(e.target.value); setMarkFullyPaid(false); }}
                    className="w-24 px-2.5 py-1.5 text-sm focus:outline-none tabular-nums text-right"
                  />
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                    className="px-2 py-1.5 text-sm bg-white border-l border-gray-200 focus:outline-none text-gray-600 cursor-pointer">
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                  </select>
                </div>
              </div>

              {/* Balance Amount */}
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm font-bold text-blue-700">Balance Amount</span>
                <span className={`text-base font-bold tabular-nums ${balanceAmount > 0 ? "text-blue-700" : "text-green-600"}`}>
                  {fmt(Math.max(0, balanceAmount))}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={() => navigate("/sales-return")}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <Button variant="navy" size="sm"
                disabled={!hasItems || submitting}
                onClick={handleSubmit}
                className={`flex-1 py-2.5 ${!hasItems ? "opacity-40 cursor-not-allowed" : ""}`}>
                {submitting ? "Saving..." : "Save Sales Return"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSalesReturn;