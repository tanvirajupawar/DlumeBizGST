const saleOrderControler = require("../controllers/sale_order_controller");




const salesRouter = require("express").Router();

salesRouter.post("/sales", saleOrderControler.create);
salesRouter.get("/sales", saleOrderControler.fetch);
salesRouter.get("/sales/try", saleOrderControler.try);
// salesRouter.get("/solved", saleOrderControler.solved);
salesRouter.get("/sales/company/:id", saleOrderControler.fetchByCompany);
salesRouter.delete("/sales/:id", saleOrderControler.delete);
salesRouter.put("/sales/:id", saleOrderControler.update);
salesRouter.get("/sales/:id", saleOrderControler.fetchOrder);
salesRouter.post("/sale_payments", saleOrderControler.payments);
salesRouter.post("/sale_payment", saleOrderControler.payment);
salesRouter.post("/sales/status", saleOrderControler.updateStatus);
salesRouter.get("/sale_invoice/:id", saleOrderControler.printInvoice);
salesRouter.get("/sale_receipt/:id", saleOrderControler.printReceipt);
salesRouter.get("/sale_receipts/:id", saleOrderControler.receipts);
salesRouter.get("/sale_invoice/normal/:id", saleOrderControler.printNormalInvoice);

module.exports = salesRouter;