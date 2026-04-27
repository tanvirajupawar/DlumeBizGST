const vendorModel = require("../models/vendor_model");
const PurchaseReceipt = require("../models/purchase_receipt_model");
const PurchaseOrderModel = require("../models/purchase_order_model");

const vendorController = {
  // Get all vendors
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
      const total = await vendorModel.countDocuments(filter);

      // Fetch filtered and paginated vendors
    const vendors = await vendorModel
  .find(filter)
  .populate("company_id")
  .lean();


const result = await Promise.all(
  vendors.map(async (v) => {

    const invoices = await PurchaseOrderModel.find({
      vendor_id: v._id
    });

    const outstanding = invoices.reduce((sum, inv) => {
      const balance =
        inv.balance_amount !== undefined && inv.balance_amount !== null
          ? Number(inv.balance_amount)
          : Number(inv.total_amount || 0);

      return sum + balance;
    }, 0);

    return {
      ...v,
      pending_amount: outstanding   // 🔥 THIS IS THE FIX
    };
  })
);

    return res.json({
  success: true,
  data: result, // ✅ use result instead of vendors
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


create: async function (req, res) {
  try {
const data = req.body;

const vendor = new vendorModel({
  vendor_name: data.vendor_name,
  company_name: data.company_name,
  business_type: data.business_type,

  gst: data.vendor_gstin,
  pan: data.vendor_pan,

  contact_no_1: data.vendor_phone,
  contact_no_2: data.vendor_alt_phone,

  email: data.vendor_email,
  website: data.vendor_website,

  address_line_1: data.vendor_address_line1,   
  address_line_2: data.vendor_address_line2,   
  city: data.vendor_city,                    
  state: data.vendor_state,                  
  pincode: data.vendor_pincode,               

  opening_balance: data.opening_balance || 0,
  pending_amount: data.opening_balance || 0,
});

    await vendor.save();

      return res.json({
        success: true,
        data: vendor,
        message: "Vendor Created Successfully",
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

  


fetch: async function (req, res) {
  try {
    const id = req.params.id;
    const vendor = await vendorModel.findById(id).populate("company_id");

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // ── Compute pending_amount live from invoice balance_amounts ──
    const invoices = await PurchaseOrderModel.find({ vendor_id: vendor._id });

    const pending = invoices.reduce((sum, inv) => {
      const bal =
        inv.balance_amount !== undefined && inv.balance_amount !== null
          ? Number(inv.balance_amount)
          : Number(inv.total_amount || 0);
      return sum + bal;
    }, 0);

    // ── Keep existing totals for backward compat ──
    const totalAmount = invoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
    const paidAmount  = totalAmount - pending;

    const vendorObj = vendor.toObject();
    vendorObj.pending_amount    = pending;       // ✅ used by VendorList payable column
    vendorObj.totalAmount       = totalAmount;
    vendorObj.paidAmount        = paidAmount;
    vendorObj.outstandingAmount = pending;       // alias for anything reading outstandingAmount

    return res.json({ success: true, data: vendorObj });

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

      const updatedVendor = await vendorModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedVendor) {
        return res
          .status(404)
          .json({ success: false, message: "Vendor not found" });
      }

      return res.json({ success: true, data: updatedVendor });
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
      const filter = { company_id: companyId };

      const vendors = await vendorModel.find(filter).sort({ createdOn: -1 }).exec();
      const result = [];


      for(const vendor of vendors){

        const totals = await PurchaseOrderModel.aggregate([
            { $match: { vendor_id: vendor._id  } },
            {
              $group: {
                _id: null,
                total_amount: { $sum: "$total_amount" },
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
        console.log(received);
        let receiptAmount = 0

        if(received.length > 0){
           receiptAmount = received[0]?.amount || 0;
        }

        

        let totalAmount = 0;
        let paidAmount = 0;
        let outstandingAmount = 0;

        if (totals.length > 0) {
          totalAmount = totals[0].total_amount || 0;
          paidAmount = receiptAmount || 0;
          outstandingAmount = totalAmount - paidAmount;
        }

        const vendorObj = vendor.toObject();
        vendorObj.totalAmount = totalAmount;
        vendorObj.paidAmount = paidAmount;
        vendorObj.outstandingAmount = outstandingAmount;

        result.push(vendorObj);

      }

       

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  vendorAccount: async (req, res) => {
    try {
      const ver_id = req.params.id;
      const filter = {};

      if (ver_id) filter.vendor_id = ver_id;       

    

      
      const orders = await PurchaseOrderModel.find(filter).populate({
                                                          path: 'vendor_id',
                                                      })                                                      
                                                      .populate({
                                                          path: 'details',
                                                          populate: [
                                                              {path: 'product_id'},
                                                          ],
                                                      }).lean();
    const payments = await PurchaseReceipt.find(filter);
    console.log(payments);


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

 
  delete: async function (req, res) {
    try {
      const id = req.params.id;

      const deletedVendor = await vendorModel.findByIdAndDelete(id);

      if (!deletedVendor) {
        return res
          .status(404)
          .json({ success: false, message: "Vendor not found" });
      }

      return res.json({
        success: true,
        message: "Vendor deleted successfully",
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

module.exports = vendorController;
