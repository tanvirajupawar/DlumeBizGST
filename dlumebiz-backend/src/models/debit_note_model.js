const mongoose = require("mongoose");

const debitNoteSchema = new mongoose.Schema({
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

  debit_no: {
    type: String,
    unique: true
  },

  // ✅ ADD THIS (IMPORTANT)
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

  amount: {
    type: Number,
    required: true
  },

  reason: {
    type: String,
    default: ""
  },

  date: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });
module.exports = mongoose.model("DebitNote", debitNoteSchema);