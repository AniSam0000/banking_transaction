# 🏦 Banking Transaction System (Ledger-Based Backend)

A backend system for managing secure banking transactions, built with Node.js, Express.js, and MongoDB.
The project implements JWT authentication, account management, and transaction-safe money transfers using a double-entry ledger system.

The system ensures data integrity, atomic transactions, and idempotent transfers, similar to how real financial systems operate.

## 🚀 Features

User registration and login with JWT authentication

Secure cookie-based authentication

Account creation and management

Peer-to-peer money transfers

Double-entry ledger system for financial accuracy

MongoDB transactions (sessions) for atomic operations

Idempotency keys to prevent duplicate transactions

Token blacklisting for logout security

Email notifications for user registration and transactions

## 🛠 Tech Stack

**Backend**

Node.js

Express.js

**Database**

MongoDB

Mongoose ODM

**Authentication**

JWT (JSON Web Token)

**Real-time / Services**

Nodemailer (Email notifications)

## 🔐 Authentication Flow

User registers with email and password.

Password is hashed before storing in the database.

After login, a JWT token is generated and stored in cookies.

Protected routes use authentication middleware to verify the token.

On logout, the token is added to a blacklist collection to prevent reuse.

## 🏦 Account System

Users can create and manage accounts.

Each account stores:

user ID

currency

status (ACTIVE / INACTIVE)

Balance is not stored directly.
Instead, it is calculated dynamically using ledger entries.

## 💸 Transaction System

Money transfers are processed using a double-entry ledger system.

**Transfer Workflow**

1 Validate request (accounts, amount, idempotency key)

2 Prevent self-transfer

3 Verify sender and receiver accounts

4 Check sender balance

5 Start MongoDB session

6 Create transaction record

7 Insert ledger entry (DEBIT from sender)

8 Insert ledger entry (CREDIT to receiver)

9 Update transaction status

10 Commit transaction

If any step fails, the transaction is rolled back.

## 🔁 Idempotency

-To prevent duplicate transfers:

-Each request includes an idempotency key

-If the same key is used again, the server returns the previous transaction result

-This prevents accidental double payments.

## 📧 Email Notifications

-The system sends emails for:

-User registration

-Successful transactions

-Transaction failures

-Implemented using Nodemailer with Gmail OAuth2.
