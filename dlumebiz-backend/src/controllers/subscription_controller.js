const SubscriptionModel = require("../models/subscription_model");
const CompanyModel = require("../models/company_model");

const subscriptionController = {
  // List all subscriptions
  index: async function (req, res) {
    try {
      const subscriptions = await SubscriptionModel.find().sort({ createdOn: -1 }).populate("company_id");

      const today = new Date();

      for (let sub of subscriptions) {
        if (sub.status === "active") {   
          let newStatus = sub.end_date < today ? "expired" : "active";
          if (sub.status !== newStatus) {
            sub.status = newStatus;
            await sub.save();
          }
        }
      }
      return res.json({ success: true, data: subscriptions });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Create a subscription (only one per company)
  create: async function (req, res) {
    try {
      const data = req.body;
      console.log(data);

      // Ensure company exists
      const company = await CompanyModel.findById(data.company_id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      // Check if subscription already exists for this company
      const existingSub = await SubscriptionModel.findOne({ company_id: data.company_id });
      if (existingSub) {
        return res.status(400).json({
          success: false,
          message: "This company already has a subscription",
        });
      }

      const subscription = new SubscriptionModel(data);
      await subscription.save();

      return res.json({
        success: true,
        data: subscription,
        message: "Subscription Created Successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Get subscription by id
  fetch: async function (req, res) {
    try {
      const id = req.params.id;
      const subscription = await SubscriptionModel.findById(id).populate("company_id");

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      return res.json({ success: true, data: subscription });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Update subscription
  update: async function (req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const updatedSub = await SubscriptionModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      );

      if (!updatedSub) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      return res.json({ success: true, data: updatedSub });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Delete subscription
  delete: async function (req, res) {
    try {
      const id = req.params.id;

      const deletedSub = await SubscriptionModel.findByIdAndDelete(id);

      if (!deletedSub) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      return res.json({
        success: true,
        message: "Subscription deleted successfully",
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

module.exports = subscriptionController;
