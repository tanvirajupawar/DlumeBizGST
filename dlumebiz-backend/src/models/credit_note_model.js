const mongoose = require("mongoose");

const creditNoteSchema = new mongoose.Schema(
  {
    sales_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleOrder",
      required: true,
    },

  client_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Client",
},

    credit_no: {
      type: String,
      unique: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    details: [
      {
        product_name: String,
        qty: Number,
        price: Number,
        amount: Number,
      },
    ],

    amount: {
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


// 🔥 AUTO GENERATE CREDIT NOTE NUMBER
creditNoteSchema.pre("save", async function (next) {
  if (!this.credit_no) {
    const count = await mongoose.models.CreditNote.countDocuments();
   this.credit_no = `CR-${(count + 1).toString().padStart(4, "0")}`;
  }
  next();
});


// 🔥 PREVENT OVERWRITE ERROR
const CreditNote =
  mongoose.models.CreditNote ||
  mongoose.model("CreditNote", creditNoteSchema);

module.exports = CreditNote;