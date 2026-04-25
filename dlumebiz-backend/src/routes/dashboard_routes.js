const dashboardControler = require("../controllers/dashboard_controller");

const dashboardRouter = require("express").Router();
dashboardRouter.get("/getTopSellingProducts/:company_id", dashboardControler.getTopSellingProducts);
dashboardRouter.get("/getOutOfStocks/:company_id", dashboardControler.getOutOfStocks);
dashboardRouter.get("/getOverDue/:company_id", dashboardControler.getOverDue);
dashboardRouter.get("/getDailyPurchase/:company_id", dashboardControler.getDailyPurchase);
dashboardRouter.get("/getDailySales/:company_id", dashboardControler.getDailySales);
dashboardRouter.get("/getReceivable/:company_id", dashboardControler.getReceivable);
dashboardRouter.get("/getPayable/:company_id", dashboardControler.getPayable);
dashboardRouter.get("/stockValue/:company_id", dashboardControler.stockValue);

module.exports = dashboardRouter;
