require('dotenv').config();
const Razorpay  = require("razorpay");
const crypto  = require("crypto"); 

const PdfPrinter = require("pdfmake");
const ExcelJS = require("exceljs");
const path = require("path");
const SubscriptionModel = require("../models/subscription_model");
const companyModel = require("../models/company_model");
const UserModel = require("../models/user_model");


// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

const paymentControler = {
    create: async function (req, res) {
         try {
            const { amount, currency = "INR", receipt } = req.body;

            const options = {
            amount: amount, 
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            };

            const order = await razorpay.orders.create(options);

            res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID, // send key_id to frontend
            });
        } catch (error) {
            console.error("Order Error:", error);
            res.status(500).json({ success: false, message: "Order creation failed" });
        }
    },
    verify: async function (req, res) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body;
             const data = req.body;

            const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

            if (generatedSignature === razorpay_signature) {
                const subscription = new SubscriptionModel(data);
                await subscription.save();
            res.json({ success: true, message: "Payment verified successfully" });
            } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
            }
        } catch (error) {
            console.error("Verify Error:", error);
            res.status(500).json({ success: false, message: "Verification failed" });
        }
    },

    subscription: async function (req, res) {
        try {
             const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body;
            const data = req.body;

           const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

            if (generatedSignature === razorpay_signature) {
                const company = new companyModel(data);
                await company.save();

                const subscription = new SubscriptionModel(data);
                subscription.company_id = company._id;
                await subscription.save();

                const user = new UserModel(data);
                user.phoneNumber = company.mobile;
                user.company_id = company._id;
                user.password = 'system';
                await user.save();

            res.json({ success: true, message: "Payment verified successfully" });
            } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
            }

          
        } catch (error) {
            console.error("Verify Error:", error);
            res.status(500).json({ success: false, message: "Verification failed" });
        }
    }
};


module.exports = paymentControler;
