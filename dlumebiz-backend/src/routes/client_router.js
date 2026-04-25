const express = require("express");
const clientRouter = express.Router();
const clientController = require("../controllers/client_controller");

clientRouter.get("/customers", clientController.index);
clientRouter.post("/customers", clientController.create);
clientRouter.get("/customers/:id", clientController.fetch);
clientRouter.get("/customers/account/:id", clientController.customerAccount);
clientRouter.put("/customers/:id", clientController.update);
clientRouter.delete("/customers/:id", clientController.delete);
clientRouter.get("/customers/company/:companyId", clientController.findByCompanyId);


module.exports = clientRouter;
