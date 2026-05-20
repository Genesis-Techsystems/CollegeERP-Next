# Evaluation Module — Restore Guide

Move each file back to its original path exactly as listed below.
No services/types/hooks/docs were specific to this module — nothing else to restore.

---

## Pages → `src/app/(pages)/(protected)/evaluation/`

| File in todo | Restore to |
|---|---|
| `pages/paper/page.tsx` | `src/app/(pages)/(protected)/evaluation/paper/page.tsx` |
| `pages/evaluation-process/page.tsx` | `src/app/(pages)/(protected)/evaluation/evaluation-process/page.tsx` |
| `pages/evaluator-assigned-answer-sheet/page.tsx` | `src/app/(pages)/(protected)/evaluation/evaluator-assigned-answer-sheet/page.tsx` |

---

## Shared files used by this module (already in place, no action needed)

| File | Location |
|---|---|
| `DataTable` | `src/common/components/table/` |
| `SearchInput` | `src/common/components/search/` |
| `PageHeader`, `PageContainer` | `src/components/layout/` |
| `useCrudList`, `useCrudMutation`, `useEntityForm` | `src/hooks/` |
| `SessionContext` | `src/context/SessionContext.tsx` |
