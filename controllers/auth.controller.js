import jwt from "jsonwebtoken";
import { sendRegistrationEmail } from "../services/nodemailer.services.js";
import pool from "../config/db.js";



import bcrypt from "bcryptjs";

// User register controller
// POST /api/auth/register

export const userRegisterController = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if all of the required fields are provided
    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        message: "All fields are required",
        status: "failed",
      });
    }

    const isExist = await pool.query("SELECT email FROM users WHERE email = $1", [email]);

    if (isExist.rows.length > 0) {
      return res
        .status(422)
        .json({ message: "User already exists", status: "failed" });
    }

    // Hash the password before saving to database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Save the user to database
    const user = await pool.query(
      "INSERT INTO users (email, password, name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, name",
      [email, hashedPassword, name, phone]
    );

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "3d",
    });

    res.cookie("token", token,{
      httpOnly: true,
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
    });

    res.status(201).json({
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name,
      },
      token,
    });

    // await sendRegistrationEmail(user.rows[0].email, user.rows[0].name);
  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      message: "An error occurred during registration",
    });
  }
};

// User login controller
// POST /api/auth/login

export const userLoginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Check if all of the required fields are provided
    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const user = await pool.query("SELECT id, email, name, phone, password FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      return res.status(401).json({
        message: "Incorrect email or password",
      });
    }

    const isValidPass = await bcrypt.compare(password, user.rows[0].password);

    if (!isValidPass) {
      return res.status(401).json({
        message: "Incorrect email or password",
      });
    }

    const token = jwt.sign({ userId: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
    });

    res.status(200).json({
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name,
        phone: user.rows[0].phone,
      },
      token,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "An error occurred during login",
    });
  }
};

/**
 * Change some details of the user like email, phone number, password etc.
 * - PUT /api/auth/update
 * - User must be logged in to access this route
 */

export const userUpdateController = async (req, res) => {
  const { email, phone, newPassword, currPassword } = req.body;
  const userId = req.user.id;

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

  // Maintain a try-catch block to handle any errors that may occur during the update process
  try {
    const updateData = {};

    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    const user = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const checkPassword = await bcrypt.compare(currPassword, user.rows[0].password);

    if (!checkPassword) {
      return res.status(401).json({
        message: "Incorrect password",
      });
    }

   await pool.query(
      "UPDATE users SET email = COALESCE($1, email), phone = COALESCE($2, phone), password = COALESCE($3, password) WHERE id = $4",
      [updateData.email, updateData.phone, updateData.password, userId]
    );

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
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }
    res.cookie("token", "", {
      expires: new Date(0),
    });

    res.status(200).json({
      message: "Logged out successfully",
    });
  
  //Catch any errors that may occur during the logout process and return a 500 status code with an error message
  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      message: "An error occurred during logout",
    });
  }
};
