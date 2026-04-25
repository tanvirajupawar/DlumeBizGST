const express = require("express");
const serviceController = require("../controllers/service_controller");

const serviceRouter = express.Router();

serviceRouter.get("/services", serviceController.index);
serviceRouter.post("/services", serviceController.create);
serviceRouter.get("/services/:id", serviceController.fetch);
serviceRouter.put("/services/:id", serviceController.update);
serviceRouter.delete("/services/:id", serviceController.delete);
serviceRouter.get("/services/company/:companyId", serviceController.findByCompanyId);

module.exports = serviceRouter;
