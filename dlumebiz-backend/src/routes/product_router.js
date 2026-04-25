const productController = require("../controllers/product_controller");
const productRouter = require("express").Router();

//  Create
productRouter.post("/product", productController.createProduct);

//  Fetch
productRouter.get("/product/company/:companyId", productController.fetchProducts);
productRouter.get("/product/category/:id", productController.fetchByCategory);
productRouter.get("/product/:id", productController.fetchProduct);

// Update
productRouter.put("/product/:id", productController.update);

// Add Stock
productRouter.put("/product/add-stock/:id", productController.add);

// Delete
productRouter.delete("/product/:id", productController.delete);

module.exports = productRouter;