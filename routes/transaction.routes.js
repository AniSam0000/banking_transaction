import express from "express";

import { authSystemUserMiddleware } from "../middleware/systemuser.middleware.js";
import {
  createInitialFundTransaction,
  createTransaction,
} from "../controllers/transaction.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */
router.post("/", authMiddleware, createTransaction);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */

router.post(
  "/system/initial-funds",
  authMiddleware,
  authSystemUserMiddleware,
  createInitialFundTransaction,
);
export default router;
