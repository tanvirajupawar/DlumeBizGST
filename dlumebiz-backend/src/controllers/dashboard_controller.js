const productModel = require("../models/product_model");
const StockManagementModel = require("../models/stock_management_model");
const SaleDetail = require("../models/sale_detail_model");
const SaleOrderModel = require("../models/sale_order_model");
const SaleReceipt = require("../models/sale_receipt_model");
const clientModel = require("../models/client_model");
const vendorModel = require("../models/vendor_model");
const PurchaseOrderModel = require("../models/purchase_order_model");
const PurchaseReceipt = require("../models/purchase_receipt_model");
const mongoose  = require("mongoose");
const moment = require("moment-timezone");

const dashboardControler = {
  getTopSellingProducts: async function (req, res) {
    try {
      const company_id = req.params.company_id;
      const now = new Date();

      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );

      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const sales = await SaleDetail.find();

      let topProduct = {};

      for (const sale of sales) {
        const product = await productModel.findById(sale.product_id);
        if (!product) continue;
        if (product.company_id.toString() === company_id.toString()) {
          const productName = product.product;

          if (!topProduct[productName]) {
            topProduct[productName] = {
              product_id: product._id,
              name: productName,
              totalQty: 0,
              totalSales: 0,
            };
          }
          topProduct[productName].totalQty += Number(sale.qty) || 0;
          topProduct[productName].totalSales += Number(sale.amount) || 0;
        }
      }

      const topProductArray = Object.values(topProduct)
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);

      return res.json({ success: true, data: topProductArray });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  getOutOfStocks: async function (req, res) {
    try {
      const company_id = req.params.company_id;
      const stocks = await StockManagementModel.find({
        total_stock: { $lt: 100 },
      }).populate({
        path: "product_id",
        match: company_id ? { company_id } : {},
      });

      const result = stocks.filter((stock) => stock.product_id);

      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  getOverDue: async function (req, res) {
    try {
      const companyId = req.params.company_id;

      // Pagination params: page and limit, with defaults
      const limit = parseInt(req.query.limit) || 10;

      // Optional filter (e.g., search by client name or email)
      const search = req.query.search || "";

      // Build filter object
      const filter = {
        company_id: companyId,
      };

      if (search) {
        // Filter by name or email containing the search text (case-insensitive)
        filter.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Get total count for pagination
      const total = await clientModel.countDocuments(filter);

      // Fetch clients with pagination and filter
      const clientsWithOutstanding = await clientModel
        .find(filter)
        .populate("company_id")
        .sort({ createdOn: -1 })
        .exec();

      const clients = [];

      for (const client of clientsWithOutstanding) {
        const totals = await SaleOrderModel.aggregate([
          { $match: { client_id: client._id } },
          {
            $group: {
              _id: null,
              totalInvoice: { $sum: "$total_amount" },
              totalPaid: { $sum: "$advance_amount" },
            },
          },
        ]);

        const received = await SaleReceipt.aggregate([
          { $match: { client_id: client._id } },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
            },
          },
        ]);

        const receiptAmount = received[0]?.amount || 0;

        let outstanding = 0;
        let total = 0;
        let paid = 0;
        if (totals.length > 0) {
          total = totals[0].totalInvoice || 0;
          paid = (totals[0].totalPaid || 0) + receiptAmount;
          outstanding = (totals[0].totalInvoice || 0) - (paid || 0);
        }

        const clientObj = client.toObject();
        clientObj.totalAmount = total;
        clientObj.paidAmount = paid;
        clientObj.outstandingAmount = outstanding.toFixed(2);

        if (outstanding > 100) {
          clients.push(clientObj);
        }
      }

      return res.json({
        success: true,
        data: clients,
        total,
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

  getReceivable: async function (req, res) {
    try {
      const companyId = req.params.company_id;

      // Pagination params: page and limit, with defaults
      const limit = parseInt(req.query.limit) || 10;

      // Optional filter (e.g., search by client name or email)
      const search = req.query.search || "";

      // Build filter object
      const filter = {
        company_id: companyId,
      };

      if (search) {
        // Filter by name or email containing the search text (case-insensitive)
        filter.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Get total count for pagination
      const total = await clientModel.countDocuments(filter);

      // Fetch clients with pagination and filter
      const clientsWithOutstanding = await clientModel
        .find(filter)
        .populate("company_id")
        .sort({ createdOn: -1 })
        .exec();

      const clients = [];
      let actualOutstanging = 0;

      for (const client of clientsWithOutstanding) {
        const totals = await SaleOrderModel.aggregate([
          { $match: { client_id: client._id } },
          {
            $group: {
              _id: null,
              totalInvoice: { $sum: "$total_amount" },
              totalPaid: { $sum: "$advance_amount" },
            },
          },
        ]);

        const received = await SaleReceipt.aggregate([
          { $match: { client_id: client._id } },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
            },
          },
        ]);

        const receiptAmount = received[0]?.amount || 0;

        let outstanding = 0;
        let total = 0;
        let paid = 0;
        if (totals.length > 0) {
          total = totals[0].totalInvoice || 0;
          paid = (totals[0].totalPaid || 0) + receiptAmount;
          outstanding = (totals[0].totalInvoice || 0) - (paid || 0);
        }

        const clientObj = client.toObject();
        clientObj.totalAmount = total;
        clientObj.paidAmount = paid;
        clientObj.outstandingAmount = outstanding.toFixed(2);
        actualOutstanging = outstanding.toFixed(2);

        if (outstanding > 100) {
          clients.push(clientObj);
        }
      }

      return res.json({
        success: true,
        data: actualOutstanging,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  getPayable: async function (req, res) {
    try {
      const companyId = req.params.company_id;

      // Build filter object
      const filter = {
        company_id: companyId,
      };

      // Fetch clients with pagination and filter
      const vendorsWithOutstanding = await vendorModel
        .find(filter)
        .populate("company_id")
        .sort({ createdOn: -1 })
        .exec();

      const vendors = [];
      let actualOutstanging = 0;

      for (const vendor of vendorsWithOutstanding) {
        const totals = await PurchaseOrderModel.aggregate([
          { $match: { vendor_id: vendor._id } },
          {
            $group: {
              _id: null,
              totalInvoice: { $sum: "$total_amount" },
              totalPaid: { $sum: "$advance_amount" },
            },
          },
        ]);

        const received = await PurchaseReceipt.aggregate([
          { $match: { vendor_id: vendor._id } },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
            },
          },
        ]);

        const receiptAmount = received[0]?.amount || 0;

        let outstanding = 0;
        let total = 0;
        let paid = 0;
        if (totals.length > 0) {
          total = totals[0].totalInvoice || 0;
          paid = (totals[0].totalPaid || 0) + receiptAmount;
          outstanding = (totals[0].totalInvoice || 0) - (paid || 0);
        }

        const clientObj = vendor.toObject();
        clientObj.totalAmount = total;
        clientObj.paidAmount = paid;
        clientObj.outstandingAmount = outstanding.toFixed(2);
        actualOutstanging = outstanding.toFixed(2);

        if (outstanding > 100) {
          vendors.push(clientObj);
        }
      }

      return res.json({
        success: true,
        data: actualOutstanging,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  stockValue: async function (req, res) {
    try {
      const company_id = req.params.company_id;
      console.log(company_id);
      console.log(req.params.company_id);
      const result = await productModel.aggregate([
        {
          $match: {
            company_id: new mongoose.Types.ObjectId(company_id),
          },
        },
        {
          $lookup: {
            from: "stockmanagements",
            localField: "_id",
            foreignField: "product_id",
            as: "stock_details",
          },
        },
        {
          $addFields: {
            total_stock: { $sum: "$stock_details.total_stock" },
          },
        },
        {
          $addFields: {
            total_value: {
              $multiply: [
                { $ifNull: ["$total_stock", 0] },
                { $ifNull: ["$purchased_price", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            grand_total_stock: { $sum: "$total_stock" },
            grand_total_value: { $sum: "$total_value" },
          },
        },
      ]);

    

      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  getDailySales: async function (req, res) {
    try {
      const companyId = req.params.company_id;

      const nowIST = moment.tz("Asia/Kolkata");

      const startOfToday = nowIST
        .clone()
        .startOf("day")
        .add(5.5, "hours")
        .toDate();

      const endOfToday = nowIST.clone().endOf("day").add(5.5, "hours").toDate();

      console.log(startOfToday);
      console.log(endOfToday);

      const orders = await SaleOrderModel.find({
        company_id: companyId,
        createdOn: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      });

      const ObjectId = require("mongoose").Types.ObjectId;
      const totalBalanceToday = await SaleOrderModel.aggregate([
        {
          $match: {
            company_id: new ObjectId(companyId),
            createdOn: {
              $gte: startOfToday,
              $lte: endOfToday,
            },
          },
        },
        {
          $addFields: {
            balance_amount: { $subtract: ["$total_amount", "$paid_amount"] },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: {
              $sum: "$total_amount",
            },
            totalPaid: {
              $sum: "$paid_amount",
            },
            totalBalance: {
              $sum: "$balance_amount",
            },
          },
        },
      ]);

      const data =
        totalBalanceToday.length > 0
          ? totalBalanceToday[0]
          : {
              totalBalance: 0,
              totalAmount: 0,
              totalPaid: 0,
            };

      return res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  getDailyPurchase: async function (req, res) {
    try {
      const companyId = req.params.company_id;

      const nowIST = moment.tz("Asia/Kolkata");

      const startOfToday = nowIST
        .clone()
        .startOf("day")
        .add(5.5, "hours")
        .toDate();

      const endOfToday = nowIST.clone().endOf("day").add(5.5, "hours").toDate();

      const ObjectId = require("mongoose").Types.ObjectId;

      const totalBalanceToday = await PurchaseOrderModel.aggregate([
        {
          $match: {
            company_id: new ObjectId(companyId),
            // Assuming the relevant date field is 'createdAt'
            createdOn: {
              $gte: startOfToday,
              $lte: endOfToday,
            },
          },
        },
        {
          $addFields: {
            balance_amount: { $subtract: ["$total_amount", "$paid_amount"] },
          },
        },
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$balance_amount" },
            totalAmount: { $sum: "$total_amount" },
            totalPaid: { $sum: "$paid_amount" },
          },
        },
      ]);

      const data =
        totalBalanceToday.length > 0
          ? totalBalanceToday[0]
          : {
              totalBalance: 0,
              totalAmount: 0,
              totalPaid: 0,
            };

      return res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  fetchOrder: async function (req, res) {
    try {
      const id = req.params.id;
      const order = await SaleOrderModel.findById(id);
      const details = await SaleDetail.find({ sales_order_id: id });

      return res.json({ success: true, data: order, details: details });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  fetchByCompany: async function (req, res) {
    try {
      const id = req.params.id;
      const orders = await SaleOrderModel.find({ company_id: id });

      return res.json({ success: true, data: orders });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  delete: async function (req, res) {
    try {
      const id = req.params.id;

      const deleted = await SaleOrderModel.findByIdAndDelete(id);

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Sale Order not found" });
      } else {
        if (deleted._id) {
          const details = await SaleDetail.find({ sales_order_id: id });

          for (let d of details) {
            const qty = parseInt(d.qty) || 0;

            const stock = await StockManagementModel.findOne({
              product_id: d.product_id,
              company_id: deleted.company_id,
            });

            if (stock) {
              stock.out = parseInt(stock.out) - qty;
              if (stock.out < 0) stock.out = 0;

              stock.total_stock = parseInt(stock.total_stock) + qty;
              if (stock.total_stock < 0) stock.total_stock = 0;

              await stock.save();
            }
          }
          await SaleDetail.deleteMany({ sales_order_id: id });
        }
        return res
          .status(200)
          .json({ message: "Sale Order deleted successfully" });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },
  update: async function (req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;
      const details = updateData.details;

      const updetedOrder = await SaleOrderModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updetedOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Sale Order not found" });
      }

      const old = await SaleDetail.find({ sales_order_id: id });

      for (let d of old) {
        const qty = parseInt(d.qty) || 0;

        const stock = await StockManagementModel.findOne({
          product_id: d.product_id,
          company_id: updetedOrder.company_id,
        });

        if (stock) {
          stock.out = parseInt(stock.out) - qty;
          if (stock.out < 0) stock.out = 0;

          stock.total_stock = parseInt(stock.total_stock) + qty;
          if (stock.total_stock < 0) stock.total_stock = 0;

          await stock.save();
        }
      }
      await SaleDetail.deleteMany({ sales_order_id: id });
      if (Array.isArray(details) && details.length > 0) {
        let detailDocs = await SaleDetail.insertMany(
          details.map((d) => ({
            ...d,
            sales_order_id: updetedOrder._id,
          })),
        );

        for (let d of detailDocs) {
          let stock = await StockManagementModel.findOne({
            product_id: d.product_id,
            company_id: updetedOrder.company_id,
          });
          const previousStock = stock ? stock.total_stock : 0;
          const qty = parseInt(d.qty);

          if (stock) {
            stock.out += qty;
            stock.total_stock -= qty;
            await stock.save();
          } else {
            await StockManagementModel.create({
              product_id: d.product_id,
              company_id: updetedOrder.company_id,
              out: qty,
              total_stock: parseInt(previousStock) - qty,
            });
          }
        }
      }

      return res.json({ success: true, data: updetedOrder });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },
};

module.exports = dashboardControler;
