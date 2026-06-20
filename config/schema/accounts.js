// src/db/schema/accounts.js

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    status: varchar("status", { length: 20 })
      .notNull()
      .default("ACTIVE"),

    currency: varchar("currency", { length: 10 })
      .notNull()
      .default("INR"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("accounts_user_idx").on(table.userId),

    userStatusIdx: index("accounts_user_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);