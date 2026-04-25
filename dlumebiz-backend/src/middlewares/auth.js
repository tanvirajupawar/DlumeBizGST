const jwt = require('jsonwebtoken');
const UserModel = require("../models/user_model");

// Async error wrapper
const CatchAsyncError = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

//  Authenticated user
exports.isAuthenticated = CatchAsyncError(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next("Please login to access this resource");
  }

  const access_token = authHeader.split(" ")[1];
  console.log(access_token);

  try {
    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN); // use your secret
    console.log(decoded.id);

    const user = await UserModel.findById(decoded.id).select("-password");
    if (!user) {
      return next("User not found");
    }

    req.user = user;
    next();
  } catch (err) {
     console.log("JWT Error:", err.name, err.message);
    return next("Access token is invalid or expired");
  }
});

//  Role-based access
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role || "")) {
      const err = new Error(`Role: ${req.user?.role} is not allowed to access this resource`);
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
};
