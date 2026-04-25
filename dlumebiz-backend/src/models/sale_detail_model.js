const { Schema, model, Types } = require("mongoose");

const SaleDetailsSchema = new Schema({
  product_id: { type: Types.ObjectId, ref: "Product" },
  sales_order_id: { type: Types.ObjectId, ref: "SaleOrder" },
  company_id: { type: Types.ObjectId, ref: "Company" },

  // 🔥 ADD THESE
  product_name: { type: String, default: "" },
  item_type: { type: String, default: "Goods" },
  sku: { type: String, default: "" },
  hsn: { type: String, default: "" },
  unit: { type: String, default: "" },

  qty: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  gst_rate: { type: Number, default: 0 },

  amount: { type: Number },

  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});
SaleDetailsSchema.pre("save", function (next) {
 const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  next();
});

SaleDetailsSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const SaleDetail = model("SaleDetail", SaleDetailsSchema);
module.exports = SaleDetail;
