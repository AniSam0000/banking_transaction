import express from "express";
import {
  userLoginController,
  userLogoutController,
  userRegisterController,
  userUpdateController,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// post*(api/auth/register)
router.post("/register", userRegisterController);

// POST api/auth/login
router.post("/login", loginRateLimiter, userLoginController);

// POST api/auth/logout
router.post("/logout", userLogoutController);

// POST api/auth/update
router.put("/update", authMiddleware, userUpdateController);

export default router;
