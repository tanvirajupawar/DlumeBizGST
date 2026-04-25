const paymentController = require("../controllers/payment_controller");

const paymentRouter = require("express").Router();

paymentRouter.post("/payment/create", paymentController.create);
paymentRouter.post("/payment/verify", paymentController.verify);
paymentRouter.post("/payment/subscription", paymentController.subscription);
module.exports = paymentRouter;