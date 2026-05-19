import { useState, useEffect } from "react";
import axios from "axios";
import { FiX, FiDownload, FiPrinter, FiEdit2, FiRefreshCw, FiCornerDownLeft } from "react-icons/fi";
import StatusBadge from "./StatusBadge";

const fmt = (n) => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtRupee = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const businessInfo = {
  name: "GLS TECHNOLOGIST",
  address: "Plot No. PAP-A-78, TTC Industrial Area, Pawane MIDC, Turbhe, Navi Mumbai, Maharashtra - 400709",
  state_code: "27",
  email: "glstechnologist2020@gmail.com",
  gst: "27AAUFG7297B1ZV",
  phone: "+91 98765 43210",
  bank: "ICICI BANK",
  branch: "Airoli, Navi Mumbai",
  account: "109005002301",
  ifsc: "ICIC0001090",
  accountHolder: "GLS TECHNOLOGIST",
};

const numberToWords = (num) => {
  if (!num || num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };
  return convert(Math.round(num));
};

const InvoiceDetailPanel = ({ invoice: initialInvoice, onClose, onDataRefresh }) => {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [returns, setReturns] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [activeTab, setActiveTab] = useState("items"); // "items" | "returns"
  const [visible, setVisible] = useState(false);

  const party = invoice.vendor_id || invoice.customer || {};
  const isSalesInvoice =
  !!invoice.customer ||
  !!invoice.customerName;

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Fetch fresh invoice ───────────────────────────────────────────────
const fetchInvoice = async () => {

  if (!initialInvoice?.id) return;

  try {

    const url = isSalesInvoice
      ? `http://localhost:8000/api/sales/${initialInvoice.id}`
      : `http://localhost:8000/api/purchase/${initialInvoice.id}`;

    console.log("FETCHING INVOICE:", url);

    const res = await axios.get(url);

    if (res.data.success) {

      const p = res.data.data;

      setInvoice({
        ...initialInvoice,

        status:
          p.payment_status ||
          p.status ||
          initialInvoice.status,

        amount:
          p.total_amount ??
          initialInvoice.amount,

        paid_amount:
          p.paid_amount ??
          initialInvoice.paid_amount,

   items: (p.details || []).map((it) => ({

  item:
    it.product_name ||
    it.item ||
    "",

  bags:
    Number(it.bags || 1),

  units:
    Number(it.units || 1),

  qty:
    Number(it.qty || 0),

          price:
            Number(it.price || 0),

          total:
            Number(
              it.amount ||
              (it.qty * it.price)
            ),

          hsn:
            it.hsn || "",

          unit:
            it.unit || "NOS",

          gstRate:
            Number(
              it.gst_rate ||
              it.gst ||
              it.gst_percent ||
              18
            ),

          discount:
            Number(it.discount || 0),
        })),
      });
    }

  } catch (err) {

    console.error(
      "Failed to refresh invoice:",
      err
    );
  }
};

  // ── Fetch purchase returns for this invoice ───────────────────────────
 const fetchReturns = async () => {

  if (!initialInvoice?.id) return;

  try {

    const url = isSalesInvoice
      ? `http://localhost:8000/api/sales-return/by-sales/${initialInvoice.id}`
      : `http://localhost:8000/api/purchase-return/by-purchase/${initialInvoice.id}`;

    const fallback = isSalesInvoice
      ? "http://localhost:8000/api/sales-return"
      : "http://localhost:8000/api/purchase-return";

    const res = await axios
      .get(url)
      .catch(() => axios.get(fallback));

    let all = [];

    if (Array.isArray(res.data))
      all = res.data;

    else if (
      res.data.success &&
      Array.isArray(res.data.data)
    )
      all = res.data.data;

    else if (Array.isArray(res.data.returns))
      all = res.data.returns;

    const invoiceId = String(initialInvoice.id);

    const filtered = all.filter((r) => {

      const idField = isSalesInvoice
        ? (r.sales_id?._id || r.sales_id)
        : (r.purchase_id?._id || r.purchase_id);

      return String(idField) === invoiceId;
    });

    setReturns(filtered);

  } catch (err) {

    console.error(
      "Failed to fetch returns:",
      err
    );

    setReturns([]);
  }
};

  // ── Fetch debit notes for this invoice ───────────────────────────────
 const fetchDebitNotes = async () => {

  if (!initialInvoice?.id) return;

  try {

    const url = isSalesInvoice
      ? `http://localhost:8000/api/credit-note/by-sales/${initialInvoice.id}`
      : `http://localhost:8000/api/debit-note/by-purchase/${initialInvoice.id}`;

    const fallback = isSalesInvoice
      ? "http://localhost:8000/api/credit-note"
      : "http://localhost:8000/api/debit-note";

    const res = await axios
      .get(url)
      .catch(() => axios.get(fallback));

    let all = [];

    if (Array.isArray(res.data))
      all = res.data;

    else if (
      res.data.success &&
      Array.isArray(res.data.data)
    )
      all = res.data.data;

    else if (
      Array.isArray(
        res.data.debitNotes ||
        res.data.creditNotes
      )
    )
      all =
        res.data.debitNotes ||
        res.data.creditNotes;

    const invoiceId = String(initialInvoice.id);

    const filtered = all.filter((d) => {

      const idField = isSalesInvoice
        ? (d.sales_id?._id || d.sales_id)
        : (d.purchase_id?._id || d.purchase_id);

      return String(idField) === invoiceId;
    });

    setDebitNotes(filtered);

  } catch (err) {

    console.error(
      "Failed to fetch notes:",
      err
    );

    setDebitNotes([]);
  }
};

  // ── Combined refresh ──────────────────────────────────────────────────
  const refreshAll = () => {
    setLoadingReturns(true);
    Promise.all([fetchInvoice(), fetchReturns(), fetchDebitNotes()])
      .finally(() => setLoadingReturns(false));
  };

  // ── On mount + listen for events ─────────────────────────────────────
  useEffect(() => {
    refreshAll();

const handleReturnCreated = (e) => {

  const eventId = isSalesInvoice
    ? e.detail?.sales_id
    : e.detail?.purchase_id;

  if (
    !eventId ||
    eventId === initialInvoice.id
  ) {
    refreshAll();
    onDataRefresh?.();
  }
};

const handleDebitCreated = (e) => {

  const eventId = isSalesInvoice
    ? e.detail?.sales_id
    : e.detail?.purchase_id;

  if (
    !eventId ||
    eventId === initialInvoice.id
  ) {
    refreshAll();
    onDataRefresh?.();
  }
};
 const returnEvent = isSalesInvoice
  ? "salesReturnCreated"
  : "purchaseReturnCreated";

const noteEvent = isSalesInvoice
  ? "creditNoteCreated"
  : "debitNoteCreated";

window.addEventListener(
  returnEvent,
  handleReturnCreated
);

window.addEventListener(
  noteEvent,
  handleDebitCreated
);

return () => {

  window.removeEventListener(
    returnEvent,
    handleReturnCreated
  );

  window.removeEventListener(
    noteEvent,
    handleDebitCreated
  );
};
  }, [initialInvoice.id]);

  // ── Totals ───────────────────────────────────────────────────────────
  const items = invoice.items || [];
  const pfCharge = invoice.pfCharge || 0;
  const supplyType = invoice.supplyType || "intrastate";
  const isInter = supplyType === "interstate";

  const itemTaxable = (item) => {
    const gross = item.qty * item.price;
    return gross - (gross * (item.discount || 0)) / 100;
  };
  const itemTax = (item) => (itemTaxable(item) * (item.gstRate || 18)) / 100;
  const itemTotal = (item) => itemTaxable(item) + itemTax(item);

  const subtotal = items.reduce((s, item) => s + item.qty * item.price, 0);
  const totalDiscount = items.reduce((s, item) => s + (item.qty * item.price * (item.discount || 0)) / 100, 0);
  const taxableAmount = subtotal - totalDiscount;
  const grandTaxable = taxableAmount + Number(pfCharge);
  const totalItemTax = items.reduce((s, item) => s + itemTax(item), 0);
  const cgst = isInter ? 0 : totalItemTax / 2;
  const sgst = isInter ? 0 : totalItemTax / 2;
  const igst = isInter ? totalItemTax : 0;
  const grandBeforeRound = grandTaxable + cgst + sgst + igst;
  const grandTotal = Math.round(grandBeforeRound);
  const roundOff = grandTotal - grandBeforeRound;

  const taxSummary = items.reduce((acc, item) => {
    const key = item.hsn || "N/A";
    if (!acc[key]) acc[key] = { hsn: key, taxable: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, rate: item.gstRate || 18 };
    acc[key].taxable += itemTaxable(item);
    const tax = itemTax(item);
    if (isInter) acc[key].igstAmt += tax;
    else { acc[key].cgstAmt += tax / 2; acc[key].sgstAmt += tax / 2; }
    return acc;
  }, {});

  const totalReturned = returns.reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalDebited  = debitNotes.reduce((s, d) => s + (d.amount || d.total_amount || 0), 0);
  const totalDeductions = totalReturned + totalDebited;
  const combinedCount   = returns.length + debitNotes.length;

  // ── Print / Download ─────────────────────────────────────────────────
  const getFullInvoiceHTML = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoiceNo || ""}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111827; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .invoice-wrap { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; border: 1.5px solid #e5e7eb; }
    .header { background: #fff; padding: 20px 28px; border-bottom: 3px solid #1e3a5f; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .company-name { font-size: 20px; font-weight: 900; color: #1e3a5f; letter-spacing: 0.5px; }
    .company-address { font-size: 11px; color: #6b7280; max-width: 380px; line-height: 1.3; margin-top: 2px; }
    .company-meta { font-size: 11px; color: #6b7280; margin-top: 1px; }
    .gstin-label { font-size: 10px; color: #9ca3af; margin-bottom: 2px; letter-spacing: 0.06em; text-transform: uppercase; text-align: right; }
    .gstin-value { font-size: 13px; font-weight: 800; color: #1e3a5f; font-family: monospace; letter-spacing: 1px; }
    .title-bar { background: #f8fafc; border-bottom: 1.5px solid #e5e7eb; padding: 9px 28px; text-align: center; }
    .title-bar span { font-size: 15px; font-weight: 800; color: #111827; letter-spacing: 1px; text-transform: uppercase; }
    .top-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1.5px solid #d1d5db; }
    .meta-col { padding: 16px 18px; border-right: 1px solid #d1d5db; }
    .meta-col:last-child { border-right: none; }
    .meta-section-title { font-size: 11px; font-weight: 800; color: #374151; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1.5px solid #e5e7eb; }
    .company-bold { font-size: 13.5px; font-weight: 800; color: #0b1324; margin-bottom: 4px; }
    .addr-text { font-size: 12px; color: #4b5563; line-height: 1.6; }
    .meta-row { display: grid; grid-template-columns: 130px 10px 1fr; align-items: start; margin-bottom: 4px; font-size: 12.5px; }
    .meta-label { color: #4b5563; font-weight: 600; }
    .meta-colon { font-weight: 700; }
    .meta-value { color: #111827; font-weight: 700; }
    .items-section { padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { padding: 9px 8px; font-size: 10.5px; font-weight: 700; color: #374151; letter-spacing: 0.04em; background: #f3f4f6; border-right: 1px solid #e5e7eb; border-bottom: 2px solid #d1d5db; white-space: nowrap; }
    th.right { text-align: right; } th.left { text-align: left; } th:last-child { border-right: none; }
    td { border: 1px solid #d1d5db; padding: 7px 8px; font-size: 12px; }
    td.right { text-align: right; } td.center { text-align: center; } td.no-border-right { border-right: none; }
    .tr-even { background: #fff; } .tr-odd { background: #f8fafc; }
    .tr-total { background: #f0f4f8; border-bottom: 1.5px solid #d1d5db; border-top: 1.5px solid #d1d5db; }
    .bank-summary { display: grid; grid-template-columns: 1fr 320px; border-top: 1.5px solid #d1d5db; }
    .bank-col { padding: 18px 24px; border-right: 1.5px solid #d1d5db; }
    .summary-col { padding: 18px 20px; }
    .section-title { font-size: 11px; font-weight: 800; color: #374151; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1.5px solid #e5e7eb; }
    .bank-grid { display: grid; grid-template-columns: auto 1fr; gap: 3px 20px; font-size: 12.5px; }
    .bank-label { color: #6b7280; font-weight: 600; white-space: nowrap; }
    .bank-value { color: #111827; font-weight: 700; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; color: #374151; }
    .summary-row span:last-child { font-weight: 600; }
    .divider { height: 1px; background: #d1d5db; margin: 8px 0; }
    .net-amount-box { background: #f0f4f8; border: 1.5px solid #d1d5db; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; font-weight: 800; color: #1e3a5f; font-size: 14px; }
    .tax-section { border-top: 1.5px solid #d1d5db; }
    .tax-title { padding: 10px 24px 6px; font-size: 11px; font-weight: 800; color: #374151; letter-spacing: 0.08em; text-transform: uppercase; }
    .words-bar { border-top: 1.5px solid #e5e7eb; padding: 12px 24px; background: #f8fafc; font-size: 12.5px; }
    .terms-sig { display: grid; grid-template-columns: 1fr 260px; border-top: 1.5px solid #d1d5db; }
    .terms-col { padding: 16px 24px; border-right: 1.5px solid #d1d5db; }
    .sig-col { padding: 16px 20px; display: flex; flex-direction: column; justify-content: space-between; }
    .terms-text { font-size: 12px; color: #4b5563; line-height: 1.8; white-space: pre-line; }
    .sig-line { height: 60px; border-bottom: 1px solid #d1d5db; margin-bottom: 6px; }
    .sig-label { font-size: 12px; font-weight: 700; color: #111827; text-align: center; }
    .footer { background: #f8fafc; border-top: 1.5px solid #e5e7eb; padding: 10px 28px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af; }
    @media print { body { margin: 0; } .invoice-wrap { border: none; box-shadow: none; } }
  </style>
</head>
<body>
<div class="invoice-wrap">
  <div class="header">
    <div style="display:flex;align-items:center;gap:16px;">
      <div>
        <div class="company-name">${businessInfo.name}</div>
        <div class="company-address">${businessInfo.address}</div>
        <div class="company-meta">State Code: <strong>${businessInfo.state_code}</strong></div>
        <div class="company-meta">${businessInfo.email} | ${businessInfo.phone}</div>
      </div>
    </div>
    <div>
      <div class="gstin-label">GSTIN/UIN</div>
      <div class="gstin-value">${businessInfo.gst}</div>
    </div>
  </div>
  <div class="title-bar"><span>${invoice.invoiceType || "Tax Invoice"}</span></div>
  <div class="top-meta">
    <div class="meta-col">
      <div class="meta-section-title">Billing Address</div>
      <div class="company-bold">${party.company_name || party.vendor_name || `${party.first_name || ""} ${party.last_name || ""}`}</div>
      <div class="addr-text">${party.address_line_1 || party.address_line1 || ""}${party.address_line_2 ? ", " + party.address_line_2 : ""}<br/>${party.city || ""}${party.state ? ", " + party.state : ""}${party.country ? ", " + party.country : ", India"}<br/>${party.pincode ? "Pincode: " + party.pincode : ""}</div>
      ${party.gstin ? `<div style="font-size:11.5px;color:#374151;margin-top:4px;">GSTIN: <strong>${party.gstin}</strong></div>` : ""}
      ${party.contact_no_1 || party.phone ? `<div style="font-size:12px;color:#4b5563;margin-top:4px;">Mo: ${party.contact_no_1 || party.phone}</div>` : ""}
    </div>
    <div class="meta-col">
      <div class="meta-section-title">Shipping Address</div>
      <div class="company-bold">${party.company_name || party.vendor_name || `${party.first_name || ""} ${party.last_name || ""}`}</div>
      <div class="addr-text">${party.shipping_address_line_1 || party.address_line_1 || party.address_line1 || ""}${party.address_line_2 ? ", " + party.address_line_2 : ""}<br/>${party.shipping_city || party.city || ""}${party.shipping_state ? ", " + party.shipping_state : party.state ? ", " + party.state : ""}${party.country ? ", " + party.country : ", India"}<br/>${party.shipping_pincode || party.pincode ? "Pincode: " + (party.shipping_pincode || party.pincode) : ""}</div>
    </div>
    <div class="meta-col">
      <div class="meta-section-title">Invoice Details</div>
      ${[["Invoice No.", invoice.invoiceNo || "—"], ["Invoice Date", invoice.date || "—"], ["Invoice Type", invoice.invoiceType || "Tax Invoice"], ["Supply Type", invoice.supplyType || "Outward"], ["Status", invoice.status || "—"]].map(([label, value]) => `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-colon">:</span><span class="meta-value">${value}</span></div>`).join("")}
    </div>
  </div>
  <div class="items-section">
    <table>
      <thead>
        <tr>
          <th class="left">#</th><th class="left">Item / Description</th><th class="left">HSN/SAC</th><th class="left">Unit</th>
          <th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Discount</th>
          <th class="right">Taxable</th><th class="right">GST %</th><th class="right">Tax</th>
          <th class="right" style="border-right:none;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
          <tr class="${i % 2 === 0 ? "tr-even" : "tr-odd"}">
            <td class="center" style="color:#6b7280;font-weight:600;width:28px;">${i + 1}</td>
            <td style="font-weight:500;color:#111827;">${item.item || item.description || ""}</td>
            <td style="color:#6b7280;font-family:monospace;font-size:11px;">${item.hsn || "—"}</td>
            <td>${item.unit || "NOS"}</td>
            <td class="right">${item.qty}</td>
            <td class="right">₹${fmt(item.price || item.rate || 0)}</td>
            <td class="right" style="color:#dc2626;">${item.discount ? item.discount + "%" : "0.00%"}</td>
            <td class="right" style="font-weight:600;">₹${fmt(itemTaxable(item))}</td>
            <td class="right">${item.gstRate || 18}%</td>
            <td class="right">₹${fmt(itemTax(item))}</td>
            <td class="right no-border-right" style="font-weight:700;color:#1e3a5f;">₹${fmt(itemTotal(item))}</td>
          </tr>`).join("")}
        <tr class="tr-total">
          <td colspan="4" style="font-weight:800;font-size:12px;color:#374151;">Total :</td>
          <td class="right" style="font-weight:700;">${items.reduce((s, i) => s + i.qty, 0)}</td>
          <td class="right" style="font-weight:700;">₹${fmt(items.reduce((s, i) => s + (i.price || i.rate || 0), 0))}</td>
          <td class="right" style="font-weight:700;color:#dc2626;">₹${fmt(totalDiscount)}</td>
          <td class="right" style="font-weight:700;">₹${fmt(grandTaxable)}</td>
          <td></td>
          <td class="right" style="font-weight:700;">₹${fmt(cgst + sgst + igst)}</td>
          <td class="right no-border-right" style="font-weight:800;color:#1e3a5f;">₹${fmt(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="bank-summary">
    <div class="bank-col">
      <div class="section-title">Bank Details</div>
      <div class="bank-grid">
        <span class="bank-label">Name</span><span class="bank-value">: ${businessInfo.accountHolder}</span>
        <span class="bank-label">Bank Name</span><span class="bank-value">: ${businessInfo.bank}</span>
        <span class="bank-label">Branch Name</span><span class="bank-value">: ${businessInfo.branch}</span>
        <span class="bank-label">Account No</span><span class="bank-value">: ${businessInfo.account}</span>
        <span class="bank-label">Branch IFSC</span><span class="bank-value">: ${businessInfo.ifsc}</span>
      </div>
    </div>
    <div class="summary-col">
      <div class="section-title">Summary</div>
      <div class="summary-row"><span>Subtotal (Gross)</span><span>₹${fmt(subtotal)}</span></div>
      <div class="summary-row"><span>Total Discount</span><span>- ₹${fmt(totalDiscount)}</span></div>
      <div class="summary-row"><span>Taxable Amount</span><span>₹${fmt(taxableAmount)}</span></div>
      ${pfCharge ? `<div class="summary-row"><span>P &amp; F / Transport</span><span>₹${fmt(pfCharge)}</span></div>` : ""}
      <div class="divider"></div>
      ${!isInter ? `<div class="summary-row"><span style="color:#6b7280;">CGST</span><span>₹${fmt(cgst)}</span></div><div class="summary-row"><span style="color:#6b7280;">SGST</span><span>₹${fmt(sgst)}</span></div>` : `<div class="summary-row"><span style="color:#6b7280;">IGST</span><span>₹${fmt(igst)}</span></div>`}
      <div class="summary-row"><span style="color:#6b7280;">Tax Amount</span><span style="font-weight:600;">₹${fmt(cgst + sgst + igst)}</span></div>
      <div class="summary-row"><span style="color:#6b7280;">Round Off</span><span style="color:${roundOff >= 0 ? "#16a34a" : "#dc2626"};">${roundOff >= 0 ? "+" : ""}${Math.abs(roundOff).toFixed(2)}</span></div>
      <div class="net-amount-box"><span>Net Amount</span><span>₹${fmt(grandTotal)}</span></div>
    </div>
  </div>
  <div class="tax-section">
    <div class="tax-title">Tax Summary</div>
    <table>
      <thead>
        <tr>
          <th class="left">Sr. No.</th><th class="left">HSN/SAC</th><th class="right">Taxable Value</th>
          ${!isInter ? `<th class="right">Central Tax Rate</th><th class="right">Central Tax Amt</th><th class="right">State Tax Rate</th><th class="right">State Tax Amt</th>` : `<th class="right">IGST Rate</th><th class="right">IGST Amount</th>`}
          <th class="right">Cess Rate</th><th class="right" style="border-right:none;">Cess Amount</th>
        </tr>
      </thead>
      <tbody>
        ${Object.values(taxSummary).map((row, i) => `
          <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};border-bottom:1px solid #e5e7eb;">
            <td class="center">${i + 1}</td><td style="font-family:monospace;">${row.hsn}</td>
            <td class="right" style="font-weight:600;">₹${fmt(row.taxable)}</td>
            ${!isInter ? `<td class="right">${row.rate / 2}%</td><td class="right">₹${fmt(row.cgstAmt)}</td><td class="right">${row.rate / 2}%</td><td class="right">₹${fmt(row.sgstAmt)}</td>` : `<td class="right">${row.rate}%</td><td class="right">₹${fmt(row.igstAmt)}</td>`}
            <td class="right" style="color:#9ca3af;">N.A.</td><td class="right no-border-right" style="color:#9ca3af;">N.A.</td>
          </tr>`).join("")}
        <tr style="background:#f3f4f6;border-top:1.5px solid #d1d5db;">
          <td colspan="2" style="font-weight:800;color:#374151;">Total</td>
          <td class="right" style="font-weight:700;">₹${fmt(taxableAmount)}</td>
          ${!isInter ? `<td></td><td class="right" style="font-weight:700;">₹${fmt(cgst)}</td><td></td><td class="right" style="font-weight:700;">₹${fmt(sgst)}</td>` : `<td></td><td class="right" style="font-weight:700;">₹${fmt(igst)}</td>`}
          <td class="right" style="color:#9ca3af;">N.A.</td><td class="right no-border-right" style="color:#9ca3af;">N.A.</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="words-bar"><strong>Amount in Words: </strong><em>${numberToWords(grandTotal)} Rupees Only</em></div>
  <div class="terms-sig">
    <div class="terms-col">
      <div class="section-title">Terms &amp; Conditions</div>
      <div class="terms-text">${invoice.termsAndConditions || "1. Payment due within 30 days of invoice date.\n2. Goods once sold will not be taken back.\n3. Subject to Navi Mumbai Jurisdiction."}</div>
    </div>
    <div class="sig-col">
      <div>
        <div class="section-title">For ${businessInfo.name}</div>
        <div style="font-size:11px;color:#6b7280;">GSTIN: ${businessInfo.gst}</div>
      </div>
      <div><div class="sig-line"></div><div class="sig-label">Authorised Signatory</div></div>
    </div>
  </div>
  <div class="footer">
    <span>Generated by <strong>D&apos;Lume Billing Software</strong>.</span>
    <span>Page 1 of 1</span>
    <span>E.O.E.</span>
  </div>
</div>
</body>
</html>`;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(getFullInvoiceHTML());
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleDownload = () => {
    const blob = new Blob([getFullInvoiceHTML()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${invoice.invoiceNo || "download"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
      <div
        className="absolute inset-0 bg-black/20 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[560px] h-full bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-base font-semibold text-gray-800">
              {invoice.vendor || invoice.customerName || party.company_name}
            </p>
            <p className="text-xs text-gray-500">{invoice.companyName || "-"}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{invoice.invoiceNo || "—"}</p>
          </div>
          <div className="flex items-center gap-1.5">
          
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition mt-0.5"
            >
              <FiX size={15} />
            </button>
          </div>
        </div>

        {/* ── Meta row ── */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: "Date", value: invoice.date },
            { label: "Amount", value: fmtRupee(invoice.amount), mono: true },
            { label: "Status", value: invoice.status },
          ].map(({ label, value, mono }) => (
            <div key={label} className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
              {label === "Status" ? (
                <StatusBadge status={invoice.status} />
              ) : (
                <p className={`text-sm font-medium text-gray-800 ${mono ? "tabular-nums" : ""}`}>{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Deductions banner (returns + debit notes combined) ── */}
        {combinedCount > 0 && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCornerDownLeft size={13} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                {returns.length > 0 && `${returns.length} Return${returns.length > 1 ? "s" : ""}`}
                {returns.length > 0 && debitNotes.length > 0 && " · "}
              {debitNotes.length > 0 &&
  `${debitNotes.length} ${
    isSalesInvoice ? "Credit Note" : "Debit Note"
  }${debitNotes.length > 1 ? "s" : ""}`
}
              </span>
            </div>
            <span className="text-xs font-bold text-amber-800 tabular-nums">
              - {fmtRupee(totalDeductions)}
            </span>
          </div>
        )}

        {/* ── Tabs ── */}
    <div className="flex border-b border-gray-100 px-6 mt-3">
  <button
    className="pb-2.5 text-xs font-semibold uppercase tracking-widest border-b-2 border-[#1e3a8a] text-[#1e3a8a]"
  >
    Line Items
  </button>
</div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ITEMS TAB */}
          {activeTab === "items" && (
            <>
              {(!invoice.items || invoice.items.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-12">No items found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                <tr className="border-y border-gray-100 bg-gray-50">
  <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 w-full">
    Item
  </th>

  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
    Bags
  </th>

  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
    Unit
  </th>

  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
    Total Qty
  </th>

  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
    Unit Price
  </th>

  <th className="text-right px-6 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">
    Total
  </th>
</tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((row, i) => (
                   <tr
  key={i}
  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
    i === invoice.items.length - 1 ? "border-b-0" : ""
  }`}
>

  {/* ITEM */}
  <td className="px-6 py-3 text-xs font-medium text-gray-800">
    {row.item}
  </td>

  {/* BAGS */}
  <td className="px-3 py-3 text-xs text-gray-500 text-right tabular-nums">
    {row.bags || 1}
  </td>

  {/* UNIT */}
  <td className="px-3 py-3 text-xs text-gray-500 text-right tabular-nums">
    {row.units || 1}
  </td>

  {/* TOTAL QTY */}
  <td className="px-3 py-3 text-xs font-semibold text-gray-700 text-right tabular-nums">
    {row.qty}
  </td>

  {/* PRICE */}
  <td className="px-4 py-3 text-xs text-gray-500 text-right tabular-nums">
    {fmtRupee(row.price)}
  </td>

  {/* TOTAL */}
  <td className="px-6 py-3 text-xs font-semibold text-gray-800 text-right tabular-nums">
    {fmtRupee(row.total)}
  </td>

</tr>
                    ))}
                  </tbody>
                </table>
              )}
              {invoice.items?.length > 0 && (
                <div className="mx-6 mt-4 pt-3.5 border-t border-gray-200 flex items-center justify-between pb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Grand Total</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">{fmtRupee(invoice.amount)}</p>
                </div>
              )}
            </>
          )}

          {/* CREDITS TAB — returns + debit notes */}
          {activeTab === "returns" && (
            <div className="px-6 py-4">
              {loadingReturns ? (
                <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
              ) : combinedCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <FiCornerDownLeft size={28} className="text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No returns or ${
  isSalesInvoice
    ? "credit notes"
    : "debit notes"
} for this invoice.</p>
                </div>
              ) : (
                <div className="space-y-3">

                  {/* ── Purchase Returns ── */}
                  {returns.map((ret, i) => (
                    <div key={ret._id || `ret-${i}`} className="border border-gray-100 rounded-xl bg-gray-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white">
                        <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
  {isSalesInvoice ? "Sales Return" : "Purchase Return"}
</span>
                          <span className="text-xs font-mono font-semibold text-gray-700">
                            {ret.return_no || `PR-${String(i + 1).padStart(3, "0")}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {ret.date ? new Date(ret.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </span>
                          <span className="text-xs font-bold text-red-600 tabular-nums">
                            - {fmtRupee(ret.total_amount)}
                          </span>
                        </div>
                      </div>
                      {(ret.details || []).length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {ret.details.map((d, di) => (
                            <div key={di} className="flex items-center justify-between px-4 py-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700">{d.product_name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Qty: {d.qty} × {fmtRupee(d.price)}</p>
                              </div>
                              <p className="text-xs font-semibold text-gray-700 tabular-nums">{fmtRupee(d.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {ret.reason && (
                        <div className="px-4 py-2 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400">
                            <span className="font-semibold">Reason: </span>{ret.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* ── Debit Notes ── */}
                  {debitNotes.map((dn, i) => (
                    <div key={dn._id || `dn-${i}`} className="border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100 bg-white">
                        <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
  {isSalesInvoice ? "Credit Note" : "Debit Note"}
</span>
                          <span className="text-xs font-mono font-semibold text-gray-700">
                            {
  dn.credit_note_no ||
  dn.credit_no ||
  dn.debit_note_no ||
  dn.debit_no ||
  `DN-${String(i + 1).padStart(3, "0")}`
}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {dn.date ? new Date(dn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </span>
                          <span className="text-xs font-bold text-blue-700 tabular-nums">
                            - {fmtRupee(dn.amount || dn.total_amount)}
                          </span>
                        </div>
                      </div>
                      {(dn.details || []).length > 0 && (
                        <div className="divide-y divide-blue-50">
                          {dn.details.map((d, di) => (
                            <div key={di} className="flex items-center justify-between px-4 py-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700">{d.product_name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Qty: {d.qty} × {fmtRupee(d.price)}
                                </p>
                              </div>
                              <p className="text-xs font-semibold text-gray-700 tabular-nums">{fmtRupee(d.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {dn.reason && (
                        <div className="px-4 py-2 border-t border-blue-100">
                          <p className="text-[10px] text-gray-400">
                            <span className="font-semibold">Reason: </span>{dn.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* ── Totals summary ── */}
                  <div className="mt-4 pt-3 border-t border-gray-200 space-y-1.5">
                    {returns.length > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">Total Returned</p>
                        <p className="text-xs font-semibold text-red-500 tabular-nums">- {fmtRupee(totalReturned)}</p>
                      </div>
                    )}
                    {debitNotes.length > 0 && (
                      <div className="flex items-center justify-between">
<p className="text-xs text-gray-400">
  {isSalesInvoice ? "Total Credited" : "Total Debited"}
</p>
                        <p className="text-xs font-semibold text-blue-600 tabular-nums">- {fmtRupee(totalDebited)}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Net Payable</p>
                      <p className="text-base font-bold text-gray-900 tabular-nums pb-4">
                        {fmtRupee(Math.max(0, (invoice.amount || 0) - totalDeductions))}
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Buttons ── */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex gap-2">
            <button onClick={handleDownload} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 text-gray-600">
              <FiDownload size={14} /> Download
            </button>
            <button onClick={handlePrint} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 text-gray-600">
              <FiPrinter size={14} /> Print
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 text-gray-700">
              Close
            </button>
            <button className="flex-1 bg-[#2b3f8f] text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2 hover:bg-[#1e2e6f]">
              <FiEdit2 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPanel;