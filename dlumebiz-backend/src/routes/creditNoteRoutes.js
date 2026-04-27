const express = require("express");
const router = express.Router();
const CreditNote = require("../models/credit_note_model");

/* CREATE CREDIT NOTE */
router.post("/credit-note", async (req, res) => {
  try {
    console.log("🔥 CREDIT NOTE API HIT");

    const data = req.body;

    console.log("📦 CREDIT DATA:", data);

// 🔥 GENERATE CREDIT NOTE NUMBER
const last = await CreditNote.findOne().sort({ createdAt: -1 });

let next = 1;

if (last && last.credit_no) {
  next = parseInt(last.credit_no.split("-")[1]) + 1;
}

data.credit_no = `CN-${String(next).padStart(5, "0")}`;

// ✅ SAVE
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
  .populate({
    path: "client_id",
    select: "first_name last_name company_name gst state"
  })
  .populate("sales_id", "invoice_no");

    const formatted = data.map((n) => ({
      ...n._doc,
      client_id: n.client_id || n.customer_id, // 🔥 fix
    }));

    res.json({ success: true, data: formatted });

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

router.get("/credit-note/next-number", async (req, res) => {
  try {
    const last = await CreditNote.findOne().sort({ createdAt: -1 });

    let next = 1;

    if (last && last.credit_no) {
      next = parseInt(last.credit_no.split("-")[1]) + 1;
    }

    const nextNumber = `CN-${String(next).padStart(5, "0")}`;

    res.json({
      success: true,
      number: nextNumber,
    });

  } catch (err) {
    console.error("NEXT CN ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;