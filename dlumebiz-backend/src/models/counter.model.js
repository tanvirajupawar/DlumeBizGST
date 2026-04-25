const mongoose = require("mongoose");

const invoiceCounterSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  invoice_type: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true });

// Ensure unique counter per company and invoice type
invoiceCounterSchema.index({ company_id: 1, invoice_type: 1 }, { unique: true });

const InvoiceCounter = mongoose.model("InvoiceCounter", invoiceCounterSchema);

module.exports = InvoiceCounter;
