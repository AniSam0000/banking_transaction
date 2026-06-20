import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./config/schema/index.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.PG_URL,
  },
});
