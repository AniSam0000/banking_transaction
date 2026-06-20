import "dotenv/config";
import { app } from "./app.js";
import pool from "./config/db.js";



async function connectDB() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

connectDB();

const port = 3000;
app.listen(port, (req, res) => {
  console.log(` Server active on port ${port}`);
});
