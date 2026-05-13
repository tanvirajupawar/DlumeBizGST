const { Schema, model, Types } = require("mongoose");

const stockSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "Product" },
  company_id: {
    type: Types.ObjectId,
    ref: "Company",
    required: true,
  },
  transaction: {
    type: String,
    default: "",
  },
stock: {
  type: Number,
  default: 0,
},

  createdOn: {
    type: Date,
    default: Date.now,
  },
  updatedOn: {
    type: Date,
    default: Date.now,
  },
});

stockSchema.pre("save", function (next) {
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = new Date();
  next();
});

stockSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const StockModel = model("Stock", stockSchema);

module.exports = StockModel;
