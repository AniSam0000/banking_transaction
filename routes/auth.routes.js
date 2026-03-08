import express from "express";
import {
  userLoginController,
  userLogoutController,
  userRegisterController,
} from "../controllers/auth.controller.js";

const router = express.Router();

// post*(api/auth/register)
router.post("/register", userRegisterController);

// POST api/auth/login
router.post("/login", userLoginController);

// POST api/auth/logout
router.post("/logout", userLogoutController);

export default router;
