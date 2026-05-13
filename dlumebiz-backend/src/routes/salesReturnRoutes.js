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

    // ✅ FIX: support both client_id and customer_id
    const clientId = data.client_id || data.customer_id;

    if (!data.sales_id || !clientId) {
      return res.status(400).json({
        success: false,
        message: "sales_id and client_id are required",
      });
    }

    data.client_id = clientId; // normalize

    // ✅ FILTER VALID ITEMS
    data.details = (data.details || []).filter(
      (item) => item.qty && item.qty > 0
    );

    if (!data.details.length) {
      return res.status(400).json({
        success: false,
        message: "No valid return items",
      });
    }

    // ✅ GENERATE LATEST RETURN NUMBER (SAFE)
    const last = await SalesReturn.findOne().sort({ createdAt: -1 });

    let next = 1;

    if (last && last.return_no) {
      const parts = last.return_no.split("-");
      const num = parseInt(parts[1]);
      if (!isNaN(num)) next = num + 1;
    }

    data.return_no = `SR-${String(next).padStart(5, "0")}`;

    // ✅ SAVE
    const newReturn = new SalesReturn(data);
    await newReturn.save();

    console.log("✅ SALES RETURN SAVED:", newReturn._id);

    // ✅ UPDATE STOCK
    for (let item of data.details) {
      if (!item.product_id) continue;

      const qty = parseInt(item.qty) || 0;

      const stock = await StockManagementModel.findOne({
        product_id: item.product_id,
      });

      if (!stock) continue;

      stock.out = Math.max((stock.out || 0) - qty, 0);
      stock.total_stock = (stock.total_stock || 0) + qty;

      await stock.save();
    }

    return res.status(200).json({
      success: true,
      message: "Sales Return Created Successfully",
      data: newReturn,
    });

  } catch (err) {
    console.error("❌ SALES RETURN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
});

/* GET SALES RETURNS BY SALES ID */
router.get("/sales-return/by-sales/:salesId", async (req, res) => {
  try {

    const returns = await SalesReturn.find({
      sales_id: req.params.salesId
    })

      .populate({
        path: "client_id",
        select: `
          first_name
          last_name
          company_name
          gstin
          phone
          email
          address_line1
          city
          state
          pincode
        `,
      })

      .populate("sales_id")

      .lean();

    res.json({
      success: true,
      data: returns.map((r) => ({
        ...r,
        details: r.details || [],
      })),
    });

  } catch (err) {

    console.error(
      "GET SALES RETURN BY SALES ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* GET ALL SALES RETURNS */
router.get("/sales-return", async (req, res) => {
  try {
    const data = await SalesReturn.find()
      .populate({
        path: "client_id",
        select: "first_name last_name company_name gst state",
      })
      .populate("sales_id", "invoice_no")
      .sort({ createdAt: -1 });

    res.json({ success: true, data });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE SALES RETURN */
router.delete("/sales-return/:id", async (req, res) => {
  try {
    const deleted = await SalesReturn.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Sales Return not found",
      });
    }

    res.json({
      success: true,
      message: "Sales Return deleted successfully",
    });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* GET NEXT RETURN NUMBER */
router.get("/sales-return/next-number", async (req, res) => {
  try {
    const last = await SalesReturn.findOne().sort({ createdAt: -1 });

    let next = 1;

    if (last && last.return_no) {
      const parts = last.return_no.split("-");
      const num = parseInt(parts[1]);
      if (!isNaN(num)) next = num + 1;
    }

    const nextNumber = `SR-${String(next).padStart(5, "0")}`;

    res.json({
      success: true,
      return_no: nextNumber, // ✅ FIXED KEY
    });

  } catch (err) {
    console.error("NEXT SR ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;