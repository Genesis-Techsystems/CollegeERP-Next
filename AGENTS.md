<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Multi-Agent Migration Approach

Phase 7 of the migration was executed by six parallel agents, each owning a distinct slice of the Angular-to-Next.js foundation migration.

### Agent Responsibilities

| Agent | Scope |
|---|---|
| **Agent 1** | Constants — migrated `src/app/common/constants.ts`, `general-constants.ts`, `alias-labels.ts`, `generic-functions.ts`, `print-config.ts` to `src/common/` |
| **Agent 2** | Charts — implemented `src/common/components/bar-chart/` and `pie-chart/` using recharts (OSS replacement for Highcharts) |
| **Agent 3** | Form components — implemented `src/common/components/search/`, `select/`, `date-picker/`, `breadcrumb/` |
| **Agent 4** | Table and theme — implemented `src/common/components/table/` and `theme-setting-modal/` |
| **Agent 5** | Pages — added `admin/organizations`, `admin/campus`, `dashboards/evaluation-dashboard`, `evaluation/*`, `pdf-download`, `sample` routes |
| **Agent 6** | Docs — updated PROGRESS.md, CLAUDE.md, AGENTS.md, and component README |

### Angular → Next.js Structure Map

| Angular path | Next.js path | Notes |
|---|---|---|
| `src/app/common/` | `src/common/` | Constants and shared utilities |
| `src/app/common/components/bar-chart/` | `src/common/components/bar-chart/` | recharts replaces Highcharts |
| `src/app/common/components/pie-chart/` | `src/common/components/pie-chart/` | recharts replaces Highcharts |
| `src/app/common/components/breadcrumb/` | `src/common/components/breadcrumb/` | Direct port |
| `src/app/common/components/search/` | `src/common/components/search/` | Direct port |
| `src/app/common/components/select/` | `src/common/components/select/` | Wraps Shadcn Select |
| `src/app/common/components/date-picker/` | `src/common/components/date-picker/` | Wraps Radix Popover + Calendar |
| `src/app/common/components/table/` | `src/common/components/table/` | Lightweight (not AG Grid) |
| `src/app/common/components/theme-setting-modal/` | `src/common/components/theme-setting-modal/` | Direct port |
| `src/app/admin/organizations/` | `src/app/(protected)/admin/organizations/` | App Router protected route |
| `src/app/admin/campus/` | `src/app/(protected)/admin/campus/` | App Router protected route |
| `src/app/dashboards/evaluation-dashboard/` | `src/app/(protected)/dashboards/evaluation-dashboard/` | Uses chart components |
| `src/app/evaluation/` | `src/app/(protected)/evaluation/` | App Router protected route |

### Notes for Future Agents

- `src/common/` is for Angular-parity foundation code. Do not put Next.js-specific abstractions here.
- Chart components are intentionally thin wrappers — keep Highcharts config assumptions out.
- The `select/` in `src/common/components/` is a higher-level labeled wrapper; the Shadcn primitive remains at `src/components/ui/select.tsx`.

### Angular reference source (read-only, full application)

The **entire** legacy Angular app is linked at **`external-src/angular/`** (alias: `external-src/goldcollegeerp_2024_dev3/`). All feature modules live under `external-src/angular/src/app/main/apps/` (~129 folders). Only scholarship is migrated in Next.js so far. Not part of the Next.js build. See `external-src/README.md`. Optional: open `CollegeERP-Next.code-workspace` for a two-root IDE view.
