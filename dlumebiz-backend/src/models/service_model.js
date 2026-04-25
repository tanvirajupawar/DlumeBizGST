const { Schema, model, Types } = require("mongoose");

const serviceSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  rate: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    default: "",
  },
 
 
  company_id: {
    type: Types.ObjectId,
    ref: "Company",
    required: true,
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

serviceSchema.pre("save", function (next) {
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = new Date();
  next();
});

serviceSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const ServiceModel = model("Service", serviceSchema);

module.exports = ServiceModel;
