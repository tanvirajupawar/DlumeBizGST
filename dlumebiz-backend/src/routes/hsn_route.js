const router = require("express").Router();
const hsnController = require("../controllers/hsn_controller");

router.get("/hsn", hsnController.getHSN);

module.exports = router;