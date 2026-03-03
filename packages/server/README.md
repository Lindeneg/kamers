# @kamers/server

Express 5 API server for the Kamers platform. Handles authentication, multi-tenant user management, permissions, and audit logging.

## Architecture

```
src/
  controllers/    Parse request -> call service -> send response
  services/       Business logic, orchestration, transactions
  repositories/   Thin Prisma wrappers, return Result<T>
  middleware/     authenticate (JWT), requirePermission (RBAC)
  routes/         Express routers, one per resource
  lib/            Shared utilities (pagination, error handling, parsing)
  generated/      Prisma client (auto-generated, git-ignored)
  __tests__/      Integration tests (supertest + real DB)
```

## Authentication flow

The server uses a dual-token JWT strategy with httpOnly cookies. No tokens are ever exposed to JavaScript.

Key security properties:

- **Token rotation**: each refresh creates a new session and invalidates the old one. Reuse of a rotated token indicates theft.
- **Path-scoped cookies**: the refresh token cookie is restricted to `/api/auth/refresh` so it's never sent on regular API calls.
- **Server-side sessions**: deleting a Session row immediately revokes that device, regardless of JWT expiry.
- **isActive gate**: checked on both login and refresh, so deactivating a user takes effect within one access token lifetime (15 min max).

```
                          ┌──────────────────────────────────────────┐
                          │              Initial Login               │
                          └──────────────────────────────────────────┘

  Client                        Server                          Database
    │                             │                               │
    │  POST /auth/login           │                               │
    │  {email, password}          │                               │
    │────────────────────────────>│                               │
    │                             │  findByEmail(email)           │
    │                             │  (excludes soft-deleted)      │
    │                             │──────────────────────────────>│
    │                             │           User                │
    │                             │<──────────────────────────────│
    │                             │                               │
    │                             │  Verify: password, isActive   │
    │                             │                               │
    │                             │  Create Session row           │
    │                             │──────────────────────────────>│
    │                             │                               │
    │                             │  Sign access JWT (15 min)     │
    │                             │  Sign refresh JWT (7 days)    │
    │                             │  (refresh token stored in     │
    │                             │   Session row for rotation)   │
    │                             │                               │
    │  Set-Cookie: access_token   │                               │
    │  Set-Cookie: refresh_token  │                               │
    │  (both httpOnly, secure)    │                               │
    │<────────────────────────────│                               │
    │                             │                               │
    │  refresh_token cookie is    │                               │
    │  path-scoped to             │                               │
    │  /api/auth/refresh only     │                               │


                          ┌──────────────────────────────────────────┐
                          │           Authenticated Request          │
                          └──────────────────────────────────────────┘

  Client                        Server                          Database
    │                             │                               │
    │  GET /api/users             │                               │
    │  Cookie: access_token=...   │                               │
    │────────────────────────────>│                               │
    │                             │                               │
    │                   ┌─────────┴─────────┐                     │
    │                   │  authenticate()   │                     │
    │                   │  Verify JWT sig   │                     │
    │                   │  Extract userId,  │                     │
    │                   │  tenantId         │                     │
    │                   └─────────┬─────────┘                     │
    │                             │                               │
    │                   ┌─────────┴──────────────┐                │
    │                   │  requirePermission()   │                │
    │                   │  Load user permissions  │───────────────>│
    │                   │  from DB, check slug   │<───────────────│
    │                   └─────────┬──────────────┘                │
    │                             │                               │
    │                             │  (request proceeds to         │
    │                             │   controller -> service)      │
    │                             │                               │


                          ┌──────────────────────────────────────────┐
                          │             Token Refresh                │
                          └──────────────────────────────────────────┘

  Client                        Server                          Database
    │                             │                               │
    │  POST /auth/refresh         │                               │
    │  Cookie: refresh_token=...  │                               │
    │────────────────────────────>│                               │
    │                             │  Verify JWT signature         │
    │                             │  Extract sessionId            │
    │                             │                               │
    │                             │  Find Session by ID           │
    │                             │──────────────────────────────>│
    │                             │<──────────────────────────────│
    │                             │                               │
    │                             │  Check: not expired,          │
    │                             │  user.isActive                │
    │                             │                               │
    │                             │  ┌─ Transaction ────────────┐ │
    │                             │  │ Delete old Session       │ │
    │                             │  │ Create new Session       │ │
    │                             │  │ (token rotation)         │ │
    │                             │  └──────────────────────────┘ │
    │                             │                               │
    │  Set-Cookie: access_token   │                               │
    │  Set-Cookie: refresh_token  │                               │
    │  (fresh pair)               │                               │
    │<────────────────────────────│                               │
```

## Invite flow

```
  Admin                         Server                       New User
    │                             │                             │
    │  POST /users/invite         │                             │
    │  {email, name}              │                             │
    │────────────────────────────>│                             │
    │                             │  Create User (no password)  │
    │                             │  Generate invite token      │
    │                             │  Set 7-day expiry           │
    │                             │                             │
    │                             │  Send email with link:      │
    │                             │  /set-password?token=...    │
    │                             │────────────────────────────>│
    │                             │                             │
    │                             │                             │  User clicks link
    │                             │                             │
    │                             │  POST /auth/set-password    │
    │                             │  {token, password}          │
    │                             │<────────────────────────────│
    │                             │                             │
    │                             │  Verify token, check expiry │
    │                             │  Hash password              │
    │                             │  Clear inviteToken fields   │
    │                             │                             │
    │                             │  User can now log in        │
    │                             │  normally via /auth/login   │
```

## User lifecycle

```
  Invited (no password, has inviteToken)
     │
     │  POST /auth/set-password
     ▼
  Active (isActive=true, can log in)
     │
     │  PATCH /users/:id/active {isActive: false}
     ▼
  Deactivated (isActive=false, blocked at login + refresh)
     │
     │  PATCH /users/:id/active {isActive: true}
     ▼
  Active (re-enabled)
     │
     │  DELETE /users/:id
     ▼
  Soft-deleted (deletedAt set, email rewritten, sessions purged)
     │
     │  (hidden from all queries, same email can be re-invited)
```

## Prisma configs

| Config | Purpose |
|---|---|
| `prisma.config.dev.ts` | Local development (loads `.env.development`) |
| `prisma.config.test.ts` | Test suite (loads `.env.test`) |
| `prisma.config.docker.ts` | Docker/production (reads `DATABASE_URL` from environment) |

