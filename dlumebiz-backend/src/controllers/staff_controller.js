const StaffModel = require("../models/staff_model");
const UserModel = require("../models/user_model");

const staffController = {
  // GET /staff?search=vinod&page=2&limit=10
  index: async function (req, res) {
    try {
      const { search = "", page = 1, limit = 10 } = req.query;
      const query = {
        $or: [
          { first_name: { $regex: search, $options: "i" } },
          { last_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };

      const staffList = await StaffModel.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await StaffModel.countDocuments(query);

      return res.json({
        success: true,
        data: staffList,
        total,
        page: parseInt(page),
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


      const userData = {
        company_id: data.company_id,
        name: `${data.first_name} ${data.last_name}`,
        password: data.password, 
        phoneNumber: data.contact_no1,
        address: `${data.address_line_1} ${data.address_line_2 || ""}`.trim(),
        city: data.city,
        state: data.state,
        role: data.designation,
        active: true
      };

      if (data.email && data.email.trim() !== '') {
        const existingUser = await UserModel.findOne({ email: data.email });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'User already exists with this email',
            error: `Email ${data.email} is already registered`,
          });
        }
        userData.email = data.email;

      }

      if (data.contact_no_1 && data.contact_no_1.trim() !== '') {
        const checkUser = await UserModel.findOne({ phoneNumber: data.contact_no_1 });

        if (checkUser) {
          return res.status(400).json({
            success: false,
            message: 'User already exists with this Mobile No',
            error: `Mobile No ${data.contact_no_1} is already registered`,
          });
        }
        userData.phoneNumber = data.contact_no_1;
      }

      const user = new UserModel(userData);
      await user.save();


      const staff = new StaffModel({
        ...data,
        user_id: user._id, 
      });

      await staff.save();

     

      return res.json({
        success: true,
        data: { staff, user },
        message: "Staff and user login created successfully",
      });
    } catch (error) {
         console.error("Create Staff Error:", error); // Log full error

      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Get staff by ID
  fetch: async function (req, res) {
    try {
      const id = req.params.id;
      const staff = await StaffModel.findById(id);

      return res.json({ success: true, data: staff });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Update staff by ID
  update: async function (req, res) {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const updatedStaff = await StaffModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedStaff) {
        return res
          .status(404)
          .json({ success: false, message: "Staff not found", error: "Staff not found"  });
      }

      return res.json({ success: true, data: updatedStaff });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  // Delete staff by ID
  delete: async function (req, res) {
    try {
      const id = req.params.id;

      const deletedStaff = await StaffModel.findByIdAndDelete(id);

      if (!deletedStaff) {
        return res
          .status(404)
          .json({ success: false, message: "Staff not found",  error: "Staff not found",});
      } else {
        if (deletedStaff.user_id) {
          await UserModel.findByIdAndDelete(deletedStaff.user_id);
        }
        return res.status(200).json({ message: "Staff and linked user deleted successfully" });
      }      
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },
  // Find staff by company_id
  findByCompanyId: async function (req, res) {
    try {
      const companyId = req.params.company_id;
      const { search = "", page = 1, limit = 10 } = req.query;

      const query = {
        company_id: companyId
      };

      const staffList = await StaffModel.find(query).sort({ createdOn: -1 });

      const total = await StaffModel.countDocuments(query);

      return res.json({
        success: true,
        data: staffList,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        message: `Staff under company ID ${companyId}`,
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

module.exports = staffController;
