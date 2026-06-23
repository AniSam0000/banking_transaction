import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access , token is missing",
    });
  }

  // Check if the token is blacklisted in Redis
  try {
    const isBlacklisted = await redisClient.get(`bl:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        message: "Token is blacklisted",
      });
    }
  } catch (redisError) {
    console.error("Redis blacklist check failed:", redisError);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await pool.query("SELECT id,email,name,phone,password FROM users WHERE id = $1", [
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
      message: "Unauthorized access , token is invalid or expired",
    });
  }
}

export default authMiddleware;
