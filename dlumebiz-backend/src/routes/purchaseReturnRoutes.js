const express = require("express");
const router = express.Router();
const PurchaseReturn = require("../models/purchase_return_model");

// ✅ Generate PR Number
const generatePRNumber = async () => {
  const last = await PurchaseReturn.findOne().sort({ createdAt: -1 });
  let next = 1;
  if (last && last.return_no) {
    const match = last.return_no.match(/PR-(\d+)/);
    if (match) next = parseInt(match[1]) + 1;
  }
  return `PR-${String(next).padStart(5, "0")}`;
};

// 1️⃣ CREATE
router.post("/purchase-return", async (req, res) => {
  try {
    const return_no = await generatePRNumber();
    const newReturn = new PurchaseReturn({
      purchase_id: req.body.purchase_id,
      vendor_id: req.body.vendor_id,
      date: req.body.date,
      reason: req.body.reason,
      details: req.body.details || [],
      total_amount: req.body.total_amount,
      return_no,
    });
    await newReturn.save();
    res.json({ success: true, data: newReturn });
  } catch (err) {
    console.error("RETURN ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2️⃣ NEXT NUMBER  ← must be before GET /purchase-return
router.get("/purchase-return/next-number", async (req, res) => {
  try {
    const return_no = await generatePRNumber();
    res.json({ success: true, return_no });
  } catch (err) {
    console.error("NEXT NUMBER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// 3️⃣ BY PURCHASE ID  ← must be before GET /purchase-return
router.get("/purchase-return/by-purchase/:purchaseId", async (req, res) => {
  try {
    const returns = await PurchaseReturn.find({ purchase_id: req.params.purchaseId })
      .populate("vendor_id")
      .populate("purchase_id")
      .lean();
    res.json({
      success: true,
      data: returns.map((r) => ({ ...r, details: r.details || [] })),
    });
  } catch (err) {
    console.error("GET BY PURCHASE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4️⃣ GET ALL (with optional ?purchase_id= filter)
router.get("/purchase-return", async (req, res) => {
  try {
    const filter = {};
    if (req.query.purchase_id) filter.purchase_id = req.query.purchase_id;
    const returns = await PurchaseReturn.find(filter)
      .populate("vendor_id")
      .populate("purchase_id")
      .lean();
    res.json({
      success: true,
      data: returns.map((r) => ({ ...r, details: r.details || [] })),
    });
  } catch (err) {
    console.error("GET RETURN ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// 5️⃣ DELETE  ← /:id always last
router.delete("/purchase-return/:id", async (req, res) => {
  try {
    const deleted = await PurchaseReturn.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Purchase return not found" });
    res.json({ success: true, message: "Purchase return deleted successfully" });
  } catch (err) {
    console.error("DELETE RETURN ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;