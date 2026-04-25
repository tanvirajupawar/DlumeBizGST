const express = require("express");
const stockController = require("../controllers/stock_controller");

const stockRouter = express.Router();

stockRouter.get("/stocks", stockController.index);
stockRouter.post("/stocks", stockController.create);
stockRouter.get("/stocks/:id", stockController.fetch);
stockRouter.put("/stocks/:id", stockController.update);
stockRouter.delete("/stocks/:id", stockController.delete);
stockRouter.get("/stocks/company/:companyId", stockController.findByCompanyId);

module.exports = stockRouter;
