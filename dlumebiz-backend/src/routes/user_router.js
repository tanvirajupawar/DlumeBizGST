const UserController = require("../controllers/user_controller");

const userRouter = require("express").Router();

userRouter.post("/user/createAccount", UserController.createAccount);
userRouter.post("/user/signIn", UserController.signIn);
userRouter.put("/user/profile/:id", UserController.update);
userRouter.get("/user/change_password/:id", UserController.changePassword);

module.exports = userRouter;