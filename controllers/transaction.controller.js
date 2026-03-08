import ledgerModel from "../models/ledger.model.js";
import transactionModel from "../models/transaction.model.js";
import accountModel from "../models/account.model.js";
import mongoose from "mongoose";
import { sendTransactionEmail } from "../services/nodemailer.services.js";

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

export const createTransaction = async (req, res) => {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  try {
    // Check for missing details

    /**
     * 1. Validate request
     */
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({
        message:
          "FromAccount, toAccount, amount and idempotencyKey are required",
      });
    }

    // If by any chance Both accounts are same
    if (fromAccount === toAccount) {
      return res.status(400).json({
        message: "Cannot transfer to same account",
      });
    }
    // Getting the details of requesting account
    const fromUserAccount = await accountModel.findOne({ _id: fromAccount });

    const toUserAccount = await accountModel.findOne({ _id: toAccount });

    if (!fromUserAccount || !toUserAccount) {
      return res.status(401).json({
        message: "Invalid From Account or To account",
      });
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExist = await transactionModel.findOne({
      idempotencyKey: idempotencyKey,
    });

    if (isTransactionAlreadyExist) {
      if (isTransactionAlreadyExist.status === "COMPLETED") {
        return res.status(200).json({
          message: "Transaction already processed",
          transaction: isTransactionAlreadyExist,
        });
      }

      if (isTransactionAlreadyExist.status === "PENDING") {
        return res.status(200).json({
          message: "Transaction is still processing",
        });
      }

      if (isTransactionAlreadyExist.status === "FAILED") {
        return res.status(500).json({
          message: "Transaction failed please retry again",
        });
      }

      if (isTransactionAlreadyExist.status === "REVERSED") {
        return res.status(500).json({
          message: "Transaction is reversed",
        });
      }
    }
    /**
     * 3. Check account status
     */

    if (
      fromUserAccount.status !== "ACTIVE" ||
      toUserAccount.status !== "ACTIVE"
    ) {
      return res.status(400).json({
        message:
          "Both fromAccount and toAccount must be ACTIVE to process transaction",
      });
    }

    /**
     * 4) Derive sender balance from ledger
     */

    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
      return res.status(400).json({
        message: `Insufficient Balance. Current balance is ${balance} . Requested amount is ${amount}`,
      });
    }

    let transaction;
    const session = await mongoose.startSession();
    try {
      /**
       * 5) CREATE Transaction
       */
      session.startTransaction();

      transaction = (
        await transactionModel.create(
          [
            {
              fromAccount: fromAccount,
              toAccount: toAccount,
              amount: amount,
              idempotencyKey: idempotencyKey,
              status: "PENDING",
            },
          ],
          { session },
        )
      )[0];
      console.log(transaction);

      await ledgerModel.insertMany(
        [
          {
            account: fromAccount,
            amount,
            transaction: transaction._id,
            type: "DEBIT",
          },
          {
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT",
          },
        ],
        { session },
      );

      await transactionModel.findOneAndUpdate(
        { _id: transaction._id },
        { status: "COMPLETED" },
        { session },
      );

      await session.commitTransaction();

      // End of session
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Transaction error",
      });
    } finally {
      await session.endSession();
    }

    /**
     * Send email notification
     */

    try {
      await sendTransactionEmail(
        req.user.email,
        req.user.name,
        amount,
        toAccount,
      );
    } catch (err) {
      console.log("Email failed but transaction succeeded");
    }

    res.status(200).json({
      message: "Transaction completed successfully",
      transaction: transaction,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const createInitialFundTransaction = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }
    // Checking if transaction already exists or not
    // So that we don't do the same transaction again
    const existingTransaction = await transactionModel.findOne({
      idempotencyKey,
    });

    if (existingTransaction) {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: existingTransaction,
      });
    }

    const toUserAccount = await accountModel.findById(toAccount);

    if (!toUserAccount) {
      return res.status(400).json({
        message: "Invalid account",
      });
    }

    const fromUserAccount = await accountModel.findOne({
      user: req.user._id,
    });

    if (!fromUserAccount) {
      return res.status(400).json({
        message: "System user account not found",
      });
    }

    session.startTransaction();

    // Create transaction document
    const transaction = await transactionModel.create({
      fromAccount: fromUserAccount._id,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    });

    //Debit entry
    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromUserAccount._id,
          transaction: transaction._id,
          type: "DEBIT",
          amount,
        },
      ],
      { session },
    );

    // Credit entry
    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          transaction: transaction._id,
          type: "CREDIT",
          amount,
        },
      ],
      { session },
    );

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );
    // Saving transaction

    await session.commitTransaction();

    return res.status(201).json({
      message: "Initial funds transaction completed successfully",
      transaction: transaction,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    return res.status(404).json({
      message: error,
    });
  } finally {
    session.endSession();
  }
};
