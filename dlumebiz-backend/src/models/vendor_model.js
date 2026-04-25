const { Schema, model, Types } = require("mongoose");

const vendorSchema = new Schema({

  vendor_name: {
    type: String,
    required: true,
  },

  company_name: {
    type: String,
    default: "",
  },

  business_type: {
    type: String,
    default: "",
  },

  gst: {
    type: String,
    default: "",
  },

  pan: {
    type: String,
    default: "",
  },

  email: {
    type: String,
    default: "",
  },

  website: {
    type: String,
    default: "",
  },

  contact_no_1: {
    type: String,
    default: "",
  },

  contact_no_2: {
    type: String,
    default: "",
  },

  address_line_1: {
    type: String,
    default: "",
  },

  address_line_2: {
    type: String,
    default: "",
  },

  city: {
    type: String,
    default: "",
  },

  state: {
    type: String,
    default: "",
  },

  country: {
    type: String,
    default: "India",
  },

  pincode: {
    type: String,
    default: "",
  },

opening_balance: {
  type: Number,
  default: 0
},

pending_amount: {
  type: Number,
  default: 0,
  min: 0,
},
  company_id: {
    type: Types.ObjectId,
    ref: "Company",
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
vendorSchema.pre("save", function (next) {
 const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  next();
});

vendorSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const vendorModel = model("Vendor", vendorSchema);

module.exports = vendorModel;
