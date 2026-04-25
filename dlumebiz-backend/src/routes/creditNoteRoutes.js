const express = require("express");
const router = express.Router();
const CreditNote = require("../models/credit_note_model");

/* CREATE CREDIT NOTE */
router.post("/credit-note", async (req, res) => {
  try {
    console.log("🔥 CREDIT NOTE API HIT");

    const data = req.body;

    console.log("📦 CREDIT DATA:", data);

    const newNote = new CreditNote(data);
    await newNote.save();

    return res.json({
      success: true,
      message: "Credit Note Created",
      data: newNote,
    });

  } catch (err) {
    console.error("❌ CREDIT ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


/* GET CREDIT NOTES */
router.get("/credit-note", async (req, res) => {
  try {
    const data = await CreditNote.find()
      .populate("customer_id", "first_name last_name company_name")
      .populate("sales_id", "invoice_no")
      .sort({ createdAt: -1 });

    res.json({ success: true, data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});


/* DELETE CREDIT NOTE */
router.delete("/credit-note/:id", async (req, res) => {
  try {
    await CreditNote.findByIdAndDelete(req.params.id);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;