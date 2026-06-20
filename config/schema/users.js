// src/db/schema/users.js

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

// Define the "users" table schema using Drizzle ORM's pgTable function
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  email: varchar("email", { length: 255 })
    .notNull()
    .unique(),

  name: varchar("name", { length: 100 })
    .notNull(),

  password: varchar("password", { length: 255 })
    .notNull(),

  phone: varchar("phone", { length: 20 })
    .notNull(),

  systemUser: boolean("system_user")
    .notNull()
    .default(false),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});