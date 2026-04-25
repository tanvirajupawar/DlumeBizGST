const express = require("express");
const router = express.Router();

const PurchaseReturn = require("../models/purchase_return_model");

// ✅ CREATE
router.post("/purchase-return", async (req, res) => {
  try {
    // ✅ generate return number
    const count = await PurchaseReturn.countDocuments();

  const newReturn = new PurchaseReturn({
  purchase_id: req.body.purchase_id,
  vendor_id: req.body.vendor_id,
  date: req.body.date,
  reason: req.body.reason,

  details: req.body.details || [],   // ✅ FIX

  total_amount: req.body.total_amount,

  return_no: `PR-${String(count + 1).padStart(3, "0")}`
});


    await newReturn.save();

    res.json({ success: true, data: newReturn });

  } catch (err) {
    console.error("RETURN ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ✅ NEXT RETURN NUMBER
router.get("/purchase-return/next-number", async (req, res) => {
  try {
    const count = await PurchaseReturn.countDocuments();

    const nextNumber = `PR-${String(count + 1).padStart(3, "0")}`;

    res.json({
      success: true,
      return_no: nextNumber
    });

  } catch (err) {
    console.error("NEXT NUMBER ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ✅ ADD THIS (VERY IMPORTANT)
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

    console.log("DELETE ID:", id); // debug

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