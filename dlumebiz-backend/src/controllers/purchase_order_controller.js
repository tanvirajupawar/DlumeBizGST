const PurchaseReceipt = require("../models/purchase_receipt_model");
const productModel = require("../models/product_model");
const PurchaseDetail = require("../models/purchase_detail_model");
const PurchaseOrderModel = require("../models/purchase_order_model");
const StockManagementModel = require("../models/stock_management_model");
const PdfPrinter = require("pdfmake");
const path = require("path");
const fs = require('fs');
const axios = require('axios');
const mongoose = require('mongoose');


const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/static/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../fonts/static/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../fonts/static/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../fonts/static/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);


const purchaseOrderControler = {


   create: async function (req, res) {
  try {
    const data = req.body;

    // Map frontend items → backend format
const details = (data.details || data.items || []).map((item) => {

console.log("🧾 ITEM FROM FRONTEND:", item);
  const qty = parseInt(item.qty || 0);
  const price = parseFloat(item.price || 0);
  const discount = parseFloat(item.discount || 0);

  const gross = qty * price;
  const discountAmount = discount;
  const amount = gross - discountAmount;

  return {
    product_name: item.product_name,
    item_type: item.item_type || item.itemType,
    sku: item.sku,
    hsn: item.hsn,
    unit: item.unit,
    qty,
    price,
    discount,
    gst_rate: parseFloat(item.gst_rate || item.gstRate || 0),
    amount,
    purchase_order_id: null,
    product_id: item.product_id || null
  };

});

   const order = new PurchaseOrderModel({
  company_id: data.company_id,
  vendor_id: data.vendor_id,
  supplier_invoice_no: data.supplier_invoice_no,
  invoice_date: data.invoice_date,
entry_date: data.entry_date,
purchase_type: data.purchase_type,
total_amount: data.total_amount,
paid_amount: data.amount_paid || 0,
payment_mode: data.payment_mode || "Cash",
payment_remark: data.payment_ref || "",
});
    await order.save();

    // attach purchase_order_id
    details.forEach((d) => {
      d.purchase_order_id = order._id;
    });

const detailDocs = details.length ? await PurchaseDetail.insertMany(details) : [];
console.log("🔥 DETAIL DOCS:", detailDocs);
    // Stock Update
for (let d of detailDocs) {

  console.log("🔥 PRODUCT ID CHECK 👉", d.product_id);
  if (!d.product_id) continue;

  const qty = parseInt(d.qty) || 0;

  // product update
  const product = await productModel.findById(d.product_id);
  if (product) {
    product.qty = (product.qty || 0) + qty;
    product.stock_in = (product.stock_in || 0) + qty;
    product.total = product.qty;
    await product.save();
  }

  // stock update
  let stock = await StockManagementModel.findOne({
    product_id: d.product_id,
    company_id: order.company_id
  });

  if (stock) {
  stock.in = (stock.in || 0) + qty;            
  stock.total_stock = (stock.total_stock || 0) + qty;
  await stock.save();
} else {
  await StockManagementModel.create({
    product_id: d.product_id,
    company_id: order.company_id,
    in: qty,                                   
    out: 0,                                  
    total_stock: qty
  });
}
}

// ✅ RESPONSE OUTSIDE LOOP
return res.json({
  success: true,
  data: order,
  message: "Purchase Order Created Successfully",
});

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
},

fetch: async function (req, res) {
  try {
    const { vendor_id } = req.query;

    let filter = {};

    if (vendor_id) {
      filter.vendor_id = vendor_id;
    }

    // ✅ Fetch orders
const orders = await PurchaseOrderModel.find(filter)
  .populate("vendor_id", "vendor_name company_name gst gstin state_code")
  .sort({ createdOn: -1 })
  .lean();
    // ✅ Fetch ONLY related details (IMPORTANT FIX)
    const orderIds = orders.map(o => o._id);

    const details = await PurchaseDetail.find({
      purchase_order_id: { $in: orderIds }
    }).lean();

    // ✅ Map details to each order
 const finalData = orders.map(order => {
  const balance =
    (order.total_amount || 0) - (order.paid_amount || 0);

  return {
    ...order,
    balance_amount: balance, // 🔥 ADD THIS
    details: details.filter(
      d => d.purchase_order_id.toString() === order._id.toString()
    )
  };
});

    return res.json({
      success: true,
      data: finalData
    });

  } catch (error) {
    console.error("FETCH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error
    });
  }
},

fetchOrder: async function (req, res) {
  try {
    const id = req.params.id;

    const order = await PurchaseOrderModel.findById(id).populate("vendor_id");
    const details = await PurchaseDetail.find({ purchase_order_id: id });

    return res.json({
      success: true,
      data: {
        ...order.toObject(),
        details: details
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
},

    fetchByCompany: async function (req, res) {
        try {
            const id = req.params.id;
            const orders = await PurchaseOrderModel.find({company_id: id}).sort({ createdOn: -1 }).populate('vendor_id').populate('payments').populate({
                                                                      path: 'details',
                                                                      populate: [
                                                                          {path: 'product_id'},
                                                                      ],
                                                                  }); 

            return res.json({ success: true, data:orders});  
            
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

    // find order first
    const order = await PurchaseOrderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found"
      });
    }

    // get details
    const details = await PurchaseDetail.find({ purchase_order_id: id });

    // reverse stock
    for (let d of details) {
      if (!d.product_id) continue;

     const qty = parseInt(d.qty) || 0;       

      const stock = await StockManagementModel.findOne({
        product_id: d.product_id,
        company_id: order.company_id
      });

      if (stock) {
     stock.in = Math.max(0, (stock.in || 0) - qty);   
stock.total_stock = Math.max(0, (stock.total_stock || 0) - qty);
        await stock.save();
      }
    }

    // delete details
    await PurchaseDetail.deleteMany({ purchase_order_id: id });

    // delete order
    await PurchaseOrderModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Purchase deleted successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
},

    update: async function (req, res) {
        console.log("UPDATE BODY:", req.body);
        try {
            const id = req.params.id;
            const updateData = req.body;
const itemsArray = Array.isArray(updateData.details)
  ? updateData.details
  : Array.isArray(updateData.items)
  ? updateData.items
  : [];

const details = itemsArray.map((item) => ({
  product_name: item.product_name || item.name,
  item_type: item.item_type || item.itemType,
  sku: item.sku,
  hsn: item.hsn,
  unit: item.unit,
  qty: parseInt(item.qty || 0),
  price: parseFloat(item.price || item.purchasePrice || 0),
  discount: parseFloat(item.discount || 0),
  gst_rate: parseFloat(item.gst_rate || item.gstRate || 0),
  product_id: item.product_id || null
}));
console.log("DETAILS:", details);

const updateFields = {
  supplier_invoice_no: updateData.supplier_invoice_no,
  invoice_date: updateData.invoice_date,
  entry_date: updateData.entry_date,
  purchase_type: updateData.purchase_type,
  reverse_charge: updateData.reverse_charge,
  notes: updateData.notes,

  total_amount: updateData.total_amount,
  paid_amount: updateData.amount_paid,
  payment_mode: updateData.payment_mode,
  payment_remark: updateData.payment_ref,
  status: updateData.status,
};
          const updetedOrder = await PurchaseOrderModel.findByIdAndUpdate(
  id,
  updateFields,
            {
                new: true,
                runValidators: true,
            }
            );

            if (!updetedOrder) {
                return res.status(404)
                .json({ success: false, message: "Purchase Order not found" });
            }   
            const old = await PurchaseDetail.find({ purchase_order_id: id });

         for (let d of old) {
  if (!d.product_id) continue;

  const qty = parseInt(d.qty) || 0;

  const stock = await StockManagementModel.findOne({
    product_id: d.product_id,
    company_id: updetedOrder.company_id
  });

  if (stock) {
stock.in = Math.max(0, (stock.in || 0) - qty);
stock.total_stock = Math.max(0, (stock.total_stock || 0) - qty);
    await stock.save();
  }
}
            await PurchaseDetail.deleteMany({ purchase_order_id: id });
            if (Array.isArray(details) && details.length > 0) {
                let detailDocs = await PurchaseDetail.insertMany(
                    details.map(d => ({
                        ...d,
                        purchase_order_id: updetedOrder._id,
                    }))
                );

                for (let d of detailDocs) {
                    let stock = await StockManagementModel.findOne({
                    product_id: d.product_id,
                    company_id: updetedOrder.company_id
                    });
                    const previousStock = stock ? stock.total_stock : 0;
                  const qty = parseInt(d.qty) || 0;
        
                    if (stock) {
                stock.in = (stock.in || 0) + qty;
stock.total_stock = (stock.total_stock || 0) + qty;
                    await stock.save();
const product = await productModel.findById(d.product_id);

if (product) {
product.qty = (product.qty || 0) + qty;
product.total = product.qty;
product.stock_in = (product.stock_in || 0) + qty;
  product.purchased_price = d.price;       
  await product.save();
}

                    } else {
await StockManagementModel.create({
  product_id: d.product_id,
  company_id: updetedOrder.company_id,
  in: qty,               
  out: 0,
  total_stock: qty,
});

// ✅ AFTER create (correct place)
const product = await productModel.findById(d.product_id);

if (product) {
product.qty = qty;
product.total = product.qty;
product.stock_in = qty;
  product.purchased_price = d.price;
  await product.save();
}
                    }
                }
            }

for (const prod of details) {

  if (!prod.product_id) continue; // ✅ FIX

  const product = await productModel.findById(prod.product_id);

  if (product) {
    product.purchased_price = prod.price;
    await product.save();
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

    payment: async function (req, res) {

        try {
            const data = req.body;
            
            const payment = new PurchaseReceipt(data);
            await payment.save();               
           

            return res.json({ success: true, data:payment, message: "Payment Done Successfully"});  
            
        } catch (error) {
            console.log(error);

             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    receipts: async function (req, res) {
        try {
            const company_id = req.params.id;
            
            const receipt = await PurchaseReceipt.find().populate({
                                        path: "vendor_id",
                                    });
            const companyObjectId = new mongoose.Types.ObjectId(company_id);

            const filtered = receipt.filter(
            (r) => r.vendor_id?.company_id?.equals(companyObjectId)
            );
            console.log("FILTERED receipts:", filtered.length);


          

            return res.status(200).json({
                success: true,
                receipts: filtered,
            });       
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }        
    },

    printReceipt: async function (req, res) {
        try {
            const id = req.params.id;
            const receipt = await PurchaseReceipt.findById(id)
                .populate({
                    path: 'purchase_order_id',
                    populate: [
                    { path: 'company_id' },  // Populates company details
                    { path: 'vendor_id' }    // Populates vendor details
                    ]
                });

             const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount);


            const companyDetails = [    
                { text: `${receipt.purchase_order_id.company_id.name}`, fontSize: 20, bold: true },
                { text: "\n" },
            ];

            // Always add main address if available
            if (receipt.purchase_order_id.company_id.address) {
                companyDetails.push({ text: receipt.purchase_order_id.company_id.address });
            }

            // Conditionally add area, city, state, country, pincode
            const company = receipt.purchase_order_id.company_id;

            if (company.area) companyDetails.push({ text: `Area: ${company.area}` });
            if (company.city) companyDetails.push({ text: `City: ${company.city}` });
            if (company.state) companyDetails.push({ text: `State: ${company.state}` });
            if (company.country) companyDetails.push({ text: `Country: ${company.country}` });
            if (company.pincode) companyDetails.push({ text: `Pincode: ${company.pincode}` });

            // Contact and email
            if (company.contact_no_1) companyDetails.push({ text: `Contact: ${company.contact_no_1}` });
            if (company.email) companyDetails.push({ text: `Email: ${company.email}` });

            const vendor = receipt.purchase_order_id.vendor_id;

            const vendorDetails = [
                { text: `${vendor.first_name} ${vendor.last_name}`, bold: true },
            ];

            // Address
            if (vendor.address) vendorDetails.push({ text: vendor.address_line_1 });
            if (vendor.area) vendorDetails.push({ text: `Area: ${vendor.address_line_2}` });
            if (vendor.city) vendorDetails.push({ text: `City: ${vendor.city}` });
            if (vendor.state) vendorDetails.push({ text: `State: ${vendor.state}` });
            if (vendor.country) vendorDetails.push({ text: `Country: ${vendor.country}` });
            if (vendor.pincode) vendorDetails.push({ text: `Pincode: ${vendor.pincode}` });

            // Contact info
            if (vendor.contact_no_1) vendorDetails.push({ text: `Contact: ${vendor.contact_no_1}` });
            if (vendor.email) vendorDetails.push({ text: `Email: ${vendor.email}` });


            const paymentFields = [];

            if (receipt.payment_method === "Card") {
                paymentFields.push(
                    { text: `Card Number: ${receipt.card_number || '-'}` },
                    { text: `Transaction ID: ${receipt.transaction_id || '-'}` }
                );
            }

            if (receipt.payment_method === "Bank Transfer") {
                paymentFields.push(
                    { text: `Bank Name: ${receipt.bank_name || '-'}` },
                    { text: `Branch: ${receipt.branch || '-'}` },
                    { text: `IFSC Code: ${receipt.ifsc_code || '-'}` },
                    { text: `Transaction ID / UTR: ${receipt.transaction_id || '-'}` }
                );
            }

            if (receipt.payment_method === "Cheque") {
                paymentFields.push(
                    { text: `Cheque No: ${receipt.cheque_no || '-'}` },
                    { text: `Bank Name: ${receipt.bank_name || '-'}` },
                    { text: `Branch: ${receipt.branch || '-'}` },
                    { text: `IFSC Code: ${receipt.ifsc_code || '-'}` }
                );
                
            }

             if (receipt.payment_method === "Cash") {
                paymentFields.push(
                    { text: `Cash` },
                );
                
            }



             const contents = [];
            
            // Add letterhead only if the URL exists
            if (receipt.purchase_order_id.company_id.letter_head && receipt.purchase_order_id.company_id.letter_head.trim() !== '') {
                    const response = await axios.get(receipt.purchase_order_id.company_id.letter_head, { responseType: 'arraybuffer' });
                const tempPath = path.join(__dirname, 'temp_letterhead.png');
                fs.writeFileSync(tempPath, response.data);
                contents.push({
                    image: tempPath,
                    fit: [595 - 40 - 40, 150], 
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                });
            }




            const docDefinition = {
                content: [
                    contents,
                   
                    {
                        columns: [
                            companyDetails,                            
                            [
                                { text: "Receipt",  alignment: "right" , fontSize: 20, bold: true },
                                { text: "\n" },
                                { text: `Receipt Date: ${new Date(receipt.createdOn).toLocaleDateString()}`, alignment: "right" },
                            ]
                        ]
                    },
                    { text: "\n\n" },
                    {
                        columns: [
                            vendorDetails,
                            
                        ]
                    },
                    { text: "\n" },
  {
text: [
  'Purchase invoice amounting to ',
  { text: `₹${order.total_amount.toFixed(2)}`, bold: true },
  '.'
],
  fontSize: 10,
  margin: [30, 10, 30, 10],
  lineHeight: 1.5
},            
                    {
                        columns: [
                            { text: `\nFor ${order.company_id.name} \n\nAuthorised Signature`, alignment: "right" }
                        ]
                    }
                ],
                footer: function(currentPage, pageCount) {
                    return {
                        columns: [
                            {
                                // text: `${receipt.purchase_order_id.company_id.address} | Website: ${receipt.purchase_order_id.company_id.website || '-'} | Email: ${receipt.purchase_order_id.company_id.email || '-'} | Phone: ${receipt.purchase_order_id.company_id.contact_number || '-'}`,
                                text: `D'Lume - ${new Date(receipt.createdOn).toLocaleDateString()}`,
                                alignment: 'left',
                                fontSize: 9
                            },
                            {
                                text: `Page ${currentPage} of ${pageCount}`,
                                alignment: 'right',
                                fontSize: 9
                            }
                        ],
                        margin: [40, 0]
                    };
                },
                defaultStyle: { fontSize: 10 }
            };


            const pdfDoc = printer.createPdfKitDocument(docDefinition);

            res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", `inline; filename=receipt_${receipt._id}.pdf`);
            pdfDoc.pipe(res);
            pdfDoc.end();
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }        
    },

    printInvoice: async function (req, res) {
        try {
            const id = req.params.id;
            const order = await PurchaseOrderModel.findById(id)
                                    .populate({
                                        path: 'company_id',
                                    })
                                    .populate({
                                        path: 'vendor_id',
                                    })
                                     .populate({
                                        path: 'details',
                                        populate: [
                                        { path: 'product_id' },  
                                        ]
                                    });


            const companyDetails = [    
                { text: `${order.company_id.name}`, fontSize: 20, bold: true },
                { text: "\n" },
            ];

            // Always add main address if available
            if (order.company_id.address) {
                companyDetails.push({ text: order.company_id.address });
            }

            // Conditionally add area, city, state, country, pincode
            const company = order.company_id;

            if (company.area) companyDetails.push({ text: `Area: ${company.area}` });
            if (company.city) companyDetails.push({ text: `City: ${company.city}` });
            if (company.state) companyDetails.push({ text: `State: ${company.state}` });
            if (company.country) companyDetails.push({ text: `Country: ${company.country}` });
            if (company.pincode) companyDetails.push({ text: `Pincode: ${company.pincode}` });

            // Contact and email
            if (company.contact_no_1) companyDetails.push({ text: `Contact: ${company.contact_no_1}` });
            if (company.email) companyDetails.push({ text: `Email: ${company.email}` });

            const vendor = order.vendor_id;

            const vendorDetails = [
                { text: `${vendor.first_name} ${vendor.last_name}`, bold: true },
            ];

            // Address
            if (vendor.address) vendorDetails.push({ text: vendor.address_line_1 });
            if (vendor.area) vendorDetails.push({ text: `Area: ${vendor.address_line_2}` });
            if (vendor.city) vendorDetails.push({ text: `City: ${vendor.city}` });
            if (vendor.state) vendorDetails.push({ text: `State: ${vendor.state}` });
            if (vendor.country) vendorDetails.push({ text: `Country: ${vendor.country}` });
            if (vendor.pincode) vendorDetails.push({ text: `Pincode: ${vendor.pincode}` });

            // Contact info
            if (vendor.contact_no_1) vendorDetails.push({ text: `Contact: ${vendor.contact_no_1}` });
            if (vendor.email) vendorDetails.push({ text: `Email: ${vendor.email}` });

           
            const docDefinition = {
                content: [
                   
                    {
                        columns: [
                            companyDetails,                            
                            [
                                { text: "Invoice",  alignment: "right" , fontSize: 20, bold: true },
                                { text: "\n" },
                                { text: `Invoice Date: ${new Date(order.createdOn).toLocaleDateString()}`, alignment: "right" },
                            ]
                        ]
                    },
                    { text: "\n\n" },
                    {
                        columns: [
                            vendorDetails,
                            
                        ]
                    },
                    { text: "\n" },
                    {
                        
                        text: [
                            'We hereby acknowledge the receipt of payment amounting to ',
                            { text: `₹${order.total_amount.toFixed(2)}`, bold: true },
                            `. This payment has been received via ${receipt.payment_method || 'Cash'} on ${new Date(receipt.createdOn).toLocaleDateString()}. We thank you for your prompt settlement and look forward to continuing our business relationship.`
                        ],
                        fontSize: 10,
                        margin: [30, 10, 30, 10],
                        lineHeight: 1.5
                    },

                 
                    {
                        columns: [
                            { text: `\nFor ${receipt.purchase_order_id.company_id.name} \n\nAuthorised Signature`, alignment: "right" }
                        ]
                    }
                ],
                footer: function(currentPage, pageCount) {
                    return {
                        columns: [
                            {
                                // text: `${receipt.purchase_order_id.company_id.address} | Website: ${receipt.purchase_order_id.company_id.website || '-'} | Email: ${receipt.purchase_order_id.company_id.email || '-'} | Phone: ${receipt.purchase_order_id.company_id.contact_number || '-'}`,
                                text: `D'Lume - ${new Date(receipt.createdOn).toLocaleDateString()}`,
                                alignment: 'left',
                                fontSize: 9
                            },
                            {
                                text: `Page ${currentPage} of ${pageCount}`,
                                alignment: 'right',
                                fontSize: 9
                            }
                        ],
                        margin: [40, 0]
                    };
                },
                defaultStyle: { fontSize: 10 }
            };


            const pdfDoc = printer.createPdfKitDocument(docDefinition);

            res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", `inline; filename=invoice_${order._id}.pdf`);
            pdfDoc.pipe(res);
            pdfDoc.end();

            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }        
    },
}

module.exports =  purchaseOrderControler;