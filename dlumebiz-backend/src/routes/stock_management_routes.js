const express = require("express");
const stockManagementController = require("../controllers/stock_management_controller");

const stockManagementRouter = express.Router();

stockManagementRouter.get("/stockManagement", stockManagementController.index);
stockManagementRouter.post("/stockManagement", stockManagementController.create);
stockManagementRouter.get("/stockManagement/:id", stockManagementController.fetch);
stockManagementRouter.get("/stockManagement/:service_id/:width", stockManagementController.fetchRate);
stockManagementRouter.put("/stockManagement/:id", stockManagementController.update);
stockManagementRouter.delete("/stockManagement/:id", stockManagementController.delete);
stockManagementRouter.get("/stockManagements/company/:companyId", stockManagementController.findByCompanyId);

module.exports = stockManagementRouter;
