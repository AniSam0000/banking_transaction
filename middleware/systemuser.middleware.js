import userModel from "../models/userModel.js";
import tokenBlackListModel from "../models/blackList.model.js";

import jwt from "jsonwebtoken";

export const authSystemUserMiddleware = async (req, res, next) => {
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

    const user = await userModel.findById(decoded.userId).select("+systemUser");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (!user.systemUser) {
      res.status(403).json({
        message: "Forbidden access , not a system user",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized access , Invalid or missing token",
    });
  }
};
