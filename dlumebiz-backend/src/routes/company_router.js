const companyControler = require("../controllers/company_controller");


const companyRouter = require("express").Router();

companyRouter.get("/company", companyControler.index);
companyRouter.post("/company", companyControler.create);
companyRouter.get("/company/:id", companyControler.fetch);
companyRouter.post("/company/:id", companyControler.update);
companyRouter.delete("/company/:id", companyControler.delete);

module.exports = companyRouter;