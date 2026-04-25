const { Schema, model, Types } = require("mongoose");

const PurchaseDetailsSchema = new Schema({

  purchase_order_id: {
    type: Types.ObjectId,
    ref: "PurchaseOrder"
  },

    product_id: {
    type: Types.ObjectId,
    ref: "Product",
    required: true
  },

  product_name: {
    type: String,
    required: true
  },

  item_type: {
    type: String,
    default: "Goods"
  },

  sku: {
    type: String,
    default: ""
  },

  hsn: {
    type: String,
    default: ""
  },

  unit: {
    type: String,
    default: "NOS"
  },

  qty: {
    type: Number,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  discount: {
    type: Number,
    default: 0
  },

  gst_rate: {
    type: Number,
    default: 0
  },

  amount: {
    type: Number,
    required: true
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


PurchaseDetailsSchema.pre("save", function (next) {

  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);

  this.updatedOn = nowIST;

  if (!this.createdOn) {
    this.createdOn = nowIST;
  }

  next();
});


const PurchaseDetail = model("PurchaseDetail", PurchaseDetailsSchema);

module.exports = PurchaseDetail;