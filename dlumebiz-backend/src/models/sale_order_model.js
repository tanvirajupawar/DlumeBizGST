const { Schema, model, Types } = require("mongoose");
const InvoiceCounter = require("./counter.model");


async function generateInvoiceNo(company_id, invoice_type) {
  // Atomically increment the counter
   const prefix = invoice_type === "Non GST" ? "INV" : "I";
  const counter = await InvoiceCounter.findOneAndUpdate(
    { company_id, invoice_type },
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // create if doesn't exist
  );

  // Format as string: I-00001
  return `${prefix}-${String(counter.seq).padStart(5, "0")}`;
}

const saleOrderSchema = new Schema({
  company_id: { type: Types.ObjectId, ref: "Company" },
  client_id: { type: Types.ObjectId, ref: "Client" },
  customer_name: { type: String, default: "" },
contact_no: { type: String, default: "" },
  order_date: { type: Date, default: Date.now },
  shipment_date: { type: Date, default: Date.now },
  invoice_date: { type: Date },   
due_date: { type: Date }, 
  invoice_no: { type: String, default: "" },
  invoice_type: { type: String, default: "" },
  invoice_category: {
  type: String,
  enum: ["B2B", "B2CL", "B2CS"],
  default: "B2CS",
},

gstin: {
  type: String,
  default: "",
},

place_of_supply: {
  type: String,
  default: "",
},

state_code: {
  type: String,
  default: "",
},
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", 'Paid', 'Unpaid', 'Partial Paid'],
    default: "Unpaid",
  },
  gst: { type: Boolean, default: false },
  amount: { type: Number },
  amount_before_tax: { type: Number },
  sgst: { type: Number, default: 0  },
  cgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  discount: { type: Number, default: 0  },
  discounted_amount: { type: Number },
  total_amount: { type: Number },
  paid_amount: { type: Number, default: 0 },
  advance_amount: { type: Number, default: '0' },  
  payment_method: { type: String, default: "Cash" },
  transaction_no: { type: String, default: ''},
  card_no: { type: String, default: ''},
  bank_name: { type: String, default: ''},
  branch: { type: String, default: ''},
  ifsc: { type: String, default: ''},
  cheque_no: { type: String, default: ''},
  remarks: { type: String, default: "" },
   delivery_address: { type: String, default: "" },
    country: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  pincode: { type: String, default: "" },
  balance_amount: {
  type: Number,
  default: 0,
},

  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

saleOrderSchema.pre("save", async function (next) {
  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;

  if (this.isNew && !this.invoice_no) {
    // const prefix = this.invoice_type === "Non GST" ? "INV" : "I";
    // const last = await this.constructor.findOne({ invoice_type: this.invoice_type, company_id: this.company_id, }) 
    //   .sort({ created_at: -1 })
    //   .select("invoice_no");

    // let nextNumber = 1;
    // if (last && last.invoice_no) {
    //   const match = last.invoice_no.match(/I-(\d+)/);
    //   if (match && match[1]) {
    //     nextNumber = parseInt(match[1], 10) + 1;
    //   }
    // }

    // this.invoice_no = `I-${String(nextNumber).padStart(5, "0")}`;

    this.invoice_no = await generateInvoiceNo(this.company_id, this.invoice_type);
  }

  this.balance_amount = (this.total_amount || 0) - (this.paid_amount || 0);

  next();
});

saleOrderSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  delete update._id;
   const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  next();
});

saleOrderSchema.virtual("details", {
  ref: "SaleDetail",
  localField: "_id",
  foreignField: "sales_order_id",
});

saleOrderSchema.set("toObject", { virtuals: true });
saleOrderSchema.set("toJSON", { virtuals: true });

const SaleOrderModel = model("SaleOrder", saleOrderSchema);
module.exports = SaleOrderModel;
