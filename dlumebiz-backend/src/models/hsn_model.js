const { Schema, model } = require("mongoose");

const hsnSchema = new Schema({
  code: String,
  description: String,
  gst_rate: Number
});

module.exports = model("HSN", hsnSchema);