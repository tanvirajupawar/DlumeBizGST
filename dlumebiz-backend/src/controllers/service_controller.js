const serviceModel = require("../models/service_model");

const serviceController = {
  // Get all services (paginated + search)
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

      const total = await serviceModel.countDocuments(filter);
      const services = await serviceModel
        .find(filter)
        .populate("company_id")
        .skip(skip)
        .limit(limit);

      return res.json({
        success: true,
        data: services,
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

  // Create service
  create: async function (req, res) {
    try {
      const data = req.body;
      const service = new serviceModel(data);
      await service.save();

      return res.json({
        success: true,
        data: service,
        message: "Service created successfully",
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

  // Get service by ID
  fetch: async function (req, res) {
    try {
      const id = req.params.id;
      const service = await serviceModel.findById(id).populate("company_id");

      if (!service) {
        return res
          .status(404)
          .json({ success: false, message: "Service not found" });
      }

      return res.json({ success: true, data: service });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Update service
  update: async function (req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const updatedService = await serviceModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedService) {
        return res
          .status(404)
          .json({ success: false, message: "Service not found" });
      }

      return res.json({ success: true, data: updatedService });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Find by company_id
  findByCompanyId: async function (req, res) {
    try {
      const companyId = req.params.companyId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";

      const filter = {
        company_id: companyId,
      };

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ];
      }

      const total = await serviceModel.countDocuments(filter);
      const services = await serviceModel
        .find(filter)
        .populate("company_id")
        .skip(skip)
        .limit(limit);

      return res.json({
        success: true,
        data: services,
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

  // Delete service
  delete: async function (req, res) {
    try {
      const id = req.params.id;
      const deletedService = await serviceModel.findByIdAndDelete(id);

      if (!deletedService) {
        return res
          .status(404)
          .json({ success: false, message: "Service not found" });
      }

      return res.json({
        success: true,
        message: "Service deleted successfully",
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

module.exports = serviceController;
