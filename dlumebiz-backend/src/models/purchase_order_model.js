const { Schema, model, Types } = require("mongoose");

const purchaseOrderSchema = new Schema({

  company_id: {
    type: Types.ObjectId,
    ref: "Company",
  },

  vendor_id: {
    type: Types.ObjectId,
    ref: "Vendor",
  },

  supplier_invoice_no: {
    type: String,
    default: ""
  },

  invoice_date: {
    type: Date,
    default: Date.now
  },

  entry_date: {
    type: Date,
    default: Date.now
  },

  purchase_type: {
    type: String,
    enum: ["Cash", "Credit"],
    default: "Credit"
  },

  notes: {
    type: String,
    default: ""
  },

  total_amount: {
    type: Number,
    required: true
  },

  // ✅ ADD THESE TWO FIELDS
  balance_amount: {
    type: Number,
    default: null   // null = not yet set (will fall back to total_amount)
  },

  payment_status: {
    type: String,
    enum: ["Unpaid", "Partial", "Paid"],
    default: "Unpaid"
  },

  paid_amount: {
    type: Number,
    default: 0
  },

  payment_mode: {
    type: String,
    default: "Cash"
  },

  payment_remark: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["Paid", "Unpaid", "Partial Paid"],
    default: "Unpaid"
  },

  order_no: {
    type: String
  },

  createdOn: {
    type: Date,
    default: Date.now
  },

  updatedOn: {
    type: Date,
    default: Date.now
  }

});


// AUTO GENERATE ORDER NUMBER
purchaseOrderSchema.pre("save", async function (next) {

  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);

  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;

  if (this.isNew && !this.order_no) {

    const last = await this.constructor
      .findOne()
      .sort({ createdOn: -1 })
      .select("order_no");

    let nextNumber = 1;

    if (last && last.order_no) {
      const match = last.order_no.match(/PO-(\d+)/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.order_no = `PO-${String(nextNumber).padStart(5, "0")}`;
  }

  next();
});


// PURCHASE DETAILS RELATION
purchaseOrderSchema.virtual("details", {
  ref: "PurchaseDetail",
  localField: "_id",
  foreignField: "purchase_order_id",
});


// PAYMENT RECEIPTS RELATION
purchaseOrderSchema.virtual("payments", {
  ref: "PurchaseReceipt",
  localField: "_id",
  foreignField: "purchase_order_id",
});


purchaseOrderSchema.set("toObject", { virtuals: true });
purchaseOrderSchema.set("toJSON", { virtuals: true });


const PurchaseOrderModel = model("PurchaseOrder", purchaseOrderSchema);

module.exports = PurchaseOrderModel;