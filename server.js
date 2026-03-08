import "dotenv/config";
import { app } from "./src/app.js";
import { connectDb } from "./config/db.js";

await connectDb();

const port = 3000;
app.listen(port, (req, res) => {
  console.log(` Server active on port ${port}`);
});
