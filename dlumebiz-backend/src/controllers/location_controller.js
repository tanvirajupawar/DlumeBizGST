const axios = require("axios");


// ================= GET STATES =================
exports.getStates = async (req, res) => {

  try {

    const response = await axios.post(
      "https://countriesnow.space/api/v0.1/countries/states",
      { country: "India" }
    );

    if (!response.data || !response.data.data) {
      return res.json({
        success: false,
        message: "Unable to fetch states"
      });
    }

    const states = response.data.data.states.map((s) => s.name);

    res.json({
      success: true,
      data: states
    });

  } catch (error) {

    console.error("States API Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch states"
    });

  }

};



// ================= GET CITIES =================
exports.getCities = async (req, res) => {

  try {

    const { state } = req.params;

    const response = await axios.post(
      "https://countriesnow.space/api/v0.1/countries/state/cities",
      {
        country: "India",
        state: state
      }
    );

    if (!response.data || !response.data.data) {
      return res.json({
        success: false,
        message: "Unable to fetch cities"
      });
    }

    res.json({
      success: true,
      data: response.data.data
    });

  } catch (error) {

    console.error("Cities API Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch cities"
    });

  }

};