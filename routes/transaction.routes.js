import express from "express";
import { createTransaction } from "../controllers/transaction.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */
router.post("/", authMiddleware, createTransaction);

export default router;
