# Docs Agent Report — 2026-03-29

## What Was Documented

### Files Created

| File | Task | Contents |
|---|---|---|
| `src/docs/architecture/README.md` | D1 | Stack table with rationale, annotated folder tree, 3-layer data flow diagram, security model, multi-tenancy explanation, key constraints |
| `src/docs/flows/auth-flow.md` | D2 | 8-step numbered flow with exact file refs, ASCII diagram, full SessionUser field list, what is/isn't in cookie, modules/pages lifecycle, security properties |
| `src/docs/flows/api-proxy-flow.md` | D3 | Step-by-step proxy flow, what proxy does NOT do, multipart file handling, trailing-space key quirk, 401 handling, env vars, traced client-to-Spring-Boot example |
| `src/docs/architecture/service-layer.md` | D4 | Why services exist, naming convention, pattern rules, complete JSDoc example, how to add a service, TanStack Query integration, error handling |
| `src/docs/components/README.md` | D5 | Full component catalog: all ui/ Shadcn primitives, layout components, forms, DataTable, ConfirmDialog, data-display/shared stubs, notes on unimplemented DataTable props |
| `src/docs/flows/exam-master-flow.md` | D6 | Filter cascade logic with code refs, university/college mode toggle, modal form chain (create/edit/file upload), details page parallel fetches, save-all pattern, all Spring Boot endpoints, known quirks table |
| `src/docs/ONBOARDING.md` | D7 | Prerequisites, setup steps, 5 mental models, how to add page/component/service, request lifecycle, troubleshooting (6 common issues), key files reference, built/not-built summary |
| `PROGRESS.md` (updated) | D8 | Phase 2 section prepended: added/changed lists for Foundation agent work |

---

## Gaps Found

### 1. `src/services/exam-master.service.ts` does not exist

`src/services/index.ts` exports `'./exam-master.service'` but the file is not present. This will cause a TypeScript compilation error. The exam master pages currently fetch inline. The service layer document describes what the file should contain but cannot link to actual implementation yet.

**Recommendation:** Foundation agent should create this file before removing the inline fetches from the page components.

### 2. `organizationId` missing from `SessionUser`

`UserDTO.organizationId` is returned by Spring Boot but is absent from `SessionUser`. The exam master page works around this with `(user as any)?.organizationId ?? 0`. This type gap is undocumented anywhere except the PROGRESS.md "What Is NOT Done" section.

**Recommendation:** Add `organizationId?: number` to `SessionUser` in `src/types/user.ts` and to the session-building logic in `src/app/api/auth/login/route.ts`. Document it in `src/docs/flows/auth-flow.md` cookie fields table.

### 3. DataTable props declared but not implemented

`DataTableProps` declares `pagination`, `paginationPageSize`, `exportCsv`, `showSearch`, and `onRowSelected` — but none of these are wired in the component body. A developer reading the type would expect these to work.

**Recommendation:** Either implement the props or remove them from the interface until they are ready. Document the gap in `src/docs/components/README.md` (already noted, but the component itself should ideally have a comment).

### 4. `src/components/data-display/` and `src/components/shared/` are empty

Both directories have barrel files but no component files. The component catalog documents them as "planned" but a new developer might be confused seeing imports fail.

**Recommendation:** Foundation agent should create the planned components (StatusBadge, StatCard, RoleGuard, PageContainer) or update the barrel files to export nothing until ready.

### 5. `[DEBUG] SessionUser` panel on Dashboard is still in production code

PROGRESS.md notes this should be removed before production. It is not gated behind `NODE_ENV`. If any user knows the URL, they can see the full SessionUser object in the UI.

**Recommendation:** Remove immediately or gate with `process.env.NODE_ENV === 'development'`.

### 6. `src/config/constants/` directory does not exist

PROGRESS.md Phase 2 addition references `src/config/constants/api.ts` etc., but only `src/config/constants.ts` (flat file) exists. The service layer doc references `@/config/constants/api` as a future import.

**Recommendation:** When Foundation agent creates the split constants structure, update the import path in `src/config/constants.ts` to re-export from the new location for backward compatibility.

### 7. No error boundary at the page level

Client components that throw errors will crash the entire page with a blank screen. There is no `error.tsx` in `(protected)/` or any page directory. `ConfirmDialog` exists but `ErrorBoundary` (referenced in PROGRESS.md Phase 2) does not yet exist as a component file.

**Recommendation:** Add `src/app/(protected)/error.tsx` as a Next.js error boundary. Also create `src/components/feedback/ErrorBoundary.tsx`.

### 8. Middleware matcher may miss some routes

Current middleware matcher:
```typescript
matcher: ['/(protected)/:path*', '/dashboard/:path*']
```

The `(protected)` route group in Next.js App Router is typically accessed without the group prefix in URLs. The matcher `/(protected)/:path*` would only work if the actual URL contains `(protected)` — which it doesn't (route group names are not in URLs). The `/dashboard/:path*` works, but other protected routes like `/admin-examination-management/...` are not covered.

**Recommendation:** Audit the middleware matcher. It likely needs to cover all protected routes individually or use a negative matcher to exclude public routes.

---

## Recommendations for Next Sprint Docs

### High priority

1. **Add `src/docs/flows/dashboard-flow.md`** — document stat card data requirements, role-based rendering logic, and what APIs will eventually power the hardcoded-zero cards.

2. **Update `src/docs/flows/auth-flow.md`** once `organizationId` is added to `SessionUser`.

3. **Add a `src/docs/troubleshooting/middleware.md`** — the middleware matcher issue (#8 above) is subtle and will cause confusion for new developers who add routes and find they are unprotected.

### Medium priority

4. **Document `src/lib/navigation.ts`** more formally — `buildNavTree()` replicates complex Angular logic and has several edge cases (module.url being the literal string `"null"`, word "and" skipping in URL derivation). The current JSDoc is good but a dedicated section in the architecture README would help.

5. **Add `src/docs/flows/navigation-flow.md`** — document how `buildNavTree()` output flows from `UserDTO` → `protected/layout.tsx` → `AppShell` → Zustand store → Sidebar render.

6. **Document `src/store/navigation-store.ts`** usage in the component catalog — it is used by both `AppShell` (writes) and `Sidebar`/`NavItem` (reads) but the store itself is not documented.

### Low priority

7. **Add ADR (Architecture Decision Record) format** to `migration-plan/03-decisions.md` for new decisions made during Phase 2 (e.g. service layer pattern, TanStack Query conventions).

8. **Document the `sessionStorage` handoff pattern** as a project convention — the exam master uses it for list→details navigation. If other feature modules adopt this, document it as a guideline (when to use vs. TanStack Query cache).
