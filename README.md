# 🏦 Ledger-Based Banking Transaction API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-v5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtoken&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

A ledger-based banking transaction backend built with **Node.js**, **Express**, and **PostgreSQL**. Supports user authentication, multi-account management, atomic fund transfers with idempotency, and email notifications.

</div>

---

## ✨ Features

- 🔐 **User authentication** with JWT
- 👥 **Multi-account** support per user
- 📒 **Ledger-based** accounting system
- ⚡ **Atomic fund transfers** using PostgreSQL transactions
- 🔁 **Idempotent transactions** (duplicate request protection)
- 📊 **Real-time balance** calculation via aggregation
- 🔒 **Secure password** hashing with bcrypt
- 📧 **Email notifications** for registration and transfers
- 🚫 **Redis Token blacklist** for secure logout validation
- 🚦 **Rate Limiting** via Redis (login & transactions limits)

---

## 📒 Ledger-Based Accounting System

Instead of storing account balances directly, the system records immutable ledger entries for every transaction.

Each transfer creates:

- 🔴 **DEBIT** entry — source account
- 🟢 **CREDIT** entry — destination account

Balance is computed as:

```
Balance = Σ CREDIT − Σ DEBIT
```

This ensures strong auditability and prevents data inconsistency.

---

## 🛠 Tech Stack

| Layer         | Technology               |
| ------------- | ------------------------ |
| ⚙️ Runtime    | Node.js (ESM)            |
| 🌐 Framework  | Express v5               |
| 🗄️ Database   | PostgreSQL + Drizzle ORM |
| 🔑 Auth       | JWT + Cookie             |
| 📧 Email      | Nodemailer (Gmail OAuth2)|
| 🔐 Hash       | bcryptjs                 |
| ⚡ Cache/Store| Redis (via node-redis)   |
| 🚦 Rate Limit | express-rate-limit       |

---

## 📁 Project Structure

```
banking_transaction/
├── app.js                          # ⚙️ Express app setup & route mounting
├── server.js                       # 🚀 Entry point — starts server on port 3000
├── package.json                    # 📦 Dependencies & scripts
│
├── config/
│   ├── db.js                       # 🔌 PostgreSQL connection (pg + Drizzle ORM)
│   └── schema/
│       ├── index.js                # 📤 Barrel export for all schemas
│       ├── users.js                # 👤 Users table definition
│       ├── accounts.js             # 💳 Accounts table definition
│       ├── ledger.js               # 📋 Ledger entries table (DEBIT / CREDIT)
│       └── transactions.js         # 🔄 Transactions table with idempotency key
│
├── controllers/
│   ├── auth.controller.js          # 🔐 Register, Login, Logout, Update
│   ├── account.controller.js       # 💰 Create account, Get accounts, Get balance
│   └── transaction.controller.js   # 💸 Transfer funds, Initial system funds
│
├── drizzle/                        # 🗃️ Generated migration files
│   ├── 0000_parallel_virginia_dare.sql
│   └── meta/
│
├── drizzle.config.js               # ⚙️ Drizzle Kit configuration
│
├── middleware/
│   └── auth.middleware.js          # 🛡️ JWT verification + blacklist check
│
├── routes/
│   ├── auth.routes.js              # 🚪 Auth endpoints
│   ├── account.routes.js           # 💳 Account endpoints
│   └── transaction.routes.js       # 💸 Transaction endpoints
│
└── services/
    └── nodemailer.services.js      # 📧 Registration & transaction email senders
```

---

## 🚀 Getting Started

### 📋 Prerequisites

- ✅ Node.js >= 18
- ✅ PostgreSQL instance (local or cloud — e.g. Neon, Supabase, RDS)
- ✅ Gmail account with OAuth2 credentials for email

### 📦 Installation

```bash
git clone https://github.com/AniSam0000/banking_transaction.git
cd banking_transaction
npm install
```

### 🔐 Environment Variables

Create a `.env` file in the project root:

```env
PG_URL=postgresql://user:password@host:5432/dbname

JWT_SECRET=your_jwt_secret_here

# Gmail OAuth2 (for Nodemailer)
EMAIL_USER=your_gmail@gmail.com
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REFRESH_TOKEN=your_google_refresh_token

# Redis configuration
REDIS_HOST=your_redis_host
REDIS_PASSWORD=your_redis_password
```

### 🗃️ Database Setup

Push the Drizzle schema to your PostgreSQL database:

```bash
npm run db:push
```

Or generate & run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### ▶️ Running the Server

```bash
# Production
npm start

# Development (with auto-reload via nodemon)
npm run server
npm run dev
```

Server runs at **`http://localhost:3000`** 🎯

---

## 🗄️ Data Models

All tables use **UUID** primary keys with auto-generated values.

### 👤 User (`users`)

| Column       | Type           | Notes                            |
| ------------ | -------------- | -------------------------------- |
| `id`         | `UUID (PK)`    | Auto-generated                   |
| `email`      | `varchar(255)` | ✅ Unique, lowercase             |
| `name`       | `varchar(100)` | 🔒 **Immutable** after creation  |
| `password`   | `varchar(255)` | 🔐 bcrypt hashed                 |
| `phone`      | `varchar(20)`  | Required                         |
| `systemUser` | `boolean`      | Default `false`                  |
| `createdAt`  | `timestamp`    | Auto-set on insert               |
| `updatedAt`  | `timestamp`    | Auto-updated                     |

### 💳 Account (`accounts`)

| Column      | Type           | Notes                                  |
| ----------- | -------------- | -------------------------------------- |
| `id`        | `UUID (PK)`    | Auto-generated                         |
| `userId`    | `UUID (FK)`    | 🔗 Ref → `users.id`                    |
| `status`    | `varchar(20)`  | `ACTIVE` \| `FROZEN` \| `CLOSED`       |
| `currency`  | `varchar(10)`  | Default `INR`                          |
| `createdAt` | `timestamp`    | Auto-set on insert                     |
| `updatedAt` | `timestamp`    | Auto-updated                           |

> 💡 Balance is **not stored** — it is computed on demand by aggregating ledger entries (`totalCredit - totalDebit`).

### 🔄 Transaction (`transactions`)

| Column           | Type                           | Notes                                             |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| `id`             | `UUID (PK)`                    | Auto-generated                                    |
| `fromAccount`    | `UUID (FK)`                    | 🔗 Ref → `accounts.id`                            |
| `toAccount`      | `UUID (FK)`                    | 🔗 Ref → `accounts.id`                            |
| `amount`         | `numeric(15,2)`                | Minimum: 1                                        |
| `status`         | `transaction_status` (enum)    | `PENDING` \| `COMPLETED` \| `FAILED` \| `REVERSED` |
| `idempotencyKey` | `varchar(255)`                 | 🆔 Unique — prevents duplicate processing          |
| `createdAt`      | `timestamp`                    | Auto-set on insert                                |
| `updatedAt`      | `timestamp`                    | Auto-updated                                      |

### 📋 Ledger (`ledger_entries`)

| Column          | Type                   | Notes                           |
| --------------- | ---------------------- | ------------------------------- |
| `id`            | `UUID (PK)`            | Auto-generated                  |
| `accountId`     | `UUID (FK)`            | 🔗 Ref → `accounts.id`          |
| `transactionId` | `UUID (FK)`            | 🔗 Ref → `transactions.id`      |
| `type`          | `ledger_type` (enum)   | `CREDIT` 🟢 \| `DEBIT` 🔴       |
| `amount`        | `numeric(15,2)`        | 🔒 Immutable                    |
| `createdAt`     | `timestamp`            | Auto-set on insert              |

> 🔒 All ledger entries are **fully immutable** — no update or delete operations are permitted.

---

## 📡 API Reference

> 🔐 All protected routes require a JWT token either as:
> - **Cookie**: `token`
> - **Header**: `Authorization: Bearer <token>`

### 🌐 Endpoints Overview

| Method | Endpoint                               | Description         | Auth |
| ------ | -------------------------------------- | ------------------- | ---- |
| `POST` | `/api/auth/register`                   | Register new user   | ❌   |
| `POST` | `/api/auth/login`                      | Login user          | ❌   |
| `POST` | `/api/auth/logout`                     | Logout user         | ✅   |
| `PUT`  | `/api/auth/update`                     | Update user profile | ✅   |
| `POST` | `/api/accounts`                        | Create account      | ✅   |
| `GET`  | `/api/accounts/get-accounts`           | List user accounts  | ✅   |
| `GET`  | `/api/accounts/balance/:accountId`     | Get balance         | ✅   |
| `POST` | `/api/transactions`                    | Transfer funds      | ✅   |

---

### 🔐 Auth — `/api/auth`

<details>
<summary><code>POST</code> <code>/api/auth/register</code> — Register a new user</summary>

**Body**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword",
  "phone": 9876543210
}
```

**Response `201`**

```json
{
  "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe" },
  "token": "<jwt>"
}
```

> 📧 Also sends a welcome email to the registered address.

</details>

<details>
<summary><code>POST</code> <code>/api/auth/login</code> — Login with email and password</summary>

**Body**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": 9876543210
  },
  "token": "<jwt>"
}
```

</details>

<details>
<summary><code>POST</code> <code>/api/auth/logout</code> — 🔒 Logout user</summary>

Invalidates the current token.

**Response `200`**

```json
{ "message": "Logged out successfully" }
```

</details>

<details>
<summary><code>PUT</code> <code>/api/auth/update</code> — 🔒 Update user profile</summary>

Update email, phone, or password. `currPassword` is always required.

**Body** _(any combination of the three fields)_

```json
{
  "email": "new@example.com",
  "phone": 9999999999,
  "newPassword": "newpassword",
  "currPassword": "currentpassword"
}
```

**Response `200`**

```json
{ "message": "User details updated successfully" }
```

</details>

---

### 💳 Accounts — `/api/accounts`

<details>
<summary><code>POST</code> <code>/api/accounts</code> — 🔒 Create a new account</summary>

Creates a new bank account for the authenticated user.

**Response `201`**

```json
{
  "account": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "ACTIVE",
    "currency": "INR"
  }
}
```

</details>

<details>
<summary><code>GET</code> <code>/api/accounts/get-accounts</code> — 🔒 List user accounts</summary>

Returns all accounts belonging to the authenticated user.

**Response `200`**

```json
{
  "accounts": [{ "id": "uuid", "status": "ACTIVE", "currency": "INR" }]
}
```

</details>

<details>
<summary><code>GET</code> <code>/api/accounts/balance/:accountId</code> — 🔒 Get balance</summary>

Returns the computed balance for an account.

**Response `200`**

```json
{
  "accountId": "uuid",
  "balance": 5000
}
```

</details>

---

### 💸 Transactions — `/api/transactions`

<details>
<summary><code>POST</code> <code>/api/transactions</code> — 🔒 Transfer funds</summary>

Transfer funds between two accounts.

**Body**

```json
{
  "fromAccount": "<accountId>",
  "toAccount": "<accountId>",
  "amount": 500,
  "idempotencyKey": "unique-key-abc123"
}
```

**Response `200`**

```json
{
  "message": "Transaction completed successfully",
  "transaction": { "id": "uuid", "status": "COMPLETED", "amount": 500 }
}
```

**Idempotency Behavior**

| Existing Status | HTTP Status | Response Message                    |
| :-------------- | :---------- | :---------------------------------- |
| `COMPLETED`     | `200`       | Transaction already processed       |
| `PENDING`       | `200`       | Transaction is still processing     |
| `FAILED`        | `500`       | Transaction failed, please retry    |
| `REVERSED`      | `500`       | Transaction is reversed             |

</details>

<details>
<summary><code>POST</code> <code>/api/transactions/system/initial-funds</code> — 🔒🔑 System only</summary>

Seeds initial funds into a user account from the system account. Only callable by users with `systemUser: true`.

**Body**

```json
{
  "toAccount": "<accountId>",
  "amount": 10000,
  "idempotencyKey": "init-funds-xyz"
}
```

**Response `201`**

```json
{
  "message": "Initial funds transaction completed successfully",
  "transaction": { "id": "uuid", "status": "COMPLETED" }
}
```

</details>

---

## 🔄 Data Flow

### 📝 User Registration Flow

```
POST /api/auth/register
        │
        ▼
   ┌──────────────┐
   │ Validate     │
   │ body fields  │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Check email  │
   │ uniqueness   │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Create user  │
   │ (bcrypt hash)│
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Sign JWT     │
   │ Set cookie   │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Send welcome │
   │ email (async)│
   └──────────────┘
```

### 🛡️ Authentication Flow (Protected Routes)

```
Request with cookie/header token
        │
        ▼
   ┌─────────────────────┐
   │    authMiddleware    │
   │                      │
   │  ❓ Token missing?   │──→ 401
   │                      │
   │  ❓ Blacklisted?     │──→ 401
   │                      │
   │  ✅ jwt.verify()     │
   └──────┬──────────────┘
          ▼
   Attach req.user → next()
```

### 💸 Fund Transfer Flow (10-step atomic process)

```
POST /api/transactions/
        │
  1.    ▼
   ┌────────────────────────┐
   │ Validate all fields    │
   │ (from, to, amount, key)│
   └──────────┬─────────────┘
        │
  2.    ▼
   ┌────────────────────────┐
   │ Check idempotencyKey   │
   │ Return if duplicate    │
   └──────────┬─────────────┘
        │
  3.    ▼
   ┌────────────────────────┐
   │ Verify accounts exist  │
   │ & are ACTIVE           │
   └──────────┬─────────────┘
        │
  4.    ▼
   ┌────────────────────────┐
   │ Compute balance via    │
   │ ledger aggregation     │
   │ Ensure funds ≥ amount  │
   └──────────┬─────────────┘
        │
        ▼
   ┌─── Start PostgreSQL Transaction ──────────────────┐
   │                                                   │
   │  5.  📝 Create Transaction (status: PENDING)      │
   │  6.  🔴 Insert DEBIT ledger entry (source)       │
   │  7.  🟢 Insert CREDIT ledger entry (dest)        │
   │  8.  ✅ Update Transaction → COMPLETED           │
   │  9.  💾 commitTransaction()                      │
   │                                                   │
   └───────────────────────────────────────────────────┘
        │
        ▼  (rollback on any failure)
 10.
   ┌────────────────────────┐
   │ Send transaction email │
   │ (best-effort, async)   │
   └──────────┬─────────────┘
        │
        ▼
   Return transaction object
```

### 📊 Balance Calculation

Balance is never stored. It is derived via SQL aggregation on demand:

```
Balance = Σ CREDIT entries − Σ DEBIT entries
         (for a given account in the ledger_entries table)
```

---

## 🛡️ Security

- 🔐 Passwords are hashed with **bcrypt** (10 rounds) before persisting.
- 🔒 `name` field is **immutable** — cannot be changed after user creation.
- 📋 All ledger entries are **immutable** — no update or delete operations are permitted.


---

## 🚦 Rate Limiting & Token Blacklisting

We utilize Redis as a centralized high-performance store for rate limiting and session validation:

### 1. Rate Limiting Rules
- **Failed Logins**: Max **5 failed login attempts per day** (24-hour window) per IP. Success requests bypass this limit.
- **Transactions**: Max **2 transaction creation requests per minute** per user ID (falls back to IP address if unauthenticated).

### 2. Token Blacklist System
- When a user logs out, the JWT is stored in Redis under the key format `bl:<token>`.
- The Redis key uses a dynamically calculated **Time To Live (TTL)** corresponding to the remaining time before token expiration (`decoded.exp - currentTime`).
- Any incoming request to protected routes checks the blacklist first, immediately rejecting blocked tokens.

---

## 🔮 Future Improvements

- [ ] 📨 Redis-based job queue for email processing
- [ ] 📊 Admin dashboard
- [ ] 📄 Transaction history pagination
- [ ] 📈 Monitoring with Prometheus/Grafana

---

<div align="center">

Made with ❤️ by [AniSam0000](https://github.com/AniSam0000)

</div>
