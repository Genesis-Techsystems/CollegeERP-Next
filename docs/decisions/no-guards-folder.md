# Why There Is No `guards/` Folder

## Background

The Angular foundation codebase (`college_erp_angular_foundation_work`) has a `src/app/guards/` folder containing `auth.guard.ts` and `login.guard.ts`. These are Angular Router guards — functions that run before a route activates to decide whether navigation should proceed.

During the Next.js migration, the question arose: should we create a matching `src/guards/` folder?

**Decision: No.**

---

## Why Angular Guards Exist as a Folder

In Angular, route protection is a single concept handled in a single place — the Router. Guards are plugged into the router config and run as middleware before any route renders. Grouping them in `guards/` makes sense because they are all the same kind of thing used in the same way.

---

## Why Next.js Is Different

Next.js does not have a router guard API. Protection is handled at **three separate layers**, each baked into a different part of the framework. These files cannot be moved to a shared folder without breaking the framework conventions.

### Layer 1 — `src/middleware.ts` (cannot move)

Fast cookie-presence check that runs on **every matched request** at the edge, before any page or layout renders. Next.js requires this file to live at `src/middleware.ts` — it is a framework convention, not a choice.

- Checks: does the session cookie exist?
- Does NOT: decrypt the session or validate the JWT.
- On failure: redirects to `/login`.

### Layer 2 — `src/app/(pages)/(protected)/layout.tsx` (cannot move)

Server Component that runs before any protected page renders. Decrypts the iron-session cookie and verifies that both `user` and `jwt` fields are present and valid. This catches expired or tampered sessions that slipped past the cookie check in Layer 1.

- Checks: is the session valid? are `user` and `jwt` present?
- Also: fetches the user's navigation tree server-side.
- On failure: redirects to `/login`.

This file must live inside the `(protected)` route group — its position in the file system is what makes it apply to all protected routes.

### Layer 3 — `src/components/shared/RoleGuard.tsx` (UI only)

Client-side React component that hides UI sections from users who lack a required role.

```tsx
<RoleGuard roles={['ADMIN', 'PRINCIPAL']}>
  <AdminOnlyPanel />
</RoleGuard>
```

This is **not a security boundary** — it only controls what is rendered. Layers 1 and 2 are the real protection. `RoleGuard` lives in `components/shared/` because it is a React component, not a route guard.

---

## Summary

| Layer | File | Moveable? | What it checks |
|---|---|---|---|
| 1 | `src/middleware.ts` | No — framework requirement | Cookie exists |
| 2 | `src/app/(pages)/(protected)/layout.tsx` | No — route file | Session valid, JWT present |
| 3 | `src/components/shared/RoleGuard.tsx` | Yes, but no reason to | User role (UI only) |

Creating a `src/guards/` folder would only contain `RoleGuard.tsx` — the actual route protection logic must stay where it is. A folder of one file with a misleading name adds confusion rather than clarity.

The three files already cross-reference each other via comments so the full auth flow is easy to follow.
