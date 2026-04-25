const { Schema, model } = require("mongoose");

const subscriptionSchema = new Schema({
  company_id: { 
    type: Schema.Types.ObjectId, 
    ref: "Company", 
    required: true, 
    unique: true  
  },
  plan_name: { type: String, required: true }, 
  plan_duration: { type: Number },
  users: { type: Number, default: 1 }, 
  start_date: { type: Date },
  end_date: { type: Date },
  status: { 
    type: String, 
    default: "active" 
  },
  auto_renewal: { type: Boolean, default: false },
  amount: { type: Number, required: true },
  transaction_id: { type: String, default: "" },
  razorpay_order_id: { type: String },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
  payment_method: { type: String },
  verified: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },


  createdOn: { type: Date },
  updatedOn: { type: Date },
  createdBy: { type: String },
  updatedBy: { type: String },
});

// Middleware for auto timestamps
subscriptionSchema.pre("save", function (next) {
  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // IST
  this.updatedOn = nowIST;
  if (!this.createdOn) this.createdOn = nowIST;
  if (!this.start_date) this.start_date = nowIST;
  
  if (this.plan_duration && !this.end_date) {
    const end = new Date(this.start_date);
    end.setMonth(end.getMonth() + this.plan_duration);
    this.end_date = end;
  }

  next();
});

// For findOneAndUpdate
subscriptionSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedOn: new Date() });
  next();
});

const SubscriptionModel = model("Subscription", subscriptionSchema);

module.exports = SubscriptionModel;
