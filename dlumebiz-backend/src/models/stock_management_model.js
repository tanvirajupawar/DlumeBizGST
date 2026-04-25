const { Schema, model, Types } = require("mongoose");

const stockManagementSchema = new Schema({ 
  product_id: {
    type: Types.ObjectId,
    ref: "Product"
  },

  company_id: {
    type: Types.ObjectId,
    ref: "Company",
  },  
  in: {
    type: Number,
    default: 0,
  },
  out: {
    type: Number,
    default: 0,
  },  
 
  total_stock: {
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

stockManagementSchema.pre("save", function (next) {
 const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;

  // Auto-calculate total_amount if not manually set


  next();
});

stockManagementSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
  update.updatedOn = new Date();
  this.setUpdate(update);
  next();
});

const StockManagementModel = model("StockManagement", stockManagementSchema, "stockmanagements");
module.exports = StockManagementModel;
