const UserModel = require("../models/user_model");
const bcrypt = require("bcrypt");
const {  sendToken } = require('../middlewares/token');



const UserController = {
    createAccount: async function(req, res){
        
        try {
            const userData = req.body;
            if (userData.email && userData.email.trim() !== '') {
                const existingUser = await UserModel.findOne({ email: userData.email });
        
                if (existingUser) {
                    return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email',
                    error: `Email ${userData.email} is already registered`,
                    });
                }
        
            }
    
            if (userData.phoneNumber && userData.phoneNumber.trim() !== '') {
                const checkUser = await UserModel.findOne({ phoneNumber: userData.phoneNumber });
        
                if (checkUser) {
                    return res.status(400).json({
                    success: false,
                    message: 'User already exists with this Mobile No',
                    error: `Mobile No ${userData.phoneNumber} is already registered`,
                    });
                }
            }
            const newUser = new UserModel(userData);
            await newUser.save();

            return res.json({ success: true, data:newUser, message: "User Created Successfully"});         

            
        } catch (err) {
            console.log(err);
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: err.message || err
            });
        }

    },

    signIn: async function(req, res) {
        try {
            const { username, password} = req.body;

             const user = await UserModel.findOne({
                $or: [{ email: username }, { phoneNumber: username }]
            });

            if(!user){
                return res.status(404).json({
                    success: false,
                    message: "User Not Found",
                    error: 'User Not Found for username ' + username,
                });

            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if(!passwordMatch){
                 console.log("Incorrect");
                return res.status(500).json({
                    success: false,
                    message: "Incorrect Password",
                    error: "Incorrect Password"
                });

            }
            sendToken(user, 200, res);
            
        } catch (error) {
             return res.status(500).json({
                success: false,
                message: "Server Error",
                error: error.message || error
            });
            
        }
        
    },

    update: async function (req, res) {
        try {
            const id = req.params.id;
            const updateData = req.body;

            delete updateData.email;
            delete updateData.phoneNumber;
    
            const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true,
            });
        
            if (!updatedUser) {
                return res
                .status(404)
                .json({ success: false, message: "User not found", error: "User not found" });
            }
        
            return res.json({ success: true, user: updatedUser });
        } catch (error) {

          return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message || error,
          });
        }
    },

    
    changePassword: async function (req, res) {
    try {
        const userId = req.params.id;
        // const { oldPassword, newPassword } = req.body;

       

        // 1️⃣ Find user
        const user = await UserModel.findById(userId).select("+password");
        if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
        }

        // // 2️⃣ Verify old password
        // const isMatch = await bcrypt.compare('Falak@786', 'Falak786');
        // if (!isMatch) {
        // return res.status(400).json({
        //     success: false,
        //     message: "Old password is incorrect",
        // });
        // }

        // 3️⃣ Hash new password
        const hashedPassword = 'Falak@786';

        // 4️⃣ Update password only
        user.password = hashedPassword;
        await user.save();

        return res.json({
        success: true,
        message: "Password changed successfully",
        });

    } catch (error) {
        return res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message || error,
        });
    }
    }

};


module.exports = UserController;