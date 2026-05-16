
const express = require("express");
const staffController = require("../controllers/staff_controller");

const staffRouter = express.Router();

// GET ALL STAFF
staffRouter.get("/staffs", staffController.index);

// CREATE STAFF
staffRouter.post("/staffs", staffController.create);

// GET SINGLE STAFF
staffRouter.get("/staffs/:id", staffController.fetch);

// UPDATE SINGLE STAFF
staffRouter.put("/staffs/:id", staffController.update);

// DELETE STAFF
staffRouter.delete("/staffs/:id", staffController.delete);

// GET STAFF BY COMPANY ID
staffRouter.get(
  "/staffs/company/:company_id",
  staffController.findByCompanyId
);

// UPDATE COMPANY DETAILS IN ALL STAFF
staffRouter.put(
  "/staffs/company/:company_id",
  staffController.updateCompanyDetails
);

module.exports = staffRouter;
