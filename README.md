# 🏦 Ledger-Based Banking Transaction API

A ledger-based banking transaction backend built with **Node.js**, **Express**, and **MongoDB**. Supports user authentication, multi-account management, atomic fund transfers with idempotency, and email notifications.

## Features

- User authentication with JWT
- Multi-account support per user
- Ledger-based accounting system
- Atomic fund transfers using MongoDB transactions
- Idempotent transactions (duplicate request protection)
- Real-time balance calculation via aggregation
- Secure password hashing with bcrypt
- Email notifications for registration and transfers
- Token blacklist for secure logout

---

## Ledger-Based Accounting System

Instead of storing account balances directly, the system records
immutable ledger entries for every transaction.

Each transfer creates:

• one DEBIT entry (source account)
• one CREDIT entry (destination account)

Balance is computed as:

Balance = Σ CREDIT − Σ DEBIT

This ensures strong auditability and prevents data inconsistency.

## Tech Stack

| Layer         | Technology                |
| ------------- | ------------------------- |
| Runtime       | Node.js (ESM)             |
| Framework     | Express v5                |
| Database      | MongoDB + Mongoose        |
| Auth          | JWT + Cookie              |
| Email         | Nodemailer (Gmail OAuth2) |
| Password Hash | bcryptjs                  |

---

## Project Structure

```
banking_transaction/
├── app.js                          # Express app setup & route mounting
├── server.js                       # Entry point — starts server on port 3000
├── package.json
│
├── config/
│   └── db.js                       # MongoDB connection
│
├── controllers/
│   ├── auth.controller.js          # Register, Login, Logout, Update
│   ├── account.controller.js       # Create account, Get accounts, Get balance
│   └── transaction.controller.js   # Transfer funds, Initial system funds
│
├── middleware/
│   ├── auth.middleware.js          # JWT verification + blacklist check
│   └── systemuser.middleware.js    # Restricts route to system users only
│
├── models/
│   ├── userModel.js               # User schema (name is immutable)
│   ├── account.model.js           # Account schema + getBalance() aggregation
│   ├── transaction.model.js       # Transaction schema with idempotency key
│   ├── ledger.model.js            # Immutable ledger entries (DEBIT / CREDIT)
│   └── blackList.model.js         # Blacklisted JWT tokens (TTL: 3 days)
│
├── routes/
│   ├── auth.routes.js
│   ├── account.routes.js
│   └── transaction.routes.js
│
└── services/
    └── nodemailer.services.js      # Registration & transaction email senders
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB instance (local or Atlas)
- Gmail account with OAuth2 credentials for email

### Installation

```bash
git clone https://github.com/AniSam0000/banking_transaction.git
cd banking_transaction
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=your_jwt_secret_here

# Gmail OAuth2 (for Nodemailer)
EMAIL_USER=your_gmail@gmail.com
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REFRESH_TOKEN=your_google_refresh_token
```

### Running the Server

```bash
# Production
npm start

# Development (with auto-reload via nodemon)
npm run server
```

Server runs at `http://localhost:3000`

---

## Data Models

### User

| Field      | Type    | Notes                              |
| ---------- | ------- | ---------------------------------- |
| email      | String  | Unique, lowercase, validated       |
| name       | String  | **Immutable** after creation       |
| password   | String  | bcrypt hashed, hidden by default   |
| phone      | Number  | Required                           |
| systemUser | Boolean | Hidden, immutable, default `false` |

### Account

| Field    | Type     | Notes                            |
| -------- | -------- | -------------------------------- |
| user     | ObjectId | Ref → User                       |
| status   | String   | `ACTIVE` \| `FROZEN` \| `CLOSED` |
| currency | String   | Default `INR`                    |

> Balance is **not stored** — it is computed on demand by aggregating ledger entries (`totalCredit - totalDebit`).

### Transaction

| Field          | Type     | Notes                                              |
| -------------- | -------- | -------------------------------------------------- |
| fromAccount    | ObjectId | Ref → Account                                      |
| toAccount      | ObjectId | Ref → Account                                      |
| amount         | Number   | Min: 1                                             |
| status         | String   | `PENDING` \| `COMPLETED` \| `FAILED` \| `REVERSED` |
| idempotencyKey | String   | Unique — prevents duplicate processing             |

### Ledger

| Field       | Type     | Notes                         |
| ----------- | -------- | ----------------------------- |
| account     | ObjectId | Ref → Account (immutable)     |
| transaction | ObjectId | Ref → Transaction (immutable) |
| type        | String   | `CREDIT` \| `DEBIT`           |
| amount      | Number   | Immutable                     |

> All ledger entries are **fully immutable** — no update or delete hooks are allowed at the schema level.

### Token Blacklist

| Field | Type   | Notes                                      |
| ----- | ------ | ------------------------------------------ |
| token | String | Unique; auto-expires in 3 days (TTL index) |

---

## API Reference

All protected routes require a JWT token either as:

- Cookie: `token`
- Header: `Authorization: Bearer <token>`

---

| Method | Endpoint                               | Description         |
| ------ | -------------------------------------- | ------------------- |
| POST   | /api/auth/register                     | Register new user   |
| POST   | /api/auth/login                        | Login user          |
| POST   | /api/auth/logout                       | Logout user         |
| PUT    | /api/auth/update                       | Update user profile |
| POST   | /api/accounts                          | Create account      |
| GET    | /api/accounts/get-accounts             | List user accounts  |
| GET    | /api/accounts/balance/:accountId       | Get balance         |
| POST   | /api/transactions                      | Transfer funds      |
| POST   | /api/transactions/system/initial-funds | Seed initial funds  |

### Auth `/api/auth`

#### `POST /api/auth/register`

Register a new user.

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
  "user": { "_id": "...", "email": "user@example.com", "name": "John Doe" },
  "token": "<jwt>"
}
```

> Also sends a welcome email to the registered address.

---

#### `POST /api/auth/login`

Login with email and password.

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
    "_id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": 9876543210
  },
  "token": "<jwt>"
}
```

---

#### `POST /api/auth/logout`

🔒 Protected

Invalidates the current token.

**Response `200`**

```json
{ "message": "Logged out successfully" }
```

---

#### `PUT /api/auth/update`

🔒 Protected

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

---

### Accounts `/api/accounts`

#### `POST /api/accounts/`

🔒 Protected

Creates a new bank account for the authenticated user.

**Response `201`**

```json
{
  "account": {
    "_id": "...",
    "user": "...",
    "status": "ACTIVE",
    "currency": "INR"
  }
}
```

---

#### `GET /api/accounts/get-accounts`

🔒 Protected

Returns all accounts belonging to the authenticated user.

**Response `200`**

```json
{
  "accounts": [{ "_id": "...", "status": "ACTIVE", "currency": "INR" }]
}
```

---

#### `GET /api/accounts/balance/:accountId`

🔒 Protected

Returns the computed balance for an account.

**Response `200`**

```json
{
  "accountId": "...",
  "balance": 5000
}
```

---

### Transactions `/api/transactions`

#### `POST /api/transactions/`

🔒 Protected

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
  "transaction": { "_id": "...", "status": "COMPLETED", "amount": 500 }
}
```

**Idempotency Behavior**

| Existing Status | HTTP | Response message                 |
| --------------- | ---- | -------------------------------- |
| `COMPLETED`     | 200  | Transaction already processed    |
| `PENDING`       | 200  | Transaction is still processing  |
| `FAILED`        | 500  | Transaction failed, please retry |
| `REVERSED`      | 500  | Transaction is reversed          |

---

#### `POST /api/transactions/system/initial-funds`

🔒 Protected + System User only

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
  "transaction": { "_id": "...", "status": "COMPLETED" }
}
```

---

## Data Flow

### User Registration Flow

```
POST /api/auth/register
        │
        ▼
Validate body fields
        │
        ▼
Check if email already exists (userModel)
        │
        ▼
Create user — password auto-hashed by pre-save hook (bcrypt)
        │
        ▼
Sign JWT → set cookie + return token
        │
        ▼
Send welcome email (Nodemailer — async, non-blocking)
```

### Authentication Flow (Protected Routes)

```
Request with cookie/header token
        │
        ▼
authMiddleware
  ├─ Token missing?  → 401
  ├─ Token blacklisted (blackList.model)?  → 401
  └─ jwt.verify() → decode userId → attach req.user → next()
```

### Fund Transfer Flow (10-step atomic process)

```
POST /api/transactions/
        │
1.      ▼
   Validate: fromAccount, toAccount, amount, idempotencyKey all present
        │
2.      ▼
   Check idempotencyKey — return existing result if duplicate
        │
3.      ▼
   Verify both accounts exist and are ACTIVE
        │
4.      ▼
   account.getBalance() — aggregate ledger (totalCredit - totalDebit)
   Ensure balance ≥ amount
        │
        ▼
   ┌─── Start MongoDB Session & Transaction ───┐
5. │  Create Transaction doc (status: PENDING)  │
6. │  Insert DEBIT ledger entry (fromAccount)   │
7. │  Insert CREDIT ledger entry (toAccount)    │
8. │  Update Transaction → status: COMPLETED   │
9. │  commitTransaction()                       │
   └────────────────────────────────────────────┘
        │
        ▼  (session aborted on any failure above)
10.
   Send transaction email (best-effort, non-blocking)
        │
        ▼
   Return transaction object
```

### Balance Calculation

Balance is never stored. It is derived via MongoDB aggregation on demand:

```
Balance = Σ CREDIT entries − Σ DEBIT entries
         (for a given account in the ledger collection)
```

---

## Security

- Passwords are hashed with **bcrypt** (10 rounds) via a Mongoose `pre-save` hook.
- `password` and `systemUser` fields have `select: false` — never returned in queries by default.
- Logged-out tokens are stored in a **blacklist** collection (TTL-indexed, auto-deleted after 3 days matching JWT expiry).
- `name` field is **immutable** — cannot be changed after user creation.
- All ledger entries are **immutable** at the schema level — no update/delete hooks allowed.
- System-only routes are guarded by a dedicated `authSystemUserMiddleware`.

## Future Improvements

- Rate limiting for API endpoints
- Redis-based job queue for email processing
- Admin dashboard
- Transaction history pagination
- Monitoring with Prometheus/Grafana
