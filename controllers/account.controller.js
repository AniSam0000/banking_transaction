import accountModel from "../models/account.model.js";

export const createAccountController = async (req, res) => {
  try {
    const user = req.user;

    const account = await accountModel.create({ user: user._id });

    res.status(201).json({
      account,
    });
  } catch (error) {
    console.log(error);

    res.json({ message: error.message });
  }
};

export const getUserAccountController = async (req, res) => {
  const accounts = await accountModel.find({ user: req.user._id });

  if (accounts.length === 0) {
    return res.status(404).json({
      message: "No accounts found for this user",
    });
  }

  res.status(200).json({
    accounts,
  });
};

/**
 * Get account balance
 * GET api/accounts/balance/:accountId
 */

export const getAccountBalanceController = async (req, res) => {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  const balance = await account.getBalance();

  res.status(200).json({
    accountId: account._id,
    balance: balance,
  });
};
