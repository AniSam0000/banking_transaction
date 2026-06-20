import {
  pgTable,
  pgEnum,
  uuid,
  numeric,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { accounts } from "./accounts.js";

export const transactionStatusEnum = pgEnum(
  "transaction_status",
  ["PENDING", "COMPLETED", "FAILED", "REVERSED"]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    fromAccount: uuid("from_account")
      .notNull()
      .references(() => accounts.id),

    toAccount: uuid("to_account")
      .notNull()
      .references(() => accounts.id),

    status: transactionStatusEnum("status")
      .notNull()
      .default("PENDING"),

    amount: numeric("amount", {
      precision: 15,
      scale: 2,
    }).notNull(),

    idempotencyKey: varchar("idempotency_key", {
      length: 255,
    })
      .notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    fromAccountIdx: index(
      "transactions_from_account_idx"
    ).on(table.fromAccount),

    toAccountIdx: index(
      "transactions_to_account_idx"
    ).on(table.toAccount),

    idempotencyKeyUnique: uniqueIndex(
      "transactions_idempotency_key_unique"
    ).on(table.idempotencyKey),
  })
);