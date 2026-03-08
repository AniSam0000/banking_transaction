import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createAccountController,
  getAccountBalanceController,
  getUserAccountController,
} from "../controllers/account.controller.js";

const router = express.Router();

// POST /api/accounts
// creaate a new account
//protected route
router.post("/", authMiddleware, createAccountController);

/**
 * GET /api/accounts/get-accounts
 * Get all the accounts of the User
 */
router.get("/get-accounts", authMiddleware, getUserAccountController);

/**
 * - GET api/accounts/balance/:accountId
 */

router.get("/balance/:accountId", authMiddleware, getAccountBalanceController);

export default router;
