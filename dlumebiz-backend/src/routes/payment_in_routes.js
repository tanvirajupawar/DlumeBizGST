const express = require("express");
const router = express.Router();

const {
  getPaymentsIn,
  createPaymentIn
} = require("../controllers/payment_in_controller");

// GET
router.get("/payment-in", getPaymentsIn);

// POST
router.post("/payment-in", createPaymentIn);

module.exports = router;