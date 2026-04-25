const StockManagementModel = require("../models/stock_management_model");


const stockManagementController = {
  index: async function (req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";

      const filter = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ];
      }

      const total = await StockManagementModel.countDocuments(filter);
      const stocks = await StockManagementModel
        .find()
        .populate("product_id");

      return res.json({
        success: true,
        data: stocks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Create stock
  create: async function (req, res) {
    try {
      const data = req.body;
      const stock = new StockManagementModel(data);
      await stock.save();

      return res.json({
        success: true,
        data: stock,
        message: "Stock created successfully",
      });
    } catch (error) {
        console.log(error);
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Get stock by ID
  fetch: async function (req, res) {
    try {
      const id = req.params.id;
      const stock = await StockManagementModel.findById(id).populate("company_id");

      if (!stock) {
        return res
          .status(404)
          .json({ success: false, message: "Stock not found" });
      }

      return res.json({ success: true, data: stock });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Update stock
  update: async function (req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const updatedStock = await StockManagementModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedStock) {
        return res
          .status(404)
          .json({ success: false, message: "Stock not found" });
      }

      return res.json({ success: true, data: updatedStock });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  
  findByCompanyId: async function (req, res) {
    try {
        console.log("companyId");
      const companyId = req.params.companyId;

      console.log("companyId");
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";

      const filter = {
        company_id: companyId,
      };
      

      const total = await StockManagementModel.countDocuments(filter);
      const stocks = await StockManagementModel
        .find(filter)
        .populate("product_id")
        .skip(skip);

      return res.json({
        success: true,
        data: stocks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.log(error)
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  fetchRate: async function (req, res) {
    try {
      const stock = await StockManagementModel.findOne({
        service_id: req.params.service_id,
        width: req.params.width,
      });

      return res.json({
        success: true,
        data: stock,       
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Delete stock
  delete: async function (req, res) {
    try {
      const id = req.params.id;
      const deletedStock = await StockManagementModel.findByIdAndDelete(id);

      if (!deletedStock) {
        return res
          .status(404)
          .json({ success: false, message: "stock not found" });
      }

      return res.json({
        success: true,
        message: "stock deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },
};

module.exports = stockManagementController;
