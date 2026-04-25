const mongoose  = require("mongoose");
const PdfPrinter = require("pdfmake");
const ExcelJS = require("exceljs");
const axios = require('axios');
const fs = require('fs');
const path = require("path");
const moment = require("moment-timezone");

const OrderModel = require("../models/order_model");
const clientModel = require("../models/client_model");
const productModel = require("../models/product_model");
const companyModel = require("../models/company_model");
const SaleDetail = require("../models/sale_detail_model");
const SaleOrderModel = require("../models/sale_order_model");
const PurchaseDetail = require("../models/purchase_detail_model");
const PurchaseOrderModel = require("../models/purchase_order_model");
const SaleReceipt = require("../models/sale_receipt_model");
const vendorModel = require("../models/vendor_model");
const PurchaseReceipt = require("../models/purchase_receipt_model");

const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/static/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../fonts/static/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../fonts/static/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../fonts/static/Roboto-MediumItalic.ttf"),
  },
};

 const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount);

const printer = new PdfPrinter(fonts);
const reportController = {
  salesReport: async (req, res) => {
    try {
      const { from, to, type = "GST", format = "PDF", company_id, ver_id } = req.query;
      const filter = {};

      if (company_id) filter.company_id = company_id;
      if (ver_id) filter.client_id = ver_id;
      if (type === 'GST') {
        filter.invoice_type = { $ne: 'Non GST' };
      } else {
        filter.invoice_type = 'Non GST';
      }  

      // if (from && from != 'Select') {
      //   filter.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   filter.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   filter.createdOn.$lte = toDate;
      // }

      if (from && from != 'Select') {
        filter.createdOn = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        filter.createdOn.$gte = fromDate;

        filter.createdOn.$lte = toDate;
      }


     
      const orders = await SaleOrderModel.find(filter).populate("client_id");

     


      if(format == 'PDF'){
        if(type == 'NON_GST'){
          const body = [
                [
                  { text: "Invoice No", style: "tableHeader" },
                  { text: "Client", style: "tableHeader" },
                  { text: "Date", style: "tableHeader" },
                  { text: "Status", style: "tableHeader" },
                  { text: "Amount", style: "tableHeader" },
                  { text: "Discount", style: "tableHeader" },
                  { text: "Total", style: "tableHeader" },
                ],
                ...orders.map((o) => [
                  { text: o.invoice_no?.toString() || "0" },
                  {
                    text: `${
                      o.client_id?.company_name?.trim()
                        ? o.client_id.company_name
                        : `${o.client_id?.first_name || ""} ${o.client_id?.last_name || ""}`
                    }`
                  },
                  {
                    text: o.order_date
                      ? new Date(o.order_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : ""
                  },
                  { text: o.status },
                  { text: o.amount?.toString() || "0" },
                  { text: o.discount?.toString() || "0" },
                  { text: o.total_amount?.toString() || "0" },
                ]),
              ];

          const docDefinition = {
            content: [
              { text: "Sales Report", style: "header" },
              {
                style: "tableExample",
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
                  body
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
            ],
            styles: {
              header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
              tableHeader: { bold: true, fillColor: "#E5E5E5" },
            },
            defaultStyle: { fontSize: 7 },
          };

          const pdfDoc = printer.createPdfKitDocument(docDefinition);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline; filename=sales_report.pdf");

          pdfDoc.pipe(res);
          pdfDoc.end();

        } else {
         const body = [
                [
                  { text: "GSTIN/UIN of Recipient", style: "tableHeader" },
                  { text: "Client", style: "tableHeader" },
                  { text: "Invoice Number", style: "tableHeader" },
                  { text: "Invoice Date", style: "tableHeader" },
                  { text: "Invoice Value", style: "tableHeader" },
                  { text: "Place of Supply", style: "tableHeader" },
                  { text: "Reverse Charge", style: "tableHeader" },
                  { text: "Applicable % of Tax Rate", style: "tableHeader" },
                  { text: "Invoice Type", style: "tableHeader" },
                  { text: "E-Commerce GSTIN", style: "tableHeader" },
                  { text: "Rate", style: "tableHeader" },
                  { text: "Taxable Value", style: "tableHeader" },
                  { text: "Cess Amount", style: "tableHeader" },
                ],
                ...orders.map((o) => [
                  { text: o.client_id?.gst?.toString() || "" },
                  {
                    text: `${
                      o.client_id?.company_name?.trim()
                        ? o.client_id.company_name
                        : `${o.client_id?.first_name || ""} ${o.client_id?.last_name || ""}`
                    }`
                  },

                  { text: o.invoice_no?.toString() || "" },
                  {
                    text: o.order_date
                      ? new Date(o.order_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : ""
                  },
                  { text: o.total_amount?.toString() || "0" },
                  { text: o.delivery_address?.toString() || "" },
                  { text: "N" },
                  { text: "18%" },
                  { text: "Regular" },
                  { text: "Regular" },
                  { text: "18%" },
                  { text: o.amount_before_tax?.toString() || "0" },
                  { text: "0" },
                ]),
              ];

            const docDefinition = {
            content: [
              { text: "Sales Report", style: "header" },
              {
                style: "tableExample",
                table: {
                  headerRows: 1,
                  widths: Array(13).fill("auto"),
                  body
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
            ],
            styles: {
              header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
              tableHeader: { bold: true, fillColor: "#E5E5E5" },
            },
            defaultStyle: { fontSize: 7 },
          };

          const pdfDoc = printer.createPdfKitDocument(docDefinition);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline; filename=sales_report.pdf");

          pdfDoc.pipe(res);
          pdfDoc.end();


        }


      

      } else {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        if (type === "NON_GST") {
          worksheet.columns = [
            { header: "Invoice No", key: "invoice_no", width: 15 },
            { header: "Client", key: "client", width: 25 },
            { header: "Date", key: "date", width: 15 },
            { header: "Status", key: "status", width: 12 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Discount", key: "discount", width: 15 },
            { header: "Total", key: "total", width: 15 },
          ];

          orders.forEach(o => {
            worksheet.addRow({
              invoice_no: o.invoice_no || "",
              client: `${
                  o.client_id?.company_name?.trim()
                    ? o.client_id.company_name
                    : `${o.client_id?.first_name || ""} ${o.client_id?.last_name || ""}`
                }`,
         
              date: o.order_date
                      ? new Date(o.order_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "",
              status: o.status || "",
              amount: o.amount || 0,
              discount: o.discount || 0,
              total: o.total_amount || 0,
            });
          });
        } else {
          worksheet.columns = [
            { header: "GSTIN/UIN of Recipient", key: "gst_no", width: 15 },            
            { header: "Client", key: "client", width: 25 },
            { header: "Invoice Number", key: "invoice_no", width: 15 },
            { header: "Invoice Date", key: "date", width: 15 },
            { header: "Invoice Value", key: "value", width: 15 },
            { header: "Place of Supply", key: "supply_place", width: 15 },
            { header: "Reverse Charge", key: "reverse", width: 15 },
            { header: "Applicable % of Tax Rate", key: "tas_rate", width: 15 },
            { header: "Invoice Type", key: "invoice_type", width: 15 },
            { header: "E-Commerce GSTIN", key: "e_comm", width: 15 },
            { header: "Rate", key: "rate", width: 12 },            
            { header: "Taxable Value", key: "amount_before_tax", width: 18 },
            { header: "Cess Amount", key: "cess", width: 12 },
          ];

          orders.forEach(o => {
            worksheet.addRow({
              gst_no: o.client_id?.gst || "",
              client: `${
                o.client_id?.company_name?.trim()
                  ? o.client_id.company_name
                  : `${o.client_id?.first_name || ""} ${o.client_id?.last_name || ""}`
              }`,

              invoice_no: o.invoice_no || "",
              date: o.order_date
                      ? new Date(o.order_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "",
              value: o.total_amount || 0,
              supply_place: o.delivery_address || 0,
              reverse: 'N',
              tas_rate: '18%',
              invoice_type: 'Regular',
              e_comm: '-',
              rate: '18%',
              amount_before_tax: o.amount_before_tax || 0,
              cess: '0',
            });
          });
        }

        // Style header row
        worksheet.getRow(1).eachCell(cell => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center" };
        });

       


          // Write workbook to buffer
          const buffer = await workbook.xlsx.writeBuffer();

          // Set headers to trigger download in browser
          res.setHeader(
            "Content-Disposition",
            "inline; filename=sales_report.xlsx"
          );
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );

          // Send buffer
          res.send(buffer);
        return res.end();
      }

    

      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },
  saleReport: async (req, res) => {
    try {
      const { from,  ver_id } = req.query;
      const filter = {};
      const filters = {};
      console.log(ver_id);

      if (ver_id) filter.client_id = ver_id;
      if (ver_id) filters.client_id = ver_id;
     

      // if (from && from != 'Select') {
      //   filter.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   filter.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   filter.createdOn.$lte = toDate;
      // }
       let totalAmounts = 0;
      let paidAmounts = 0;
      let outstandingAmount = 0;

    

      if (from && from !== "all") {
        const saleOrder = await SaleOrderModel.findOne({ client_id: ver_id }).sort({ createdOn: -1 }).select("createdOn");
        const saleres= await SaleReceipt.findOne({ client_id: ver_id }).sort({ createdOn: -1 }).select("createdOn");


        const nowIST = moment.tz("Asia/Kolkata");

        const dates = [
          saleOrder?.createdOn,
          saleres?.createdOn,
        ].filter(Boolean);

        const latestJSDate = dates.length
          ? new Date(Math.max(...dates.map(d => new Date(d).getTime())))
          : nowIST.toDate();

        const latestDate = moment(latestJSDate).tz("Asia/Kolkata");

        let fromDate;

        if (from === "1d") {
          fromDate = latestDate.clone().subtract(1, "day").startOf("day").toDate();
        } else if (from === "1w") {
          fromDate = latestDate.clone().subtract(7, "day").startOf("day").toDate();
        } else if (from === "1m") {
          fromDate = latestDate.clone().subtract(1, "month").startOf("day").toDate();
        } else if (from === "3m") {
          fromDate = latestDate.clone().subtract(3, "month").startOf("day").toDate();
        } else {
          fromDate = latestDate.clone().subtract(6, "month").startOf("day").toDate();
        }

        const clientId = new mongoose.Types.ObjectId(ver_id);

        // Opening invoices before selected period
        const totals = await SaleOrderModel.aggregate([
          {
            $match: {
              client_id: clientId,
              order_date: { $lt: fromDate },
            },
          },
          {
            $group: {
              _id: null,
              totalInvoice: { $sum: "$total_amount" },
              totalPaid: { $sum: "$advance_amount" },
            },
          },
        ]);

        // Opening receipts before selected period
        const received = await SaleReceipt.aggregate([
          {
            $match: {
              client_id: clientId,
              date: { $lt: fromDate },
            },
          },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
            },
          },
        ]);

        const receiptAmount = received[0]?.amount || 0;

       

        if (totals.length > 0) {
          totalAmounts = totals[0].totalInvoice || 0;
          paidAmounts = (totals[0].totalPaid || 0) + receiptAmount;
          outstandingAmount = totalAmounts - paidAmounts;
        }

        
          filter.order_date = { $gte: fromDate, $lte: latestDate };
          filters.date = { $gte: fromDate, $lte: latestDate };

      }



     
      const orders = await SaleOrderModel.find(filter).populate({
                                                          path: 'client_id',
                                                      })                                                      
                                                      .populate({
                                                          path: 'details',
                                                          populate: [
                                                              {path: 'product_id'},
                                                          ],
                                                      }).lean();
    const payments = await SaleReceipt.find(filters);


    const formattedOrders = orders.map(o => ({
      type: "order",
      date: o.order_date,
      ...o,
      details: o.details,       // explicitly available now
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






      const client = await clientModel.findById(ver_id).populate("company_id");
      
      const contents = [];
      const outstandingContent = [];
      console.log(outstandingAmount);

      // if(outstandingAmount != 0){
      //   outstandingContent.push({
      //     text: `Previous Invoiced Amt: ${totalAmounts} | Previous Paid Amt: ${paidAmounts}  | Previous Outstanding Amt: ${outstandingAmount}\n`,
      //     bold: true,
      //     fontSize: 10,
      //     alignment: 'center',
      //     margin: [0, 0, 0, 10],
      //   });

      // }
      



      if (client.company_id.letter_head && client.company_id.letter_head.trim() !== '') {
            const response = await axios.get(client.company_id.letter_head, { responseType: 'arraybuffer' });
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
              { text: `${client.company_id.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1' },
              `${client.company_id.address.toUpperCase()} `,
              `${client.company_id.area.toUpperCase()} `,
              `${client.company_id.city.toUpperCase()} - ${client.company_id.pincode}`,
            

              `GSTIN: ${client.company_id.gst} - `,
              "STATE CODE: 27 - ",
              `PAN: ${client.company_id.pan}\n`,

              `EMAIL: ${client.company_id.email.toUpperCase()}, `,
              ` MOBILE: +91 ${client.company_id.mobile}\n`,
          ],
          alignment: 'center',
          margin: [0, 0, 0, 10],});
      }   
      
      console.log({
          totalAmounts: totalAmounts,
          paidAmounts: paidAmounts,
          outstandingAmount: outstandingAmount,
        });
      
      let totalAmount = totalAmounts;
      let paidAmount = paidAmounts;
      let balAmount = outstandingAmount;
      let remAmount = outstandingAmount;

      


     const body = [
      [
        { text: "Item", style: "tableHeader" },
        { text: "Type", style: "tableHeader" },
        { text: "Description", style: "tableHeader" },
        { text: "Size", style: "tableHeader" },
        { text: "Bags", style: "tableHeader" },
        { text: "Qty", style: "tableHeader" },
        { text: "Rate", style: "tableHeader" },
        { text: "Amount", style: "tableHeader", alignment: "right" },
        { text: "Received Amt", style: "tableHeader", alignment: "right" },
        { text: "Bal Amt", style: "tableHeader", alignment: "right" },
      ],

      // Use flatMap to handle nested details arrays
      ...mergedResult.flatMap((o, i) => {
       

        const rows = [];
        if (o.type === "order") {
           balAmount = balAmount + o.total_amount;
            totalAmount = totalAmount + o.total_amount;
        paidAmount = paidAmount + o.advance_amount;
        let remsAmount = o.total_amount - o.advance_amount;
        remAmount = remAmount + remsAmount;
          
          
          rows.push([
            {
              text: ` ${
                o.order_date
                  ? new Date(o.order_date)
                      .toISOString()
                      .split("T")[0]
                      .split("-")
                      .reverse()
                      .join("/")
                  : ""
              }  Invoice No ${o.invoice_no || ""}   Invoice Amount: ${o.total_amount}`,
              colSpan: 9,
              bold: true,
              fillColor: "#f2f2f2",
              margin: [3, 2, 0, 2],
            },
            {}, {}, {}, {}, {}, {}, {},{},{},
          ]);

          if (Array.isArray(o.details) && o.details.length > 0) {
            o.details.forEach((d) => {
              rows.push([
                { text: d.product_id.product?.toString() || "" },
                { text: d.product_id.type?.toString() || "" },
                { text: d.description?.toString() || "" },
                { text: d.product_id.size?.toString() || "" },
                {
                  text:
                    d.bags && Number(d.bags) > 0
                      ? `${(Number(d.bags))} x ${(Number(d.units)).toString()}`
                      : `1 x ${Number(d.qty).toString()}`
                },

                { text: d.qty?.toString() || "0" },
                { text: formatINR(d.price || "0"), alignment: "right" },
                { text: formatINR(d.amount || "0"), alignment: "right" },
                {}, {},
              ]);
            });
          }
        

          return rows;
        } else  {

         paidAmount = paidAmount + o.amount;
        remAmount = remAmount - o.amount;
          rows.push([
            {
              text: `   Date: ${
                o.date
                  ? new Date(o.date)
                      .toISOString()
                      .split("T")[0]
                      .split("-")
                      .reverse()
                      .join("/")
                  : ""
              }, ${o.remarks ? `Remarks: " ${o.remarks}` : ""}, Payment Method: ${o.payment_method},  ${o.payment_method === "Cheque"
                        ? `Cheque No: ${o.cheque_no || "-"} | Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"}`
                        : o.payment_method === "Bank Transfer"
                        ? `Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"} | Transaction No: ${o.transaction_no || "-"}`
                        : o.payment_method === "Card"
                        ? `Card Number: ${o.card_number || "-"} | Transaction ID: ${o.transaction_no || "-"}`
                        : o.payment_method === "UPI"
                        ? `Transaction ID: ${o.transaction_no || "-"}`
                        : "-"}`,
              colSpan: 7,
              bold: false,
              alignment: "left",
              fillColor: "#bfbfbf",
              margin: [3, 2, 0, 2],
            },
            {}, {}, {},{}, {}, {}, { text: formatINR(balAmount || "0"),fillColor: "#bfbfbf", alignment: "right" },  { text: formatINR(o.amount || "0"),fillColor: "#bfbfbf", alignment: "right" }, { text: formatINR(balAmount - o.amount || "0"),fillColor: "#bfbfbf", alignment: "right" },
          ]);
          balAmount = balAmount - o.amount;
         
           return rows;

        }

       
      }),

      

       [
         {text: " " , border: [ false, false, false, false ] }, 
         {text: " " , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
      ],
             [
        {text: "Thank you for your business!" , colSpan:3, rowSpan:3,  border: [ false, false, false, false ],  fontSize: 18,  bold: true  }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         { text: "Total  Amount" ,fillColor: "#f2f2f2",  colSpan:2,  alignment: "right",  bold: true }, 
         {text: "" , border: [ false, false, false, false ] }, 
        {text: formatINR(totalAmount || ""),fillColor: "#f2f2f2", alignment: "right" ,  bold: true }, 
      ],
      [
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" ,border: [ false, false, false, false ]  }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        { text: "Total Paid Amount", fillColor: "#f2f2f2", colSpan:2, alignment: "right",  bold: true }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: formatINR(paidAmount || ""), fillColor: "#f2f2f2", alignment: "right",  bold: true },

      ],
      [

        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: " " ,border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        { text: "Total Remaining  Amount" ,fillColor: "#f2f2f2",  colSpan:2, alignment: "right" ,  bold: true }, 
        {text: "" , border: [ false, false, false, false ] }, 
         {text: formatINR(remAmount || ""),fillColor: "#f2f2f2", alignment: "right" ,  bold: true },
      ],
    
    ];




      const docDefinition = {
        content: [
          contents,  
         {
            text: [
              { text: 'Sales of ', style: 'header' },
              {
                text: client?.company_name?.trim()
                  ? client.company_name
                  : `${client?.first_name || ""} ${client?.last_name || ""}`,
                style: 'header',
                color: '#4169E1'
              }
            ]
          },
          outstandingContent,
          

          {
            style: "tableExample",
            table: {
              headerRows: 1,
              widths: [  "*","auto","auto","auto", "auto", "auto", "auto", "auto", "15%", "auto"],
              body
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
        ],
        styles: {
          header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
          tableHeader: { bold: true, fillColor: "#E5E5E5" },
        },
        defaultStyle: { fontSize: 8 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=sales_report.pdf");

      pdfDoc.pipe(res);
      pdfDoc.end();    

      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  //   saleReport: async (req, res) => {
  //   try {
  //     const { from, to, ver_id } = req.query;
  //     const filter = {};

  //     if (ver_id) filter.client_id = ver_id;
     

  //     // if (from && from != 'Select') {
  //     //   filter.createdOn = {};
  //     //   const now = new Date();
  //     //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
  //     //   fromDate.setHours(0, 0, 0, 0); 
  //     //   filter.createdOn.$gte = fromDate;

  //     //   const toDate = new Date();
  //     //   toDate.setHours(23, 59, 59, 999); 
  //     //   filter.createdOn.$lte = toDate;
  //     // }

  //     if (from && from != 'Select') {
  //       filter.createdOn = {};
  //       const nowIST = moment.tz("Asia/Kolkata");
  //       const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

  //       const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
  //       filter.createdOn.$gte = fromDate;

  //       filter.createdOn.$lte = toDate;
  //     }


     
  //     const orders = await SaleOrderModel.find(filter).populate({
  //                                                         path: 'client_id',
  //                                                     })                                                      
  //                                                     .populate({
  //                                                         path: 'details',
  //                                                         populate: [
  //                                                             {path: 'product_id'},
  //                                                         ],
  //                                                     });
  //     const client = await clientModel.findById(ver_id).populate("company_id");
      
  //     const contents = [];


  //     if (client.company_id.letter_head && client.company_id.letter_head.trim() !== '') {
  //           const response = await axios.get(client.company_id.letter_head, { responseType: 'arraybuffer' });
  //         const tempPath = path.join(__dirname, 'temp_letterhead.png');
  //         fs.writeFileSync(tempPath, response.data);
  //         contents.push({
  //             image: tempPath,
  //             fit: [595 - 40 - 40, 150], 
  //             alignment: 'center',
  //             margin: [0, 0, 0, 10],
  //         });
  //     } else {
  //             contents.push({ text: [
  //             { text: `${client.company_id.name.toUpperCase()}\n`, bold: true, fontSize: 18 },
  //             `${client.company_id.address.toUpperCase()} `,
  //             `${client.company_id.area.toUpperCase()} `,
  //             `${client.company_id.city.toUpperCase()} - ${client.company_id.pincode}`,
            

  //             `GSTIN: ${client.company_id.gst} - `,
  //             "STATE CODE: 27 - ",
  //             `PAN: ${client.company_id.pan}\n`,

  //             `EMAIL: ${client.company_id.email.toUpperCase()}, `,
  //             ` MOBILE: +91 ${client.company_id.mobile}\n`,
  //         ],
  //         alignment: 'center',
  //         margin: [0, 0, 0, 10],});
  //     }                                            
      
  //     let totalAmount = 0;
  //     let paidAmount = 0;
  //     let remAmount = 0;


  //    const body = [
  //     [
  //       { text: "Item", style: "tableHeader" },
  //       { text: "Type", style: "tableHeader" },
  //       { text: "Size", style: "tableHeader" },
  //       { text: "Qty", style: "tableHeader" },
  //       { text: "Rate", style: "tableHeader" },
  //       { text: "Amount", style: "tableHeader", alignment: "right" },
  //     ],

  //     // Use flatMap to handle nested details arrays
  //     ...orders.flatMap((o) => {
  //         totalAmount = totalAmount + o.total_amount;
  //         paidAmount = paidAmount + o.paid_amount;
  //         let remsAmount = o.total_amount - o.paid_amount;
  //         remAmount = remAmount +  remsAmount;
  //       const rows = [];
  //       rows.push([
  //         {
  //           text: `Invoice No: ${o.invoice_no || ""}    Order Date: ${
  //             o.order_date
  //                     ? new Date(o.order_date)
  //                         .toISOString()
  //                         .split("T")[0]      
  //                         .split("-")         
  //                         .reverse()          
  //                         .join("/")        
  //                     : ""
  //           }`,
  //           colSpan: 6,
  //           bold: true,
  //           fillColor: "#f2f2f2", 
  //           margin: [3, 2, 0, 2], 
  //         },
  //         {}, 
  //         {},
  //         {},
  //         {},
  //         {},
  //       ]);

  //       // If there are details
  //       if (Array.isArray(o.details) && o.details.length > 0) {
  //         o.details.forEach((d, index) => {
  //           rows.push([
  //             // Show client name only in the first detail row
  //             { text: d.product_id.product?.toString() || "" },
  //             { text: d.product_id.type?.toString() || "" },
  //             { text: d.product_id.size?.toString() || "" },
  //             { text: d.qty?.toString() || "0" },
  //             { text: formatINR(d.price || "0"), alignment: "right" },
  //             { text: formatINR(d.amount || "0"), alignment: "right" },
  //           ]);
  //         });
  //       } 

  //       rows.push([
        
  //         {}, 
  //         {}, 
  //         {}, 
  //         { text: "Invoice Amount" , alignment: "right" }, 
  //         { text: "Paid Amount", alignment: "right" }, 
  //         { text: "Remaining  Amount" , alignment: "right" }, 
  //       ]);
  //       rows.push([
        
  //         {}, 
  //         {}, 
  //         {}, 
  //         {text: formatINR(o.total_amount || ""), alignment: "right" }, 
  //         {text: formatINR(o.paid_amount || ""), alignment: "right" },
  //         {text: formatINR(o.total_amount - o.paid_amount || ""), alignment: "right" },
  //       ]);
       

  //       return rows;
  //     }),
      

  //      [
  //        {text: " " , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //     ],
  //            [
  //        {text: " " , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        {text: "" , border: [ false, false, false, false ] }, 
  //        { text: "Total  Amount" ,fillColor: "#f2f2f2",    alignment: "right",  bold: true }, 
  //       {text: formatINR(totalAmount || ""),fillColor: "#f2f2f2", alignment: "right" ,  bold: true }, 
  //     ],
  //     [
  //       {text: "Thank you for your business!" , colSpan:2, rowSpan:2,  border: [ false, false, false, false ],  fontSize: 18,  bold: true  }, 
  //       {text: "" , border: [ false, false, false, false ] }, 
  //       {text: "" ,border: [ false, false, false, false ]  }, 
  //       {text: "" , border: [ false, false, false, false ] }, 
  //       { text: "Total Paid Amount", fillColor: "#f2f2f2",  alignment: "right",  bold: true }, 
  //       {text: formatINR(paidAmount || ""), fillColor: "#f2f2f2", alignment: "right",  bold: true },

  //     ],
  //     [

  //       {text: "" , border: [ false, false, false, false ] }, 
  //       {text: "" , border: [ false, false, false, false ] }, 
  //       {text: " " ,border: [ false, false, false, false ] }, 
  //       {text: "" , border: [ false, false, false, false ] }, 
  //       { text: "Total Remaining  Amount" ,fillColor: "#f2f2f2",   alignment: "right" ,  bold: true }, 
  //        {text: formatINR(remAmount || ""),fillColor: "#f2f2f2", alignment: "right" ,  bold: true },
  //     ],
    
  //   ];



  //     const docDefinition = {
  //       content: [
  //         contents,  
  //         { text: `Sales  of ${client?.company_name?.trim()
  //               ? client.company_name
  //               : `${client?.first_name || ""} ${client?.last_name || ""}`
  //           }`, style: "header" },
  //         {
  //           style: "tableExample",
  //           table: {
  //             headerRows: 1,
  //             widths: [  "*","auto", "auto", "auto", "auto", "auto"],
  //             body
  //           },
  //           layout: {
  //             hLineWidth: function (i, node) {
  //               return 1; // horizontal line width
  //             },
  //             vLineWidth: function (i, node) {
  //               return 1; // vertical line width
  //             },
  //             hLineColor: function (i, node) {
  //               return "black"; // horizontal line color
  //             },
  //             vLineColor: function (i, node) {
  //               return "black"; // vertical line color
  //             },
  //             paddingLeft: function (i, node) { return 5; },
  //             paddingRight: function (i, node) { return 5; },
  //             paddingTop: function (i, node) { return 3; },
  //             paddingBottom: function (i, node) { return 3; },
  //           }
  //         },
  //       ],
  //       styles: {
  //         header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
  //         tableHeader: { bold: true, fillColor: "#E5E5E5" },
  //       },
  //       defaultStyle: { fontSize: 7 },
  //     };

  //     const pdfDoc = printer.createPdfKitDocument(docDefinition);

  //     res.setHeader("Content-Type", "application/pdf");
  //     res.setHeader("Content-Disposition", "inline; filename=sales_report.pdf");

  //     pdfDoc.pipe(res);
  //     pdfDoc.end();    

      
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ success: false, message: "Server error", error: error.message });
  //   }
  // },

  outstandingReport: async (req, res) => {
    try {
      const { id } = req.query;
      const filter = {};

      if (id) filter.company_id = id;

  

   

     
      const clientsWithOutstanding = await clientModel.find(filter).populate("company_id");
      const company = await companyModel.findById(id);

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
          paid = (totals[0].totalPaid || 0) + (amount || 0);
          outstanding = (totals[0].totalInvoice || 0) - paid;
        }

        const clientObj = client.toObject();
        clientObj.totalAmount = total;
        clientObj.paidAmount = paid;
        clientObj.outstandingAmount = outstanding;

        clients.push(clientObj);
      }
      
      const contents = [];


      if (company.letter_head && company.letter_head.trim() !== '') {
            const response = await axios.get(company.letter_head, { responseType: 'arraybuffer' });
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
              { text: `${company.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1' },
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
      
      let totalAmount = 0;


     const body = [
      [
        { text: "Sr. No", style: "tableHeader" },
        { text: "Customer Name", style: "tableHeader" },
        { text: "Total Outstanding", style: "tableHeader" },
        { text: "Received Amount", style: "tableHeader" },
        { text: "Payment Mode", style: "tableHeader" },
        { text: "Remarks", style: "tableHeader" },
      ],

      // Use flatMap to handle nested details arrays
      ...clients.flatMap((o, index) => {
          totalAmount = totalAmount + o.outstandingAmount;
        const rows = [];
        if(o.outstandingAmount > 0){
          rows.push([
                    
            { text: `${index + 1}` },
            { text: `${o?.company_name?.trim()
                ? o.company_name
                : `${o?.first_name || ""} ${o?.last_name || ""}` }`},
            {text: formatINR(o.outstandingAmount || ""), alignment: "right"},
          {text: " "},
          {text: 'Cash / UPI'},
          {text: " "},
          ]);   
        }

       

        return rows;
      }),     

      
     
    
    ];



      const docDefinition = {
        content: [
          contents,  
          {
            text: `Date: ${new Date(Date.now()).toLocaleDateString("en-GB")}`,
            bold: true,
          },

          { text: `Business Name: ${company?.name?.trim()}`, bold: true, margin: [0, 0, 0, 10]},
          {
            style: "tableExample",
            table: {
              headerRows: 1,
              widths: [ "auto",  "auto", "auto",  "*","auto",  "*"],
              body
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
        { text: "", margin: [0, 5, 0, 15] },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "30%"], 
              body: [
                // --- HEADER ROW ---
                [
                  { text: "Description", bold: true, alignment: "left" },
                  { text: "Amount", bold: true, alignment: "right" }
                ],

                // --- DATA ROW ---
                [
                  { text: "Total Collection Received Amount" },
                  { text: "" } // empty value
                ],
              ],
            },
            layout: {
              hLineWidth: function (i, node) {
                return 1;
              },
              vLineWidth: function (i, node) {
                return 1;
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
            }
          },
          { text: "", margin: [0, 5, 0, 15] },

          {
            stack: [
              { text: "Prepared By", bold: true, fontSize: 14 },
              { text: "Signature: _____________________________", margin: [0, 10, 0, 0] },
              { text: "Name: __________________________________", margin: [0, 10, 0, 15] },
            ],
            alignment: "left",
          },


          {
            stack: [
              { text: "Authorised Signature", bold: true, fontSize: 14 },
              { text: "Signature: ______________________", margin: [0, 10, 0, 0] },
              { text: `Name: ${company.owner_name || "______________________"}`, margin: [0, 10, 0, 0] },
            ],
            alignment: "left",
          },


         
        ],
        styles: {
          header: { fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
          tableHeader: { bold: true, fillColor: "#E5E5E5" },
        },
        defaultStyle: { fontSize: 10 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=outstanding_report.pdf");

      pdfDoc.pipe(res);
      pdfDoc.end();    

      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

   findByCompanyId: async function (req, res) {
      try {
        const companyId = req.params.companyId;
  
      
  
        // Build filter object
        const filter = {
          company_id: companyId,
        };
  
      
  
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
                totalPaid: { $sum: "$paid_amount" },
              },
            },
          ]);
  
          let outstanding = 0;
          let total = 0;
          let paid = 0;
          if (totals.length > 0) {
            total = totals[0].totalInvoice || 0;
            paid = totals[0].totalPaid || 0;
            outstanding = (totals[0].totalInvoice || 0) - (totals[0].totalPaid || 0);
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

  receiptReport: async (req, res) => {
    try {
      const { from, ver_id } = req.query;
      const filter = {};

      if (ver_id) filter.client_id = ver_id;


      if (from && from != 'Select') {
        filter.date = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        filter.date.$gte = fromDate;

        filter.date.$lte = toDate;
      }



     
      const orders = await SaleReceipt.find(filter).populate("client_id");
      const client = await clientModel.findById(ver_id).populate("company_id");

      const contents = [];

     


      if (client.company_id.letter_head && client.company_id.letter_head.trim() !== '') {
            const response = await axios.get(client.company_id.letter_head, { responseType: 'arraybuffer' });
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
              { text: `${client.company_id.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1' },
              `${client.company_id.address.toUpperCase()} `,
              `${client.company_id.area.toUpperCase()} `,
              `${client.company_id.city.toUpperCase()} - ${client.company_id.pincode}`,
            

              `GSTIN: ${client.company_id.gst} - `,
              "STATE CODE: 27 - ",
              `PAN: ${client.company_id.pan}\n`,

              `EMAIL: ${client.company_id.email.toUpperCase()}, `,
              ` MOBILE: +91 ${client.company_id.mobile}\n`,
          ],
          alignment: 'center',
          margin: [0, 0, 0, 10],});
      }      
      let amtTotal = 0;

      const totals = await SaleOrderModel.aggregate([
        { $match: { client_id: new mongoose.Types.ObjectId(filter.client_id) } },
        {
          $group: {
            _id: null,
            totalInvoice: { $sum: { $ifNull: ["$total_amount", 0] } },
            totalPaid: { $sum: { $ifNull: ["$paid_amount", 0] } },
          },
        },
      ]);


      let total = 0;
      let paid = 0;
      let outstanding = 0;

      if (totals.length > 0) {
        const { totalInvoice, totalPaid } = totals[0];
        total = totalInvoice || 0;
        paid = totalPaid || 0;
        outstanding = total - paid;
      }

  
       
        
      const body = [                          

            [
              { text: "Date", style: "tableHeader" },
              { text: "Remarks", style: "tableHeader" },
              { text: "Payment Method", style: "tableHeader" },
              { text: "Details", style: "tableHeader" },
              { text: "Amount", style: "tableHeader", alignment: "right" },
            ],
             ...orders.map((o) => {
                amtTotal += o.amount || 0;
                return [
                  { text: o.date
                    ? new Date(o.date)
                        .toISOString()
                        .split("T")[0]
                        .split("-")
                        .reverse()
                        .join("/")
                    : "" },
                  { text: o.remarks || "" },
                  { text: o.payment_method || "" },
                  {
                    text:
                      o.payment_method === "Cheque"
                        ? `Cheque No: ${o.cheque_no || "-"} | Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"}`
                        : o.payment_method === "Bank Transfer"
                        ? `Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"} | Transaction No: ${o.transaction_no || "-"}`
                        : o.payment_method === "Card"
                        ? `Card Number: ${o.card_number || "-"} | Transaction ID: ${o.transaction_no || "-"}`
                        : o.payment_method === "UPI"
                        ? `Transaction ID: ${o.transaction_no || "-"}`
                        : "-",
                  },

                  { text: formatINR(o.amount) || "0.00", alignment: "right" },
                ];
              }),
              [
                { text: "Total:",  colSpan: 4, style: "tableHeader", alignment: "right" },
                { text: "" },
                { text: "" },
                { text: "" },
                { text: formatINR(amtTotal) || "0.00", style: "tableHeader", alignment: "right" },
              ],
              [
                { text: "Total Outstanding:", colSpan: 4, style: "tableHeader", alignment: "right" },
                { text: "" },
                { text: "" },
                { text: "" },
                { text: formatINR(outstanding) || "0.00", style: "tableHeader", alignment: "right" },
              ],
          ];

      const docDefinition = {
        content: [
          contents,  
          {
            text: [
              { text: 'Receipts Report of ', style: 'header' },
              {
                text: client?.company_name?.trim()
                  ? client.company_name
                  : `${client?.first_name || ""} ${client?.last_name || ""}`,
                style: 'header',
                color: '#4169E1'
              }
            ]
          },

          {
            style: "tableExample",
            table: {
              headerRows: 1,
              widths: ["*", "*","*", "*", "*"],
              body
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
        ],
        styles: {
          header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
          tableHeader: { bold: true, fillColor: "#E5E5E5" },
        },
        defaultStyle: { fontSize: 7 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=sales_report.pdf");

      pdfDoc.pipe(res);
      pdfDoc.end();

    

      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  purchaseReceiptReport: async (req, res) => {
    try {
      const { from, ver_id } = req.query;
      const filter = {};

      if (ver_id) filter.vendor_id = ver_id;


      if (from && from != 'Select') {
        filter.date = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        filter.date.$gte = fromDate;

        filter.date.$lte = toDate;
      }



     
      const orders = await PurchaseReceipt.find(filter).populate("vendor_id");
      const client = await vendorModel.findById(ver_id).populate("company_id");

      const contents = [];

     


      if (client.company_id.letter_head && client.company_id.letter_head.trim() !== '') {
            const response = await axios.get(client.company_id.letter_head, { responseType: 'arraybuffer' });
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
              { text: `${client.company_id.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1' },
              `${client.company_id.address.toUpperCase()} `,
              `${client.company_id.area.toUpperCase()} `,
              `${client.company_id.city.toUpperCase()} - ${client.company_id.pincode}`,
            

              `GSTIN: ${client.company_id.gst} - `,
              "STATE CODE: 27 - ",
              `PAN: ${client.company_id.pan}\n`,

              `EMAIL: ${client.company_id.email.toUpperCase()}, `,
              ` MOBILE: +91 ${client.company_id.mobile}\n`,
          ],
          alignment: 'center',
          margin: [0, 0, 0, 10],});
      }      
      let amtTotal = 0;

      const totals = await SaleOrderModel.aggregate([
        { $match: { client_id: new mongoose.Types.ObjectId(filter.client_id) } },
        {
          $group: {
            _id: null,
            totalInvoice: { $sum: { $ifNull: ["$total_amount", 0] } },
            totalPaid: { $sum: { $ifNull: ["$paid_amount", 0] } },
          },
        },
      ]);


      let total = 0;
      let paid = 0;
      let outstanding = 0;

      if (totals.length > 0) {
        const { totalInvoice, totalPaid } = totals[0];
        total = totalInvoice || 0;
        paid = totalPaid || 0;
        outstanding = total - paid;
      }

  
       
        
      const body = [                          

            [
              { text: "Date", style: "tableHeader" },
              { text: "Remarks", style: "tableHeader" },
              { text: "Payment Method", style: "tableHeader" },
              { text: "Details", style: "tableHeader" },
              { text: "Amount", style: "tableHeader", alignment: "right" },
            ],
             ...orders.map((o) => {
                amtTotal += o.amount || 0;
                return [
                  { text: o.date
                    ? new Date(o.date)
                        .toISOString()
                        .split("T")[0]
                        .split("-")
                        .reverse()
                        .join("/")
                    : "" },
                  { text: o.remarks || "" },
                  { text: o.payment_method || "" },
                  {
                    text:
                      o.payment_method === "Cheque"
                        ? `Cheque No: ${o.cheque_no || "-"} | Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"}`
                        : o.payment_method === "Bank Transfer"
                        ? `Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"} | Transaction No: ${o.transaction_no || "-"}`
                        : o.payment_method === "Card"
                        ? `Card Number: ${o.card_number || "-"} | Transaction ID: ${o.transaction_no || "-"}`
                        : o.payment_method === "UPI"
                        ? `Transaction ID: ${o.transaction_no || "-"}`
                        : "-",
                  },

                  { text: formatINR(o.amount) || "0.00", alignment: "right" },
                ];
              }),
              [
                { text: "Total:",  colSpan: 4, style: "tableHeader", alignment: "right" },
                { text: "" },
                { text: "" },
                { text: "" },
                { text: formatINR(amtTotal) || "0.00", style: "tableHeader", alignment: "right" },
              ],
              [
                { text: "Total Outstanding:", colSpan: 4, style: "tableHeader", alignment: "right" },
                { text: "" },
                { text: "" },
                { text: "" },
                { text: formatINR(outstanding) || "0.00", style: "tableHeader", alignment: "right" },
              ],
          ];

      const docDefinition = {
        content: [
          contents,  
          {
            text: [
              { text: 'Receipts Report of ', style: 'header' },
              {
                text: client?.company_name?.trim()
                  ? client.company_name
                  : `${client?.first_name || ""} ${client?.last_name || ""}`,
                style: 'header',
                color: '#4169E1'
              }
            ]
          },

          {
            style: "tableExample",
            table: {
              headerRows: 1,
              widths: ["*", "*","*", "*", "*"],
              body
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
        ],
        styles: {
          header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
          tableHeader: { bold: true, fillColor: "#E5E5E5" },
        },
        defaultStyle: { fontSize: 7 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=purchase_report.pdf");

      pdfDoc.pipe(res);
      pdfDoc.end();

    

      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  purchasesReport: async (req, res) => {
    try {
      const { from,  ver_id } = req.query;
      const filter = {};
      const filters = {};
      console.log(ver_id);

      if (ver_id) filter.vendor_id = ver_id;
      if (ver_id) filters.vendor_id = ver_id;
     

      // if (from && from != 'Select') {
      //   filter.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   filter.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   filter.createdOn.$lte = toDate;
      // }
       let totalAmounts = 0;
      let paidAmounts = 0;
      let outstandingAmount = 0;

    

      if (from && from !== "all") {
        const saleOrder = await PurchaseOrderModel.findOne({ vendor_id: ver_id }).sort({ createdOn: -1 }).select("createdOn");
        const saleres= await PurchaseReceipt.findOne({ vendor_id: ver_id }).sort({ createdOn: -1 }).select("createdOn");


        const nowIST = moment.tz("Asia/Kolkata");

        const dates = [
          saleOrder?.createdOn,
          saleres?.createdOn,
        ].filter(Boolean);

        const latestJSDate = dates.length
          ? new Date(Math.max(...dates.map(d => new Date(d).getTime())))
          : nowIST.toDate();

        const latestDate = moment(latestJSDate).tz("Asia/Kolkata");

        let fromDate;

        if (from === "1d") {
          fromDate = latestDate.clone().subtract(1, "day").startOf("day").toDate();
        } else if (from === "1w") {
          fromDate = latestDate.clone().subtract(7, "day").startOf("day").toDate();
        } else if (from === "1m") {
          fromDate = latestDate.clone().subtract(1, "month").startOf("day").toDate();
        } else if (from === "3m") {
          fromDate = latestDate.clone().subtract(3, "month").startOf("day").toDate();
        } else {
          fromDate = latestDate.clone().subtract(6, "month").startOf("day").toDate();
        }

        const clientId = new mongoose.Types.ObjectId(ver_id);

        // Opening invoices before selected period
        const totals = await PurchaseOrderModel.aggregate([
          {
            $match: {
              vendor_id: clientId,
              order_date: { $lt: fromDate },
            },
          },
          {
            $group: {
              _id: null,
              totalInvoice: { $sum: "$total_amount" },
              totalPaid: { $sum: "$advance_amount" },
            },
          },
        ]);

        // Opening receipts before selected period
        const received = await PurchaseReceipt.aggregate([
          {
            $match: {
              vendor_id: clientId,
              date: { $lt: fromDate },
            },
          },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
            },
          },
        ]);

        const receiptAmount = received[0]?.amount || 0;

       

        if (totals.length > 0) {
          totalAmounts = totals[0].totalInvoice || 0;
          paidAmounts = (totals[0].totalPaid || 0) + receiptAmount;
          outstandingAmount = totalAmounts - paidAmounts;
        }

        
          filter.order_date = { $gte: fromDate, $lte: latestDate };
          filters.date = { $gte: fromDate, $lte: latestDate };

      }



     
      const orders = await PurchaseOrderModel.find(filter).populate({
                                                          path: 'vendor_id',
                                                      })                                                      
                                                      .populate({
                                                          path: 'details',
                                                          populate: [
                                                              {path: 'product_id'},
                                                          ],
                                                      }).lean();
    const payments = await PurchaseReceipt.find(filters);


    const formattedOrders = orders.map(o => ({
      type: "order",
      date: o.order_date,
      ...o,
      details: o.details,       // explicitly available now
      vendor_id: o.vendor_id,
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






      const client = await vendorModel.findById(ver_id).populate("company_id");
      
      const contents = [];
      const outstandingContent = [];
      console.log(outstandingAmount);

      // if(outstandingAmount != 0){
      //   outstandingContent.push({
      //     text: `Previous Invoiced Amt: ${totalAmounts} | Previous Paid Amt: ${paidAmounts}  | Previous Outstanding Amt: ${outstandingAmount}\n`,
      //     bold: true,
      //     fontSize: 10,
      //     alignment: 'center',
      //     margin: [0, 0, 0, 10],
      //   });

      // }
      



      if (client.company_id.letter_head && client.company_id.letter_head.trim() !== '') {
            const response = await axios.get(client.company_id.letter_head, { responseType: 'arraybuffer' });
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
              { text: `${client.company_id.name.toUpperCase()}\n`, bold: true, fontSize: 18, color:'#4169E1' },
              `${client.company_id.address.toUpperCase()} `,
              `${client.company_id.area.toUpperCase()} `,
              `${client.company_id.city.toUpperCase()} - ${client.company_id.pincode}`,
            

              `GSTIN: ${client.company_id.gst} - `,
              "STATE CODE: 27 - ",
              `PAN: ${client.company_id.pan}\n`,

              `EMAIL: ${client.company_id.email.toUpperCase()}, `,
              ` MOBILE: +91 ${client.company_id.mobile}\n`,
          ],
          alignment: 'center',
          margin: [0, 0, 0, 10],});
      }   
      
      console.log({
          totalAmounts: totalAmounts,
          paidAmounts: paidAmounts,
          outstandingAmount: outstandingAmount,
        });
      
      let totalAmount = totalAmounts;
      let paidAmount = paidAmounts;
      let balAmount = outstandingAmount;
      let remAmount = outstandingAmount;

      


     const body = [
      [
        { text: "Item", style: "tableHeader" },
        { text: "Type", style: "tableHeader" },
        { text: "Description", style: "tableHeader" },
        { text: "Size", style: "tableHeader" },
        { text: "Bags", style: "tableHeader" },
        { text: "Qty", style: "tableHeader" },
        { text: "Rate", style: "tableHeader" },
        { text: "Amount", style: "tableHeader", alignment: "right" },
        { text: "Received Amt", style: "tableHeader", alignment: "right" },
        { text: "Bal Amt", style: "tableHeader", alignment: "right" },
      ],

      // Use flatMap to handle nested details arrays
      ...mergedResult.flatMap((o, i) => {
       

        const rows = [];
        if (o.type === "order") {
           balAmount = balAmount + o.total_amount;
            totalAmount = totalAmount + o.total_amount;
        paidAmount = paidAmount + o.advance_amount;
        let remsAmount = o.total_amount - o.advance_amount;
        remAmount = remAmount + remsAmount;
          
          
          rows.push([
            {
              text: ` ${
                o.order_date
                  ? new Date(o.order_date)
                      .toISOString()
                      .split("T")[0]
                      .split("-")
                      .reverse()
                      .join("/")
                  : ""
              }  Invoice No ${o.invoice_no || ""}   Invoice Amount: ${o.total_amount}`,
              colSpan: 9,
              bold: true,
              fillColor: "#f2f2f2",
              margin: [3, 2, 0, 2],
            },
            {}, {}, {}, {}, {}, {}, {},{},{},
          ]);

          if (Array.isArray(o.details) && o.details.length > 0) {
            o.details.forEach((d) => {
              rows.push([
                { text: d.product_id.product?.toString() || "" },
                { text: d.product_id.type?.toString() || "" },
                { text: d.description?.toString() || "" },
                { text: d.product_id.size?.toString() || "" },
                {
                  text:
                    d.bags && Number(d.bags) > 0
                      ? `${(Number(d.bags))} x ${(Number(d.units)).toString()}`
                      : `1 x ${Number(d.qty).toString()}`
                },

                { text: d.qty?.toString() || "0" },
                { text: formatINR(d.price || "0"), alignment: "right" },
                { text: formatINR(d.amount || "0"), alignment: "right" },
                {}, {},
              ]);
            });
          }
        

          return rows;
        } else  {

         paidAmount = paidAmount + o.amount;
        remAmount = remAmount - o.amount;
          rows.push([
            {
              text: `   Date: ${
                o.date
                  ? new Date(o.date)
                      .toISOString()
                      .split("T")[0]
                      .split("-")
                      .reverse()
                      .join("/")
                  : ""
              }, ${o.remarks ? `Remarks: " ${o.remarks}` : ""}, Payment Method: ${o.payment_method},  ${o.payment_method === "Cheque"
                        ? `Cheque No: ${o.cheque_no || "-"} | Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"}`
                        : o.payment_method === "Bank Transfer"
                        ? `Drawee Bank: ${o.bank_name || "-"} | Branch: ${o.branch || "-"} | IFSC: ${o.ifsc || "-"} | Transaction No: ${o.transaction_no || "-"}`
                        : o.payment_method === "Card"
                        ? `Card Number: ${o.card_number || "-"} | Transaction ID: ${o.transaction_no || "-"}`
                        : o.payment_method === "UPI"
                        ? `Transaction ID: ${o.transaction_no || "-"}`
                        : "-"}`,
              colSpan: 7,
              bold: false,
              alignment: "left",
              fillColor: "#bfbfbf",
              margin: [3, 2, 0, 2],
            },
            {}, {}, {},{}, {}, {}, { text: formatINR(balAmount || "0"),fillColor: "#bfbfbf", alignment: "right" },  { text: formatINR(o.amount || "0"),fillColor: "#bfbfbf", alignment: "right" }, { text: formatINR(balAmount - o.amount || "0"),fillColor: "#bfbfbf", alignment: "right" },
          ]);
          balAmount = balAmount - o.amount;
         
           return rows;

        }

       
      }),

      

       [
         {text: " " , border: [ false, false, false, false ] }, 
         {text: " " , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
      ],
             [
        {text: "Thank you for your business!" , colSpan:3, rowSpan:3,  border: [ false, false, false, false ],  fontSize: 18,  bold: true  }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         {text: "" , border: [ false, false, false, false ] }, 
         { text: "Total  Amount" ,fillColor: "#f2f2f2",  colSpan:2,  alignment: "right",  bold: true }, 
         {text: "" , border: [ false, false, false, false ] }, 
        {text: formatINR(totalAmount || ""),fillColor: "#f2f2f2", alignment: "right" ,  bold: true }, 
      ],
      [
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" ,border: [ false, false, false, false ]  }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        { text: "Total Paid Amount", fillColor: "#f2f2f2", colSpan:2, alignment: "right",  bold: true }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: formatINR(paidAmount || ""), fillColor: "#f2f2f2", alignment: "right",  bold: true },

      ],
      [

        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: " " ,border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        {text: "" , border: [ false, false, false, false ] }, 
        { text: "Total Remaining  Amount" ,fillColor: "#f2f2f2",  colSpan:2, alignment: "right" ,  bold: true }, 
        {text: "" , border: [ false, false, false, false ] }, 
         {text: formatINR(remAmount || ""),fillColor: "#f2f2f2", alignment: "right" ,  bold: true },
      ],
    
    ];




      const docDefinition = {
        content: [
          contents,  
         {
            text: [
              { text: 'Purchase of ', style: 'header' },
              {
                text: client?.company_name?.trim()
                  ? client.company_name
                  : `${client?.first_name || ""} ${client?.last_name || ""}`,
                style: 'header',
                color: '#4169E1'
              }
            ]
          },
          outstandingContent,
          

          {
            style: "tableExample",
            table: {
              headerRows: 1,
              widths: [  "*","auto","auto","auto", "auto", "auto", "auto", "auto", "15%", "auto"],
              body
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
        ],
        styles: {
          header: { fontSize: 10, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
          tableHeader: { bold: true, fillColor: "#E5E5E5" },
        },
        defaultStyle: { fontSize: 8 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=purchase_report.pdf");

      pdfDoc.pipe(res);
      pdfDoc.end();    

      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },
 

  purchaseReport: async (req, res) => {
    try {
      const { from, to, type = "GST", format = "PDF", company_id, ver_id } = req.query;
      
       const filter = {};

      if (company_id) filter.company_id = company_id;
      if (ver_id) filter.vendor_id = ver_id;
      if (type === 'GST') {
        filter.invoice_type = { $ne: 'Non GST' };
      } else {
        filter.invoice_type = 'Non GST';
      }  
      
      // if (from && from != 'Select') {
      //   filter.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   filter.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   filter.createdOn.$lte = toDate;
      // }

      if (from && from != 'Select') {
        filter.createdOn = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        filter.createdOn.$gte = fromDate;

        filter.createdOn.$lte = toDate;
      }

      const orders = await PurchaseOrderModel.find(filter).populate("vendor_id");

      if (format === "PDF") {
        if (type === "NON_GST") {
          const body = [
            [
              { text: "Invoice No", style: "tableHeader" },
              { text: "Invoice Date", style: "tableHeader" },
              { text: "Vendor", style: "tableHeader" },
              { text: "Date", style: "tableHeader" },
              { text: "Amount", style: "tableHeader" },
              { text: "Discount", style: "tableHeader" },
              { text: "Total", style: "tableHeader" },
            ],
            ...orders.map((o) => [
              { text: o.invoice_no?.toString() || "" },
              { text: o.invoice_date
                      ? new Date(o.invoice_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "" },
             {
                text: `${
                  o.vendor_id?.company_name?.trim()
                    ? o.vendor_id.company_name
                    : `${o.vendor_id?.first_name || ""} ${o.vendor_id?.last_name || ""}`
                }`
              },

              { text: o.order_date
                      ? new Date(o.order_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "" },
              { text: o.amount?.toString() || "0" },
              { text: o.discount?.toString() || "0" },
              { text: o.total_amount?.toString() || "0" },
            ]),
          ];

          const docDefinition = {
            content: [
              { text: "Purchase Report (NON-GST)", style: "header" },
              {
                style: "tableExample",
                table: { headerRows: 1, widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"], body },
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
            ],
            styles: {
              header: { fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
              tableHeader: { bold: true, fillColor: "#E5E5E5" },
            },
            defaultStyle: { fontSize: 8 },
          };

          const pdfDoc = printer.createPdfKitDocument(docDefinition);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline; filename=purchase_report_non_gst.pdf");
          pdfDoc.pipe(res);
          pdfDoc.end();
        } else {
          // ---------------- GST PDF ----------------
          const body = [
            [
              { text: "GSTIN of supplier", style: "tableHeader" },
              { text: "Vendor", style: "tableHeader" },
              { text: "Invoice number", style: "tableHeader" },
              { text: "Invoice Type", style: "tableHeader" },
              { text: "Invoice Date", style: "tableHeader" },
              { text: "Invoice Value", style: "tableHeader" },
              { text: "Place of supply", style: "tableHeader" },
              { text: "Supply Attract Reverse Charge", style: "tableHeader" },
              { text: "Taxable Value (₹)", style: "tableHeader" },
              { text: "Integrated Tax(₹)", style: "tableHeader" },
              { text: "Central Tax(₹)", style: "tableHeader" },
              { text: "State/UT Tax(₹)", style: "tableHeader" },
              { text: "Applicable % of Tax Rate", style: "tableHeader" },
            ],
            ...orders.map((o) => [
              { text: o.vendor_id?.gst?.toString() || "" },
              {
                text: `${
                  o.vendor_id?.company_name?.trim()
                    ? o.vendor_id.company_name
                    : `${o.vendor_id?.first_name || ""} ${o.vendor_id?.last_name || ""}`
                }`
              },
              { text: o.invoice_no?.toString() || "" },
              { text:  "Regular" },
              { text: o.invoice_date
                      ? new Date(o.invoice_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "" },
              { text: o.total_amount?.toString() || "0" },
              { text:  "-" },
              { text:  "N" },
              { text: o.amount_before_tax?.toString() || "0" },
              { text: o.igst?.toString() || "0" },
              { text: o.cgst?.toString() || "0" },
              { text: o.sgst?.toString() || "0" },
               { text:  "18%" },
            ]),
          ];

          const docDefinition = {
            content: [
              { text: "Purchase Report (GST)", style: "header" },
              {
                style: "tableExample",
                table: { headerRows: 1, widths: Array(13).fill("auto"), body },
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
            ],
            styles: {
              header: { fontSize: 9, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
              tableHeader: { bold: true, fillColor: "#E5E5E5" },
            },
            defaultStyle: { fontSize: 7 },
          };

          const pdfDoc = printer.createPdfKitDocument(docDefinition);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline; filename=purchase_report_gst.pdf");
          pdfDoc.pipe(res);
          pdfDoc.end();
        }
      } else {
        // ---------------- Excel Export ----------------
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Purchase Report");

        if (type === "NON_GST") {
          worksheet.columns = [
            { header: "Order No", key: "order_no", width: 15 },
            { header: "Vendor", key: "vendor", width: 25 },
            { header: "Date", key: "date", width: 15 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Discount", key: "discount", width: 15 },
            { header: "Total", key: "total", width: 15 },
          ];

          orders.forEach((o) => {
            worksheet.addRow({
              order_no: o.invoice_no || "",
              vendor: `${
                o.vendor_id?.company_name?.trim()
                  ? o.vendor_id.company_name
                  : `${o.vendor_id?.first_name || ""} ${o.vendor_id?.last_name || ""}`
              }`,

              date: o.invoice_date
                      ? new Date(o.invoice_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "",
              amount: o.amount || 0,
              discount: o.discount || 0,
              total: o.total_amount || 0,
            });
          });
        } else {
         worksheet.columns = [
            { header: "GSTIN of Supplier", key: "gst_no", width: 20 },
            { header: "Vendor", key: "vendor", width: 25 },
            { header: "Invoice Number", key: "invoice_no", width: 20 },
            { header: "Invoice Type", key: "invoice_type", width: 15 },
            { header: "Invoice Date", key: "invoice_date", width: 15 },
            { header: "Invoice Value (₹)", key: "invoice_value", width: 20 },
            { header: "Place of Supply", key: "place_of_supply", width: 20 },
            { header: "Supply Attract Reverse Charge", key: "reverse_charge", width: 25 },
            { header: "Taxable Value (₹)", key: "amount_before_tax", width: 20 },
            { header: "Integrated Tax (₹)", key: "igst", width: 15 },
            { header: "Central Tax (₹)", key: "cgst", width: 15 },
            { header: "State/UT Tax (₹)", key: "sgst", width: 15 },
            { header: "Applicable % of Tax Rate", key: "tax_rate", width: 20 },
          ];


          orders.forEach((o) => {
            worksheet.addRow({
              gst_no: o.vendor_id?.gst || "",
              vendor: `${
                o.vendor_id?.company_name?.trim()
                  ? o.vendor_id.company_name
                  : `${o.vendor_id?.first_name || ""} ${o.vendor_id?.last_name || ""}`
              }`,
              invoice_no: o.invoice_no || "",
              invoice_type: "Regular", // default, or use o.invoice_type if available
              invoice_date: o.invoice_date
                      ? new Date(o.invoice_date)
                          .toISOString()
                          .split("T")[0]      
                          .split("-")         
                          .reverse()          
                          .join("/")        
                      : "",
              invoice_value: o.total_amount || 0,
              place_of_supply: "-", // fill state if available
              reverse_charge: "N", // or "Y" if applicable
              amount_before_tax: o.amount_before_tax || 0,
              igst: o.igst || 0,
              cgst: o.cgst || 0,
              sgst: o.sgst || 0,
              tax_rate: "18%", // or dynamically based on product/service
            });
          });

        }

        worksheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center" };
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader(
          "Content-Disposition",
          `inline; filename=purchase_report_${type.toLowerCase()}.xlsx`
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.send(buffer);
        return res.end();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },



  stockReports: async (req, res) => {
    try {
      const { type = 'GST', company_id, from = '' } = req.query;
      const matchCondition = {};

      if (company_id) matchCondition.company_id = company_id;
      if (type === 'GST') {
        matchCondition.invoice_type = { $ne: 'Non GST' };
      } else {
        matchCondition.invoice_type = 'Non GST';
      }  

      

      // if (from && from != 'Select') {
      //   matchCondition.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   matchCondition.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   matchCondition.createdOn.$lte = toDate;
      // }

      if (from && from != 'Select') {
        matchCondition.createdOn = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        matchCondition.createdOn.$gte = fromDate;

        matchCondition.createdOn.$lte = toDate;
      }

     

      
      const unfilterStocks = await SaleDetail.find()
          .populate({
            path: "product_id",            
          })
          .populate({
            path: "sales_order_id",
            match: matchCondition,
          });

      const stocks = unfilterStocks.filter((s) => s.sales_order_id);

      res.status(200).json({ success: true, orders: stocks }); 

     
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  stockReport: async (req, res) => {
    try {
      const { format = "PDF",type = 'GST', company_id, from, to, ver_id = '' } = req.query;
      const matchCondition = {};
      const filter = {};

      if (company_id) matchCondition.company_id = company_id;
      if (ver_id) filter.product_id = ver_id;
      if (type === 'GST') {
        matchCondition.invoice_type = { $ne: 'Non GST' };
      } else {
        matchCondition.invoice_type = 'Non GST';
      }  
      
      // if (from && from != 'Select') {
      //   matchCondition.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   matchCondition.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   matchCondition.createdOn.$lte = toDate;
      // }

      if (from && from != 'Select') {
        matchCondition.createdOn = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        matchCondition.createdOn.$gte = fromDate;

        matchCondition.createdOn.$lte = toDate;
      }




      const unfilterStocks = await SaleDetail.find(filter)
          .populate({
            path: "product_id",            
          })
          .populate({
            path: "sales_order_id",
            match: matchCondition,
          });

      const stocks = unfilterStocks.filter((s) => s.sales_order_id);

      // const stocks = await SaleDetail.find({})
      //   .populate({
      //     path: "product_id",
      //     match: { company_id: companyId },
      //   });


        

      if (format === "PDF") {
        // PDF Export
        const body = [
          [
            { text: "HSN", style: "tableHeader" },
            { text: "Description", style: "tableHeader" },
            { text: "UQC", style: "tableHeader" },
            { text: "Total Quantity", style: "tableHeader" },
            { text: "Total Value", style: "tableHeader" },
            { text: "Rate", style: "tableHeader" },
            { text: "Taxable Value", style: "tableHeader" },
            { text: "Integrated Tax Amount", style: "tableHeader" },
            { text: "Central Tax Amount", style: "tableHeader" },
            { text: "State/UT Tax Amount", style: "tableHeader" },
            { text: "Cess Amount", style: "tableHeader" },
          ],
          ...stocks.map((s) => [
            { text: s.product_id?.hsn?.toString() || "-" },
            { text: s.product_id?.product || "" },
            { text: "PAIR" },
            { text: s.qty?.toString() || "0" },
            { text: s.amount?.toString() || "0" },
            { text: s.price?.toString() || "0" },
            { text: s.amount?.toString() || "0" },
            { text: "0" },
            { text: "0" },
            { text: "0" },
            { text: "0" },
          ]),
        ];

        const docDefinition = {
          content: [
            { text: "HSN Report", style: "header" },
            {
              style: "tableExample",
              table: {
                headerRows: 1,
                widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
                body,
              },
            },
          ],
          styles: {
            header: { fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 20] },
            tableHeader: { bold: true, fillColor: "#E5E5E5" },
          },
          defaultStyle: { fontSize: 8 },
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=stock_report.pdf");
        pdfDoc.pipe(res);
        pdfDoc.end();
      } else {
        // Excel Export
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("HSN Report");

        worksheet.columns = [
          { header: "HSN", key: "hsn", width: 15 },
          { header: "Description", key: "description", width: 25 },
          { header: "UQC", key: "uqc", width: 10 },
          { header: "Total Quantity", key: "total_qty", width: 15 },
          { header: "Total Value", key: "total_value", width: 20 },
          { header: "Rate", key: "rate", width: 12 },
          { header: "Taxable Value", key: "taxable_value", width: 20 },
          { header: "Integrated Tax Amount", key: "igst", width: 20 },
          { header: "Central Tax Amount", key: "cgst", width: 20 },
          { header: "State/UT Tax Amount", key: "sgst", width: 20 },
          { header: "Cess Amount", key: "cess", width: 15 },
        ];

        stocks.forEach((s) => {
          worksheet.addRow({
            hsn: s.product_id?.hsn || "-",
            description: s.product_id?.product || "",
            uqc: s.product_id?.uqc || "-",
            total_qty: s.total_qty || 0,
            total_value: s.amount || 0,
            rate: s.price || 0,
            taxable_value: s.amount || 0,
            igst:  0,
            cgst:  0,
            sgst:  0,
            cess:  0,
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader("Content-Disposition", "inline; filename=stock_report.xlsx");
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.send(buffer);
        return res.end();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  salesReports: async (req, res) => {
    try {
      const {  type = "GST",  company_id, from } = req.query;
      const filter = {};

      if (company_id) filter.company_id = company_id;
      if (type === 'GST') {
        filter.invoice_type = { $ne: 'Non GST' };
      } else {
        filter.invoice_type = 'Non GST';
      }  

      // if (from && from != 'Select') {
      //   filter.createdOn = {};
      //   const now = new Date();
      //   const fromDate = new Date(now.getFullYear(), now.getMonth() - from, now.getDate());
      //   fromDate.setHours(0, 0, 0, 0); 
      //   filter.createdOn.$gte = fromDate;

      //   const toDate = new Date();
      //   toDate.setHours(23, 59, 59, 999); 
      //   filter.createdOn.$lte = toDate;
      // }


      if (from && from != 'Select') {
        filter.createdOn = {};
        const nowIST = moment.tz("Asia/Kolkata");
        const fromDate = nowIST.clone().subtract(Number(from), "months").startOf("day").add(5.5, "hours").toDate();

        const toDate = nowIST.clone().endOf("day").add(5.5, "hours").toDate();
        filter.createdOn.$gte = fromDate;

        filter.createdOn.$lte = toDate;
      }

     
     
      const orders = await SaleOrderModel.find(filter).populate("client_id");
      res.status(200).json({ success: true, orders: orders }); 


      
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },
 

purchaseReports: async (req, res) => {
  try {

    const { type = "GST", company_id, from, vendor_id, format } = req.query;

    const filter = {};

    if (company_id) filter.company_id = company_id;
if (vendor_id) filter.vendor_id = vendor_id;
    if (type === "GST") {
      filter.invoice_type = { $ne: "Non GST" };
    } else {
      filter.invoice_type = "Non GST";
    }

    // 🔹 Date Filter
    if (from && from !== "all") {

      const nowIST = moment.tz("Asia/Kolkata");

      let fromDate;

      if (from === "1d") {
        fromDate = nowIST.clone().subtract(1, "day").startOf("day").toDate();
      }
      else if (from === "1w") {
        fromDate = nowIST.clone().subtract(7, "day").startOf("day").toDate();
      }
      else if (from === "1m") {
        fromDate = nowIST.clone().subtract(1, "month").startOf("day").toDate();
      }
      else if (from === "3m") {
        fromDate = nowIST.clone().subtract(3, "month").startOf("day").toDate();
      }
      else {
        fromDate = nowIST.clone().subtract(6, "month").startOf("day").toDate();
      }

      const toDate = nowIST.clone().endOf("day").toDate();

      filter.invoice_date = {
        $gte: fromDate,
        $lte: toDate
      };
    }

    const orders = await PurchaseOrderModel
      .find(filter)
      .populate("vendor_id");

 let taxableTotal = 0;
let taxTotal = 0;
let grandTotal = 0;
let paidTotal = 0;
let balanceTotal = 0;

const report = orders.map(o => {

  const taxable = o.amount_before_tax || 0;
  const cgst = o.cgst || 0;
  const sgst = o.sgst || 0;
  const igst = o.igst || 0;

  const totalTax = cgst + sgst + igst;

  const invoiceTotal = o.total_amount || 0;

  const paid = o.advance_amount || 0;

  const balance = invoiceTotal - paid;

  // 🔹 accumulate totals
  taxableTotal += taxable;
  taxTotal += totalTax;
  grandTotal += invoiceTotal;
  paidTotal += paid;
  balanceTotal += balance;

  return {

    purchase_date: o.invoice_date,

    invoice_number: o.invoice_no,

    vendor_name:
      o.vendor_id?.company_name ||
      `${o.vendor_id?.first_name || ""} ${o.vendor_id?.last_name || ""}`,

    gstin: o.vendor_id?.gst || "",

    state: o.vendor_id?.state || "",

    taxable_amount: taxable,

    cgst: cgst,

    sgst: sgst,

    igst: igst,

    total_tax: totalTax,

    grand_total: invoiceTotal,

    amount_paid: paid,

    balance_amount: balance,

    payment_status:
      balance === 0
        ? "Paid"
        : paid > 0
        ? "Partial"
        : "Unpaid",

    itc_eligible: "Yes",

    reverse_charge: "No"
  };

});


if (format === "excel") {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Purchase Report");

  worksheet.columns = [

    { header: "Purchase Date", key: "purchase_date", width: 15 },
    { header: "Invoice Number", key: "invoice_number", width: 20 },
    { header: "Vendor", key: "vendor_name", width: 25 },
    { header: "GSTIN", key: "gstin", width: 20 },
    { header: "State", key: "state", width: 15 },

    { header: "Taxable Amount", key: "taxable_amount", width: 18 },
    { header: "CGST", key: "cgst", width: 12 },
    { header: "SGST", key: "sgst", width: 12 },
    { header: "IGST", key: "igst", width: 12 },

    { header: "Total Tax", key: "total_tax", width: 15 },

    { header: "Grand Total", key: "grand_total", width: 18 },

    { header: "Amount Paid", key: "amount_paid", width: 18 },
    { header: "Balance", key: "balance_amount", width: 18 },

    { header: "Payment Status", key: "payment_status", width: 15 },

    { header: "ITC Eligible", key: "itc_eligible", width: 15 },
    { header: "Reverse Charge", key: "reverse_charge", width: 18 }

  ];

  report.forEach(r => {
    worksheet.addRow(r);
  });

  // Style header
  worksheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=purchase_report.xlsx"
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(buffer);

  return res.end();
}

  res.json({
  success: true,

  summary: {
    taxable_total: taxableTotal,
    total_tax: taxTotal,
    grand_total: grandTotal,
    paid_total: paidTotal,
    balance_total: balanceTotal
  },

  data: report
});

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
},


  lowStock: async (req, res) => {
    try {
      const companyId = req.params.companyId;
      
      const page = parseInt(req.query.page) || 1;
      console.log("page");
      console.log(page);
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await OrderModel.find({ company_id: companyId })
        .populate("client_id service_id")
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

  balancesheet: async (req, res) => {
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


};

module.exports = reportController;
