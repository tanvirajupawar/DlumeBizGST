const { Schema, model } = require("mongoose");

const companySchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, require: true },
  mobile: { type: String, require: true },
  alt_mobile: { type: String, default: "" },
  owner_name: { type: String, default: "" },
  owner_mobile: { type: String, default: "" },
  owner_email: { type: String, default: "" },
  address: { type: String, default: "" },
  area: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "India" },
  pincode: { type: String, default: "" },
  gst: { type: String, default: "" },
  pan: { type: String, default: "" },
  bank_holder_name: { type: String, default: "" },
  account_no: { type: String, default: "" },
  bank: { type: String, default: "" },
  branch: { type: String, default: "" },
  ifsc: { type: String, default: "" },
  logo: { type: String, default: "" },
  logo_name: { type: String, default: "" },
  letter_name: { type: String, default: "" },
  letter_head: { type: String, default: "" },
  profileProgress: { type: Number, default: 0 },
  updatedOn: { type: Date },
  createdOn: { type: Date },
  createdBy: { type: String },
  updatedBy: { type: String },
  plan_type: {
  type: String,
  enum: ["NON_GST", "GST"],
  default: "NON_GST",
},

subscription_status: {
  type: String,
  enum: ["TRIAL", "ACTIVE", "EXPIRED"],
  default: "TRIAL",
},

subscription_expiry: {
  type: Date,
},

plan_duration_months: {
  type: Number,
  default: 1,
},

features: {

  gst: {
    type: Boolean,
    default: false,
  },

  inventory: {
    type: Boolean,
    default: true,
  },

  reports: {
    type: Boolean,
    default: true,
  },

},
});

companySchema.pre("save", function (next) {
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
    this.updatedOn = nowIST;
    if (!this.createdOn) this.createdOn = nowIST;

  next();
});

companySchema.pre("updafindOneAndUpdatete", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;

  next();
});

const companyModel = model("Company", companySchema);

module.exports = companyModel;
