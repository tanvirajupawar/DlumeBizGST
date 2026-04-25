const { Schema, model } = require("mongoose");

const locationSchema = new Schema({
  state: String,
  state_code: String,
  city: String
});

module.exports = model("Location", locationSchema);