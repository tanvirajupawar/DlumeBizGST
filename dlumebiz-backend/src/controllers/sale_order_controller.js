const productModel = require("../models/product_model");
const StockManagementModel = require("../models/stock_management_model");
const SaleDetail = require("../models/sale_detail_model");
const SaleOrderModel = require("../models/sale_order_model");
const SaleReceipt = require("../models/sale_receipt_model");
const PdfPrinter = require("pdfmake");
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const axios = require('axios');
const path = require("path");
const numberToWords = require("number-to-words"); 


const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/static/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../fonts/static/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../fonts/static/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../fonts/static/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);



const saleOrderControler = {



// ✅ CREATE SALE ORDER
create: async function (req, res) {
  try {

    const data = req.body;
    const details = data.details || [];



    // ✅ CREATE ORDER
    const order = new SaleOrderModel(data);

    // ✅ INITIAL PAID AMOUNT
    order.paid_amount = Number(
      order.advance_amount || 0
    );

    // ✅ SAVE ORDER
    await order.save();

    // ✅ SAVE DETAILS + UPDATE STOCK
    if (details.length > 0) {

    const detailDocs = await SaleDetail.insertMany(
  details.map((d) => ({
    ...d,
    sales_order_id: order._id,
    company_id: order.company_id,  
  }))
);

      for (const d of detailDocs) {

        const qty = Number(d.qty || 0);

        // ✅ STOCK MANAGEMENT
    if (
  !d.product_id ||
  !mongoose.Types.ObjectId.isValid(d.product_id)
) {
  continue;
}

let stock = await StockManagementModel.findOne({
  product_id: d.product_id,
          company_id: order.company_id,
        });

        if (stock) {

          stock.out =
            Number(stock.out || 0) + qty;

          stock.total_stock = Math.max(
            0,
            Number(stock.total_stock || 0) - qty
          );

          await stock.save();

        } else {

          await StockManagementModel.create({
            product_id: d.product_id,
            company_id: order.company_id,
            in: 0,
            out: qty,
            total_stock: 0,
          });
        }

        // ✅ PRODUCT UPDATE
     let product = null;

if (
  d.product_id &&
  mongoose.Types.ObjectId.isValid(d.product_id)
) {
  product =
    await productModel.findById(d.product_id);
}

        if (product) {

          product.qty = Math.max(
            0,
            Number(product.qty || 0) - qty
          );

          product.stock_out =
            Number(product.stock_out || 0) + qty;

          product.total = product.qty;

          await product.save();
        }
      }
    }

    // ✅ FETCH COMPLETE INVOICE
    const invoice =
      await SaleOrderModel.findById(order._id)

        .populate({
          path: "company_id",
        })

        .populate({
          path: "client_id",
        })

        .populate({
          path: "details",
          populate: [
            {
              path: "product_id",
            },
          ],
        });

    return res.json({
      success: true,
      data: invoice,
      message: "Sale Order Created Successfully",
    });

  } catch (error) {

    console.error("CREATE SALE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error,
    });
  }
},


fetch: async function (req, res) {
  try {

    const { client_id } = req.query;

    let filter = {};

    if (
      client_id &&
      mongoose.Types.ObjectId.isValid(client_id)
    ) {
      filter.client_id =
        new mongoose.Types.ObjectId(client_id);
    }

    console.log("FILTER:", filter);

    const orders = await SaleOrderModel.find(filter)

      // ✅ CUSTOMER DETAILS
      .populate({
        path: "client_id",

        select: `
          first_name
          last_name
          company_name
          gstin
          phone
          email
          address
          city
          state
          pincode
        `
      })

      // ✅ ITEMS DETAILS
      .populate({
        path: "details",

        select: `
          product_name
          hsn
          qty
          price
          gst
          amount
          unit
        `
      })

      .sort({ createdOn: -1 })

      .lean();

    // ✅ FORMAT DATE/TIME
    const formatted = orders.map((o) => {

      const invoiceDate = o.invoice_date
        ? new Date(o.invoice_date)
        : null;

      return {

        ...o,

        invoice_date_formatted: invoiceDate
          ? invoiceDate.toLocaleDateString("en-GB")
          : "",

        invoice_time_formatted: invoiceDate
          ? invoiceDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      };
    });

    return res.json({
      success: true,
      data: formatted
    });

  } catch (error) {

    console.error("FETCH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
},

  


   

    fetchOrder: async function (req, res) {
        try {
            const id = req.params.id;
            const order = await SaleOrderModel.findById(id).populate({
                                                                path: 'client_id',
                                                            })
                                                            .populate({
                                                                path: 'details',
                                                                populate: [
                                                                    {path: 'product_id'},
                                                                ],
                                                            });

            return res.json({ success: true, data:order});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    fetchByCompany: async function (req, res) {
        try {
            const id = req.params.id;
            const orders = await SaleOrderModel.find({company_id: id}).sort({ createdOn: -1 })
                                                            .populate({
                                                                path: 'client_id',
                                                            })
                                                            .populate({
                                                                path: 'details',
                                                                populate: [
                                                                    {path: 'product_id'},
                                                                ],
                                                            });
            const ObjectId = require('mongoose').Types.ObjectId;

            const totalBalance = await SaleOrderModel.aggregate([
                {
                    $match: {
                    company_id: new ObjectId(id),
                    
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

            return res.json({ success: true, data:orders, total: data});  
            
        } catch (error) {
            console.log(error);
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

    // ✅ FIND ORDER FIRST
    const order =
      await SaleOrderModel.findById(id);

    // ✅ NOT FOUND
    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Sale Order not found",
      });
    }

    // ✅ BLOCK DELETE IF PAYMENT EXISTS
    if (Number(order.paid_amount || 0) > 0) {

      return res.status(400).json({
        success: false,
        message:
          "Cannot delete paid or partially paid invoice",
      });
    }

    // ✅ FETCH DETAILS BEFORE DELETE
    const details =
      await SaleDetail.find({
        sales_order_id: id,
      });

    // ✅ REVERSE STOCK
    for (const d of details) {

      const qty = Number(d.qty || 0);

      // ✅ STOCK MANAGEMENT
      const stock =
        await StockManagementModel.findOne({
          product_id: d.product_id,
          company_id: order.company_id,
        });

      if (stock) {

        stock.out = Math.max(
          0,
          Number(stock.out || 0) - qty
        );

        stock.total_stock =
          Number(stock.total_stock || 0) + qty;

        await stock.save();
      }

      // ✅ PRODUCT UPDATE
      const product =
        await productModel.findById(d.product_id);

      if (product) {

        product.qty =
          Number(product.qty || 0) + qty;

        product.stock_out = Math.max(
          0,
          Number(product.stock_out || 0) - qty
        );

        product.total = product.qty;

        await product.save();
      }
    }

    // ✅ DELETE DETAILS
    await SaleDetail.deleteMany({
      sales_order_id: id,
    });

    // ✅ DELETE ORDER
    await SaleOrderModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Sale Order deleted successfully",
    });

  } catch (error) {

    console.error(
      "DELETE SALE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error,
    });
  }
},
// ✅ UPDATE SALE ORDER
update: async function (req, res) {

  try {

    const id = req.params.id;

    const updateData = req.body;

    const details = updateData.details || [];

    // ❌ NEVER RESET PAID AMOUNT / STATUS HERE
    // Payment flow handles that separately

    // ✅ GET OLD ORDER
    const existingOrder =
      await SaleOrderModel.findById(id);

    if (!existingOrder) {

      return res.status(404).json({
        success: false,
        message: "Sale Order not found",
      });
    }

    // ✅ KEEP EXISTING PAYMENT DATA
    updateData.paid_amount =
      existingOrder.paid_amount || 0;

    updateData.advance_amount =
      existingOrder.advance_amount || 0;

    // ✅ UPDATE ORDER
    const updatedOrder =
      await SaleOrderModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    // ✅ REVERSE OLD STOCK
    const oldDetails =
      await SaleDetail.find({
        sales_order_id: id,
      });

    for (const d of oldDetails) {

      const qty = Number(d.qty || 0);

      // ✅ STOCK MANAGEMENT
      const stock =
        await StockManagementModel.findOne({
          product_id: d.product_id,
          company_id: updatedOrder.company_id,
        });

      if (stock) {

        stock.out = Math.max(
          0,
          Number(stock.out || 0) - qty
        );

        stock.total_stock =
          Number(stock.total_stock || 0) + qty;

        await stock.save();
      }

      // ✅ PRODUCT UPDATE
  let product = null;

if (
  d.product_id &&
  mongoose.Types.ObjectId.isValid(d.product_id)
) {
  product =
    await productModel.findById(d.product_id);
}

      if (product) {

        product.qty =
          Number(product.qty || 0) + qty;

        product.stock_out = Math.max(
          0,
          Number(product.stock_out || 0) - qty
        );

        product.total = product.qty;

        await product.save();
      }
    }

    // ✅ DELETE OLD DETAILS
    await SaleDetail.deleteMany({
      sales_order_id: id,
    });

    // ✅ ADD NEW DETAILS
    if (details.length > 0) {

const detailDocs = await SaleDetail.insertMany(
  details.map((d) => ({
    ...d,
    sales_order_id: updatedOrder._id,
    company_id: updatedOrder.company_id,  
  }))
);

      for (const d of detailDocs) {

        const qty = Number(d.qty || 0);

        // ✅ STOCK
    // ✅ STOCK
if (
  !d.product_id ||
  !mongoose.Types.ObjectId.isValid(d.product_id)
) {
  continue;
}

let stock =
  await StockManagementModel.findOne({
    product_id: d.product_id,
    company_id: updatedOrder.company_id,
  });

        if (stock) {

          stock.out =
            Number(stock.out || 0) + qty;

          stock.total_stock = Math.max(
            0,
            Number(stock.total_stock || 0) - qty
          );

          await stock.save();

        } else {

          await StockManagementModel.create({
            product_id: d.product_id,
            company_id: updatedOrder.company_id,
            in: 0,
            out: qty,
            total_stock: 0,
          });
        }

  // ✅ PRODUCT
let product = null;

if (
  d.product_id &&
  mongoose.Types.ObjectId.isValid(d.product_id)
) {
  product =
    await productModel.findById(d.product_id);
}

        if (product) {

          product.qty = Math.max(
            0,
            Number(product.qty || 0) - qty
          );

          product.stock_out =
            Number(product.stock_out || 0) + qty;

          product.total = product.qty;

          await product.save();
        }
      }
    }

    // ✅ FINAL UPDATED ORDER
    const finalOrder =
      await SaleOrderModel.findById(id)

        .populate({
          path: "company_id",
        })

        .populate({
          path: "client_id",
        })

        .populate({
          path: "details",
          populate: [
            {
              path: "product_id",
            },
          ],
        });

    return res.json({
      success: true,
      data: finalOrder,
      message: "Sale Order Updated Successfully",
    });

  } catch (error) {

    console.error("UPDATE SALE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error,
    });
  }
},


payments: async function (req, res) {

  try {

    const {
      client_id,
      amount,
      payment_method,
      remarks,
      date,
      allocations,
      card_no,
      ifsc,
      cheque_no,
      transaction_no,
      bank_name,
      branch,
    } = req.body;

    // ✅ VALIDATION
    if (!allocations || allocations.length === 0) {

      return res.status(400).json({
        success: false,
        message: "No invoice allocations provided",
      });
    }

    // ✅ RECEIPT ARRAY
    const receipts = [];

    // ✅ PROCESS EACH INVOICE
    for (const alloc of allocations) {

      const {
        id,
        paid_amount,
      } = alloc;

      // ✅ SKIP INVALID
      if (Number(paid_amount || 0) <= 0) {
        continue;
      }

      // ✅ FIND ORDER
      const order =
        await SaleOrderModel.findById(id);

      if (!order) {
        continue;
      }

      // ✅ UPDATE PAID AMOUNT
 const remaining =
  Number(order.total_amount || 0) -
  Number(order.paid_amount || 0);

const paymentToApply = Math.min(
  Number(paid_amount || 0),
  remaining
);

order.paid_amount =
  Number(order.paid_amount || 0) +
  paymentToApply;

      // ✅ SAVE ORDER
      // Model automatically handles:
      // status
      // balance_amount
      await order.save();

      // ✅ CREATE RECEIPT
      const receipt =
        await SaleReceipt.create({

          sale_order_id: order._id,

          client_id,

          invoice_no:
            order.invoice_no || "",

amount: paymentToApply,
          payment_method:
            payment_method || "Cash",

          remarks:
            remarks || "",

          transaction_no:
            transaction_no || "",

          card_no:
            card_no || "",

          bank_name:
            bank_name || "",

          branch:
            branch || "",

          ifsc:
            ifsc || "",

          cheque_no:
            cheque_no || "",

          date:
            date || new Date(),
        });

      receipts.push(receipt);
    }

    return res.json({
      success: true,
      data: receipts,
      message:
        "Payment done successfully across invoices",
    });

  } catch (error) {

    console.error(
      "PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error,
    });
  }
},
     try: async function (req, res) {


        try {
            const response = await axios.post("https://backend.chatmitra.com/developer/api/send_message", {
                    recipient_mobile_number: "919004918837",
                    messages: [{
                        kind: "template",
                        template: {
                        name: "payment_done_20260206193314",
                        language: "en",
                        components: [
                            {
                                type: "body",
                                parameters: [
                                { type: "text", text: 'vinod' },
                                { type: "text", text: '2000' },
                                { type: "text", text: 'I-00022' },
                                ],
                            },
                            ],
                        }
                    }],
                    customer_name: "vinod"
                    }, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer d3c292c1740c10bfb7e9267cc5c5b82b:b90ba44b163b323897011411a01022d20f717a0a0c1643cbb65ba13fbe74d84158a40fcd84023011a6c1a581615c278fb748d2ed794184cf4e31332c854f39657d22e34688b44070f7e9ba9ab61d33822963ec9a78744fa6a52fb7b80136a8ec7e2a3474d93f3dec70ed77964cd723b07a6d183996b6c56c6c96ef463bc4c608edf14c3721733b99afe7637fe6e24f9939d6329cc5ebec91ee19fdb33d2eb8b7801bec3782a9510ef9b06152253d811d27ed2f29bd765413101e8ee68d33f437"
                    }
            });
            console.log(response.data);

            
        } catch (error) {
           console.log(error.response?.data || error.message);
            
        }

           
    },

  

    updateStatus: async function (req, res) {
        try {
            const { status, id } = req.body;

            const order = await SaleOrderModel.findById(id);
            if (order){
if (
  ["Paid", "Partial", "Unpaid"].includes(status)
) {
  return res.status(400).json({
    success: false,
    message:
      "Payment status cannot be updated manually",
  });
}

order.status = status;
                await order.save();
            }  


            return res.json({
            success: true,
            data: order,
            message: "Status is Updated ",
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message || error,
            });
        }
    },

 receipts: async function (req, res) {

  try {

    const company_id = req.params.id;

    // ✅ FETCH RECEIPTS
    const receipts =
      await SaleReceipt.find()

        .sort({ createdOn: -1 })

        .populate({
          path: "client_id",

          select: `
            first_name
            last_name
            company_name
            company_id
            contact_no_1
            email
          `,
        })

        .populate({
          path: "sale_order_id",

          select: `
            invoice_no
            total_amount
            paid_amount
            balance_amount
            status
          `,
        })

        .lean();

    // ✅ FILTER COMPANY
    const filtered = receipts.filter(

      (r) =>

        r.client_id &&

        r.client_id.company_id?.toString() ===
        company_id.toString()
    );

    // ✅ FORMAT RESPONSE
    const formatted = filtered.map((r) => ({

      ...r,

      customer_name:
        r.client_id?.company_name ||

        `${r.client_id?.first_name || ""}
         ${r.client_id?.last_name || ""}`.trim(),

      invoice_no:
        r.invoice_no ||
        r.sale_order_id?.invoice_no ||
        "",

      invoice_status:
        r.sale_order_id?.status || "",

      total_amount:
        r.sale_order_id?.total_amount || 0,

      paid_amount:
        r.sale_order_id?.paid_amount || 0,

      pending_amount:
        r.sale_order_id?.balance_amount || 0,
    }));

    return res.status(200).json({

      success: true,

      receipts: formatted,
    });

  } catch (error) {

    console.error(
      "RECEIPTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message || error,
    });
  }
},

    printInvoice: async function (req, res) {
        try {
            const id = req.params.id;
            const invoice = await SaleOrderModel.findById(id).populate({
                                                                path: 'company_id',
                                                            })
                                                            .populate({
                                                                path: 'client_id',
                                                            })
                                                            .populate({
                                                                path: 'details',
                                                                populate: [
                                                                    {path: 'product_id'},
                                                                ],
                                                            });


            const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount);
                 


            const companyDetails = [    
                { text: `${invoice.company_id.name}`, fontSize: 20, bold: true, style: "header"  },
                { text: "\n" },
            ];

            // Always add main address if available
            if (invoice.company_id.address) {
                companyDetails.push({ text: invoice.company_id.address , style: "subheader"  });
            }

            // Conditionally add area, city, state, country, pincode
            const company = invoice.company_id;

            if (company.area) companyDetails.push({ text: `Area: ${company.area}` });
            if (company.city) companyDetails.push({ text: `City: ${company.city}` });
            if (company.state) companyDetails.push({ text: `State: ${company.state}` });
            if (company.country) companyDetails.push({ text: `Country: ${company.country}` });
            if (company.pincode) companyDetails.push({ text: `Pincode: ${company.pincode}` });

            // Contact and email
            if (company.contact_no_1) companyDetails.push({ text: `Contact: ${company.contact_no_1}` });
            if (company.email) companyDetails.push({ text: `Email: ${company.email}` });

            const vendor = invoice.client_id;

            const clientDetails = [
                { text: `${vendor.first_name} ${vendor.last_name}`, bold: true },
            ];

            // Address
            if (vendor.address) clientDetails.push({ text: vendor.address_line_1 });
            if (vendor.area) clientDetails.push({ text: `Area: ${vendor.address_line_2}` });
            if (vendor.city) clientDetails.push({ text: `City: ${vendor.city}` });
            if (vendor.state) clientDetails.push({ text: `State: ${vendor.state}` });
            if (vendor.country) clientDetails.push({ text: `Country: ${vendor.country}` });
            if (vendor.pincode) clientDetails.push({ text: `Pincode: ${vendor.pincode}` });

            // Contact info
            if (vendor.contact_no_1) clientDetails.push({ text: `Contact: ${vendor.contact_no_1}` });
            if (vendor.email) clientDetails.push({ text: `Email: ${vendor.email}` });


            const paymentFields = [];

            if (invoice.payment_method === "Card") {
                paymentFields.push(
                    { text: `Card Number: ${invoice.card_number || '-'}` },
                    { text: `Transaction ID: ${invoice.transaction_id || '-'}` }
                );
            }

            if (invoice.payment_method === "Bank Transfer") {
                paymentFields.push(
                    { text: `Bank Name: ${invoice.bank_name || '-'}` },
                    { text: `Branch: ${invoice.branch || '-'}` },
                    { text: `IFSC Code: ${invoice.ifsc_code || '-'}` },
                    { text: `Transaction ID / UTR: ${invoice.transaction_id || '-'}` }
                );
            }

            if (invoice.payment_method === "Cheque") {
                paymentFields.push(
                    { text: `Cheque No: ${invoice.cheque_no || '-'}` },
                    { text: `Bank Name: ${invoice.bank_name || '-'}` },
                    { text: `Branch: ${invoice.branch || '-'}` },
                    { text: `IFSC Code: ${invoice.ifsc_code || '-'}` }
                );
                
            }

            if (invoice.payment_method === "Cash") {
                paymentFields.push(
                    { text: `Cash` },
                );
                
            }

              const tableBody = [
                    [
                    { text: "SR", bold: true , style: 'bg'},
                    { text: "NAME OF PRODUCT / SERVICES", bold: true , style: 'bg'},
                    { text: "HSN / SAC", bold: true , style: 'bg'},
                    { text: "TYPE ", bold: true , style: 'bg'},
                    { text: "DESCRIPTION ", bold: true , style: 'bg'},
                    { text: "SIZE ", bold: true , style: 'bg'},
                    { text: "QTY", bold: true , style: 'bg'},
                    { text: "RATE", bold: true , style: 'bg'},
                    { text: "AMOUNT", bold: true , style: 'bg'},
                    ],
                ];

                let totalAmount = 0;

                invoice.details.forEach((item, index) => {
                    const product = item.product_id || {};
                    const amount = item.amount || (item.qty * item.price);
                    totalAmount += amount;

                    tableBody.push([
                    index + 1,
                    product.product.toUpperCase() || "-",
                    product.hsn || "-",
                    product.type || "",
                    item.description || " ",
                    product.size || "",
                    item.qty || "0",
                    formatINR(item.price) || "0.00",
                    formatINR(amount),
                    ]);
                });
            
            
            const amountWords = "RUPEES " +
            numberToWords.toWords(invoice.total_amount).replace(/(^\w|\s\w)/g, m => m.toUpperCase()) +
            " Only";


            const contents = [];

            // Add letterhead only if the URL exists
            if (invoice.company_id.letter_head && invoice.company_id.letter_head.trim() !== '') {
                 const response = await axios.get(invoice.company_id.letter_head, { responseType: 'arraybuffer' });
                const tempPath = path.join(__dirname, 'temp_letterhead.png');
                fs.writeFileSync(tempPath, response.data);
                contents.push({
                    image: tempPath,
                    fit: [595 - 40 - 40, 150], 
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                });
            } else {
                   contents.push({ text: [
                    { text: `${company.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1'  },
                    `${company.address.toUpperCase()} `,
                    `${company.area.toUpperCase()} `,
                    `${company.city.toUpperCase()} - ${company.pincode}`,
                  

                    `GSTIN: ${company.gst} - `,
                    "STATE CODE: 27 - ",
                    `PAN: ${company.pan}\n`,

                    `EMAIL: ${company.email.toUpperCase()}, `,
                    ` MOBILE: +91 ${company.mobile}\n`,
                ],
                alignment: 'center',
                margin: [0, 0, 0, 10],});
            }



           
            const docDefinition = {
                content: [
                     contents,                  
                
                
                    {
                        table: {
                            widths: ["*"],
                            body: [      
                            [
                                { 
                                text: "TAX INVOICE", 
                                bold: true, 
                                fontSize: 16, 
                                alignment: "center", 
                                },                             
                            ],
                            ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                        },

                    {
                        table: {
                            widths: ["*", "*"], // two columns: To / From
                            body: [
                            [
                                // Left Column: To (vendor)
                                {
                                text: [
                                    { text: "TO,\n", bold: true },
                                    {
                                        text: invoice.client_id.company_name && invoice.client_id.company_name.trim() !== ""
                                            ? `${invoice.client_id.company_name.toUpperCase()}\n`
                                            : `${invoice.client_id.first_name.toUpperCase()} ${invoice.client_id.last_name.toUpperCase()}\n`,
                                        bold: true,
                                    },
                                    `${invoice.client_id.address_line_1.toUpperCase()} `,
                                    `${invoice.client_id.address_line_2.toUpperCase()} `,
                                    `${invoice.client_id.state.toUpperCase()} `,
                                    `${invoice.client_id.city.toUpperCase()} - ${invoice.client_id.pincode.toUpperCase()}\n`,
                                

                                    { text: "GST & Other Details\n", bold: true },
                                    `GSTIN: ${invoice.client_id.gst}\n`,
                                    `PAN: ${invoice.client_id.pan}\n`,

                                    `EMAIL: ${invoice.client_id.email.toUpperCase()}, MOBILE: ${invoice.client_id.contact_no_1}\n`,
                                ],
                                },

                                // Right Column: From (Your Company)
                                {
                                text: [
                                    { text: "FROM,\n", bold: true },
                                    { text: `${company.name}\n`, bold: true },
                                    `${company.address} `,
                                    `${company.area} `,
                                    `${company.city} - ${company.pincode}`,

                                    { text: "INVOICE DETAILS\n", bold: true },
                                    `INVOICE NO: ${invoice.invoice_no}\n`, 
                                    {
                                        text: `INVOICE DATE: ${
                                            invoice.order_date
                                            ? new Date(invoice.order_date)
                                                .toISOString()
                                                .split("T")[0]       // yyyy-mm-dd
                                                .split("-")          // ["yyyy","mm","dd"]
                                                .reverse()           // ["dd","mm","yyyy"]
                                                .join("/")           // dd/mm/yyyy
                                            : ""
                                        }\n`,
                                    },


                                    { text: "GST & OTHER DETAILS\n", bold: true },
                                    `GSTIN: ${company.gst}\n`,
                                    "STATE CODE: 27\n",
                                    `PAN: ${company.pan}\n`,

                                    `Email: ${company.email.toUpperCase()}, `,
                                    ` Mobile: +91 ${company.mobile}\n`,
                                ],
                                },
                            ],
                            ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                        },
                    {
                        table: {
                        headerRows: 1,
                        widths: ["auto", "*", "auto","auto",  "auto","auto", "auto", "auto", "auto"],
                        body: tableBody,
                        },
                         layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },
                     {
                        table: {
                        widths: ["*", "*", 100, 100],
                        body: [
                            [
                                  {
                                    text: `AMOUNT IN WORDS :${amountWords.toUpperCase()}`,
                                    bold: true,
                                    colSpan: 2,
                                    alignment: "left",
                                    style: "bg",
                                     margin: [5, 2, 2, 2],
                                    border: [true, false, false, false],
                                },  
                                {},                               
                                { text: "SUB TOTAL", alignment: "right", bold: true , style: 'bg'},
                                { text: formatINR(invoice.amount), alignment: "right" , style: 'bg'},
                            ],
                            [
                                {
                                    text: `BANK DETAILS`,
                                    bold: true,
                                    colSpan: 2,
                                    alignment: "left",
                                    style: "bg",
                                },
                                {},
                                { text: "DISCOUNT", alignment: "right", bold: true , style: 'bg'},
                                { text: `- ${formatINR(invoice.discount)}`, alignment: "right" , style: 'bg'},
                            ],
                             [
                                {text: "BANK PAYEE NAME :" , style: 'bg'},
                                {text: `${company.bank_holder_name.toUpperCase()}` , style: 'bg'},
                                { text: `CGST (9%)`, alignment: "right", bold: true , style: 'bg'},
                                { text: formatINR(invoice.cgst), alignment: "right", style: 'bg' },
                            ],
                             [
                                {text: "BANK A/C NO :" , style: 'bg'},
                                {text: `${company.account_no}` , style: 'bg'},                               
                                { text: `SGST (9%)`, alignment: "right", bold: true , style: 'bg'},
                                { text: formatINR(invoice.sgst), alignment: "right" , style: 'bg'},
                            ],
                            [
                                {text: "BANK NAME & BRANCH :" , style: 'bg'}, 
                                {text: `${company.bank.toUpperCase()}, ${company.branch.toUpperCase()}` , style: 'bg'},
                                { text: `IGST (18%)`, alignment: "right", bold: true , style: 'bg'},
                                { text: formatINR(invoice.igst), alignment: "right" , style: 'bg'},
                            ],
                            [
                                {text: "BANK IFSC :" , style: 'bg'}, 
                                {text: `${company.ifsc}` , style: 'bg'},                               
                                { text: "NET AMOUNT", alignment: "right", bold: true , style: 'bg'},
                                { text: formatINR(invoice.total_amount), alignment: "right" , style: 'bg'},
                            ],

                            
                           
                        ],
                        },
                         layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },                   

                    

                    {
                        table: {
                        widths: ["*"],
                        body: [
                            [
                            {
                                text: [
                                { text: "TERMS & CONDITIONS\n", bold: true },
                                `1. Payment should be made account payee cheque in favour of \"${company.name}\"\n`,
                                "2. Payment should be made within 7 days.\n",
                                ],
                            },
                            ],
                        ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },

                    // Signature Table
                    {
                        table: {
                        widths: ["*"],
                        body: [
                            [
                            {
                                text: [
                                {text: "\n THANKING YOU,\nSIGN:\n\n\n\n"},
                                { text: `SIGNED BY : ${company.owner_name.toUpperCase()}\n${company.name.toUpperCase()}`, bold: true },
                                ],
                            },
                            ],
                        ],
                        },
                        layout: "noBorders",
                        margin: [0, 0, 0, 10],
                    },                  
                   
                   
                ],
                footer: function(currentPage, pageCount) {
                    return {
                        columns: [
                            {
                                // text: `${invoice.company_id.address} | Website: ${invoice.company_id.website || '-'} | Email: ${invoice.company_id.email || '-'} | Phone: ${invoice.company_id.contact_number || '-'}`,
                                text: `D'Lume - ${new Date().toLocaleDateString("en-IN")}`,
                                alignment: 'left',
                                fontSize: 9
                            },
                            {
                                text: `PAGE ${currentPage} of ${pageCount}`,
                                alignment: 'right',
                                fontSize: 9
                            }
                        ],
                        margin: [40, 0]
                    };
                },
                defaultStyle: { fontSize: 10 },
                 styles: {
                    bg: {
                        fillColor: '#e0e0e0', // same gray
                        margin: [5, 2, 0, 2]
                    },
                    header: { fontSize: 16, bold: true },
                    subheader: { fontSize: 10 },
                    sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
                    tableHeader: { bold: true, fillColor: "#E5E5E5" },
                },
            };


            const pdfDoc = printer.createPdfKitDocument(docDefinition);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=invoice_${invoice._id}.pdf`);

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

       
    

    


    printNormalInvoice: async function (req, res) {
        try {
            const id = req.params.id;

            // Validate and convert to ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID" });
            }
            const invoice = await SaleOrderModel.findById(id).populate({
                                                                path: 'company_id',
                                                            })
                                                            .populate({
                                                                path: 'client_id',
                                                            })
                                                            .populate({
                                                                path: 'details',
                                                                populate: [
                                                                    {path: 'product_id'},
                                                                ],
                                                            });
                 


            const companyDetails = [    
                { text: `${invoice.company_id.name}`, fontSize: 20, bold: true, style: "header"  },
                { text: "\n" },
            ];

            const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount);

            // Always add main address if available
            if (invoice.company_id.address) {
                companyDetails.push({ text: invoice.company_id.address , style: "subheader"  });
            }

            // Conditionally add area, city, state, country, pincode
            const company = invoice.company_id;

            if (company.area) companyDetails.push({ text: `Area: ${company.area}` });
            if (company.city) companyDetails.push({ text: `City: ${company.city}` });
            if (company.state) companyDetails.push({ text: `State: ${company.state}` });
            if (company.country) companyDetails.push({ text: `Country: ${company.country}` });
            if (company.pincode) companyDetails.push({ text: `Pincode: ${company.pincode}` });

            // Contact and email
            if (company.contact_no_1) companyDetails.push({ text: `Contact: ${company.contact_no_1}` });
            if (company.email) companyDetails.push({ text: `Email: ${company.email}` });

            const vendor = invoice.client_id;

            const clientDetails = [
                { text: `${vendor.first_name} ${vendor.last_name}`, bold: true },
            ];

            // Address
            if (vendor.address) clientDetails.push({ text: vendor.address_line_1 });
            if (vendor.area) clientDetails.push({ text: `Area: ${vendor.address_line_2}` });
            if (vendor.city) clientDetails.push({ text: `City: ${vendor.city}` });
            if (vendor.state) clientDetails.push({ text: `State: ${vendor.state}` });
            if (vendor.country) clientDetails.push({ text: `Country: ${vendor.country}` });
            if (vendor.pincode) clientDetails.push({ text: `Pincode: ${vendor.pincode}` });

            // Contact info
            if (vendor.contact_no_1) clientDetails.push({ text: `Contact: ${vendor.contact_no_1}` });
            if (vendor.email) clientDetails.push({ text: `Email: ${vendor.email}` });


            const paymentFields = [];

            if (invoice.payment_method === "Card") {
                paymentFields.push(
                    { text: `Card Number: ${invoice.card_number || '-'}` },
                    { text: `Transaction ID: ${invoice.transaction_id || '-'}` }
                );
            }

            if (invoice.payment_method === "Bank Transfer") {
                paymentFields.push(
                    { text: `Bank Name: ${invoice.bank_name || '-'}` },
                    { text: `Branch: ${invoice.branch || '-'}` },
                    { text: `IFSC Code: ${invoice.ifsc_code || '-'}` },
                    { text: `Transaction ID / UTR: ${invoice.transaction_id || '-'}` }
                );
            }

            if (invoice.payment_method === "Cheque") {
                paymentFields.push(
                    { text: `Cheque No: ${invoice.cheque_no || '-'}` },
                    { text: `Bank Name: ${invoice.bank_name || '-'}` },
                    { text: `Branch: ${invoice.branch || '-'}` },
                    { text: `IFSC Code: ${invoice.ifsc_code || '-'}` }
                );
                
            }

            if (invoice.payment_method === "Cash") {
                paymentFields.push(
                    { text: `Cash` },
                );
                
            }

              const tableBody = [
                    [
                    { text: "SR", bold: true , style: 'bg'},
                    { text: "NAME OF PRODUCT / SERVEICES", bold: true , style: 'bg'},
                    { text: "Type", bold: true , style: 'bg'},
                    { text: "Description", bold: true , style: 'bg'},
                    { text: "SIZE / PACK", bold: true , style: 'bg'},
                    { text: "QTY", bold: true , style: 'bg'},
                    { text: "RATE", bold: true , style: 'bg'},
                    { text: "AMOUNT", bold: true , style: 'bg'},
                    ],
                ];

                let totalAmount = 0;

                invoice.details.forEach((item, index) => {
                    const product = item.product_id || {};
                    const amount = item.amount || (item.qty * item.price);
                    totalAmount += amount;

                    tableBody.push([
                    index + 1,
                    product.product || "-",                    
                    product.type || " ",
                    item.description || " ",
                    product.size || "-",
                    item.qty || "-",
                    formatINR(item.price) || "0.00",
                    formatINR(amount),
                    ]);
                });
            
            
            const amountWords = "Rupees " +
            numberToWords.toWords(invoice.total_amount).replace(/(^\w|\s\w)/g, m => m.toUpperCase()) +
            " Only";

            


             const contents = [];

            // Add letterhead only if the URL exists
            if (invoice.company_id.letter_head && invoice.company_id.letter_head.trim() !== '') {
                 const response = await axios.get(invoice.company_id.letter_head, { responseType: 'arraybuffer' });
                const tempPath = path.join(__dirname, 'temp_letterhead.png');
                fs.writeFileSync(tempPath, response.data);
                contents.push({
                    image: tempPath,
                    fit: [595 - 40 - 40, 150], 
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                });


            } else {
                contents.push({ text: [
                    { text: `${company.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1'  },
                    `${company.address.toUpperCase()} `,
                    `${company.area.toUpperCase()} `,
                    `${company.city.toUpperCase()} - ${company.pincode}`,
                  

                    `GSTIN: ${company.gst} - `,
                    "STATE CODE: 27 - ",
                    `PAN: ${company.pan}\n`,

                    `EMAIL: ${company.email.toUpperCase()}, `,
                    ` MOBILE: +91 ${company.mobile}\n`,
                ],
                alignment: 'center',
                margin: [0, 0, 0, 10],});

            }
                console.log(contents);






            const docDefinition = {
                content: [
                    contents,
                  
                    
                     { 
                        text: "INVOICE", 
                        bold: true, 
                        fontSize: 16, 
                        alignment: "center", 
                         bold: true,
                        margin: [0, 0, 0, 10] 
                    },   
                
                
                   

                    {
                        table: {
                            widths: ["*", "*"], // two columns: To / From
                            body: [
                            [
                                // Left Column: To (vendor)
                                {
                                text: [
                                    { text: "TO,\n", bold: true },
                                    {
                                        text: invoice.client_id.company_name && invoice.client_id.company_name.trim() !== ""
                                            ? `${invoice.client_id.company_name.toUpperCase()}\n`
                                            : `${invoice.client_id.first_name.toUpperCase()} ${invoice.client_id.last_name.toUpperCase()}\n`,
                                        bold: true,
                                    },
                                    `${invoice.client_id.address_line_1.toUpperCase()}\n`,
                                    `${invoice.client_id.address_line_2.toUpperCase()}\n`,
                                    `${invoice.client_id.state.toUpperCase()}\n`,
                                    `${invoice.client_id.city.toUpperCase()} - ${invoice.client_id.pincode.toUpperCase()}\n\n`,
                                

                                    `EMAIL: ${invoice.client_id.email.toUpperCase()}\n`,
                                    `MOBILE: ${invoice.client_id.contact_no_1}\n`,
                                ],
                                },

                                // Right Column: From (Your Company)
                                {
                                text: [
                                    { text: "FROM,\n", bold: true },
                                    { text: `${company.name.toUpperCase()}\n`, bold: true },
                                    `${company.address.toUpperCase()}\n`,
                                    `${company.area.toUpperCase()}\n`,
                                    `${company.city.toUpperCase()} - ${company.pincode}`,

                                    { text: "INVOICE DETAILS\n", bold: true },
                                    `INVOICE NO: ${invoice.invoice_no}\n`,
                                    {
                                        text: `INVOICE DATE: ${
                                            invoice.order_date
                                            ? new Date(invoice.order_date)
                                                .toISOString()
                                                .split("T")[0]       // yyyy-mm-dd
                                                .split("-")          // ["yyyy","mm","dd"]
                                                .reverse()           // ["dd","mm","yyyy"]
                                                .join("/")           // dd/mm/yyyy
                                            : ""
                                        }\n`,
                                    },                              

                                    `EMAIL: ${company.email.toUpperCase()}\n`,
                                    `MOBILE: +91 ${company.mobile}\n`,
                                ],
                                },
                            ],
                            ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                        },
                    {
                        table: {
                        headerRows: 1,
                        widths: ["auto", "*", "auto", "auto", "auto",  "auto", "auto", "auto"],
                        body: tableBody,
                        },
                         layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },
                    {
                        table: {
                            widths: ["*", 100, 100],
                            body: [
                            [
                                {
                                    text: `AMOUNT IN WORDS:${amountWords.toUpperCase()}`,
                                    bold: true,
                                    colSpan: 1,
                                    rowSpan: 5, // spans 4 rows
                                    alignment: "left",
                                    style: "bg",
                                    margin: [5, 10, 5, 10],
                                    border: [true, false, false, false], // no border for this cell
                                },
                                { text: "SUB TOTAL", alignment: "right", bold: true, style: "bg" },
                                { text: formatINR(invoice.amount), alignment: "right", style: "bg" },
                            ],
                            [
                                {},
                                { text: "DISCOUNT", alignment: "right", bold: true, style: "bg" },
                                { text: `- ${formatINR(invoice.discount)}`, alignment: "right", style: "bg" },
                            ],
                            [
                                {},
                                { text: "ADVANCE", alignment: "right", bold: true, style: "bg" },
                                { text: `- ${formatINR(invoice.advance_amount)}`, alignment: "right", style: "bg" },
                            ],
                            [
                                {},
                                { text: "NET AMOUNT", alignment: "right", bold: true, style: "bg" },
                                { text: formatINR(invoice.total_amount), alignment: "right" , style: "bg"},
                            ],
                            
                             [
                               {},
                                { text: "DUE AMOUNT", alignment: "right", bold: true , style: 'bg'},
                                { text: formatINR(invoice.total_amount - invoice.advance_amount), alignment: "right" , style: 'bg'},
                            ], 
                            ],
                        },
                        layout: {
                        hLineWidth: function (i, node) {
                        return i === 0 || i === node.table.body.length ? 1 : 1;
                        },
                        vLineWidth: function (i, node) {
                        return 1; // remove left border for first column
                        },
                        hLineColor: function (i, node) {
                        return "black";
                        },
                        vLineColor: function (i, node) {
                        return "black";
                        },
                        paddingLeft: function (i, node) { return 5; },
                        paddingRight: function (i, node) { return 5; },
                        paddingTop: function (i, node) { return 3; },
                        paddingBottom: function (i, node) { return 3; },
                        },
                    },

                     {
                        table: {
                        widths: [ "*"],
                        body: [
                            [{ text: "BANK DETAILS", bold: true }],
                           
                        ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },

                     {
                        table: {
                        widths: ["30%", "*"],
                        body: [
                            [{text: "BANK PAYEE NAME :"}, {text: `${company.bank_holder_name.toUpperCase()}`}],
                            [{text: "BANK A/C NO :"}, {text: `${company.account_no}`}],
                            [{text: "BANK NAME & BRANCH :"}, {text: `${company.bank.toUpperCase()} - ${company.branch.toUpperCase()}`}],
                            [{text: "BANK IFSC :"}, {text: `${company.ifsc}`}],
                        ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },

                    // Terms & Conditions Table
                    {
                        table: {
                        widths: ["*"],
                        body: [
                            [
                            {
                                text: [
                                { text: "TERMS & CONDITIONS\n", bold: true },
                                `1. Payment should be made account payee cheque in favour of \"${company.name}\"\n`,
                                "2. Payment should be made within 7 days.\n",
                                ],
                            },
                            ],
                        ],
                        },
                        layout: {
                            hLineWidth: function (i, node) {
                                return 1; // horizontal line width
                            },
                            vLineWidth: function (i, node) {
                                return 1; // vertical line width
                            },
                            hLineColor: function (i, node) {
                                return "black"; // horizontal line color
                            },
                            vLineColor: function (i, node) {
                                return "black"; // vertical line color
                            },
                            paddingLeft: function (i, node) { return 5; },
                            paddingRight: function (i, node) { return 5; },
                            paddingTop: function (i, node) { return 3; },
                            paddingBottom: function (i, node) { return 3; },
                            }
                    },

                    // Signature Table
                    {
                        table: {
                        widths: ["*"],
                        body: [
                            [
                            {
                                text: [
                                {text: "\n\n THANKING YOU,\n YOURS FAITHFULLY \nSIGN:\n\n\n\n\n\n\n\n"},
                                { text: `SIGNED BY : ${company.owner_name.toUpperCase()}\n${company.name.toUpperCase()}`, bold: true },
                                ],
                            },
                            ],
                        ],
                        },
                        layout: "noBorders",
                        margin: [0, 0, 0, 10],
                    },                  
                   
                   
                ],
                footer: function(currentPage, pageCount) {
                    return {
                        columns: [
                            {
                                // text: `${invoice.company_id.address} | Website: ${invoice.company_id.website || '-'} | Email: ${invoice.company_id.email || '-'} | Phone: ${invoice.company_id.contact_number || '-'}`,
                                text: `D'Lume - ${new Date().toLocaleDateString("en-IN")}`,
                                alignment: 'left',
                                fontSize: 9
                            },
                            {
                                text: `PAGE ${currentPage} of ${pageCount}`,
                                alignment: 'right',
                                fontSize: 9
                            }
                        ],
                        margin: [40, 0]
                    };
                },
                defaultStyle: { fontSize: 10 },
                 styles: {
                     bg: {
                        fillColor: '#e0e0e0', // same gray
                        margin: [5, 2, 0, 2]
                    },
                    header: { fontSize: 16, bold: true },
                    subheader: { fontSize: 10 },
                    sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
                    tableHeader: { bold: true, fillColor: "#E5E5E5" },
                },
            };


            const pdfDoc = printer.createPdfKitDocument(docDefinition);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=invoice_${invoice._id}.pdf`);

            pdfDoc.pipe(res);
            pdfDoc.end();
            
        } catch (error) {
            console.log(error);
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
            const receipt = await SaleReceipt.findById(id).populate({
                    path: 'client_id',
                    populate: [
                    { path: 'company_id' },  
                    ]
                });


                 const contents = [];
                 const company = receipt.client_id.company_id;

            const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount);

            // Add letterhead only if the URL exists
            if (receipt.client_id.company_id.letter_head && receipt.client_id.company_id.letter_head.trim() !== '') {
                 const response = await axios.get(receipt.client_id.company_id.letter_head, { responseType: 'arraybuffer' });
                const tempPath = path.join(__dirname, 'temp_letterhead.png');
                fs.writeFileSync(tempPath, response.data);
                contents.push({
                    image: tempPath,
                    fit: [595 - 40 - 40, 150], 
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                });
            } else {
                contents.push({ text: [
                    { text: `${company.name}\n`, bold: true, fontSize: 18, color:'#4169E1'  },
                    `${company.address} `,
                    `${company.area} `,
                    `${company.city} - ${company.pincode}`,
                  

                    `GSTIN: ${company.gst} - `,
                    "State Code: 27 - ",
                    `PAN: ${company.pan}\n`,

                    `Email: ${company.email}, `,
                    ` Mobile: +91 ${company.mobile}\n`,
                ],
                alignment: 'center',
                margin: [0, 0, 0, 10],});
            }

            const docDefinition = {
                content: [
                    contents,
                  
                    {
                        table: {
                            widths: ["*"], // two columns: To / From
                            body: [
                            [
                                // Left Column: To (vendor)
                                {
                                text: [
                                    { text: "To,\n", bold: true },
                                    { text: `${receipt.client_id.first_name}  ${receipt.client_id.last_name}\n`, bold: true },
                                    `${receipt.client_id.address_line_1}\n`,
                                    `${receipt.client_id.address_line_2}\n`,
                                    `${receipt.client_id.state}\n`,
                                    `${receipt.client_id.city} - ${receipt.client_id.pincode}\n\n`,
                                

                                    `Email: ${receipt.client_id.email}\n`,
                                    `Mobile: ${receipt.client_id.contact_no_1}\n`,
                                ],
                                },

                               
                            ],
                            ],
                        },
                         layout: "noBorders",
                        margin: [0, 0, 0, 10],
                       
                    },
                      { 
                        text: "Receipt", 
                        bold: true, 
                        fontSize: 16, 
                        alignment: "center", 
                         bold: true,
                        margin: [0, 0, 0, 10] 
                    },   
                    {
                        table: {
                            widths: ['50%', '50%'],
                            body: [
                            [
                                {
                                text: [
                                    { text: 'Received with thanks from: ', bold: false },
                                    {
                                    text:
                                        receipt.client_id.company_name &&
                                        receipt.client_id.company_name.trim() !== ""
                                        ? receipt.client_id.company_name
                                        : `${receipt.client_id.first_name ?? ""} ${receipt.client_id.last_name ?? ""}`,
                                    bold: true,
                                    }

                                ],
                                margin: [0, 2, 0, 2]
                                },
                                {
                                alignment: 'right',
                                stack: [
                                   {
                                    text: `Receipt Date: ${
                                        receipt.createdOn
                                        ? new Date(receipt.createdOn)
                                            .toISOString()
                                            .split("T")[0]
                                            .split("-")
                                            .reverse()
                                            .join("/")
                                        : ""
                                    }`
                                    }

                                ],
                                margin: [0, 2, 0, 2]
                                }
                            ],
                            [
                                {
                                colSpan: 2,
                                stack: [
                                    {
                                    text: [
                                        { text: `By: `, bold: false },
                                        { text: `${receipt.payment_method || '-'}`, bold: true }
                                    ],
                                    margin: [0, 2, 0, 2]
                                    },
                                    ...(receipt.payment_method === 'Cheque'
                                    ? [
                                        {
                                            text: [
                                            { text: `Cheque No: ` },
                                            { text: `${receipt.cheque_no || '-'}`, bold: true },
                                            { text: `Drawee Bank: ${receipt.bank_name || '-'}` },
                                            { text: `Branch: ${receipt.branch || '-'}     ` },
                                            { text: `IFSC: ${receipt.ifsc || '-'}     ` },
                                            ]
                                        }
                                        ]
                                    : receipt.payment_method === 'Bank Transfer'
                                    ? [
                                        {
                                            text: [
                                            { text: `Drawee Bank: ${receipt.bank_name || '-'}` },
                                            { text: `Branch: ${receipt.branch || '-'}     ` },
                                            { text: `IFSC: ${receipt.ifsc || '-'}     ` },
                                            { text: `Transaction No: ${receipt.transaction_no || '-'}     ` },
                                            ]
                                        }
                                        ]
                                    : receipt.payment_method === 'Card'
                                    ? [
                                        {
                                            text: [
                                            { text: `Card Number: ${receipt.card_no || '-'}     ` },
                                            { text: `Transaction ID: ${receipt.transaction_no || '-'}` }
                                            ]
                                        }
                                        ]
                                    : receipt.payment_method === 'UPI'
                                    ? [
                                        {
                                            text: [
                                            { text: `Transaction ID: ${receipt.transaction_no || '-'}` }
                                            ]
                                        }
                                        ]                                   
                                    : [])
                                ]
                                },
                                {}
                            ]
                            ]
                        },
                        layout: "noBorders",
                        margin: [0, 0, 0, 10],
                       
                    },
                    {
                        
                        text: [
                            'We hereby acknowledge the receipt of payment amounting to ',
                            { text: `${formatINR(receipt.amount)}`, bold: true },
                            `. This payment has been received via ${receipt.payment_method || 'Cash'} on ${new Date(receipt.createdOn).toLocaleDateString()}. We thank you for your prompt settlement and look forward to continuing our business relationship.`
                        ],
                        fontSize: 10,
                        margin: [30, 10, 30, 10],
                        lineHeight: 1.5
                    },
                    {
                        columns: [
                            { text: `\nFor ${receipt.client_id.company_id.name} \n\nAuthorised Signature`, alignment: "right" }
                        ]
                    },                  
                    
                  

                             
                   
                   
                ],
                footer: function(currentPage, pageCount) {
                    return {
                        columns: [
                            {
                                // text: `${invoice.company_id.address} | Website: ${invoice.company_id.website || '-'} | Email: ${invoice.company_id.email || '-'} | Phone: ${invoice.company_id.contact_number || '-'}`,
                                text: `D'Lume - ${new Date().toLocaleDateString("en-IN")}`,
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
                defaultStyle: { fontSize: 10 },
                 styles: {
                header: { fontSize: 16, bold: true },
                subheader: { fontSize: 10 },
                sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
                tableHeader: { bold: true, fillColor: "#E5E5E5" },
                },
            };


            const pdfDoc = printer.createPdfKitDocument(docDefinition);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=invoice_${receipt._id}.pdf`);

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
    
generateInvoice: async function (req, res) {
  try {
    const lastInvoice = await SaleOrderModel
      .findOne({ invoice_no: { $exists: true, $ne: null, $ne: "" } })
      .sort({ createdOn: -1 });

    let nextNumber = 1;

    if (
      lastInvoice &&
      lastInvoice.invoice_no &&
      typeof lastInvoice.invoice_no === "string"
    ) {
      const parts = lastInvoice.invoice_no.split("-");
      const lastPart = parts[parts.length - 1];
      if (!isNaN(lastPart)) {
        nextNumber = Number(lastPart) + 1;
      }
    }

    const invoice_no = `I-${String(nextNumber).padStart(5, "0")}`;  // I-00025

    return res.json({ success: true, invoice_no });

  } catch (error) {
    console.error("GENERATE INVOICE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
},

    
}

module.exports =  saleOrderControler;