import userModel from "../models/userModel.js";
import tokenBlackListModel from "../models/blackList.model.js";
import jwt from "jsonwebtoken";
import { sendRegistrationEmail } from "../services/nodemailer.services.js";
import e from "express";

// User register controller
// POST /api/auth/register

export const userRegisterController = async (req, res) => {
  const { email, password, name, phone } = req.body;

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
    phone: phone,
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
// POST /api/auth/login

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
      phone: user.phone,
    },
    token,
  });
};

/**
 * Change some details of the user like email, phone number, password etc.
 * - PUT /api/auth/update
 * - User must be logged in to access this route
 */

export const userUpdateController = async (req, res) => {
  const { email, phone, newPassword, currPassword } = req.body;
  const userId = req.user._id;

  // Check if at least one field is provided for update
  if (!email && !phone && !newPassword) {
    return res.status(400).json({
      message:
        "At least one field (email, phone, newPassword) is required for update ",
    });
  }

  if (!currPassword) {
    return res.status(400).json({
      message: "Current password is required to update user details",
    });
  }
  try {
    const updateData = {};

    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (newPassword) updateData.password = newPassword;

    const user = await userModel.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const checkPassword = await user.comparePassword(currPassword);

    if (!checkPassword) {
      return res.status(401).json({
        message: "Incorrect password",
      });
    }

    Object.assign(user, updateData);
    await user.save();

    res.status(200).json({
      message: "User details updated successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "An error occurred while updating user details",
    });
  }
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
