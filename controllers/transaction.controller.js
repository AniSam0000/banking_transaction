import pool from "../config/db.js";

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

  const client = await pool.connect();

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

    // Start a transaction
    await client.query("BEGIN");

    // Sort account IDs to prevent deadlocks when locking rows with FOR UPDATE
    const sortedAccountIds = [fromAccount, toAccount].sort();

    // Lock both accounts in a consistent, sorted order to avoid deadlock
    const accountLock1 = await client.query(
      `
      SELECT * FROM accounts WHERE id = $1 FOR UPDATE
    `,
      [sortedAccountIds[0]],
    );

    const accountLock2 = await client.query(
      `
      SELECT * FROM accounts WHERE id = $1 FOR UPDATE
    `,
      [sortedAccountIds[1]],
    );

    const row1 = accountLock1.rows[0];
    const row2 = accountLock2.rows[0];

    let fromRow = null;
    let toRow = null;

    if (row1) {
      if (row1.id === fromAccount) fromRow = row1;
      else if (row1.id === toAccount) toRow = row1;
    }
    if (row2) {
      if (row2.id === fromAccount) fromRow = row2;
      else if (row2.id === toAccount) toRow = row2;
    }

    // Map to the structure expected by the rest of the code
    const fromUserAccount = { rows: fromRow ? [fromRow] : [] };
    const toUserAccount = { rows: toRow ? [toRow] : [] };

    // Check if both accounts exist and ensure the authenticated user owns the fromAccount
    if (
      !fromUserAccount.rows[0] ||
      !toUserAccount.rows[0] ||
      fromUserAccount.rows[0].user_id !== req.user.id
    ) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(401).json({
        message: "Invalid From Account or To account",
      });
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExist = await client.query(
      `
      SELECT * FROM transactions WHERE idempotency_key = $1
    `,
      [idempotencyKey],
    );

    // If transaction already exists, we need to check the status of the transaction and respond accordingly
    if (isTransactionAlreadyExist.rows[0]) {
      await client.query("ROLLBACK");
      client.release();

      if (isTransactionAlreadyExist.rows[0].status === "COMPLETED") {
        return res.status(200).json({
          message: "Transaction already processed",
          transaction: isTransactionAlreadyExist.rows[0],
        });
      }

      if (isTransactionAlreadyExist.rows[0].status === "PENDING") {
        return res.status(200).json({
          message: "Transaction is still processing",
        });
      }

      if (isTransactionAlreadyExist.rows[0].status === "FAILED") {
        return res.status(500).json({
          message: "Transaction failed please retry again",
        });
      }

      if (isTransactionAlreadyExist.rows[0].status === "REVERSED") {
        return res.status(500).json({
          message: "Transaction is reversed",
        });
      }
    }
    /**
     * 3. Check account status
     */

    if (
      fromUserAccount.rows[0].status !== "ACTIVE" ||
      toUserAccount.rows[0].status !== "ACTIVE"
    ) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        message:
          "Both fromAccount and toAccount must be ACTIVE to process transaction",
      });
    }

    /**
     * 4) Derive sender balance from ledger
     */

    const balance = await client.query(
      `
      SELECT COALESCE(
        SUM(
          CASE 
            WHEN TYPE = 'CREDIT' THEN amount
            WHEN TYPE = 'DEBIT' THEN -amount
          END
        ),
        0
      ) as balance
       FROM ledger_entries
       WHERE account_id = $1
      `,
      [fromAccount],
    );

    const currbalance = parseFloat(balance.rows[0].balance);

    if (currbalance < amount) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        message: `Insufficient Balance. Current balance is ${currbalance} . Requested amount is ${amount}`,
      });
    }

    /**
     * 5) CREATE Transaction
     */
    const insertTxRes = await client.query(
      `
      INSERT INTO transactions (from_account, to_account, amount, idempotency_key, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING *;
    `,
      [fromAccount, toAccount, amount, idempotencyKey],
    );

    const transaction = insertTxRes.rows[0];

    /**
     * 6 & 7) Create DEBIT and CREDIT ledger entries
     */
    await client.query(
      `
      INSERT INTO ledger_entries (account_id, amount, transaction_id, type)
      VALUES 
        ($1, $2, $3, 'DEBIT'),
        ($4, $5, $6, 'CREDIT');
    `,
      [
        fromAccount,
        amount,
        transaction.id, // Debit entry
        toAccount,
        amount,
        transaction.id, // Credit entry
      ],
    );

    /**
     * 8) Mark transaction COMPLETED
     */
    const updateTxRes = await client.query(
      `
      UPDATE transactions 
      SET status = 'COMPLETED' 
      WHERE id = $1
      RETURNING *;
    `,
      [transaction.id],
    );

    const completedTransaction = updateTxRes.rows[0];

    /**
     * 9) Commit PG transaction
     */
    await client.query("COMMIT");
    client.release(); // Return client to pool

    /**
     * Send email notification
     */

    // try {
    //   await sendTransactionEmail(
    //     req.user.email,
    //     req.user.name,
    //     amount,
    //     toAccount,
    //   );
    // } catch (err) {
    //   console.log("Email failed but transaction succeeded");
    // }

    res.status(200).json({
      message: "Transaction completed successfully",
      transaction: completedTransaction,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      // Catch silently if transaction never started
    }
    client.release();
    return res.status(400).json({
      message: error.message,
    });
  }
};
