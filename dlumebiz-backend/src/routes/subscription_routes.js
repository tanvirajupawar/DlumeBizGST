const subscriptionController = require("../controllers/subscription_controller");

const subscriptionRouter = require("express").Router();
subscriptionRouter.post("/subscriptions", subscriptionController.create);
subscriptionRouter.get("/subscriptions", subscriptionController.index);
subscriptionRouter.get("/subscriptions/:id", subscriptionController.fetch);
subscriptionRouter.put("/subscriptions/:id", subscriptionController.update);
subscriptionRouter.delete("/subscriptions/:id", subscriptionController.delete);

module.exports = subscriptionRouter;
