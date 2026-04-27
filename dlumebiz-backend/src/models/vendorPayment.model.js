const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema({
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },

  amount: Number,
  payment_mode: String,
  payment_ref: String,

  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);