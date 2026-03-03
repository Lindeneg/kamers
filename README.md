# Kamers

**Work in progress.**

I just wanted to explore a multi-tenant application, I used a logistics management platform here, but it could in theory be whatever. Organizations get isolated workspaces with their own users, permissions, shipments, bookings, and audit trails.

Authentication supports both built-in email/password login and OIDC providers (Google, Microsoft, etc.). The session and permission model is provider-agnostic, auth methods flow through the same pipeline.

## Audit logging

All mutations are recorded in the `AuditLog` table with the acting user, target entity, IP address, and a JSON `details` payload containing human-readable context (target user email/name, permissions granted, etc.).

All fallible operations return `Result<T, E>`.

## Multi-tenancy

Every user belongs to exactly one tenant. Tenant isolation is enforced at the query level, all data-fetching operations filter by `tenantId`. Tenants are resolved from email domains during invite and login.

Super admins (which is effectively me) can view users and audit logs across tenants via a `?tenantId=` query parameter. Regular users and tenant admins can only see their own tenant's data.

## Quick start (development)

Default seed credentials are printed during bootstrap. The super admin email/password are configured via `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `packages/server/.env.development`.

```bash
npm run bootstrap
npm run dev
```
