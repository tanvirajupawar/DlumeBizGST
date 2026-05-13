const { Schema, model, Types } = require("mongoose");

const productSchema = new Schema({
  product: {
    type: String,
    required: true,
  },
barcode: {
  type: String,
  default: null,
  unique: true,
  sparse: true,
},
  type: {
    type: String,
  },
  hsn: {
    type: String,
  },
  size: {
    type: String,
  },
  qty: {
    type: Number,
    default: 0,
  },
purchase_price: {
  type: Number,
},
  mrp: {
    type: Number,
  },
 
 company_id: { 
  type: Types.ObjectId, 
  ref: "Company",
  default: null
},
  createdOn: { 
    type: Date, 
    default: Date.now 
  },
  updatedOn: { 
    type: Date, 
    default: Date.now 
  },
  category: {
  type: String,
},
code: {
  type: String,
},
unit: {
  type: String,
  default: "PCS",
},
  createdBy: { type: String },
  updatedBy: { type: String },
});

productSchema.virtual("stock_details", {
  ref: "StockManagement",
  localField: "_id",       
  foreignField: "product_id" 
});

// Middleware for setting timestamps
productSchema.pre("save", function (next) {
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
    this.updatedOn = nowIST;
    if (!this.createdOn) this.createdOn = nowIST;
  next();
});

productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id; // prevent overwriting _id
  if (!update.$set) update.$set = {};
  update.$set.updatedOn = new Date();
  next();
});

const Product = model("Product", productSchema);

module.exports = Product;
