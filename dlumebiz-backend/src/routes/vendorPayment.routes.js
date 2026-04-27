const express = require("express");
const router = express.Router();

const controller = require("../controllers/vendorPayment.controller");

// CREATE PAYMENT
router.post("/vendor-payment", controller.createPayment);

module.exports = router;