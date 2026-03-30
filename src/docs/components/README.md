# Component Catalog

> All components are TypeScript with JSDoc props interfaces.
> All client components have `'use client'` at the top.
> Shadcn components in `ui/` are copy-paste pattern — not an npm dependency.

---

## Categories

1. [UI Primitives (`ui/`)](#ui-primitives-ui) — Shadcn-generated Radix wrappers
2. [Layout (`layout/`)](#layout-layout) — App shell, nav, page-level structure
3. [Forms (`forms/`)](#forms-forms) — Reusable form controls
4. [Data Table (`data-table/`)](#data-table-data-table) — AG Grid wrapper
5. [Feedback (`feedback/`)](#feedback-feedback) — User feedback dialogs
6. [Data Display (`data-display/`)](#data-display-data-display) — Badges, stat cards (planned)
7. [Shared (`shared/`)](#shared-shared) — Cross-domain reusables (planned)

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

**Purpose:** Sticky header bar (h-14). Contains hamburger (mobile), search bar (placeholder), bell notification (placeholder), apps grid (placeholder), and user dropdown.

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

## Forms (`forms/`)

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

### `DatePicker.tsx`

**Purpose:** Date input backed by Radix Popover + Shadcn Calendar. Returns `Date | null`.

**Props:**
```typescript
interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string    // default: 'Pick a date'
  disabled?: boolean
  minDate?: Date          // dates before this are disabled
  maxDate?: Date          // dates after this are disabled
  className?: string
}
```

Display format: `dd/MM/yyyy`. Used in `ExamMasterModal` for `fromDate`, `toDate`, `notificationPublishedOn`, `feeNotificationPublishedOn`.

**Usage with react-hook-form:**
```tsx
<Controller
  control={control}
  name="fromDate"
  render={({ field }) => (
    <DatePicker value={field.value} onChange={field.onChange} />
  )}
/>
```

---

### `MonthYearPicker.tsx`

**Purpose:** Month/year picker that shows a 3x4 month grid with year navigation arrows. Day component is always set to 1. Returns `Date | null`.

**Props:**
```typescript
interface MonthYearPickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string    // default: 'Pick month/year'
  disabled?: boolean
}
```

Display format: `MM/yyyy`. Used in `ExamMasterModal` for `examMonthYr`. When this value changes, the modal's `useEffect` auto-syncs `fromDate` and `toDate` to the first of that month.

---

## Data Table (`data-table/`)

### `DataTable.tsx`

**Purpose:** Generic typed AG Grid wrapper. Handles module registration, default column options, and auto-height mode.

**Props:**
```typescript
interface DataTableProps<T> {
  rowData: T[]
  columnDefs: ColDef<T>[]
  loading?: boolean           // shows AG Grid loading overlay
  height?: string             // default '500px', use 'auto' for autoHeight
  quickFilterText?: string    // externally controlled search filter
  onCellClicked?: (event: CellClickedEvent<T>) => void
  pagination?: boolean        // (prop accepted but not yet wired to AgGridReact)
  paginationPageSize?: number // (prop accepted but not yet wired)
  exportCsv?: boolean         // (prop accepted but not yet wired)
  showSearch?: boolean        // (prop accepted but not yet wired)
  onRowSelected?: (row: T | null) => void  // (prop accepted but not yet wired)
}
```

**Note:** Several props (`pagination`, `exportCsv`, `showSearch`, `onRowSelected`) are declared in the interface but not yet implemented in the component body. The current implementation only wires: `rowData`, `columnDefs`, `loading`, `height`, `quickFilterText`, `onCellClicked`.

Default column settings: `sortable: true`, `filter: true`, `resizable: true`, `flex: 1`, `minWidth: 100`.

**AG Grid is client-only.** Any page using `DataTable` must be a `'use client'` component. Do not use in Server Components. If you need lazy loading: `dynamic(() => import('@/components/data-table/DataTable'), { ssr: false })`.

**Usage:**
```tsx
const columnDefs = useMemo<ColDef<ExamMaster>[]>(() => [
  { field: 'examName', headerName: 'Exam Name' },
  {
    headerName: 'Status',
    cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
      p.data?.isActive ? <span>Active</span> : <span>Inactive</span>,
  },
], [])

<DataTable
  rowData={examsList}
  columnDefs={columnDefs}
  loading={isLoading}
  onCellClicked={handleCellClick}
/>
```

JSX cell renderers (`cellRenderer`) work because the page is already a client component.

---

## Feedback (`feedback/`)

### `ConfirmDialog.tsx`

**Purpose:** Confirmation dialog for destructive or important actions. Blocks user interaction until confirmed or cancelled.

**Props:**
```typescript
interface ConfirmDialogProps {
  open: boolean
  title: string                            // e.g. "Delete Exam Master?"
  description: string                      // consequence explanation
  confirmLabel?: string                    // default: 'Confirm'
  confirmVariant?: 'destructive' | 'default'  // default: 'destructive'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean                      // shows spinner, disables buttons
}
```

Uses Shadcn Dialog (`ui/dialog.tsx`) internally. Calls `onCancel` when the dialog is closed via the backdrop or escape key.

**Usage:**
```tsx
<ConfirmDialog
  open={deleteDialogOpen}
  title="Delete Exam Label?"
  description="This will mark the label as inactive and cannot be undone from this screen."
  confirmLabel="Delete"
  confirmVariant="destructive"
  onConfirm={handleConfirmDelete}
  onCancel={() => setDeleteDialogOpen(false)}
  isLoading={isDeleting}
/>
```

**Current gap:** The exam master details page deletes labels immediately without a confirmation dialog. `ConfirmDialog` exists to solve this but has not been wired in yet.

---

## Data Display (`data-display/`)

**Status: Directory and barrel file exist. No component files yet — planned by Foundation agent.**

`src/components/data-display/index.ts` is a stub:
```typescript
// Data display components barrel — status badges, data cards, stat widgets
```

Planned components:
- `StatusBadge` — colored pill badge for active/inactive/status states
- `StatCard` — dashboard stat card with label, value, icon

---

## Shared (`shared/`)

### `PageContainer.tsx`

**Purpose:** Standard page wrapper providing consistent horizontal padding and max-width constraint for all protected pages.

**Usage:**
```tsx
<PageContainer>
  <PageHeader title="..." />
  <DataTable ... />
</PageContainer>
```

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

## Adding a New Component

1. **Choose the right category:**
   - `ui/` — Shadcn primitives (Radix-based, no business logic)
   - `forms/` — controlled inputs and pickers
   - `layout/` — structural/shell components
   - `data-table/` — table/grid components
   - `feedback/` — toasts, dialogs, error states
   - `data-display/` — status indicators, stat cards
   - `shared/` — cross-domain reusables

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
