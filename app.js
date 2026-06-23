import express from "express";
import authRouter from "./routes/auth.routes.js";
import accountRouter from "./routes/account.routes.js";
import transactionRouter from "./routes/transaction.routes.js";
import cookieParser from "cookie-parser";

export const app = express();

// It is important to set "trust proxy" to 1, because render uses reverse proxy, 
// and without this, rate limiting will be based on the IP address of the proxy, not the actual client.
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

// Routes

app.get("/", (req, res) => {
  res.send("Ledger Service is up and running Properly on Render");
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);
