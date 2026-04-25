const express = require("express");
const whatsappController = require("../controllers/whatsapp_controller");
const whatsRouter = express.Router();


whatsRouter.get("/", whatsappController.webhook);
whatsRouter.post("/", whatsappController.receiveWebhook);

module.exports = whatsRouter;
