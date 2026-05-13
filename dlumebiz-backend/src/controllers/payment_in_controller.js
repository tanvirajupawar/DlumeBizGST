const SaleOrder = require("../models/sale_order_model");
const Client = require("../models/client_model");
const SaleReceipt = require("../models/sale_receipt_model");
const mongoose = require("mongoose");

// ── GET PAYMENTS ──
exports.getPaymentsIn = async (req, res) => {
  try {
    const filter = {};
    if (req.query.customer_id) filter.client_id = req.query.customer_id;

    const payments = await SaleReceipt.find(filter).sort({ date: -1 });

    return res.json({
      success: true,
      data: payments,
    });

  } catch (err) {
    console.error("❌ GET PAYMENT-IN ERROR:", err);
    return res.status(500).json({ success: false });
  }
};


// ── CREATE PAYMENT-IN ──
exports.createPaymentIn = async (req, res) => {
  try {
    const { customer_id, amount, payment_mode, remark, invoice_ids } = req.body;

    if (!customer_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "customer_id and amount are required",
      });
    }

    if (!invoice_ids || invoice_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No invoices selected",
      });
    }

    const received = Number(amount);
    let remaining = received;

    console.log("💰 PAYMENT-IN:", received);

    // 🔥 FETCH SALES INVOICES
const invoices = await SaleOrder.find({
  _id: { $in: invoice_ids },
  $expr: { $lt: ["$paid_amount", "$total_amount"] } // 🔥 ONLY unpaid
}).sort({ createdAt: -1 });

    // 🔥 APPLY PAYMENT
for (let inv of invoices) {
  if (remaining <= 0) break;

  const totalAmt = Number(inv.total_amount || 0);
  const alreadyPaid = Number(inv.paid_amount ?? 0);

  const balance = totalAmt - alreadyPaid;
  if (balance <= 0) continue;

  const pay = Math.min(balance, remaining);

inv.paid_amount = alreadyPaid + pay;

// ✅ BALANCE
inv.balance_amount = totalAmt - inv.paid_amount;

// ✅ STATUS
if (inv.paid_amount >= totalAmt) {

  inv.payment_status = "Paid";
  inv.status = "Paid";

} else if (inv.paid_amount > 0) {

  inv.payment_status = "Partial Paid";
  inv.status = "Partial Paid";

} else {

  inv.payment_status = "Unpaid";
  inv.status = "Unpaid";
}

remaining -= pay;

await inv.save();

}

// 🔥 UPDATE CUSTOMER PENDING
    const totalPending = await SaleOrder.aggregate([
      { $match: { client_id: new mongoose.Types.ObjectId(customer_id) } },
      {
        $project: {
          balance: {
            $subtract: [
              "$total_amount",
              { $ifNull: ["$paid_amount", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$balance" },
        },
      },
    ]);

    await Client.findByIdAndUpdate(customer_id, {
      pending_amount: totalPending[0]?.total || 0,
    });

    // 🔥 CREATE PAYMENT RECORD
    const count = await SaleReceipt.countDocuments();
    const payment_no = `RCPT-${String(count + 1).padStart(4, "0")}`;

    const payment = await SaleReceipt.create({
      client_id: customer_id,
      amount: received,
      payment_mode: payment_mode || "Cash",
      remark: remark || "",
      payment_no,
      date: new Date(),
    });

    return res.json({
      success: true,
      message: "Payment received successfully",
      data: payment,
    });

  } catch (err) {
    console.error("❌ PAYMENT-IN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};