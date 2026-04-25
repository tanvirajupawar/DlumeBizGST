const mongoose = require("mongoose");

const salesReturnSchema = new mongoose.Schema(
  {
    sales_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleOrder", // ✅ FIXED (was "Sales")
      required: true,
    },

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client", // ✅ FIXED (was "Customer")
      required: true,
    },

    return_no: {
      type: String,
      unique: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    details: [
      {
        product_name: {
          type: String,
          required: true,
        },
        qty: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],

    total_amount: {
      type: Number,
      default: 0,
    },

    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);


// 🔥 AUTO GENERATE RETURN NUMBER
salesReturnSchema.pre("save", async function (next) {
  if (!this.return_no) {
    const count = await mongoose.models.SalesReturn.countDocuments();
    this.return_no = `SR-${(count + 1).toString().padStart(5, "0")}`;
  }
  next();
});


// 🔥 CRITICAL FIX (prevents overwrite error)
const SalesReturn =
  mongoose.models.SalesReturn ||
  mongoose.model("SalesReturn", salesReturnSchema);

module.exports = SalesReturn;