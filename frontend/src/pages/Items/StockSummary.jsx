import { useState, useEffect } from "react";
import axios from "axios";
import {
  FiDownload,
  FiPrinter,
  FiShare2,
} from "react-icons/fi";
import { LuPackage, LuBoxes } from "react-icons/lu";

import Table from "../../components/Table";

const fmt = (n) =>
  n === 0
    ? "₹0"
    : "₹" + Number(n).toLocaleString("en-IN");

export default function StockSummary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCategory, setSearchCategory] =
    useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);

      const company_id =
        localStorage.getItem("company_id");

      const res = await axios.get(
        `http://localhost:8000/api/product/company/${company_id}`
      );

      setItems(
        (res.data.data || []).map((item) => ({
          id: item._id,

          name: item.product || "",

          hsn: item.hsn || "-",

          purchasePrice: Number(
            item.purchase_price ??
              item.purchasePrice ??
              item.price ??
              item.cost ??
              0
          ),

          sellingPrice: Number(item.mrp ?? 0),

          stockQuantity: Number(
            item.total ?? item.total_stock ?? 0
          ),

          unit: item.unit || "PCS",

          category: item.category || "",
        }))
      );
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      searchCategory === "" ||
      item.category
        .toLowerCase()
        .includes(searchCategory.toLowerCase()) ||
      item.name
        .toLowerCase()
        .includes(searchCategory.toLowerCase())
  );

  // ── EXPORT DATA ─────────────────────────────

  const exportData = filteredItems.map(
    (item, i) => ({
      sr: i + 1,

      name: item.name,

      hsn: item.hsn,

      purchasePrice: item.purchasePrice,

      sellingPrice: item.sellingPrice,

      stockQuantity: item.stockQuantity,

      stockValue:
        item.stockQuantity *
        item.purchasePrice,
    })
  );

  const exportColumns = [
    { key: "sr", label: "Sr No" },

    { key: "name", label: "Item Name" },

    { key: "hsn", label: "HSN" },

    {
      key: "purchasePrice",
      label: "Purchase Price",
    },

    {
      key: "sellingPrice",
      label: "Selling Price",
    },

    { key: "stockQuantity", label: "Qty" },

    { key: "stockValue", label: "Value" },
  ];

  // ── PDF GENERATOR ─────────────────────────────

  const generatePDFFile = async (
    data,
    columns,
    title
  ) => {
    const { jsPDF } = await import("jspdf");

    const autoTable = (
      await import("jspdf-autotable")
    ).default;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageW = 210;
    const pageH = 297;
    const margin = 15;

    const now = new Date();

    const dateStr =
      now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const txt = (
      text,
      x,
      y,
      opts = {}
    ) => {
      doc.text(String(text ?? ""), x, y, opts);
    };

    const line = (
      x1,
      y1,
      x2,
      y2
    ) => {
      doc.setDrawColor(180, 180, 180);

      doc.setLineWidth(0.25);

      doc.line(x1, y1, x2, y2);
    };

    // HEADER

    doc.setFont("helvetica", "bold");

    doc.setFontSize(11);

    txt("D'Lume", margin, 14);

    doc.setFont("helvetica", "normal");

    doc.setFontSize(7.5);

    txt("Ph: 9137826646", margin, 19);

    doc.setFontSize(9);

    txt(title, pageW - margin, 14, {
      align: "right",
    });

    doc.setFontSize(7.5);

    txt(
      `Generated: ${dateStr}`,
      pageW - margin,
      19,
      {
        align: "right",
      }
    );

    line(
      margin,
      22,
      pageW - margin,
      22
    );

    autoTable(doc, {
      startY: 30,

      head: [columns.map((c) => c.label)],

      body: data.map((row) =>
        columns.map(
          (c) => row[c.key] ?? "—"
        )
      ),

      styles: {
        fontSize: 8,

        cellPadding: 3,
      },

      headStyles: {
        fillColor: [240, 240, 240],

        textColor: [20, 20, 20],

        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },

      didDrawPage: (hookData) => {
        doc.setFontSize(7);

        line(
          margin,
          pageH - 11,
          pageW - margin,
          pageH - 11
        );

        txt(
          `Page ${hookData.pageNumber}`,
          pageW - margin,
          pageH - 6,
          {
            align: "right",
          }
        );

        txt(
          "D'Lume — Confidential",
          margin,
          pageH - 6
        );
      },
    });

    const blob = doc.output("blob");

    return new File(
      [blob],
      `${title}.pdf`,
      {
        type: "application/pdf",
      }
    );
  };

  // ── EXCEL GENERATOR ─────────────────────────────

  const generateExcelFile = async (
    data,
    columns,
    title
  ) => {
    const XLSX = await import("xlsx");

    const wb = XLSX.utils.book_new();

    const rows = [];

    rows.push(["D'Lume"]);

    rows.push(["Ph: 9137826646"]);

    rows.push([`Report: ${title}`]);

    rows.push([
      `Generated: ${new Date().toLocaleDateString(
        "en-GB"
      )}`,
    ]);

    rows.push([]);

    rows.push(
      columns.map((c) => c.label)
    );

    data.forEach((row) => {
      rows.push(
        columns.map((c) => row[c.key])
      );
    });

    const ws =
      XLSX.utils.aoa_to_sheet(rows);

    ws["!cols"] = columns.map(() => ({
      wch: 18,
    }));

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      title.substring(0, 31)
    );

    const wbout = XLSX.write(wb, {
      bookType: "xlsx",

      type: "array",
    });

    const blob = new Blob([wbout], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return new File(
      [blob],
      `${title}.xlsx`,
      {
        type: blob.type,
      }
    );
  };

  // ── DOWNLOAD ─────────────────────────────

  const triggerDownload = (file) => {
    const url =
      URL.createObjectURL(file);

    const a =
      document.createElement("a");

    a.href = url;

    a.download = file.name;

    a.click();

    URL.revokeObjectURL(url);
  };

  // ── ACTIONS ─────────────────────────────

  const handleExcel = async () => {
    const file =
      await generateExcelFile(
        exportData,
        exportColumns,
        "Stock Summary"
      );

    triggerDownload(file);
  };

  const handlePDF = async () => {
    const file =
      await generatePDFFile(
        exportData,
        exportColumns,
        "Stock Summary"
      );

    triggerDownload(file);
  };

  const handleShare = async () => {
    try {
      const file =
        await generatePDFFile(
          exportData,
          exportColumns,
          "Stock Summary"
        );

      if (
        navigator.canShare &&
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share({
          title: "Stock Summary",

          files: [file],
        });
      } else {
        alert("Sharing not supported");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
  window.exportStockExcel = handleExcel;
  window.exportStockPDF = handlePDF;
}, [filteredItems]);

  // ── TOTALS ─────────────────────────────

  const totalStockValue =
    filteredItems.reduce(
      (sum, item) =>
        sum +
        item.stockQuantity *
          item.purchasePrice,
      0
    );

  const totalStockQty =
    filteredItems.reduce(
      (sum, item) =>
        sum + item.stockQuantity,
      0
    );

  // ── TABLE COLUMNS ─────────────────────────────

  const columns = [
    { key: "sr", label: "Sr No" },

    {
      key: "name",
      label: "Item Name",
    },

    {
      key: "hsn",
      label: "HSN Code",
    },

    {
      key: "purchasePrice",

      label: "Purchase Price",

      render: (v) => fmt(v),
    },

    {
      key: "sellingPrice",

      label: "Selling Price",

      render: (v) => fmt(v),
    },

    {
      key: "stockQuantity",

      label: "Stock Qty",
    },

    {
      key: "stockValue",

      label: "Stock Value",

      render: (_, row) =>
        fmt(
          row.stockQuantity *
            row.purchasePrice
        ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-5">

        {/* TOP CARDS */}

        <div className="flex items-center gap-4 flex-wrap">

          {/* VALUE */}

          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 mb-1.5">
              <LuBoxes size={13} />
              Total Stock Value
            </div>

            <p className="text-xl font-bold text-gray-800 tabular-nums">
              {loading
                ? "—"
                : fmt(totalStockValue)}
            </p>
          </div>

          {/* QTY */}

          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 mb-1.5">
              <LuPackage size={13} />
              Total Stock Quantity
            </div>

            <p className="text-xl font-bold text-gray-800 tabular-nums">
              {loading
                ? "—"
                : totalStockQty.toLocaleString(
                    "en-IN"
                  )}
            </p>
          </div>

          <div className="flex-1" />
        </div>

      
        {/* TABLE */}

        <Table
          columns={columns}
          data={filteredItems.map(
            (item, i) => ({
              ...item,

              sr: i + 1,
            })
          )}
          searchPlaceholder="Search items..."
        />
      </div>
    </div>
  );
}