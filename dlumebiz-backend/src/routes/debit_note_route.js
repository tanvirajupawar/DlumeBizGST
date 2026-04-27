const express = require("express");
const router = express.Router();

const DebitNote = require("../models/debit_note_model");

// ✅ CREATE DEBIT NOTE
router.post("/debit-note", async (req, res) => {
  try {
    console.log("DEBIT BODY:", req.body);

    // ✅ Generate Debit Note Number
    const count = await DebitNote.countDocuments();

   const newNote = new DebitNote({
  purchase_id: req.body.purchase_id,
  vendor_id: req.body.vendor_id,

  debit_no: `DN-${String(count + 1).padStart(3, "0")}`,

  // ✅ IMPORTANT: map items properly
  details: (req.body.details || []).map(d => ({
    product_id: d.product_id,
    product_name: d.product_name,
    qty: d.qty,
    price: d.price,
    amount: d.amount
  })),

  amount: req.body.amount,
  reason: req.body.reason || ""
});

    await newNote.save();

    res.json({ success: true, data: newNote });

  } catch (err) {
    console.error("DEBIT ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get("/debit-note", async (req, res) => {
  try {
const notes = await DebitNote.find()
  .populate({
    path: "vendor_id",
    select: "vendor_name company_name gst gstin gst_no gst_number state_code"
  })
  .populate({
    path: "purchase_id",
    select: "supplier_invoice_no taxable_amount total_amount vendor_id"
  })
  .lean();

    console.log("DEBIT NOTES:", notes); // 🔍 debug

    res.json({ success: true, data: notes });

  } catch (err) {
    console.error("GET DEBIT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ DELETE DEBIT NOTE
router.delete("/debit-note/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await DebitNote.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Debit note not found"
      });
    }

    res.json({
      success: true,
      message: "Debit note deleted successfully"
    });

  } catch (err) {
    console.error("DELETE DEBIT ERROR:", err);
    res.status(500).json({ success: false });
  }
});


module.exports = router;