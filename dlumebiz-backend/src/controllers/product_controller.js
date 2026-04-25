const productModel = require("../models/product_model");
const StockManagementModel = require("../models/stock_management_model");
const mongoose  = require("mongoose");

const productControler = {
    createProduct: async function (req, res) {
        try {
            const data = req.body;
            const product = new productModel(data);
            const saved = await product.save();

           const qty = parseInt(data.qty || 0);

            await StockManagementModel.create({
                product_id: saved._id,
                company_id: saved.company_id,
                in: qty,
                total_stock:  qty,
            });

            return res.json({ success: true, data:product, message: "Product Created Successfully"});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

fetchProducts: async function (req, res) {
  try {
    const company_id  = req.params.companyId;

   const products = await productModel.aggregate([
  {
    $match: {
      company_id: new mongoose.Types.ObjectId(company_id)
    }
  },
  {
    $lookup: {
      from: "stockmanagements",
      let: { productId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$product_id", "$$productId"] },
                { $eq: ["$company_id", new mongoose.Types.ObjectId(company_id)] }
              ]
            }
          }
        }
      ],
      as: "stock_details"
    }
  },
  {
    $addFields: {
      stock_details: {
        $ifNull: [
          { $arrayElemAt: ["$stock_details", 0] },
          { total_stock: 0, in: 0, out: 0 }
        ]
      }
    }
  }
]);

products.forEach(p => {
  console.log("FULL STOCK 👉", p.stock_details);
});


    // 🔥 ADD THIS BLOCK (VERY IMPORTANT)
const formatted = products.map((p) => ({
  id: p._id,
  product: p.product || "",
  hsn: p.hsn || "",
  type: p.type || "",
  size: p.size || "",
  category: p.category || "",
  code: p.code || "",

  purchasePrice: p.purchase_price || 0,
  mrp: p.mrp || 0,

  // ✅ FIXED HERE
  in: p.stock_details?.in || 0,
  out: p.stock_details?.out || 0,
  total: p.stock_details?.total_stock || 0,

  unit: p.unit || "PCS"
}));

    // 🔥 RETURN FORMATTED DATA
    return res.json({ success: true, data: formatted });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error
    });
  }
},

    fetchProduct: async function (req, res) {
        try {
            const id = req.params.id;
            const product = await productModel.findById(id);

            return res.json({ success: true, data:product});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    fetchByCategory: async function (req, res) {
        try {
            const id = req.params.id;
            const products = await productModel.find({category_id: id});

            return res.json({ success: true, data:products});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    delete: async function (req, res) {
        try {
        const id = req.params.id;

        const deleted = await productModel.findByIdAndDelete(id);

        if (!deleted) {
            return res
            .status(404)
            .json({ success: false, message: "product not found" });
        }

         await StockManagementModel.findOneAndDelete({ product_id: id });

        return res.json({
            success: true,
            message: "product deleted successfully",
        });
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

        const updatedService = await productModel.findByIdAndUpdate(
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
                .json({ success: false, message: "Product not found" });
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
    add: async function (req, res) {
        try {
            const id = req.params.id;
            const { stock } = req.body; // from frontend
            const product = await productModel.findById(id);

            if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
            }

            // Convert to number safely
            const addedStock = parseInt(stock) || 0;

            // ✅ 1. Update product stock (add new stock to old stock)
            const newProductStock = (parseInt(product.stock) || 0) + addedStock;
            product.stock = newProductStock;
            await product.save();

            // ✅ 2. Update stock management entry
            let stockEntry = await StockManagementModel.findOne({ product_id: id });
            if (stockEntry) {
            stockEntry.in += addedStock;
            stockEntry.total_stock += addedStock;
            await stockEntry.save();
            } else {
            await StockManagementModel.create({
                product_id: id,
             company_id: req.body.company_id || null,
                in: addedStock,
                total_stock: addedStock,
            });
            }

            return res.json({
            success: true,
            message: "Stock updated successfully",
            data: product,
            });
        } catch (error) {
            return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message || error,
            });
        }
    },

}

module.exports =  productControler;