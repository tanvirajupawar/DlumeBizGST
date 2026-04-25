const OrderModel = require("../models/order_model");
const StockManagementModel = require("../models/stock_management_model");
const orderController = {
  create: async (req, res) => {
    try {
      const order = new OrderModel(req.body);
      await order.save();
      const existingStock = await StockManagementModel.findOne({
        service_id: order.service_id,
        company_id: order.company_id,
        width: order.media_width,
      });

      if (existingStock) {
        const newQty = parseFloat(existingStock.out || 0) + parseFloat(order.sqft || 0);
        const newTotal = parseFloat(existingStock.total_stock || 0) - parseFloat(order.sqft || 0);

        existingStock.out = newQty;
        existingStock.total_stock = newTotal;
        await existingStock.save();
      } else {
        // If not exists, create new one
        const stckmanagement = new StockManagementModel({
          service_id: order.service_id,
          company_id: order.company_id,
          width: order.media_width,
          out: order.sqft,
          rate: order.rate,
          total_stock: 0 - order.sqft,
        });
      }
      return res.json({ success: true, message: "Order created", data: order });
    } catch (error) {
        console.log(error);
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  fetch: async (req, res) => {
    try {
      const order = await OrderModel.findById(req.params.id)
        .populate("client_id service_ids company_id");
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      return res.json({ success: true, data: order });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  index: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const orders = await OrderModel.find({})
        .populate("client_id service_ids company_id")
        .skip(skip)
        .limit(limit);

      const total = await OrderModel.countDocuments();
      return res.json({
        success: true,
        data: orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  findByCompanyId: async (req, res) => {
    try {
      const companyId = req.params.companyId;
      
      const page = parseInt(req.query.page) || 1;
      console.log("page");
      console.log(page);
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await OrderModel.find({ company_id: companyId })
        .populate("client_id service_id")
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit);

      const total = await OrderModel.countDocuments({ company_id: companyId });

      return res.json({
        success: true,
        data: orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const updatedOrder = await OrderModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      return res.json({ success: true, data: updatedOrder });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const order = await OrderModel.findById(req.params.id);
      const deletedOrder = await OrderModel.findByIdAndDelete(req.params.id);

      const existingStock = await StockManagementModel.findOne({
        service_id: order.service_id,
        company_id: order.company_id,
        width: order.width,
      });

      if (existingStock) {
        const newQty = parseFloat(existingStock.out || 0) - parseFloat(order.sqft || 0);
        const newTotal = parseFloat(existingStock.total_stock || 0) + parseFloat(order.sqft || 0);

        existingStock.out = newQty;
        existingStock.total_stock = newTotal;
        await existingStock.save();
      }

      if (!deletedOrder) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      return res.json({ success: true, message: "Order deleted" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },
};

module.exports = orderController;
