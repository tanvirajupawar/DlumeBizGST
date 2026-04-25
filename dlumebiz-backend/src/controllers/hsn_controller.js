const axios = require("axios");

exports.getHSN = async (req, res) => {

  try {

    const response = await axios.get(
      "https://countriesnow.space/api/v0.1/countries/states"
    );

    // Example dataset fallback (HSN for footwear etc.)
    const hsnData = [
      { code: "6401", description: "Waterproof footwear", gst_rate: 18 },
      { code: "6402", description: "Footwear with rubber/plastic soles", gst_rate: 18 },
      { code: "6403", description: "Footwear with leather uppers", gst_rate: 18 },
      { code: "6404", description: "Textile footwear", gst_rate: 18 },
      { code: "6405", description: "Other footwear", gst_rate: 18 },
      { code: "6406", description: "Parts of footwear", gst_rate: 18 }
    ];

    res.json({
      success: true,
      data: hsnData
    });

  } catch (err) {

    console.log("HSN API ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};