const express = require("express");
const staffController = require("../controllers/staff_controller");

const staffRouter = express.Router();

staffRouter.get("/staffs", staffController.index);
staffRouter.post("/staffs", staffController.create);
staffRouter.get("/staffs/:id", staffController.fetch);
staffRouter.put("/staffs/:id", staffController.update);
staffRouter.delete("/staffs/:id", staffController.delete);
staffRouter.get("/staffs/company/:company_id", staffController.findByCompanyId); // 

module.exports = staffRouter;
