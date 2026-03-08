import userModel from "../models/userModel.js";
import tokenBlackListModel from "../models/blackList.model.js";
import jwt from "jsonwebtoken";
import { sendRegistrationEmail } from "../services/nodemailer.services.js";

// User register controller
// POST /api/auth/register

export const userRegisterController = async (req, res) => {
  const { email, password, name } = req.body;

  const isExist = await userModel.findOne({
    email: email,
  });

  if (isExist) {
    return res
      .status(422)
      .json({ message: "User already exists", status: "failed" });
  }
  const user = await userModel.create({
    email: email,
    name: name,
    password: password,
  });

  const token = await jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });

  await sendRegistrationEmail(user.email, user.name);
};

// User login controller
// POST /api/auth/register

export const userLoginController = async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email: email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Incorrect email or password",
    });
  }

  const isValidPass = await user.comparePassword(password);

  if (!isValidPass) {
    return res.status(401).json({
      message: "Incorrect email or password",
    });
  }

  const token = await jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
};

/**
 * - User logout controller
 * - POST api/auth/logout
 */

export const userLogoutController = async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }
  res.cookie("token", "", {
    expires: new Date(0),
  });

  await tokenBlackListModel.create({
    token: token,
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
};
