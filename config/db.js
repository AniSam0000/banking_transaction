import mongoose from "mongoose";

export const connectDb = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("Already connected to database");
    return;
  }

  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/bank-transaction`);
    console.log("✅ Database connected");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // Exit if cannot connect
  }
};
