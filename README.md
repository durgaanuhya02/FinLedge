# FinLedger

A production-quality finance record management and analytics REST API with Role-Based Access Control (RBAC), JWT authentication, Google OAuth, and email verification.

---

## Project Overview

FinLedger is a backend-only API that lets organizations track financial records (income and expenses), enforce strict role-based access, and surface aggregated analytics through a dashboard. It demonstrates:

- Layered architecture (routes → controllers → services → DB)
- JWT access + refresh token pattern with rotation
- Google OAuth sign-in with automatic account linking
- Email verification on registration and password reset via Gmail SMTP
- RBAC enforced at the middleware layer
- Soft deletes, pagination, filtering, and sorting
- Consistent API response envelope across all endpoints
- Full integration test coverage with Jest + Supertest

---

## Tech Stack

| Technology | Reason |
|---|---|
| Node.js + TypeScript | Type safety across the entire codebase; strict mode catches bugs at compile time |
| Express.js | Minimal, well-understood HTTP framework; easy to compose middleware |
| Prisma ORM (v6) | Type-safe DB queries, auto-generated client, clean migration workflow |
| SQLite | Zero-setup relational DB; swap `DATABASE_URL` for PostgreSQL in production with no code changes |
| JWT (jsonwebtoken) | Stateless access tokens + DB-backed refresh tokens for rotation and revocation |
| Zod | Runtime schema validation with TypeScript inference; single source of truth for input shapes |
| bcryptjs | Industry-standard password hashing with configurable salt rounds |
| Passport + passport-google-oauth20 | Handles Google OAuth 2.0 flow cleanly; integrates with Express middleware |
| Nodemailer | Sends verification and reset emails via Gmail SMTP; falls back to Ethereal in dev |
| swagger-jsdoc + swagger-ui-express | Auto-generated OpenAPI docs from JSDoc comments |
| Jest + Supertest | Integration tests that hit real HTTP routes against a live in-memory test DB |

---

## Architecture Decisions

**Layered structure** — routes → controllers → services → DB. Controllers only parse/validate input and delegate to services. Services own all business logic. This makes each layer independently testable and replaceable without touching the others.

**RBAC in middleware** — `authorize(...roles)` is a reusable middleware factory applied at the route level. Keeping access control out of service logic means permissions are visible at a glance in the route file, not buried in business logic. It also means a single misconfigured route is the only failure point, not scattered conditionals across services.

**Refresh token rotation** — on every `/refresh` call, the old token is revoked and a new one is issued. Reusing a rotated token returns 401, which detects token theft. All refresh tokens are hashed with SHA-256 before storage.

**Soft deletes** — `is_deleted` flag on records, `status: inactive` on users. No data is ever hard-deleted. All queries filter `isDeleted: false` by default.

**Email verification is non-blocking** — registration succeeds and returns tokens immediately. The verification email is sent fire-and-forget. This avoids failing registration if SMTP is misconfigured, while still encouraging verification.

**Google OAuth account linking** — if a user registers with email/password first, then signs in with Google using the same email, the Google ID is automatically linked to the existing account. No duplicate accounts.

**Consistent response envelope** — every response is `{ success, data, meta? }` or `{ success, error }`. Clients never need to guess the shape.

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <repo-url>
cd finledger
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- JWT secrets (use long random strings in production)
- Google OAuth credentials (from [console.cloud.google.com](https://console.cloud.google.com))
- Gmail SMTP credentials (use a Gmail App Password)

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Seed the database

```bash
npx ts-node --transpile-only src/config/seed.ts
```

This creates 3 users and 50 financial records across 6 months.

| Email | Role | Password |
|---|---|---|
| admin@finledger.com | admin | Test@1234 |
| analyst@finledger.com | analyst | Test@1234 |
| viewer@finledger.com | viewer | Test@1234 |

### 5. Run the server

```bash
npm run dev
```

Server starts at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

### 6. Run tests

```bash
npm test
```

---

## API Reference

### Auth — `/api/auth`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | /api/auth/register | No | — | Register, sends verification email |
| POST | /api/auth/login | No | — | Login with email + password |
| POST | /api/auth/refresh | No | — | Rotate refresh token, get new access token |
| POST | /api/auth/logout | No | — | Revoke refresh token |
| GET | /api/auth/verify-email | No | — | Verify email via token from email link |
| POST | /api/auth/resend-verification | No | — | Resend verification email |
| POST | /api/auth/forgot-password | No | — | Send password reset email |
| POST | /api/auth/reset-password | No | — | Reset password using token from email |
| GET | /api/auth/google | No | — | Initiate Google OAuth (redirects to Google) |
| GET | /api/auth/google/callback | No | — | Google OAuth callback, returns tokens |

### Users — `/api/users`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | /api/users | Yes | admin | Paginated user list (filter by role/status) |
| GET | /api/users/:id | Yes | admin | Get single user |
| PATCH | /api/users/:id | Yes | admin | Update name, role, status |
| DELETE | /api/users/:id | Yes | admin | Soft delete (set inactive) |

### Financial Records — `/api/records`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | /api/records | Yes | viewer, analyst, admin | Paginated list with filters and sorting |
| GET | /api/records/:id | Yes | viewer, analyst, admin | Get single record |
| POST | /api/records | Yes | admin | Create record |
| PATCH | /api/records/:id | Yes | admin | Partial update |
| DELETE | /api/records/:id | Yes | admin | Soft delete |

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | /api/dashboard/summary | Yes | viewer, analyst, admin | Total income, expenses, net balance, count |
| GET | /api/dashboard/by-category | Yes | viewer, analyst, admin | Category-wise income and expense totals |
| GET | /api/dashboard/trends | Yes | viewer, analyst, admin | Weekly or monthly time-series data |
| GET | /api/dashboard/recent | Yes | viewer, analyst, admin | 10 most recent records |
| GET | /api/dashboard/top-categories | Yes | analyst, admin | Top 5 expense categories |

---

## Role Permission Matrix

| Action | viewer | analyst | admin |
|---|---|---|---|
| Register / Login / OAuth | ✓ | ✓ | ✓ |
| Verify email / Reset password | ✓ | ✓ | ✓ |
| Read financial records | ✓ | ✓ | ✓ |
| Create / Update / Delete records | ✗ | ✗ | ✓ |
| Dashboard summary / trends / recent / by-category | ✓ | ✓ | ✓ |
| Dashboard top-categories | ✗ | ✓ | ✓ |
| Manage users (list, update, delete) | ✗ | ✗ | ✓ |

---

## Assumptions Made

- Role is set at registration time. In a real product, only admins would assign elevated roles — here it is open for demo convenience.
- Email verification is encouraged but not enforced — users can access the API without verifying. Enforcement would be a one-line middleware addition.
- Dashboard aggregations run in-process over all records. For large datasets these would move to DB-level `groupBy` / `aggregate` queries.
- SQLite is used for portability. The schema is PostgreSQL-compatible; switching requires only changing `DATABASE_URL` and the `provider` in `schema.prisma`.
- Refresh tokens are hashed with SHA-256 before storage. The raw token is only ever held in memory and returned to the client once.
- Google OAuth users have no `passwordHash` — they cannot use the email/password login or password reset flow.
- The `jti` (JWT ID) claim is added to every token to prevent hash collisions when multiple tokens are issued within the same second.

---

## Known Limitations / Tradeoffs

- **No connection pooling** — SQLite is single-writer; fine for development, not for concurrent production load.
- **In-process dashboard aggregations** — `getSummary`, `getByCategory`, etc. load all records into memory. Should use Prisma `groupBy` and `aggregate` for scale.
- **Rate limiter is in-memory** — `express-rate-limit` defaults to memory store. In a multi-instance deployment, use a Redis store.
- **No email verification enforcement** — users are active immediately after registration. Blocking unverified users would require one additional middleware check.
- **Google OAuth returns JSON** — in a real app the callback would redirect to a frontend URL with tokens in a secure cookie or query param. Here it returns JSON for API-first usage.
- **ts-node uses `--transpile-only`** — skips type checking at runtime for speed. Run `npx tsc --noEmit` separately to type-check.

---

## What I Would Add Next

1. **PostgreSQL + connection pooling** (PgBouncer or Prisma Accelerate) for production readiness and concurrent writes
2. **Redis-backed rate limiting and refresh token store** for horizontal scaling across multiple instances
3. **Audit log table** — record every mutation (who changed what and when) for compliance and debugging
4. **DB-level aggregations** — replace in-memory dashboard loops with Prisma `groupBy` and `aggregate` for performance at scale
5. **Frontend redirect flow for OAuth** — redirect to a frontend URL with tokens in an `HttpOnly` cookie instead of returning JSON from the callback
