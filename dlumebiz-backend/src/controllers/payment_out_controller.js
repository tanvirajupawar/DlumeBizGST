const Purchase = require("../models/purchase_order_model");
const Vendor = require("../models/vendor_model");
const PaymentOut = require("../models/payment_out_model");
const mongoose = require("mongoose");

// ── GET PAYMENTS ──
exports.getPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.vendor_id) filter.vendor_id = req.query.vendor_id;

    const payments = await PaymentOut.find(filter).sort({ date: -1 });

    return res.json({
      success: true,
      data: payments,
    });

  } catch (err) {
    console.error("❌ GET PAYMENT ERROR:", err);
    return res.status(500).json({ success: false });
  }
};

// ── CREATE PAYMENT ──
exports.createPayment = async (req, res) => {
  try {
    const { vendor_id, amount, payment_mode, remark, invoice_ids } = req.body;

    if (!vendor_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "vendor_id and amount are required",
      });
    }

    if (!invoice_ids || invoice_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No invoices selected",
      });
    }

    const paid = Number(amount);
    let remaining = paid;

    console.log("💰 PAYMENT:", paid);

    // 🔥 FETCH INVOICES (BOTTOM FIRST)
    const invoices = await Purchase.find({
      _id: { $in: invoice_ids },
    }).sort({ createdAt: -1 });

    // 🔥 APPLY PAYMENT
    for (let inv of invoices) {
      if (remaining <= 0) break;

      const totalAmt = Number(inv.total_amount || 0);
      const alreadyPaid = Number(inv.paid_amount || 0);

      const balance = totalAmt - alreadyPaid;
      if (balance <= 0) continue;

      const pay = Math.min(balance, remaining);

      inv.paid_amount = alreadyPaid + pay;

      inv.payment_status =
        inv.paid_amount >= totalAmt ? "Paid" : "Partial";

      remaining -= pay;

      await inv.save();
    }

    // 🔥 UPDATE VENDOR PENDING
    const totalPending = await Purchase.aggregate([
      { $match: { vendor_id: new mongoose.Types.ObjectId(vendor_id) } },
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

    await Vendor.findByIdAndUpdate(vendor_id, {
      pending_amount: totalPending[0]?.total || 0,
    });

    // 🔥 CREATE PAYMENT RECORD
    const count = await PaymentOut.countDocuments();
    const payment_no = `PAY-${String(count + 1).padStart(4, "0")}`;

    const payment = await PaymentOut.create({
      vendor_id,
      amount: paid,
      payment_mode: payment_mode || "Cash",
      remark: remark || "",
      payment_no,
      date: new Date(),
    });

    return res.json({
      success: true,
      message: "Payment applied successfully",
      data: payment,
    });

  } catch (err) {
    console.error("❌ PAYMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};