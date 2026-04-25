const { Schema, model, Types } = require("mongoose");

const orderSchema = new Schema({
  client_id: { type: Types.ObjectId, ref: "Client", required: true },
  service_id: { type: Types.ObjectId, ref: "Service" },
  company_id: { type: Types.ObjectId, ref: "Company", required: true },
  order_date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending",
  },
  total_amount: { type: Number, required: true },
  remarks: { type: String, default: "" },
  image_name: { type: String, default: "" },
  img: { type: String, default: "" },
  unit_type: { type: String, default: "" },
  qty: { type: String, default: "" },
  rate: { type: String, default: "" },
  print_size: { type: String, default: "" },
  media_width: { type: String, default: "" },
  media_height: { type: String, default: "" },
  sqft: { type: String, default: "" },
  dtp: { type: String, default: "" },
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

orderSchema.pre("save", function (next) {
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = new Date();
  next();
});

orderSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const OrderModel = model("Order", orderSchema);
module.exports = OrderModel;
