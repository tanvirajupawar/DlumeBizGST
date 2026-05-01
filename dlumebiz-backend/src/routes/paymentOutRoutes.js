const express = require("express");
const router = express.Router();

const {
  getPayments,
  createPayment
} = require("../controllers/payment_out_controller");

// GET
router.get("/payment-out", getPayments);

// POST
router.post("/payment-out", createPayment);

module.exports = router;