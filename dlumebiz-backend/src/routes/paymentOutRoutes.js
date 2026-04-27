const express = require("express");
const router = express.Router();

const Purchase = require("../models/purchase_order_model");
const Vendor = require("../models/vendor_model");
const PaymentOut = require("../models/payment_out_model"); // ← make sure this exists

// ── GET all payments (for PaymentsTab in VendorDetails) ──
router.get("/payment-out", async (req, res) => {
  try {
    const filter = {};
    if (req.query.vendor_id) filter.vendor_id = req.query.vendor_id;

    const payments = await PaymentOut.find(filter).sort({ date: -1 });
    return res.json({ success: true, data: payments });
  } catch (err) {
    console.error("❌ GET PAYMENT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ── POST create payment ──
router.post("/payment-out", async (req, res) => {
  try {
    const { vendor_id, amount, payment_mode, remark } = req.body;

    if (!vendor_id || !amount) {
      return res.status(400).json({ success: false, message: "vendor_id and amount are required" });
    }

    const paid = Number(amount);
    let remaining = paid;

    console.log("💰 PAYMENT:", paid);

    // ── 1. Fetch unpaid / partial invoices oldest → newest ──
  const { invoice_ids } = req.body;

const invoices = await Purchase.find({
  _id: { $in: invoice_ids }
});

    for (let inv of invoices) {
      if (remaining <= 0) break;

      const balance =
        inv.balance_amount !== undefined && inv.balance_amount !== null
          ? Number(inv.balance_amount)
          : Number(inv.total_amount || 0);

      if (balance <= 0) continue;

      if (balance <= remaining) {
        // fully paid
        remaining -= balance;
        inv.balance_amount = 0;
        inv.payment_status = "Paid";
      } else {
        // partially paid
        inv.balance_amount = balance - remaining;
        inv.payment_status = "Partial";
        remaining = 0;
      }

      await inv.save();
    }

    // ── 2. Update vendor pending_amount ──
    const vendor = await Vendor.findById(vendor_id);
    if (vendor) {
      const current = Number(vendor.pending_amount || 0);
      vendor.pending_amount = Math.max(0, current - paid);
      await vendor.save();
    }

    // ── 3. Generate payment number ──
    const count = await PaymentOut.countDocuments();
    const payment_no = `PAY-${String(count + 1).padStart(4, "0")}`;

    // ── 4. Save payment record ──
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
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;