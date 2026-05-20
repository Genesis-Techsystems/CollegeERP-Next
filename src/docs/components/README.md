# Component Catalog

> All components are TypeScript with JSDoc props interfaces.
> All client components have `'use client'` at the top.
> Shadcn components in `ui/` are copy-paste pattern — not an npm dependency.

---

## Categories

### `src/components/` — Structural Components
1. [UI Primitives (`ui/`)](#ui-primitives-ui) — Shadcn-generated Radix wrappers
2. [Layout (`layout/`)](#layout-layout) — App shell, nav, page-level structure

### `src/common/components/` — Reusable UI Components
3. [Table (`table/`)](#table-table) — DataTable (AG Grid) + Table (simple)
4. [Date Picker (`date-picker/`)](#date-picker-date-picker) — DatePicker, MonthYearPicker
5. [Search (`search/`)](#search-search) — SearchInput
6. [Select (`select/`)](#select-select) — Select, MultiSelect
7. [Charts (`bar-chart/`, `pie-chart/`)](#charts) — recharts wrappers
8. [Data Display (`data-display/`)](#data-display-data-display) — StatusBadge, StatCard
9. [Feedback (`feedback/`)](#feedback-feedback) — ConfirmDialog, EmptyState, ErrorBoundary, FormModal
10. [Forms (`forms/`)](#forms-forms) — CollegeFilterPanel, FormField

---

## UI Primitives (`ui/`)

Shadcn-generated components using Radix UI primitives + `cn()`. These are **copy-pasted source files**, not an npm dependency. To add a new Shadcn component: `npx shadcn@latest add <component-name>` or manually create following the same pattern.

Do not modify these to add business logic. Keep them as pure presentational wrappers.

| File | Radix primitive | Primary usage |
|---|---|---|
| `button.tsx` | None (HTML button) | All CTA buttons, form submits |
| `input.tsx` | None (HTML input) | Text inputs |
| `label.tsx` | `@radix-ui/react-label` | Form field labels |
| `dialog.tsx` | `@radix-ui/react-dialog` | Modal dialogs (ExamMasterModal, ConfirmDialog) |
| `select.tsx` | `@radix-ui/react-select` | Filter dropdowns |
| `checkbox.tsx` | `@radix-ui/react-checkbox` | Boolean form fields |
| `radio-group.tsx` | `@radix-ui/react-radio-group` | Exam mode toggle (University/College) |
| `tabs.tsx` | `@radix-ui/react-tabs` | Exam type tabs on details page |
| `popover.tsx` | `@radix-ui/react-popover` | DatePicker, MonthYearPicker containers |
| `calendar.tsx` | `react-day-picker` | Date selection inside DatePicker |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Topbar user menu |
| `collapsible.tsx` | `@radix-ui/react-collapsible` | Sidebar nav item groups |
| `avatar.tsx` | `@radix-ui/react-avatar` | User avatar in Topbar |
| `badge.tsx` | None | Role badge on Dashboard |
| `card.tsx` | None | Dashboard stat cards |
| `separator.tsx` | `@radix-ui/react-separator` | Visual dividers |
| `skeleton.tsx` | None | Loading placeholders |
| `loader.tsx` | None | `ProgressBar` component used by AppShell |

---

## Layout (`layout/`)

### `AppShell.tsx`

**Purpose:** Root layout wrapper for all protected pages. Composes Sidebar + Topbar + scrollable main area with page transition animation.

**Props:**
```typescript
interface AppShellProps {
  children: ReactNode
  initialNavItems: NavItem[]  // from server-side protected layout.tsx
}
```

On mount, `initialNavItems` is pushed to Zustand `navigation-store` via `setNavItems()`. This hydrates the sidebar nav without a client-side fetch.

The `<main>` element uses `key={pathname}` to trigger `animate-fade-up` CSS animation on every route change.

**Usage:** Only instantiated in `src/app/(protected)/layout.tsx`. Not used directly in pages.

---

### `Sidebar.tsx`

**Purpose:** Left navigation sidebar. Dark theme (slate-900). Renders dynamic nav from Zustand store.

Nav items built from `user.modules[]` + `user.pages[]` via `buildNavTree()` in `src/lib/navigation.ts`. Different users see different nav trees based on what Spring Boot returns in their UserDTO.

Contains the logout button (calls `POST /api/auth/logout`).

---

### `Topbar.tsx`

**Purpose:** Sticky header bar (h-14). Contains hamburger (mobile), live page search with API-backed dropdown results (keyboard navigable with ↑↓/Enter/Escape), bell notification, apps grid, and user dropdown.

Fetches all pages accessible to the current user on mount from Spring Boot via `/api/proxy`. The search input filters pages by display name, shows up to 8 results in a dropdown, and navigates on Enter or click.

User dropdown shows name, role, and a "Sign out" option.

---

### `NavItem.tsx`

**Purpose:** Recursive nav item renderer. Handles both leaf items (with `href`) and collapsible groups (with `children`). Uses Zustand `navigation-store` for collapsed state.

---

### `PageHeader.tsx`

**Purpose:** Page-level title + optional subtitle + optional action slot (right side).

**Props:**
```typescript
interface PageHeaderProps {
  title: string          // h1 — page title
  subtitle?: string      // muted description below title
  action?: ReactNode     // right-side slot for buttons, menus, etc.
}
```

**Usage:**
```tsx
<PageHeader
  title="Exam Master"
  subtitle="Manage examination master records"
  action={<Button onClick={() => setModalOpen(true)}>Add Exam</Button>}
/>
```

Uses CSS custom property `var(--font-size-page-title)` for the title size (defined in `globals.css`).

---

### `PageContainer.tsx`

**Purpose:** Standard page wrapper applying consistent outer padding via CSS custom properties `--spacing-page-x` and `--spacing-page-y` (defined in `globals.css`).

**Props:**
```typescript
interface PageContainerProps {
  children: ReactNode
  className?: string
}
```

**Usage:**
```tsx
<PageContainer>
  <PageHeader title="Organizations" subtitle="Manage organization records" />
  <DataTable rowData={data} columnDefs={cols} />
</PageContainer>
```

Import: `import { PageContainer } from '@/components/layout'`

---

## Forms (`common/components/forms/`)

### `CollegeFilterPanel.tsx`

**Purpose:** Renders the standard University → Course (→ Regulation) cascading filter panel used by all exam pages that need college-level filtering. Replaces ~80 lines of identical inline JSX that was duplicated across `grade-setup`, `exam-max-marks-setup`, and similar pages.

**Props:**
```typescript
interface CollegeFilterPanelProps {
  // University
  universities: CollegeWiseFilterRow[]
  selectedUniversityId: number | null
  onUniversityChange: (id: number) => void

  // Course
  courses: CollegeWiseFilterRow[]
  selectedCourseId: number | null
  onCourseChange: (id: number) => void

  // Regulation — only rendered when provided
  regulations?: Regulation[]
  selectedRegulationId?: number | null
  onRegulationChange?: (id: number) => void

  // "For Disabled Students" checkbox — only rendered when provided
  isForDisabled?: boolean
  onIsForDisabledChange?: (checked: boolean) => void

  // Loading state disables the University dropdown
  isLoading?: boolean

  // Extra filter slots rendered after the standard ones
  children?: ReactNode
}
```

Pair with `useCollegeFilters` hook (`src/hooks/useCollegeFilters.ts`) which provides all the state and handlers.

**Usage:**
```tsx
const filters = useCollegeFilters({ withRegulations: true })
const [isForDisabled, setIsForDisabled] = useState(false)

<CollegeFilterPanel
  universities={filters.universities}
  selectedUniversityId={filters.selectedUniversityId}
  onUniversityChange={filters.setUniversityId}
  courses={filters.courses}
  selectedCourseId={filters.selectedCourseId}
  onCourseChange={filters.setCourseId}
  regulations={filters.regulations}
  selectedRegulationId={filters.selectedRegulationId}
  onRegulationChange={(id) => filters.setRegulationId(id)}
  isForDisabled={isForDisabled}
  onIsForDisabledChange={setIsForDisabled}
  isLoading={filters.isLoading}
/>
```

To add a page-specific extra filter (e.g. an Academic Year dropdown), pass it as `children` — it appears after the standard dropdowns in the same grid row.

---

## Table (`common/components/table/`)

### `DataTable.tsx`

**Purpose:** Generic typed AG Grid wrapper. Handles module registration, default column options, client-side pagination (manual row slicing so autoHeight sizes to visible rows), server-side pagination, and auto-height mode.

**Import:** `import { DataTable } from '@/common/components/table'`

**Props:**
```typescript
interface DataTableProps<T> {
  rowData: T[]
  columnDefs: ColDef<T>[]
  loading?: boolean                    // 'auto' for autoHeight; default '500px'
  height?: string
  getRowId?: GetRowIdFunc<T>
  onCellClicked?: (event: CellClickedEvent<T>) => void
  onRowClick?: (row: T) => void

  // Client-side pagination
  pagination?: boolean               // slices rowData internally; renders pagination bar
  paginationPageSize?: number        // default 10

  // Server-side pagination
  serverSide?: boolean               // parent supplies current page's rowData slice
  totalCount?: number
  currentPage?: number               // 0-based
  onPageChange?: (page: number, pageSize: number) => void

  exportCsv?: boolean                // shows Export CSV button
}
```

Default column settings: `sortable: true`, `filter: false`, `resizable: true`, `minWidth: 100`.

**AG Grid is client-only.** Any page using `DataTable` must be a `'use client'` component.
Dynamic import: `dynamic(() => import('@/common/components/table/DataTable'), { ssr: false })`

### `Table.tsx`

**Purpose:** Lightweight simple HTML table (no AG Grid). Use for read-only lists where AG Grid feature weight is not needed. Supports column types: `default`, `image`, `status`, `action`, `id`, `eval-status`.

**Import:** `import { Table } from '@/common/components/table'`

---

## Feedback (`common/components/feedback/`)

Import: `import { ConfirmDialog, FormModal, EmptyState, ErrorBoundary } from '@/common/components/feedback'`

### `ConfirmDialog.tsx`

**Purpose:** Confirmation dialog for destructive or important actions.

**Props:**
```typescript
interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string                    // default: 'Confirm'
  confirmVariant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}
```

### `FormModal.tsx`

**Purpose:** Generic modal wrapper for add/edit forms. Provides consistent title + scrollable body + footer action area.

### `EmptyState.tsx`

**Purpose:** Empty state illustration + message for when a list has no results.

### `ErrorBoundary.tsx`

**Purpose:** React error boundary to catch render errors and show a fallback UI.

---

## Data Display (`common/components/data-display/`)

Import: `import { StatusBadge, StatCard } from '@/common/components/data-display'`

### `StatusBadge.tsx`

**Purpose:** Colored pill badge for active/inactive/other status states.

**Props:**
```typescript
interface StatusBadgeProps {
  active: boolean
  activeLabel?: string     // default: 'Active'
  inactiveLabel?: string   // default: 'Inactive'
}
```

### `StatCard.tsx`

**Purpose:** Dashboard stat card with label, value, trend, and optional icon.

---

## Hooks (`src/hooks/`)

### `useCollegeFilters.ts`

**Purpose:** Encapsulates the University → Course → Regulation cascading filter state used by every exam page with college-level filters. Replaces ~100 lines of duplicated `useState` + `useEffect` + cascade handler logic that was copy-pasted across `grade-setup`, `exam-max-marks-setup`, and similar pages.

**Options:**
```typescript
interface Options {
  withRegulations?: boolean  // when true, loads regulations via getRegulations(courseId)
  autoSelectFirst?: boolean  // default true — auto-selects first item in each list
}
```

**Returns (`CollegeFiltersState`):**
```typescript
{
  isLoading: boolean

  universities: CollegeWiseFilterRow[]
  selectedUniversityId: number | null
  setUniversityId: (id: number) => void   // triggers course cascade + clears downstream

  courses: CollegeWiseFilterRow[]
  selectedCourseId: number | null
  setCourseId: (id: number) => void        // clears regulation selection

  regulations: Regulation[]               // populated only when withRegulations: true
  selectedRegulationId: number | null
  setRegulationId: (id: number | null) => void
}
```

**Query keys used:**
- `['college-filters', orgId, empId]` — University/Course data, `staleTime: 5 min`
- `['regulations', courseId]` — Regulation data, `staleTime: 5 min`

**Usage:**
```tsx
// University + Course only
const filters = useCollegeFilters()

// University + Course + Regulation
const filters = useCollegeFilters({ withRegulations: true })
```

Pair with `<CollegeFilterPanel>` to render the filter UI. The hook manages all state; the panel is purely presentational.

---

## Utilities (`src/lib/utils.ts`)

### `distinct<T>(arr, keyFn)`

**Purpose:** Returns a deduplicated copy of `arr`, preserving the first occurrence of each item identified by a numeric key. Used when Spring Boot stored-proc results contain duplicate university/course rows (one row per college).

```typescript
export function distinct<T>(arr: T[], keyFn: (item: T) => number): T[]
```

**Example:**
```typescript
import { distinct } from '@/lib/utils'

const universities = distinct(filtersData, (r) => r.fk_university_id)
const courses = distinct(
  filtersData.filter((r) => r.fk_university_id === selectedId),
  (r) => r.fk_course_id,
)
```

Do not redefine this per-file — it was previously duplicated in 6 page files.

---

---

## Common Components (`src/common/components/`)

Components in `src/common/` mirror Angular's `src/app/common/components/`. They are reusable across all modules. Import from their directory path, e.g. `@/common/components/bar-chart/BarChart`.

---

### `BarChart`

**Purpose:** Renders a bar chart using recharts. OSS replacement for Highcharts used in Angular.

**Props:**
```typescript
interface BarChartProps {
  data: BarChartDataItem[]    // array of data objects
  xKey: string                // key in data to use for x-axis labels
  yKeys: string[]             // one or more keys to plot as bars
  colors?: string[]           // bar fill colors (defaults to theme palette)
  height?: number             // chart height in px, default 300
  className?: string
}
```

**Usage:**
```tsx
<BarChart
  data={[{ month: 'Jan', passed: 40, failed: 10 }]}
  xKey="month"
  yKeys={['passed', 'failed']}
  colors={['#4ade80', '#f87171']}
  height={320}
/>
```

---

### `PieChart`

**Purpose:** Renders a pie/donut chart using recharts.

**Props:**
```typescript
interface PieChartProps {
  data: PieChartDataItem[]    // [{ name: string; value: number }]
  dataKey: string             // key holding the numeric value
  nameKey: string             // key holding the slice label
  colors?: string[]           // slice fill colors
  height?: number             // default 300
  className?: string
}
```

**Usage:**
```tsx
<PieChart
  data={[{ label: 'Pass', count: 80 }, { label: 'Fail', count: 20 }]}
  dataKey="count"
  nameKey="label"
  height={280}
/>
```

---

### `SearchInput`

**Purpose:** Controlled search input with optional debounce. Mirrors Angular `SearchComponent`.

**Props:**
```typescript
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string        // default: 'Search…'
  debounceMs?: number         // debounce delay in ms (0 = no debounce)
  disabled?: boolean
  className?: string
}
```

**Usage:**
```tsx
const [query, setQuery] = useState('')
<SearchInput value={query} onChange={setQuery} placeholder="Search students…" debounceMs={300} />
```

---

### `Select`

**Purpose:** Labeled dropdown wrapping the Shadcn Select primitive. Provides a consistent label + select layout used across the app.

**Props:**
```typescript
interface SelectProps {
  options: { value: string; label: string }[]
  value: string | null
  onChange: (value: string) => void
  label?: string
  placeholder?: string        // default: 'Select…'
  disabled?: boolean
  className?: string
}
```

**Usage:**
```tsx
<Select
  label="Academic Year"
  options={yearOptions}
  value={selectedYear}
  onChange={setSelectedYear}
  placeholder="Choose year"
/>
```

Note: this is a higher-level wrapper. For raw Radix primitives use `src/components/ui/select.tsx`.

---

### `DatePicker` (common)

**Purpose:** Date input backed by Radix Popover + Shadcn Calendar. Mirrors Angular `DatePickerComponent`. The canonical DatePicker for all pages. Import from `@/common/components/date-picker`.

**Props:**
```typescript
interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string        // default: 'Pick a date'
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}
```

**Usage:**
```tsx
<DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
```

---

### `Breadcrumb`

**Purpose:** Renders a breadcrumb trail from an array of items. Last item is rendered as plain text; earlier items are links.

**Props:**
```typescript
interface BreadcrumbProps {
  items: { label: string; href?: string }[]
  className?: string
}
```

**Usage:**
```tsx
<Breadcrumb
  items={[
    { label: 'Admin', href: '/admin' },
    { label: 'Organizations' },
  ]}
/>
```

---

### `Table`

**Purpose:** Lightweight generic data table (not AG Grid). Use for simple read-only lists where AG Grid's feature weight is not needed.

**Props:**
```typescript
interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode   // custom cell renderer
}

interface TableProps<T> {
  rows: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  emptyText?: string               // default: 'No data'
  onRowClick?: (row: T) => void
  className?: string
}
```

**Usage:**
```tsx
<Table
  rows={campusList}
  columns={[
    { key: 'campusName', header: 'Campus Name' },
    { key: 'campusCode', header: 'Code' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => <span>{row.isActive ? 'Active' : 'Inactive'}</span>,
    },
  ]}
  loading={isLoading}
  onRowClick={(row) => openEditModal(row)}
/>
```

---

### `ThemeSettingModal`

**Purpose:** Modal for user appearance/theme preferences (e.g. color scheme, density). Mirrors Angular `ThemeSettingModalComponent`.

**Props:**
```typescript
interface ThemeSettingModalProps {
  open: boolean
  onClose: () => void
}
```

**Usage:**
```tsx
const [themeOpen, setThemeOpen] = useState(false)

<ThemeSettingModal open={themeOpen} onClose={() => setThemeOpen(false)} />
```

---

## Adding a New Component

1. **Choose the right location:**
   - `src/components/ui/` — Shadcn primitives (Radix-based, no business logic)
   - `src/components/layout/` — structural/shell components (AppShell, Topbar, Sidebar, PageHeader, PageContainer)
   - `src/common/components/<category>/` — reusable UI used in pages; add to the most relevant subdirectory (table, date-picker, search, select, bar-chart, pie-chart, data-display, feedback, forms)

2. **TypeScript props interface with JSDoc on every prop:**
   ```typescript
   interface MyComponentProps {
     /** What this prop does */
     value: string
   }
   ```

3. **Add `'use client'` if it uses hooks or browser APIs**

4. **Export from category's `index.ts`** (if the barrel file exports it)

5. **Document here** in the appropriate section above
