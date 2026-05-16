const { Schema, model, Types } = require("mongoose");

const SaleReceiptSchema = new Schema({
  sale_order_id: {
  type: Types.ObjectId,
  ref: "SaleOrder",
  required: true,
  index: true,
},  
  client_id: {
  type: Types.ObjectId,
  ref: "Client",
  required: true,
  index: true,
},  
    invoice_no: { type: String, default: "" },
  amount: {
  type: Number,
  required: true,
  min: 0,
},  

receipt_no: {
  type: String,
  default: "",
  unique: true,
  index: true,
},
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

SaleReceiptSchema.pre("save", async function (next) {

  const nowIST = new Date(
    new Date().getTime() + 5.5 * 60 * 60 * 1000
  );

  this.updatedOn = nowIST; 

  if (!this.createdOn) {
    this.createdOn = nowIST;
  }

  // ✅ AUTO RECEIPT NUMBER
  if (this.isNew && !this.receipt_no) {
    const count = await this.constructor.countDocuments();
    this.receipt_no = `RCPT-${String(count + 1).padStart(5, "0")}`;
  }

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
