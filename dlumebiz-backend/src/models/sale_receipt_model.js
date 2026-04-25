const { Schema, model, Types } = require("mongoose");

const SaleReceiptSchema = new Schema({
  sale_order_id: { type: Types.ObjectId, ref: "SaleOrder" },  
  client_id: { type: Types.ObjectId, ref: "Client" },  
  amount: { type: Number, required: true },  
  payment_method: { type: String, default: "Cash" },
  remarks: { type: String, default: ''},
  transaction_no: { type: String, default: ''},
  card_no: { type: String, default: ''},
  bank_name: { type: String, default: ''},
  branch: { type: String, default: ''},
  ifsc: { type: String, default: ''},
  cheque_no: { type: String, default: ''},
  date: { type: Date, default: Date.now },
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

SaleReceiptSchema.pre("save", function (next) {
  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  next();
});

SaleReceiptSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const SaleReceipt = model("SaleReceipt", SaleReceiptSchema);
module.exports = SaleReceipt;
