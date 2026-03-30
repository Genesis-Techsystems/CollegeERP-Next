# PDF Download Module — Restore Guide

Move each file back to its original path exactly as listed below.
No services/types/hooks were specific to this module — nothing else to restore.

---

## Pages → `src/app/(pages)/(protected)/pdf-download/`

| File in todo | Restore to |
|---|---|
| `pages/page.tsx` | `src/app/(pages)/(protected)/pdf-download/page.tsx` |

---

## Notes

- Handles PDF generation client-side using jsPDF and html2canvas.
- No backend service calls. Self-contained page.
