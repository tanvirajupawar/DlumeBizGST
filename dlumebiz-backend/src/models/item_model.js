const productModel = require("../models/product_model");
const StockManagementModel = require("../models/stock_management_model");

exports.getItems = async (req, res) => {
  try {
    const company_id = req.params.company_id;

    const products = await productModel.find({ company_id }).lean();

   const stockMap = new Map();

   const stock = await StockManagementModel.find({ company_id });

stock.forEach((s) => {
  stockMap.set(s.product_id?.toString(), s);
});

const final = products.map((p) => {
  const s = stockMap.get(p._id.toString());

return {
  id: p._id,
  product: p.product,   // 🔥 FIX THIS
  barcode: p.barcode || "", // 🔥 ADD THIS

  hsn: p.hsn || "",
  type: p.type || "",
  size: p.size || "",
  purchasePrice: p.purchase_price || 0,
  mrp: p.mrp || 0,

  in: s?.in || 0,
  out: s?.out || 0,
  total: s?.total_stock || 0,

  unit: p.unit || "PCS",
  category: p.category || "",
  code: p.code || "",
};
});
    return res.json({
      success: true,
      data: final,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};