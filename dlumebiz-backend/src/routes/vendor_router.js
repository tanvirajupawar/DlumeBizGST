const express = require("express");
const vendorRouter = express.Router();
const vendorController = require("../controllers/vendor_controller");

vendorRouter.get("/vendor", vendorController.index);
vendorRouter.post("/vendor", vendorController.create);
vendorRouter.get("/vendor/:id", vendorController.fetch);
vendorRouter.get("/vendor/account/:id", vendorController.vendorAccount);
vendorRouter.put("/vendor/:id", vendorController.update);
vendorRouter.delete("/vendor/:id", vendorController.delete);
vendorRouter.get("/vendor/company/:companyId", vendorController.findByCompanyId);

module.exports = vendorRouter;
