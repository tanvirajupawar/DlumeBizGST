const mongoose = require("mongoose");

const purchaseReturnSchema = new mongoose.Schema({
  purchase_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PurchaseOrder",
    required: true
  },

  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },

  // ✅ NEW FIELD (IMPORTANT)
  return_no: {
    type: String,
    unique: true
  },

  date: {
    type: Date,
    default: Date.now
  },

  details: [
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item"
    },
    product_name: {
      type: String,
      required: true
    },
    qty: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  }
],

  total_amount: {
    type: Number,
    default: 0
  },

  reason: {
    type: String,
    default: ""
  }

}, { timestamps: true });

module.exports = mongoose.model("PurchaseReturn", purchaseReturnSchema);