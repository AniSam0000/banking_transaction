import pool from "../config/db.js";

import jwt from "jsonwebtoken";

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access , token is missing",
    });
  }

  // // To check if the token is blacklisted or not
  // const isBlackListed = await tokenBlackListModel.findOne({ token });

  // if (isBlackListed) {
  //   return res.status(401).json({
  //     message: "Token is blacklisted",
  //   });
  // }
  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    const user = await pool.query("SELECT * FROM users WHERE id = $1", [
      decoded.userId,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    req.user = user.rows[0];
    return next();
  } catch (error) {
    console.log(error.message);
    res.status(401).json({
      message: "Unauthorized access , token is missing",
    });
  }
}

export default authMiddleware;
