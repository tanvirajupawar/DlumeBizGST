const { Schema, model, Types } = require("mongoose");

const SaleDetailsSchema = new Schema({
product_id: {
  type: Types.ObjectId,
  ref: "Product",
  required: true,
  index: true,
},

sales_order_id: {
  type: Types.ObjectId,
  ref: "SaleOrder",
  required: true,
  index: true,
},

company_id: {
  type: Types.ObjectId,
  ref: "Company",
  required: true,
  index: true,
},

  // 🔥 ADD THESE
  product_name: { type: String, default: "" },
  item_type: { type: String, default: "Goods" },
  sku: { type: String, default: "" },
  hsn: { type: String, default: "" },
  unit: { type: String, default: "" },

qty: {
  type: Number,
  default: 0,
  min: 0,
},

price: {
  type: Number,
  default: 0,
  min: 0,
},

discount: {
  type: Number,
  default: 0,
  min: 0,
},

gst_rate: {
  type: Number,
  default: 0,
  min: 0,
},

amount: {
  type: Number,
  default: 0,
  min: 0,
},
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});
SaleDetailsSchema.pre("save", function (next) {
 const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
 this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  this.amount =
  (this.qty || 0) *
  (this.price || 0);
  next();
});

SaleDetailsSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  update.updatedOn = nowIST;
  if (
  update.qty !== undefined ||
  update.price !== undefined
) {

  const qty =
    update.qty ??
    this._update.qty ??
    0;

  const price =
    update.price ??
    this._update.price ??
    0;

  update.amount = qty * price;
}
  next();
});

const SaleDetail = model("SaleDetail", SaleDetailsSchema);
module.exports = SaleDetail;
