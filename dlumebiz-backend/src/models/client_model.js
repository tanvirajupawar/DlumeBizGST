const { Schema, model, Types } = require("mongoose");
const SaleOrderModel = require("../models/sale_order_model");

const clientSchema = new Schema({

  first_name: { type: String, required: true },
  last_name: { type: String },

  email: { type: String },
  contact_no_1: { type: String },
  contact_no_2: { type: String, default: "" },

  address_line_1: { type: String, default: "" },
  address_line_2: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },
  pincode: { type: String, default: "" },

  // ✅ FIXED
  gstin: { type: String, default: "" },
  pan_number: { type: String, default: "" },

  // ✅ NEW
  shipping_address_line_1: { type: String, default: "" },
  shipping_city: { type: String, default: "" },
  shipping_state: { type: String, default: "" },
  shipping_pincode: { type: String, default: "" },

  // ✅ NEW
  opening_balance: { type: Number, default: 0 },

  pending_amount: {
    type: Number,
    default: 0,
    min: 0,
  },

  company_id: { type: Types.ObjectId, ref: "Company" },

  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

clientSchema.pre("save", function (next) {
  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  next();
});

clientSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});



clientSchema.set("toObject", { virtuals: true });
clientSchema.set("toJSON", { virtuals: true });

const clientModel = model("Client", clientSchema);

module.exports = clientModel;
