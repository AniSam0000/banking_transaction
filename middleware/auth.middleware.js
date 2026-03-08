import userModel from "../models/userModel.js";
import tokenBlackListModel from "../models/blackList.model.js";

import jwt from "jsonwebtoken";

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access , token is missing",
    });
  }

  // To check if the token is blacklisted or not
  const isBlackListed = await tokenBlackListModel.findOne({ token });

  if (isBlackListed) {
    return res.status(401).json({
      message: "Token is blacklisted",
    });
  }
  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId);

    req.user = user;
    return next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized access , token is missing",
    });
  }
}

export default authMiddleware;
