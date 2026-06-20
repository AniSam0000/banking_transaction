import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { accounts } from "./accounts.js";
import { transactions } from "./transactions.js";
import {
  pgEnum,
} from "drizzle-orm/pg-core";

export const ledgerTypeEnum = pgEnum(
  "ledger_type",
  ["CREDIT", "DEBIT"],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),

    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),

    amount: numeric("amount", {
      precision: 15,
      scale: 2,
    }).notNull(),

    type: ledgerTypeEnum("type")
      .notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountIdx: index("ledger_account_idx").on(
      table.accountId,
    ),

    transactionIdx: index(
      "ledger_transaction_idx",
    ).on(table.transactionId),
  }),
);