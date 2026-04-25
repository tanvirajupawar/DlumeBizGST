const { Schema, model } = require("mongoose");

const staffSchema = new Schema(
  {
    company_id: { type: Schema.Types.ObjectId, ref: "Company" },
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    contact_no_1: {
      type: String,
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
      default: "",
    },
    pincode: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true, 
    },


    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

staffSchema.pre("save", function (next) {
  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  next();
});

staffSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

const StaffModel = model("Staff", staffSchema);
module.exports = StaffModel;
