const express = require("express");
const router = express.Router();

const SalesReturn = require("../models/sales_return_model");
const StockManagementModel = require("../models/stock_management_model");

/* CREATE SALES RETURN */
router.post("/sales-return", async (req, res) => {
  try {
    console.log("🔥 SALES RETURN API HIT");

    const data = req.body;

    console.log("📦 RECEIVED DATA:", data);

    // ✅ SAVE SALES RETURN
    const newReturn = new SalesReturn(data);
    await newReturn.save();

    console.log("✅ SALES RETURN SAVED:", newReturn._id);

    // 🔥 UPDATE STOCK (VERY IMPORTANT)
    if (Array.isArray(data.details) && data.details.length > 0) {
      for (let item of data.details) {
        const qty = parseInt(item.qty) || 0;

        const stock = await StockManagementModel.findOne({
          product_id: item.product_id, // ⚠️ must match your system
        });

        if (stock) {
          stock.out = (stock.out || 0) - qty;       // reverse sale
          if (stock.out < 0) stock.out = 0;

          stock.total_stock = (stock.total_stock || 0) + qty;

          await stock.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Sales Return Created Successfully",
      data: newReturn
    });

  } catch (err) {
    console.error("❌ SALES RETURN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Server Error"
    });
  }
});


router.get("/sales-return", async (req, res) => {
  try {
    const data = await SalesReturn.find()
      .populate("customer_id", "first_name last_name company_name")
      .populate("sales_id", "invoice_no")
      .sort({ createdAt: -1 });

    // 🔥 ADD FALLBACK FOR OLD DATA
    const formatted = data.map((r, i) => ({
      ...r._doc,
      return_no: r.return_no || `SR-${(i + 1).toString().padStart(5, "0")}`,
    }));

    res.json({ success: true, data: formatted });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false });
  }
});


router.delete("/sales-return/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await SalesReturn.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Sales Return not found",
      });
    }

    return res.json({
      success: true,
      message: "Sales Return deleted successfully",
    });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;