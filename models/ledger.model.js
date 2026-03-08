import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Ledger must be associated with an account"],
    ref: "account",
    index: true,
    immutable: true,
  },
  amount: {
    type: Number,
    required: [true, "Amount is needed for ledger entry"],
    immutable: true,
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Ledger must be associated with a transaction"],
    immutable: true,
    index: true,
    ref: "transaction",
  },
  type: {
    type: String,
    enum: {
      values: ["CREDIT", "DEBIT"],
      message: "Type can be either CREDIT or DEBIT",
    },
    required: true,
    immutable: true,
  },
});

function preventLedgerModification() {
  throw new Error(
    "Ledger entries are immutable and cannot be modified or deleted",
  );
}

ledgerSchema.pre("findOneAndUpdate", preventLedgerModification);
ledgerSchema.pre("updateOne", preventLedgerModification);
ledgerSchema.pre("deleteOne", preventLedgerModification);
ledgerSchema.pre("remove", preventLedgerModification);
ledgerSchema.pre("deleteMany", preventLedgerModification);
ledgerSchema.pre("updateMany", preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);

const ledgerModel = mongoose.model("ledger", ledgerSchema);

export default ledgerModel;
