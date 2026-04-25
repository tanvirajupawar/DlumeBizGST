const categoryModel = require("../models/category_model");

const categoryController = {
    createCategory: async function (req, res) {
        try {
                const data = req.body;
                const category = new categoryModel(data);
                await category.save();

                return res.json({ success: true, data:category, message: "Category Created Successfully"});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    fetchCategories: async function (req, res) {
        try {
                const categories = await categoryModel.find();

                return res.json({ success: true, data:categories});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    fetchCategory: async function (req, res) {
        try {
            const id = req.params.id;
            const category = await categoryModel.findById(id);

            return res.json({ success: true, data:category});  
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    }
}

module.exports = categoryController;