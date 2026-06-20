import pool from "../config/db.js";

/**
 * Creates a new bank account for the authenticated user.
 * POST /api/accounts
 */
export const createAccountController = async (req, res) => {
  try {
    const user = req.user;

    const account = await pool.query(
      "INSERT INTO accounts (user_id) VALUES ($1) RETURNING *",
      [user._id]
    );

    res.status(201).json({
      account: account.rows[0],
    });
  }
  
  catch (error) {
    console.log(error);

    res.status(500).json({ message: error.message });
  }
};


/**
 * Retrieves all accounts belonging to the authenticated user.
 * GET /api/get-accounts
 */
export const getUserAccountController = async (req, res) => {
  try {
    const accounts = await pool.query(
      "SELECT * FROM accounts WHERE user_id = $1",
      [req.user.id]
    );

    if (accounts.rows.length === 0) {
      return res.status(404).json({
        message: "No accounts found for this user",
      });
    }

    res.status(200).json({
      accounts: accounts.rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves the current balance of a specific account.
 * Computes balance by summing CREDIT entries and subtracting DEBIT entries.
 * GET api/accounts/balance/:accountId
 */
export const getAccountBalanceController = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await pool.query(
      "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
      [accountId, req.user.id]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    const balance = await pool.query(
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
      [accountId]
    );

    res.status(200).json({
      accountId: account.rows[0].id,
      balance: balance.rows[0].balance,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
