# Dashboards Module — Restore Guide

Move each file back to its original path exactly as listed below.
No services/types/hooks were specific to this module — nothing else to restore.

---

## Pages → `src/app/(pages)/(protected)/dashboards/`

| File in todo | Restore to |
|---|---|
| `pages/evaluation-dashboard/page.tsx` | `src/app/(pages)/(protected)/dashboards/evaluation-dashboard/page.tsx` |

---

## Notes

- Dashboard page has TODO comments for real service calls — services not yet implemented.
- Uses `StatCard` from `src/common/components/data-display/` and shared chart components.
- When implementing services, add them to `src/services/` and re-export in `src/services/index.ts`.
