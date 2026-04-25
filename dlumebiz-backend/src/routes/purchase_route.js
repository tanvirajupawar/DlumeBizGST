const express = require("express");
const router = express.Router();

const purchaseOrderControler = require("../controllers/purchase_order_controller");

// CREATE PURCHASE
router.post("/create", purchaseOrderControler.create);

// GET ALL PURCHASES
router.get("/purchase", purchaseOrderControler.fetch);
// GET PURCHASE BY COMPANY
router.get("/company/:id", purchaseOrderControler.fetchByCompany);

// GET SINGLE PURCHASE
router.get("/purchase/:id", purchaseOrderControler.fetchOrder);
// UPDATE PURCHASE
router.put("/purchase/:id", purchaseOrderControler.update);
// DELETE PURCHASE
router.delete("/purchase/:id", purchaseOrderControler.delete);
// PAYMENT ENTRY
router.post("/payment", purchaseOrderControler.payment);

// RECEIPT PDF
router.get("/receipt/:id", purchaseOrderControler.printReceipt);

// RECEIPTS LIST
router.get("/receipts/:id", purchaseOrderControler.receipts);

// INVOICE PDF
router.get("/invoice/:id", purchaseOrderControler.printInvoice);

module.exports = router;