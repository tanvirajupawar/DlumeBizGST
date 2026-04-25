const categoryController = require("../controllers/category_controller");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

const categoryRouter = require("express").Router();

categoryRouter.post(
  "/category",
  isAuthenticated,
  authorizeRoles("admin", "user"),
  categoryController.createCategory
);
categoryRouter.get(
  "/category",
  isAuthenticated,
  authorizeRoles("admin", "user"),
  categoryController.fetchCategories
);
categoryRouter.get("/category/:id", categoryController.fetchCategory);

module.exports = categoryRouter;
