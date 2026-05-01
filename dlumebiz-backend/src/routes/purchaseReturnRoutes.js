const express = require("express");
const router = express.Router();

const PurchaseReturn = require("../models/purchase_return_model");


// ✅ FUNCTION: Generate PR Number (SAFE)
const generatePRNumber = async () => {
  const last = await PurchaseReturn.findOne().sort({ createdAt: -1 });

  let next = 1;

  if (last && last.return_no) {
    const match = last.return_no.match(/PR-(\d+)/);
    if (match) {
      next = parseInt(match[1]) + 1;
    }
  }

  return `PR-${String(next).padStart(5, "0")}`;
};


// ✅ CREATE PURCHASE RETURN
router.post("/purchase-return", async (req, res) => {
  try {

    // 🔥 Generate PR number
    const return_no = await generatePRNumber();

    const newReturn = new PurchaseReturn({
      purchase_id: req.body.purchase_id,
      vendor_id: req.body.vendor_id,
      date: req.body.date,
      reason: req.body.reason,

      details: req.body.details || [],
      total_amount: req.body.total_amount,

      return_no // ✅ correct PR number
    });

    await newReturn.save();

    res.json({
      success: true,
      data: newReturn
    });

  } catch (err) {
    console.error("RETURN ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ✅ GET NEXT PR NUMBER
router.get("/purchase-return/next-number", async (req, res) => {
  try {

    const return_no = await generatePRNumber();

    res.json({
      success: true,
      return_no
    });

  } catch (err) {
    console.error("NEXT NUMBER ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ✅ GET ALL PURCHASE RETURNS
router.get("/purchase-return", async (req, res) => {
  try {

    const returns = await PurchaseReturn.find()
      .populate("vendor_id")
      .populate("purchase_id")
      .lean();

    const finalData = returns.map(r => ({
      ...r,
      details: r.details || []
    }));

    res.json({
      success: true,
      data: finalData
    });

  } catch (err) {
    console.error("GET RETURN ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ✅ DELETE PURCHASE RETURN
router.delete("/purchase-return/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PurchaseReturn.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Purchase return not found"
      });
    }

    res.json({
      success: true,
      message: "Purchase return deleted successfully"
    });

  } catch (err) {
    console.error("DELETE RETURN ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


module.exports = router;