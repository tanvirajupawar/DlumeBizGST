const express = require("express");
const reportController = require("../controllers/report_controller");
const reportRouter = express.Router();

reportRouter.get("/reports/sales", reportController.salesReport);
reportRouter.get("/reports/sale", reportController.saleReport);
reportRouter.get("/reports/purchase", reportController.purchasesReport);
reportRouter.get("/reports/receipts", reportController.receiptReport);
reportRouter.get("/reports/purchase/receipts", reportController.purchaseReceiptReport);
reportRouter.get("/reports/purchases", reportController.purchaseReport);
reportRouter.get("/reports/stocks", reportController.stockReport);
reportRouter.get("/reports/low_stocks", reportController.lowStock);
reportRouter.get("/reports/balancesheet", reportController.balancesheet);

reportRouter.get("/reports/view/sales", reportController.salesReports);
reportRouter.get("/reports/view/purchases", reportController.purchaseReports);
reportRouter.get("/reports/view/stocks", reportController.stockReports);
reportRouter.get("/reports/outstandingReport", reportController.outstandingReport);
module.exports = reportRouter;
