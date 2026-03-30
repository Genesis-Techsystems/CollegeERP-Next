@AGENTS.md

## Component Import Rule

**Reusable UI components live in `@/common/components/`. Layout/structural components live in `@/components/layout/`.**

All exports are **named exports**. Never use default imports from component paths.

```ts
// Reusable UI components — import from @/common/components/
import { DataTable } from '@/common/components/table'
import { Select, MultiSelect } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { ConfirmDialog, FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'

// Layout / structural — import from @/components/layout
import { PageHeader, PageContainer } from '@/components/layout'

// Or import from the common barrel for reusable components
import { DataTable, Select, ConfirmDialog } from '@/common/components'

// Wrong — will fail at build time
import DataTable from '@/common/components/table'   // default import, does not exist
```

---

## `src/components/layout/` — Layout & Structural Components

| Directory | Components |
|---|---|
| `components/layout/` | `AppShell`, `Topbar` (live search), `Sidebar`, `NavItem`, `PageHeader`, `PageContainer` |

Import: `import { PageHeader, PageContainer } from '@/components/layout'`

---

## `src/common/components/` — Reusable UI Components

Mirrors Angular's `src/app/common/components/`. Each component mirrors an Angular `@Component`. Props correspond to Angular `@Input()` / `@Output()` bindings.

| Directory | Components |
|---|---|
| `common/components/table/` | `DataTable` — AG Grid Community v35 wrapper with server-side pagination support; `Table` — lightweight simple table |
| `common/components/date-picker/` | `DatePicker`, `MonthYearPicker` — react-day-picker v9 |
| `common/components/search/` | `SearchInput` — instant by default (0 ms debounce); pass `serverSearch` for 300 ms debounce on API searches; pass `collapsible` to render as icon button that expands on click |
| `common/components/select/` | `Select` (async-safe, Radix Popover), `MultiSelect` (Popover + Checkbox) |
| `common/components/charts/` | `BarChart` — recharts v3 (vertical/horizontal, stacked, click handler); `PieChart` — recharts v3 (donut mode, hover expand, custom tooltip); `DrilldownChart` stub |
| `common/components/theme-setting-modal/` | `ThemeSettingModal` — appearance, color scheme, sidebar, font size |
| `common/components/breadcrumb/` | `Breadcrumb`, `useBreadcrumb` hook |
| `common/components/data-display/` | `StatusBadge`, `StatCard` |
| `common/components/feedback/` | `ConfirmDialog`, `EmptyState`, `ErrorBoundary`, `FormModal` |
| `common/components/forms/` | `ActiveStatusField` (isActive checkbox + conditional reason input), `CollegeFilterPanel`, `FormField` |

Import from subdirectory: `import { DataTable } from '@/common/components/table'`
Import from barrel: `import { DataTable, Select, ConfirmDialog } from '@/common/components'`

---

## `src/services/` — API Service Layer

All API calls go through `src/services/`. Pages and components never call `fetch()` directly to server endpoints.

### CRUD service (`crud.ts`) + query builder (`query.ts`)

```ts
import { crud, domainList, domainCreate, domainUpdate, domainSoftDelete, getAllRecords } from '@/services/crud'
import { buildQuery } from '@/services/query'
```

API pattern:
```
GET    /api/proxy/domain/list/{Entity}?size=99999&query={query}
POST   /api/proxy/domain/create/{Entity}
PUT    /api/proxy/domain/update/{Entity}?query={pk}=={value}
GET    /api/proxy/getAllRecords/{procName}?{params}
```

`buildQuery` produces the query string: `buildQuery({ 'Course.courseId': 5, isActive: true }, { field: 'createdDt', direction: 'DESC' })` → `"Course.courseId==5.and.isActive==true.order(createdDt=DESC)"`

### Domain service files

Each entity has a typed wrapper in `src/services/`. Use the domain service, not `crud` directly from pages:
```ts
import { getExamSessions, createExamSession, updateExamSession, deleteExamSession } from '@/services/exam-session'
```

---

## `src/config/constants/` — All Constants

**Never write a raw string URL in `fetch()`. Always use a constant.**

| Constant | Use |
|---|---|
| `NEXT_API.AUTH.LOGIN` | `'/api/auth/login'` — Next.js login route |
| `NEXT_API.AUTH.LOGOUT` | `'/api/auth/logout'` — Next.js logout route |
| `NEXT_API.AUTH.ME` | `'/api/auth/me'` — Next.js session route |
| `NEXT_API.PROXY(path)` | Builds `/api/proxy/{path}` — use with Spring Boot path constants |
| `AUTH_API.*` | Spring Boot auth paths — server-side only (`integrations/spring-api.ts`) |
| `EXAM_API.*` | Spring Boot exam endpoint paths — use with `NEXT_API.PROXY()` |
| `ORG_API.*` | Spring Boot org endpoint paths — use with `NEXT_API.PROXY()` |
| `GM_CODES.*` | GeneralMaster category codes (95 entries) — use as `in_gm_codes` param |
| `APP_CONFIG` | App name, session TTL, rate limit config |
| `USER_ROLES` | Spring Boot role strings |
| `DATE_FORMATS` | `DISPLAY`, `DISPLAY_WITH_TIME` format strings |

---

## `src/common/` — Angular Foundation Layer Mirror

`src/common/` mirrors Angular's `src/app/common/` directory. It contains project-wide constants, utility helpers, and reusable presentational components shared across all modules.

### Constant Files

| File | Purpose |
|---|---|
| `src/common/constants.ts` | Core app-wide constants: API base paths, pagination defaults, app name |
| `src/common/general-constants.ts` | Domain enums: roles, status codes, academic year formats, exam-related enums |
| `src/common/alias-labels.ts` | Human-readable label map for entity field names (mirrors Angular alias map) |
| `src/common/generic-functions.ts` | Shared utility functions: date formatting, string helpers, data transformations |
| `src/common/print-config.ts` | Print layout configuration used by PDF/print views |

### Charts: recharts instead of Highcharts

Angular used Highcharts (commercial licence). Next.js migration uses **recharts** (MIT). The API is different — do not assume Highcharts config objects work here. See the component source files for the exact props interface.

---

## AG Grid Column Definitions Pattern

Separate column **shape** from **rendering** in every page. This makes column layout easy to scan and change without touching renderer logic.

### Structure (all in the same page file)

```ts
// 1. Pure data — outside the component, no cellRenderer
const COL_DEFS = {
  siNo:    { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Entity>,
  name:    { field: 'name', headerName: 'Name', minWidth: 180 } as ColDef<Entity>,
  isActive:{ field: 'isActive', headerName: 'Status', minWidth: 110 } as ColDef<Entity>,
  actions: { headerName: 'Actions', minWidth: 110, flex: 0, width: 110 } as ColDef<Entity>,
}

// 2. Pure renderers — outside the component, no state dependencies
function statusRenderer(p: ICellRendererParams<Entity>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

// 3. Factory for renderers that need page state
function makeActionsRenderer(
  setEditing: (row: Entity | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Entity>) => (
    <Button size="sm" variant="ghost" onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5 mr-1" /> Edit
    </Button>
  )
}

// 4. useMemo inside component — assembles shape + renderers
const columnDefs = useMemo<ColDef<Entity>[]>(
  () => [
    COL_DEFS.siNo,
    COL_DEFS.name,
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions,  cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
  ],
  [setEditing, setModalOpen],
)
```

### Rules
- Always use `StatusBadge` from `@/common/components/data-display` for `isActive` columns — never inline badge spans.
- `COL_DEFS` keys are the source of truth for column layout; renderers are opt-in via spread.
- `makeActionsRenderer` pattern for any renderer that closes over page state.
