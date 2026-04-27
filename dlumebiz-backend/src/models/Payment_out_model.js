const mongoose = require("mongoose");

const paymentOutSchema = new mongoose.Schema(
  {
    vendor_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    amount:       { type: Number, required: true },
    payment_mode: { type: String, default: "Cash" },
    remark:       { type: String, default: "" },
    payment_no:   { type: String },
    date:         { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentOut", paymentOutSchema);