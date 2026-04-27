const VendorPayment = require("../models/vendorPayment.model");

exports.createPayment = async (req, res) => {
  try {
    const payment = await VendorPayment.create(req.body);

    res.json({
      success: true,
      data: payment
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};