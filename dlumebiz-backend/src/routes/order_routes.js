const express = require("express");
const orderController = require("../controllers/order_controller");
const orderRouter = express.Router();

orderRouter.get("/orders", orderController.index);                      // GET /api/orders
orderRouter.get("/orders/:id", orderController.fetch);                  // GET /api/orders/:id
orderRouter.get("/orders/company/:companyId", orderController.findByCompanyId); // GET /api/orders/company/:companyId
orderRouter.post("/orders", orderController.create);                   // POST /api/orders
orderRouter.put("/orders/:id", orderController.update);                 // PUT /api/orders/:id
orderRouter.delete("/orders/:id", orderController.delete);              // DELETE /api/orders/:id

module.exports = orderRouter;
