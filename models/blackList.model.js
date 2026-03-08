import mongoose from "mongoose";

/**
 * To black list token so that no hacker can access it and use it for bad urpose
 */

const tokenBlackListSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is required to blacklist"],
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

tokenBlackListSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 3, // 3 days
  },
);

const tokenBlackListModel = mongoose.model(
  "tokenBlackList",
  tokenBlackListSchema,
);

export default tokenBlackListModel;
