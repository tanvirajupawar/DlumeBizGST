const mongoose = require("mongoose");

const salesReturnSchema = new mongoose.Schema(
  {
    sales_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleOrder",
      required: true,
    },

    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
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
        // ✅ ADD THIS (CRITICAL FIX)
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // optional but good
          required: false,
        },

        product_name: {
          type: String,
          required: true,
        },

        qty: {
          type: Number,
          required: true,
          min: 1, // ✅ prevents 0 or negative
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    total_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// 🔥 AUTO GENERATE RETURN NUMBER (SAFE VERSION)
salesReturnSchema.pre("save", async function (next) {
  if (!this.return_no) {
    const last = await mongoose.models.SalesReturn
      .findOne()
      .sort({ createdAt: -1 });

    let next = 1;

    if (last && last.return_no) {
      next = parseInt(last.return_no.split("-")[1]) + 1;
    }

    this.return_no = `SR-${String(next).padStart(5, "0")}`;
  }
  next();
});

// 🔥 MODEL EXPORT SAFE
const SalesReturn =
  mongoose.models.SalesReturn ||
  mongoose.model("SalesReturn", salesReturnSchema);

module.exports = SalesReturn;