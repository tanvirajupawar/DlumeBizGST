const { Schema, model } = require("mongoose");

const categorySchema = new Schema({
  title: { type: String, required: [true, "title is required"] },
  description: { type: String, default: " " },
  updatedOn: { type: Date },
  createdOn: { type: Date },
});

categorySchema.pre("save", function (next) {
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  this.createdOn = new Date();

  next();
});

categorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;

  next();
});

const categoryModel = model("Category", categorySchema);

module.exports = categoryModel;
