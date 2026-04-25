const companyModel = require("../models/company_model");
const UserModel = require("../models/user_model");
const cloudinary = require('cloudinary').v2;

const companyControler = {
  index: async function (req, res) {
    try {
      const companies = await companyModel.find();

      return res.json({ success: true, data: companies });
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
      const company = new companyModel(data);
      await company.save();

      if (data.owner_email && data.owner_email.trim() !== '') {
        let adminUser = await UserModel.findOne({ email: data.owner_email });

        if (adminUser) {
          adminUser.company_id = company._id;
          await adminUser.save();
        } 

      }
      if (company.owner_mobile && company.owner_mobile.trim() !== '') {
        let adminUser = await UserModel.findOne({ phoneNumber: company.owner_mobile });

        if (adminUser) {
          adminUser.company_id = company._id;
          await adminUser.save();
        } 

      }

      

      return res.json({
        success: true,
        data: company,
        message: "Company Created Successfully",
      });
    } catch (error) {
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
      const company = await companyModel.findById(id).sort({ createdOn: -1 });

      return res.json({ success: true, data: company });
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
      console.log(updateData);

       let logoUrl = null;
      let letterUrl = null;
      
       if (updateData.letter_base) {
        const letterUpload = await cloudinary.uploader.upload(
          `data:image/png;base64,${updateData.letter_base}`, 
          { folder: 'company_letterhaeds', public_id: updateData.letter_name?.split('.')[0] }
        );
        letterUrl = letterUpload.secure_url;
        updateData.letter_head = letterUrl;
      }

      // Upload letterhead if provided
      if (updateData.logobase) {
        const logoUpload = await cloudinary.uploader.upload(
          `data:image/png;base64,${updateData.logobase}`, 
          { folder: 'company_logo', public_id: updateData.logo_name?.split('.')[0] }
        );
        
        logoUrl = logoUpload.secure_url;
        updateData.logo = logoUrl;
        
      }

      const updatedCompany = await companyModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedCompany) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found", error: "Company not found" });
      }

      return res.json({ success: true, data: updatedCompany });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
      });
    }
  },

  delete: async function (req, res) {
    try {
      const id = req.params.id;

      const deletedCompany = await companyModel.findByIdAndDelete(id);

      if (!deletedCompany) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found", error: "Company not found" });
      }

      return res.json({
        success: true,
        message: "Company deleted successfully",
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

module.exports = companyControler;
