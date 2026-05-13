const clientModel = require("../models/client_model");
const SaleOrderModel = require("../models/sale_order_model");
const SaleReceipt = require("../models/sale_receipt_model");

const clientController = {
  // Get all clients
  index: async function (req, res) {
    try {
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Search filter (optional)
      const search = req.query.search || "";

      // Build filter object
      const filter = {};
      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Count total documents for pagination
      const total = await clientModel.countDocuments(filter);

      // Fetch filtered and paginated clients
const clients = await clientModel
  .find(filter)
  .populate("company_id")
  .lean();

const result = await Promise.all(
  clients.map(async (c) => {

    const invoices = await SaleOrderModel.find({
      client_id: c._id
    });

    const outstanding = invoices.reduce((sum, inv) => {
      const total = Number(inv.total_amount || 0);
      const paid  = Number(inv.paid_amount || 0);
      return sum + (total - paid);
    }, 0);

    return {
      ...c,
pending_amount: (c.opening_balance || 0) + outstanding    };
  })
);

return res.json({
  success: true,
  data: result,
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

  // Create a new client
create: async function (req, res) {
  try {
    const body = req.body;

    // ✅ Split name into first + last
    const nameParts = (body.customer_name || "").trim().split(" ");

const data = {
  first_name: nameParts[0] || "",
  last_name: nameParts.slice(1).join(" ") || "",

  company_name: body.company_name,

  contact_no_1: body.customer_phone,
  contact_no_2: body.customer_alt_phone || "",

  email: body.customer_email,

  address_line_1: body.customer_address_line1,
  address_line_2: body.customer_address_line2 || "",

  // ✅ FIXED
  gstin: body.customer_gstin || "",
  pan_number: body.customer_pan || "",

  city: body.customer_city,
  state: body.customer_state,
  pincode: body.customer_pincode,

  // ✅ ADD THIS
  shipping_address_line_1: body.shipping_address_line_1 || "",
  shipping_city: body.shipping_city || "",
  shipping_state: body.shipping_state || "",
  shipping_pincode: body.shipping_pincode || "",

  // ✅ ADD THIS
  opening_balance: body.opening_balance || 0,
  pending_amount: body.opening_balance || 0,
};

    console.log("Mapped Data:", data); // debug

    const client = new clientModel(data);
    await client.save();

    return res.json({
      success: true,
      data: client,
      message: "Client Created Successfully",
    });

  } catch (error) {
    console.log("CREATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error,
    });
  }
},

  // Get a single client by ID
  fetch: async function (req, res) {
    try {
      const id = req.params.id;
      const client = await clientModel.findById(id).populate("company_id");

      if (!client) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found" });
      }

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

      let totalAmount = 0;
      let paidAmount = 0;
      let outstandingAmount = 0;

      if (totals.length > 0) {
        totalAmount = totals[0].totalInvoice || 0;
        paidAmount = (totals[0].totalPaid || 0) + receiptAmount;
        outstandingAmount = totalAmount - paidAmount;
      }

      const clientObj = client.toObject();
      clientObj.totalAmount = totalAmount;
      clientObj.paidAmount = paidAmount;
      clientObj.outstandingAmount = outstandingAmount;
      clientObj.pending_amount = (client.opening_balance || 0) + outstandingAmount;

      return res.json({
        success: true,
        data: clientObj,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Update a client
  update: async function (req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const updatedClient = await clientModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedClient) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found" });
      }

      return res.json({ success: true, data: updatedClient });
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
      const companyId = req.params.companyId;

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
        const amount = received[0]?.amount || 0;


        let outstanding = 0;
        let total = 0;
        let paid = 0;
        if (totals.length > 0) {
          total = totals[0].totalInvoice || 0;
          // paid = totals[0].totalPaid || 0;
          paid = (totals[0].totalPaid || 0) + (amount || 0);
          outstanding = (totals[0].totalInvoice || 0) - paid;
        }

        const clientObj = client.toObject();
        clientObj.totalAmount = total;
        clientObj.paidAmount = paid;
        clientObj.outstandingAmount = outstanding;

        clients.push(clientObj);
      }
      const ObjectId = require('mongoose').Types.ObjectId;

        const totalBalance = await SaleOrderModel.aggregate([
        {
            $match: {
            company_id: new ObjectId(companyId),
            
            }
        },
        {
            $addFields: {
                balance_amount: { $subtract: ["$total_amount", "$paid_amount"] }
            }
        },
        {
            $group: {
            _id: null, 
            totalAmount: { 
                $sum: "$total_amount" 
            },
            totalPaid: {
                $sum: "$paid_amount" 
            },
                totalBalance: {
                $sum: "$balance_amount" 
            }
            }
        }
    ]);

      const data = totalBalance.length > 0
        ? totalBalance[0]
        : {
            totalBalance: 0,
            totalAmount: 0,
            totalPaid: 0
        };

      return res.json({
        success: true,
        data: clients,
        total: data,
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

  // Delete a client
  delete: async function (req, res) {
    try {
      const id = req.params.id;

      const deletedClient = await clientModel.findByIdAndDelete(id);

      if (!deletedClient) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found" });
      }

      return res.json({
        success: true,
        message: "Client deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },
 

  customerAccount: async (req, res) => {
    try {
      const ver_id = req.params.id;
      const filter = {};

      if (ver_id) filter.client_id = ver_id;       

    

     
      const orders = await SaleOrderModel.find(filter).populate({
                                                          path: 'client_id',
                                                      })                                                      
                                                      .populate({
                                                          path: 'details',
                                                          populate: [
                                                              {path: 'product_id'},
                                                          ],
                                                      }).lean();
    const payments = await SaleReceipt.find(filter);


    const formattedOrders = orders.map(o => ({
      type: "order",
      date: o.order_date,
      ...o,
      details: o.details,       
      client_id: o.client_id,
    }));

    const formattedPayments = payments.map(p => ({
      type: "payment",
      date: p.date,
      ...p._doc
    }));

    // Merge and sort by date descending
    const mergedResult = [...formattedOrders, ...formattedPayments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

     return res.json({
        success: true,
        data: mergedResult,
      }); 
     

      
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

};

module.exports = clientController;
