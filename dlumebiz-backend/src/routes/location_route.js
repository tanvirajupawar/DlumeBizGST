const router = require("express").Router();
const locationController = require("../controllers/location_controller");

router.get("/states", locationController.getStates);
router.get("/cities/:state", locationController.getCities);

module.exports = router;