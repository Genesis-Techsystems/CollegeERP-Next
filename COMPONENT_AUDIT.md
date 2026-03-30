# Component Audit: Angular → `common/components` → `components/`

> **Purpose:** Compare every shared component between the Angular original, the `src/common/components/` migration layer, and the new `src/components/` design system. For each component: what the Angular original did, what each Next.js layer does, what is missing, what was added unnecessarily, and what the underlying library gives for free that isn't being used.
>
> **Two component layers in Next.js:**
> - `src/common/components/` — ported from Angular (older layer, partially superseded)
> - `src/components/` — new design system (shadcn / Radix UI based)

---

## Table of Contents

1. [Table / Data Grid](#1-table--data-grid)
2. [Date Picker](#2-date-picker)
3. [Search Input](#3-search-input)
4. [Select / Dropdown](#4-select--dropdown)
5. [Charts](#5-charts)
6. [Layout](#6-layout)
7. [Summary: Critical Gaps](#7-summary-critical-gaps)

---

## 1. Table / Data Grid

### Angular original

**Library:** Angular Material — `MatTableModule`, `MatSortModule`, `MatPaginatorModule`

Two patterns used in parallel:

**Pattern A — `app-data-table` shared wrapper** (`main/utils/data-table/`):
- `@Input() tableData` — row array
- `@Input() columnHeader` — `{ [key: string]: string }` map rendered via `Object.keys()`
- `MatTableDataSource` for client-side filtering
- `MatSort` — per-column sort headers
- `MatPaginator` — page sizes `[15, 100]`
- Global `applyFilter()` wired to `MatTableDataSource.filter`
- Inline domain-specific `Actions` column with a Refund button and `Router` navigation
- **PDF print button** — XHR to a receipt endpoint, rendered in an `<iframe>`, triggered with `iframe.print()`

**Pattern B — inline `mat-table` per feature page:**
- `displayedColumns: string[]` — explicit column list per component
- Per-column `matColumnDef`, `mat-sort-header`, and bespoke `*matCellDef` templates
- `MatPaginator` with configurable `pageSizeOptions` (e.g. `[10, 15, 100]`)
- **Server-side pagination** — `[pageIndex]`, `[pageSize]`, `[length]="totalCount"`, `(page)="getNext($event)"` — the paginator event triggers an API call at the new offset. Used by biometric-employees, HR payroll, and academics modules.
- `applyFilter()` on every component, wired to `MatTableDataSource.filter`
- Rich cell templates: date pipe (`| date:'d MMM, y'`), conditional icon buttons, image+text combos, row-click routing

---

### `src/common/components/table/Table.tsx`

**Library:** Plain HTML `<table>` + Tailwind CSS. No third-party grid library.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `rows` | `T[]` | Row data |
| `columns` | `TableColumn<T>[]` | Column definitions |
| `title` | `string?` | Heading above table |
| `loading` | `boolean?` | Skeleton loading state |
| `emptyText` | `string?` | Empty state message |
| `onRowClick` | `(row: T) => void` | Row click handler |
| `pageSize` | `number?` | Client-side rows per page (default 10; `0` disables pagination) |
| `className` | `string?` | Wrapper CSS override |

**Built-in column types (`type` field on `TableColumn`):**

| Type | Behavior |
|------|----------|
| `'image'` | Renders `<img>` with fallback to `/assets/images/default_logo.png` |
| `'status'` | Renders `StatusBadge` — green "Active" / red "Inactive" |
| `'action'` | Edit pencil icon, calls `onRowClick` |
| `'id'` | Page-offset-aware 1-based serial number |
| `'eval-status'` | Colored clickable pill, calls `onRowClick` |

**Built-in behaviors:**
- Client-side slice-based pagination with prev/next controls and "X of Y" label
- Hover highlight on clickable rows
- Skeleton loading (animated pulse per cell)
- `formatValue()` normalizes null/boolean/Date/string

**Features missing vs Angular:**

| Missing Feature | Angular Equivalent |
|----------------|--------------------|
| Column-level sorting | `mat-sort-header` on every `<th>` |
| Column-level filtering | `MatTableDataSource` per-column filter |
| Global text search prop | `applyFilter()` + `MatTableDataSource.filter` |
| Configurable page size options | `[pageSizeOptions]="[15, 100]"` on paginator |
| Server-side pagination | `[pageIndex]`, `[pageSize]`, `[length]`, `(page)` event |
| Column resize | Not in Angular Material either, but expected in ERP tables |
| Print / PDF export | XHR + iframe print in `app-data-table` |
| Multiple row actions | Multiple icon buttons per row in Angular templates |
| Tooltip on action icons | `matTooltip` |
| Per-column date formatting | `| date:'d MMM, y'` pipe per cell |
| Page size selector UI | `mat-paginator` UI for runtime page size change |
| Jump-to-page / page number | `mat-paginator` full control set |

**Hardcoded date formatting:**
`const DATE_COLUMNS = ['answerSheetCheckDate']` — a magic column key baked into a supposedly generic component.

> **⚠️ Dead code:** Zero pages import `Table.tsx`. Every page that renders a grid uses `DataTable` from `src/components/data-table/`. This entire component is unused.

---

### `src/components/data-table/DataTable.tsx`

**Library:** AG Grid Community (`ag-grid-react`, `ag-grid-community`, `AllCommunityModule`)

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rowData` | `T[]` | — | Row data |
| `columnDefs` | `ColDef<T>[]` | — | AG Grid column definitions (full AG Grid API passthrough) |
| `loading` | `boolean?` | — | AG Grid loading overlay |
| `height` | `string?` | `"500px"` | Container height; `"auto"` triggers `domLayout="autoHeight"` |
| `quickFilterText` | `string?` | — | External quick-filter string |
| `onCellClicked` | `(event: CellClickedEvent<T>) => void` | — | Cell click event |
| `pagination` | `boolean?` | — | AG Grid built-in pagination |
| `paginationPageSize` | `number?` | `20` | Rows per page |
| `exportCsv` | `boolean?` | — | Show "Export CSV" toolbar button |
| `showSearch` | `boolean?` | — | Show `SearchInput` toolbar driving internal quickFilter |
| `onRowSelected` | `(row: T \| null) => void` | — | Single-row selection callback |

**`defaultColDef` applied to every column:**
- `sortable: true`
- `filter: true`
- `resizable: true`
- `flex: 1`
- `minWidth: 100`

**Built-in behaviors:**
- Column-level sort, column-level filter (AG Grid filter UI), column resize by drag
- Animated row transitions
- Single-row selection (when `onRowSelected` provided)
- CSV export via `gridRef.current?.api.exportDataAsCsv()`
- Combined internal + external quick filter (`showSearch` overrides `quickFilterText`)
- AG Grid loading overlay

**Features missing vs Angular:**

| Missing Feature | Angular Equivalent |
|----------------|--------------------|
| **Server-side pagination** | `(page)` event on `mat-paginator` — biometric/HR pages fetched from API on page change. `onPaginationChanged` AG Grid event not forwarded. |
| `onRowClick` convenience prop | `(click)` on `<tr mat-row>` — only `onCellClicked` exists; callers extract `event.data` manually |
| Multiple row selection | `SelectionModel` + checkbox column in Angular |
| Print / PDF export | XHR + iframe in `app-data-table` — only CSV available here |
| `title` prop | Angular component had integrated section headings |

**Props added unnecessarily (no page currently uses them):**
- `onRowSelected` — zero pages pass this prop. AG Grid `rowSelection="single"` is wired up for nothing.
- `quickFilterText` (external) — no page passes this. Pages either filter `rowData` before passing, or use `showSearch`. The prop is dead.

**What AG Grid Community gives for free that `DataTable` doesn't expose:**

| AG Grid Feature | How to Access | Exposed by `DataTable`? |
|----------------|---------------|------------------------|
| `onPaginationChanged` event | AG Grid event callback | ❌ Not forwarded — critical for server-side paging |
| `getRowId` stable row identity | `getRowId` prop | ❌ Not wired — row updates cause scroll/selection loss |
| Column visibility toggle | `gridRef.api.setColumnVisible()` | ❌ No UI button |
| Auto-size columns | `gridRef.api.autoSizeAllColumns()` | ❌ No button/prop |
| Column pinning | `ColDef.pinned: 'left' \| 'right'` | Only via raw `columnDefs` |
| `domLayout="print"` | AG Grid prop | ❌ Only `"autoHeight"` or default |
| `onFilterChanged` / `onSortChanged` | AG Grid events | ❌ Not forwarded — can't sync to URL or trigger server queries |
| Column grouping | `columnDefs` nesting | Only via raw `columnDefs` |
| `tooltipField` / `tooltipValueGetter` | `ColDef` fields | Only via raw `columnDefs` |
| Row height customization | `rowHeight`, `getRowHeight` | ❌ Not exposed |
| Multi-sort | `multiSortKey: 'ctrl'` | ❌ Not exposed |
| Column state save/restore | `gridRef.api.getColumnState()` | ❌ No persistence hook |

---

## 2. Date Picker

### Angular original

**Library:** `@angular/material/datepicker` + `@angular/material-moment-adapter` (Moment.js). Registered globally via `MatMomentDateModule`.

**Core usage pattern (inline composition in every template):**
```html
<input matInput [matDatepicker]="dp" formControlName="startDate" [min]="minDate" [max]="maxDate" (dateChange)="calDays()">
<mat-datepicker-toggle matSuffix [for]="dp"></mat-datepicker-toggle>
<mat-datepicker #dp></mat-datepicker>
```

**Features used across the codebase:**

| Feature | Angular Attribute / Event | Scope |
|---------|--------------------------|-------|
| Single date, Reactive Forms | `formControlName` + `[matDatepicker]` | ~250 templates |
| Single date, Template-driven | `[(ngModel)]` + `[matDatepicker]` | ~50 templates |
| Min date constraint | `[min]="someFormControlValue"` | Many — batch from/to, date ranges |
| Max date constraint | `[max]="startDate"` | Several — registration date, DOB |
| Change event | `(dateChange)="calDays()"` | Widespread — triggers day count recalculation |
| **Month/year-only mode** | `startView="multi-year"` + `(yearSelected)` + `(monthSelected)` + `panelClass="example-month-picker"` | ~8 screens: payroll reports, fee reports, attendance reports, exam masters |
| Programmatic close | `datepicker.close()` inside `chosenMonthHandler` | All month-picker screens |
| Custom display format | `MAT_DATE_FORMATS` provider with `MM/YYYY` parse/display | Month/year-mode components |
| Required validation | `required` attribute → feeds `FormGroup` validity | Many batch/fee modals |
| Disabled state | `disabled` attribute on `<input>` | A few |

**Month/year-only pattern in detail:**
`startView="multi-year"` opens at the year level. `(yearSelected)` captures the year; `(monthSelected)` captures the month and immediately calls `datepicker.close()`. This turns the full calendar into a month/year-only picker. A custom `MAT_DATE_FORMATS` provider reformats the displayed value to `MM/YYYY`.

---

### `src/common/components/date-picker/DatePicker.tsx`

**Library:** Radix UI Popover + shadcn `Calendar` component (wraps react-day-picker v9).
**Null type:** `Date | undefined`

**Props:**

| Prop | Type | Angular Equivalent |
|------|------|-------------------|
| `value` | `Date \| undefined` | Moment object via `FormControl` |
| `onChange` | `(date: Date \| undefined) => void` | `(dateChange)` event |
| `placeholder` | `string` | `placeholder` on `<input>` |
| `label` | `string` | `<mat-label>` inside `<mat-form-field>` |
| `minDate` | `Date` | `[min]` |
| `maxDate` | `Date` | `[max]` |
| `disabled` | `boolean` | `disabled` attribute |
| `className` | `string` | — |

**Features missing vs Angular:**

| Missing Feature | Angular Equivalent |
|----------------|--------------------|
| Month/year-only mode | `startView="multi-year"` + `(monthSelected)` |
| **Navigation constraints** | `[min]`/`[max]` blocked navigation *and* selection; here only day buttons are disabled — user can still browse to any century |
| `required` / validation state | `required` attr → `FormGroup` invalid state |
| Clear value via UI | Form reset in Angular |
| Error/hint message slot | `<mat-error>`, `<mat-hint>` children |
| `dateInput` event (on keystroke) | `(dateInput)` vs `(dateChange)` distinction |

**Bugs / issues:**
- Passes deprecated `initialFocus` prop — renamed to `autoFocus` in react-day-picker v9 (`^9.14.0` is installed). The prop does nothing.
- Uses `undefined` for empty state; `forms/DatePicker` uses `null` — **API inconsistency** between the two layers.

---

### `src/components/forms/DatePicker.tsx`

**Library:** Same — Radix Popover + shadcn Calendar (react-day-picker v9).
**Null type:** `Date | null`

Same missing features as `common/date-picker` plus:
- No `label` prop (present in `common` version, absent here)
- No `initialFocus` or `autoFocus` — calendar does not auto-focus when popover opens

---

### `src/components/forms/MonthYearPicker.tsx`

**Library:** Radix Popover only. The month grid is **entirely hand-rolled** — a 3×4 `<button>` grid with a year navigator (left/right chevrons).

**Props:**

| Prop | Type |
|------|------|
| `value` | `Date \| null` |
| `onChange` | `(date: Date \| null) => void` |
| `placeholder` | `string` |
| `disabled` | `boolean` |

**Features missing vs Angular's month/year mode:**

| Missing Feature | Angular Equivalent |
|----------------|--------------------|
| `minDate` / `maxDate` | `[min]`/`[max]` constrained navigation |
| Year navigation bounds | Without bounds, user can navigate to year 1 or 9999 |
| `className` / `label` props | — |
| `required` / validation state | — |
| Clear value via UI | No "clear" button — once selected, can't reset to `null` |
| Keyboard arrow navigation in month grid | Angular Material full keyboard nav |

> **⚠️ Unnecessary component:** react-day-picker v9 supports `captionLayout="dropdown"` natively, which renders month + year dropdowns with keyboard navigation, bounds via `startMonth`/`endMonth`, and full accessibility — with **one prop**. The entire `MonthYearPicker` custom implementation can be replaced.

---

### What react-day-picker v9 gives for free that isn't exposed

The shadcn `Calendar` passes all `DayPickerProps` through (`...props`), so every feature below is available — none are surfaced as named props by either wrapper:

| Feature | Prop(s) | Impact |
|---------|---------|--------|
| **Navigation bounds** | `startMonth={minDate}`, `endMonth={maxDate}` | Fix with 2 props — prevents browsing beyond valid range |
| **Month/year caption dropdowns** | `captionLayout="dropdown"` | Replaces all of `MonthYearPicker` |
| **Range selection** | `mode="range"`, `selected: DateRange`, `min`/`max` days | Replaces paired from/to pickers |
| Multiple date selection | `mode="multiple"`, `selected: Date[]` | Not used in ERP but available |
| Locale / RTL | `locale`, `weekStartsOn`, `dir="rtl"` | Relevant for Indian academic calendar |
| Custom day modifiers | `modifiers`, `modifiersClassNames` | Angular had `dateClass` for highlighting holidays |
| Fixed week height | `fixedWeeks` | Prevents calendar height jumping month-to-month |
| Month change events | `onMonthChange`, `onNextClick`, `onPrevClick` | Controlled navigation |
| Animation | `animate` (v9.6+) | — |

---

## 3. Search Input

### Angular original

**Pattern:** Raw `<input matInput>` inline on every page, wired via `(keyup)="applyFilter($event.target.value)"`.
`applyFilter` calls `MatTableDataSource.filter = value.trim().toLowerCase()`.

**Characteristics:**
- No debounce — fires on every raw `keyup`
- No clear button
- No search icon (a separate `<mat-icon>search</mat-icon>` label element placed manually)
- Not a shared component — each feature page owns its own search input

---

### `src/common/components/search/SearchInput.tsx`

**Improvements over Angular:**

| Feature | Angular | `common/search` |
|---------|---------|----------------|
| Debounce | None | 300ms (configurable via `debounceMs` prop) |
| Clear button | None | Yes — bypasses debounce, immediately emits `''` |
| Search icon | Manual `<mat-icon>` beside input | Built-in |
| Controlled/uncontrolled | Always wired to `MatTableDataSource` | Optional `value` prop — uncontrolled-friendly |
| `autoComplete` | N/A | `autoComplete="off"` prevents browser autofill |
| Accessibility | None | `aria-label` on input, `aria-hidden` on icon, `aria-label="Clear search"` on button |

**Missing vs Angular:**
- No `required` prop / no form validation state
- No error/hint message slot
- No `name`/`id` props for use inside an HTML `<form>` with native submit

**Internal inconsistency:**
The component exports prop name `onSearch`, but `CLAUDE.md` documentation says `onChange`. The docs are wrong.

---

### `src/components/forms/SearchInput.tsx`

Nearly identical to `common/search/SearchInput`. Differences:

| Aspect | `common/search/SearchInput` | `forms/SearchInput` |
|--------|-----------------------------|---------------------|
| `value` prop | Optional (uncontrolled-friendly) | Required — always controlled |
| Event prop name | `onSearch` | `onChange` |
| `useCallback` on clear handler | Yes | No (inline arrow function) |
| `autoComplete="off"` | Yes | ❌ Missing |
| `aria-hidden` on icon | Yes | ❌ Missing |

> **⚠️ Unnecessary duplication:** Two nearly identical debounced search inputs exist with no functional reason for both. `common/search` is slightly more complete. Should consolidate on one.

---

## 4. Select / Dropdown

### Angular original

**Library:** Angular Material `<mat-select>` + `ngx-mat-select-search` (third-party, MIT) for in-dropdown filtering.

**Features used:**

| Feature | Angular Attribute / Event |
|---------|--------------------------|
| Basic single select, Reactive Forms | `formControlName` + `(selectionChange)="handler()"` |
| Multi-select | `<mat-select multiple>` + `[(ngModel)]` — used for attendance periods picker |
| `required` validation | `required` attribute → `FormGroup` invalid state |
| Disabled | `disabled="true"` for read-only display fields |
| In-dropdown search with **server-side fetch** | `ngx-mat-select-search` with `[formControl]="employeeFilterCtrl"`, `(keyup)` triggers API call, results piped through `ReplaySubject<any[]>` via `*ngFor ... \| async` |
| No-results label | `[noEntriesFoundLabel]="'No results'"` on `ngx-mat-select-search` |
| Auto-clear search on close | `[clearSearchInput]="true"` |
| Loading spinner in search field | `[searching]="isLoading"` |
| `compareWith` for object equality | `[compareWith]="compareFn"` — matches objects by field not reference |

Used across **440+ files** containing `ngx-mat-select-search`.

---

### `src/common/components/select/Select.tsx`

**Library:** Radix Select. JSON serialization round-trip (`toRadixValue`/`fromRadixValue`) to handle Radix's string-only value requirement.

**Improvements over Angular:**
- Inline search filter auto-shown when `options.length > 6` — no third-party dependency
- "No matching results" empty state baked in
- `label` prop rendered as `<label>` above the trigger

**Features missing vs Angular:**

| Missing Feature | Angular Equivalent |
|----------------|--------------------|
| **Multi-select** | `<mat-select multiple>` — used for attendance periods/batch pickers. Radix Select is single-select only. |
| Server-side search callback | `(keyup)` event on `ngx-mat-select-search` triggering API calls. This component only filters already-fetched options. |
| `required` / validation state | `required` attr + `FormGroup` integration |
| Error message slot | `<mat-error>` under `<mat-form-field>` |
| `compareWith` custom comparator | JSON round-trip is a fragile workaround — breaks for objects with non-serializable fields (functions, circular refs, class instances) |
| `[searching]` spinner | `ngx-mat-select-search [searching]` showed a spinner while async results load |
| Clear search on panel close | `[clearSearchInput]="true"` on `ngx-mat-select-search` |
| Accessible label association | `<label>` above trigger has no `htmlFor` / `id` link — screen readers won't associate it |

**Unnecessary additions:**

- **Magic `> 6` threshold** for showing the search input — callers cannot force or suppress it. Should be a `searchable?: boolean` prop.
- **JSON round-trip serialization** (`toRadixValue`/`fromRadixValue`) — the standard pattern is to store string IDs in the options array and let callers map to domain objects. The serialization adds a runtime failure category for complex object values.

---

### `src/components/ui/select.tsx`

Raw shadcn / Radix Select re-export. Exposes the full Radix surface: `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.

No behavior added — this is the primitive layer.

---

### `src/components/forms/CollegeFilterPanel.tsx`

Uses raw `ui/select` primitives (not `common/select`). Domain-specific panel for University → Course → Regulation cascade.

**Additions over Angular:**
- `isLoading` prop disables University dropdown and shows "Loading…" placeholder
- `children` slot for extra filters after the standard three
- Auto-cascade disabled state (Course disabled when `courses.length === 0`, etc.)
- "For Disabled Students" `Checkbox` as an optional controlled slot

**Missing vs Angular:**
- No in-dropdown search (uses raw Radix — no filtering inside large Course dropdowns)
- No `required` validation integration
- No Academic Year slot in the default layout (must use `children`)
- Cascade clear-on-parent-change is entirely the caller's responsibility

**Unnecessarily baked in:**
`isForDisabled` / "For Disabled Students" checkbox is domain knowledge inside a component described as reusable. It applies only to grade-setup/max-marks-setup pages. Should be passed as a `children` slot item by the feature page.

---

### What Radix Select gives for free that isn't exposed

| Feature | Radix Prop | Exposed? |
|---------|-----------|----------|
| Controlled open state | `open`, `onOpenChange` | ❌ |
| RTL support | `dir="ltr \| rtl"` | ❌ |
| Option grouping with header | `SelectGroup` + `SelectLabel` | ❌ (exported from `ui/select` but no wrapper uses it) |
| Per-item disabled | `SelectItem disabled` prop | ❌ |
| Dropdown aligned to selected item | `position="item-aligned"` on `SelectContent` | ❌ (only `"popper"` mode used) |
| **Multi-select** | Requires different primitive (`Command` + `Popover`) | ❌ No implementation anywhere in the new codebase |

---

## 5. Charts

### Angular original

**Three separate chart libraries used in parallel:**

#### ngx-charts (`@swimlane/ngx-charts`) — shared bar/pie wrappers

Used by `app/main/utils/bar-charts/` and `pie-charts/`.

**Bar chart subtypes:** `ngx-charts-bar-vertical`, `ngx-charts-bar-vertical-stacked`, `ngx-charts-bar-vertical-2d` (three distinct variants, runtime-switched via `@Input() type`)

**Bound inputs on bar chart:**
`[scheme]`, `[results]`, `[gradient]`, `[xAxis]`/`[yAxis]`, `[legend]`, `[showXAxisLabel]`/`[showYAxisLabel]`, `[xAxisLabel]`/`[yAxisLabel]`, `[animations]`, `[dataLabelFormatting]`, `[yAxisTickFormatting]`

**Bound inputs on pie chart:**
`[scheme]`, `[results]`, `[gradient]`, `[legend]`, `[explodeSlices]`, `[labels]`, `[doughnut]` boolean toggle

**Events on both:** `(select)`, `(activate)`, `(deactivate)`

**Y-axis formatter:** `formatNumber` helper (K/M/B abbreviation) passed as `[yAxisTickFormatting]="formatNumber"`

---

#### Highcharts — dashboard widgets (`app/main/apps/highchart-dashboard/`)

Modules loaded: `highcharts`, `highcharts-more`, `modules/drilldown`, `modules/stock`, `modules/exporting`

**`FeesSummaryChart` — 3-level drilldown column chart:**
- Click District → College → Fee Category
- `chart.drilldown` / `chart.drillup` events
- `drilldownLevels` tracking, `drillUpButton` positioning
- Custom `redraw` events that reconstruct a breadcrumb `pathArr`
- `stacking: 'normal'` for stacked columns

**`CollegeApplicationPieChart` — interactive donut:**
- `allowPointSelect: true`, `innerSize: '50%'`
- `dataLabels` with `useHTML: true` and a custom `formatter` rendering HTML markup
- `showInLegend: true`
- Area/college filter dropdowns calling `areaFilterChanged()`/`collegeFilterChanged()` to re-render
- `Highcharts.setOptions({ lang: { decimalPoint: '.', thousandsSep: ',' } })` for global number formatting
- `exporting: { enabled: false }` at the option level

---

#### FusionCharts

Used in `staff-dashboard.component.html` (`<fusioncharts>` directive). Third library in the codebase.

---

### `src/common/components/bar-chart/` + `pie-chart/`

**Library:** Recharts with `ResponsiveContainer`.

**What was ported correctly:**
- `BarChart` supports `type: 'bar' | 'column'` with axis swap
- Multi-series color override per entry
- `PieChart` has `innerRadius='70%'` donut default matching Angular
- `ResponsiveContainer width="100%"` for fluid layout

**Features missing vs Angular ngx-charts:**

| Missing Feature | Angular Equivalent |
|----------------|--------------------|
| Stacked bars | `ngx-charts-bar-vertical-stacked` — recharts `stackId` prop exists on `<Bar>` but is unused |
| Grouped 2D bars | `ngx-charts-bar-vertical-2d` |
| Click event on bar/slice | `(select)` event |
| Hover events | `(activate)` / `(deactivate)` — recharts has `onMouseEnter`/`onMouseLeave` but not wired |
| Y-axis K/M/B formatter | `[yAxisTickFormatting]="formatNumber"` — `formatNumber` was not ported |
| Configurable legend position | `legendPosition` input — hard-coded `verticalAlign="bottom"` |
| Pie explode slices | `[explodeSlices]="true"` — no `paddingAngle` / offset logic |
| Pie label toggle | `[labels]="showLabels"` — labels always rendered, no prop |
| Gradient fill | `[gradient]="gradient"` — would require `<LinearGradient>` SVG defs |

**Features missing vs Highcharts dashboard (more severe):**

| Missing Feature | Highcharts Equivalent |
|----------------|----------------------|
| **3-level drilldown** | `chart.drilldown` / `chart.drillup` events + `drilldownLevels` tracking — completely absent in recharts |
| Breadcrumb path during drilldown | `this.pathArr` maintained and rendered in template |
| Custom HTML tooltips | `tooltip.pointFormat` + `dataLabels.useHTML: true` with custom `formatter` |
| `allowPointSelect` on pie | Click selects/deselects slice with visual offset |
| Filter dropdowns re-rendering chart | Area/college `<select>` calling `areaFilterChanged()` |
| Global number formatting | `Highcharts.setOptions({ lang: { thousandsSep: ',' } })` |
| Number formatting on axis | `tickFormatter` per axis — not set in recharts wrappers |

**What recharts gives for free that isn't used:**

| Feature | Recharts API | Currently Used? |
|---------|-------------|-----------------|
| Stacked bars | `stackId="a"` on `<Bar>` | ❌ |
| Click on bar/slice | `onClick` on `<Bar>` / `<Pie>` | ❌ |
| Hover expand on pie slice | `activeShape` + `activeIndex` state on `<Pie>` | ❌ |
| Value labels on bars | `label` prop on `<Bar>` | ❌ |
| Y-axis tick formatter | `tickFormatter` on `<YAxis>` | ❌ |
| Range zoom brush | `<Brush>` component | ❌ |
| Reference / threshold line | `<ReferenceLine y={value} />` | ❌ |
| Y-axis domain clamp | `domain={[0, 'auto']}` on `<YAxis>` | ❌ |
| Max bar width | `maxBarSize` on `<Bar>` | ❌ |
| Custom tooltip component | `content` prop on `<Tooltip>` | ❌ |
| Padding between pie slices | `paddingAngle` on `<Pie>` | ❌ |

---

### `src/components/data-display/` — StatCard, StatusBadge

**Not chart replacements** — net-new components with no Angular precedent in this slot.

- **`StatCard`** — KPI tile with `title`, `value`, `icon: LucideIcon`, `trend?: { value, label, direction }`, `isLoading` skeleton, `colorVariant`. Not used in any Angular dashboard.
- **`StatusBadge`** — semantic pill with 5 variants (`active`, `inactive`, `pending`, `draft`, `published`). Angular used raw `mat-chip` or inline CSS classes for status display.

No unnecessary additions here — these fill a genuine gap.

---

## 6. Layout

### Angular original

**Framework:** Fuse theme (`@fuse/*`) + Angular Material + Angular Flex Layout (`@angular/flex-layout`)

**Key services and directives:**
- `FuseConfigService` — observable config: `layout.navbar.position`, `layout.navbar.hidden`, `colorTheme`
- `FuseSidebarService.getSidebar(key).toggleOpen()` — named sidebar registry
- `fuse-navigation layout="vertical"` — handles the entire menu tree declaratively
- `fusePerfectScrollbar` — replaces native scrollbar with perfect-scrollbar library
- `fxLayout`, `fxFlex`, `fxLayoutAlign`, `fxHide.gt-md`, `fxShow.gt-sm` — responsive layout directives

**Angular Material in toolbar:**
- `mat-toolbar`, `mat-icon-button`, `mat-icon` with `matBadge`/`matBadgeColor` for notification badge counts
- **`mat-autocomplete` search** — full live autocomplete backed by `getSearchItems()` API, `_filter()` on `Observable`, `[displayWith]="displayCode"`, navigates to matched page on select
- `matBadge="8"` on mail, `matBadge="5"` on notifications
- User avatar with `onerror` fallback to default image
- **Multi-student switcher for PARENT role** — `*ngFor="let st of students"` menu items call `selectedStudent(st.studentId)`
- `UserIdleService` session monitoring, `SnotifyService` toasts

**Navbar specifics:**
- Dynamic college logo — two `*ngIf` branches for null vs present `collegeLogo`
- `fuseConfig.layout.navbar.secondaryBackground` / `primaryBackground` dynamic background classes
- `fxHide.lt-lg` / `fxHide.gt-md` — separate toggle buttons for desktop fold vs mobile open

---

### `src/common/components/breadcrumb/Breadcrumb.tsx`

**Correctly implements:**
- `<nav aria-label="Breadcrumb">` with `aria-current="page"` on last item
- Next.js `<Link>` for ancestor items, plain `<span>` for current
- `ChevronRight` separator from lucide-react
- Stateless — no store, no hooks

**Missing vs Angular:**
- Angular's `BreadcrumbService` auto-populated breadcrumbs from route data. This port requires every page to manually construct and pass `items[]` — a DX regression. No route-aware utility exists.
- No `maxItems` truncation for deeply nested routes — Angular's Fuse breadcrumb collapsed with `...` for long paths.

---

### `src/common/components/theme-setting-modal/ThemeSettingModal.tsx`

**Significantly expands on Angular** — Angular never exposed a user-facing theme modal. `FuseConfigService` was developer-configured, not user-configurable.

| Capability | Angular (FuseConfigService) | ThemeSettingModal |
|-----------|----------------------------|-------------------|
| Light/dark/system toggle | Not user-exposed | ✅ 3-way toggle (Sun/Moon/Monitor icons) |
| Color scheme swatches | `config.colorTheme` string, not a modal | ✅ 6 swatches (default/blue/green/purple/orange/red) |
| Font size | ❌ Not in Angular | ✅ sm/md/lg |
| Sidebar position left/right | `config.layout.navbar.position` (dev-configured) | ✅ Toggle |
| Sidebar collapsed-by-default | `layout.navbar.folded` config | ✅ Toggle switch |
| Persistence | Angular's Fuse settings JSON | ✅ `localStorage` (`erp_theme_settings` key) |
| CSS variable injection | Not applicable | ✅ Sets `--color-primary`, `--font-size-base`, `:root` data attributes |
| Reset to defaults | Not present | ✅ `resetSettings()` with RotateCcw icon |

**Missing vs Angular's Fuse config:**
- `layout.toolbar.hidden`, `layout.footer.hidden`, `customScrollbars` toggles
- Named color themes that swap full Material palettes — this modal only changes `--color-primary` HSL; `--color-secondary`, `--color-accent`, `--color-error` are not adjusted

**Unnecessary addition:**
Hand-rolled toggle switch (`role="switch"` + `translate-x` CSS) — the shadcn `Switch` component (`@/components/ui/switch`) already exists in the project and wraps Radix `SwitchPrimitive` with correct ARIA semantics.

Also: `Dialog.Description` (required by Radix for accessibility) is missing — Radix will warn in dev that `DialogContent` needs `DialogDescription` or `aria-describedby`.

---

### `src/components/layout/Topbar.tsx`

> **⚠️ Critical regression:** Angular had a live `mat-autocomplete` search backed by `getSearchItems()` API that navigated to matched pages on selection. The new Topbar's `<input type="search">` has **no `onChange` handler, no data source, and no routing** — it is a static stub.

**Other regressions vs Angular toolbar:**

| Feature | Angular | New Topbar |
|---------|---------|-----------|
| Notification count badge | `matBadge="5"` | Hardcoded red dot — no count |
| Mail icon + badge | `matBadge="8"` on mail button | ❌ No mail icon |
| All-apps / grid button | Not in Angular | Present but ❌ no `onClick` handler — dead stub |
| Help button | Not in Angular | Present but ❌ no `onClick` handler — dead stub |
| PARENT student switcher | `*ngFor="let st of students"` menu with `selectedStudent(st.studentId)` | ❌ Not implemented |
| Role name tooltip | `matTooltip="{{roleName}}"` | Shows `user?.roleName` as static text — equivalent but loses tooltip |

---

### `src/components/layout/Sidebar.tsx`

**New features over Angular (genuine improvements):**
- Hover-expand with 120ms debounce timer (`setSidebarHovered`, `hoverLeaveTimer`)
- Pin/unpin auto-collapse preference — `PinOff`/`Pin` icons. Angular had no per-user pin.
- Scroll position preservation across collapse/expand via `savedScrollRef`
- Active module scroll-into-view on navigation via `data-nav-module` data attributes
- Logout directly in sidebar footer — Angular placed logout only in the toolbar user menu

> **⚠️ Bug:** `ThemeSettingModal` exposes `sidebarPosition: 'left' | 'right'` as a user toggle, and the Zustand store holds the value. The `Sidebar` component is **always left-docked regardless of this setting** — `PanelRightClose`/`PanelRightOpen` icons aren't even imported. The theme setting is wired to nothing.

---

### `src/components/layout/NavItem.tsx`

**New features over Angular (genuine improvements):**
- 3-state collapse logic — `collapsedItems.has(item.id)` persisted in Zustand. Angular Fuse computed collapse from route tree automatically.
- `hasActiveDescendant` recursive check — Angular derived this from its navigation service.
- `data-nav-module` / `data-active` data attributes enabling Sidebar's scroll-into-view effect.
- Icon-only collapsed mode at depth-0 (`isEffectivelyCollapsed`).

**Minor issue:**
`ICON_MAP` maps `person`, `group`, `people` all to `Users`. lucide-react ships `UserRound`, `UsersRound`, `PersonStanding` as distinct icons.

**What shadcn/Radix could provide that isn't used:**
`TooltipProvider` + `Tooltip` for icon-only collapsed mode — currently uses only the browser-default `title` attribute with no styling control.

---

### `src/components/layout/PageHeader.tsx`

Simple `title` + `subtitle` + optional `action` slot. No breadcrumb — callers must compose `Breadcrumb` + `PageHeader` separately.

---

### `src/components/shared/RoleGuard.tsx`

Net-new pattern — no direct Angular equivalent. Angular used route-level `AuthGuard` + inline `*ngIf="userRole === 'ADMIN'"`. `RoleGuard` is a React component wrapper for inline conditional rendering.

---

### `src/components/shared/PageContainer.tsx`

Trivial wrapper applying `--spacing-page-x` / `--spacing-page-y` CSS tokens. Angular used `fxLayout="column"` + Material card padding. No direct equivalent.

---

## 7. Summary: Critical Gaps

### High Priority

| # | Gap | Component | Impact |
|---|-----|-----------|--------|
| 1 | **Server-side pagination callback missing** — `onPaginationChanged` AG Grid event not forwarded. Biometric/HR payroll pages that page from the API have no path. | `DataTable` | Breaks feature parity for paginated-API pages |
| 2 | **Topbar search is a dead stub** — `<input>` has no handler, no data, no routing. Angular had live `mat-autocomplete` over all accessible pages. | `Topbar` | Visible regression for any user who used search |
| 3 | **`sidebarPosition` theme setting has no effect** — Sidebar is always left-docked. `ThemeSettingModal` lets the user toggle right-position but nothing responds. | `Sidebar` + `ThemeSettingModal` | User-visible settings mismatch |
| 4 | **`MonthYearPicker` year navigation is unbounded** — user can browse to year 1 or 9999. No `minDate`/`maxDate`. | `MonthYearPicker` | UX defect on ~8 payroll/attendance/exam screens |
| 5 | **Multi-select has no implementation** — Angular used `mat-select multiple` for attendance periods and batch pickers. Radix Select is single-select only. No `Command`+`Popover` pattern exists in the codebase. | Select layer | Missing feature for batch/period pickers |
| 6 | **Highcharts 3-level drilldown has no equivalent** — the fees-summary dashboard was a fully interactive drill-down chart (District → College → Fee Category). No recharts port exists. | Charts | Dashboard feature completely absent |

### Medium Priority

| # | Gap | Component | Impact |
|---|-----|-----------|--------|
| 7 | **`minDate`/`maxDate` don't constrain calendar navigation** — only disable day buttons; user can browse to any century. Fix: pass `startMonth={minDate}`, `endMonth={maxDate}` to `Calendar`. | Both `DatePicker` components | UX defect on date-constrained pickers |
| 8 | **`common/table/Table.tsx` is dead code** — zero imports, all pages use `DataTable`. `DATE_COLUMNS` constant hardcodes a domain column key inside a generic component. | `common/table` | Technical debt |
| 9 | **Two duplicate search inputs with no functional difference** — `common/search/SearchInput` vs `forms/SearchInput`. | Search | Technical debt, diverging API |
| 10 | **`MonthYearPicker` can be replaced with `captionLayout="dropdown"`** — react-day-picker v9 supports this natively, with keyboard navigation, bounds, and accessibility for free. | `MonthYearPicker` | Eliminates custom code, adds accessibility |
| 11 | **`isForDisabled` checkbox baked into `CollegeFilterPanel`** — domain knowledge in a "reusable" component. | `CollegeFilterPanel` | Coupling concern |

### Low Priority

| # | Gap | Component | Impact |
|---|-----|-----------|--------|
| 12 | **`getRowId` not wired in `DataTable`** — scroll position and selection are lost on data refresh. | `DataTable` | UX defect on pages that refresh row data |
| 13 | **No route-aware breadcrumb utility** — every page manually constructs `items[]`. Angular's `BreadcrumbService` populated from route data automatically. | `Breadcrumb` | DX regression |
| 14 | **Deprecated `initialFocus` prop** in `common/date-picker` — renamed to `autoFocus` in react-day-picker v9. Currently a no-op. | `common/date-picker` | Calendar doesn't auto-focus on open |
| 15 | **`ThemeSettingModal` uses hand-rolled `Switch`** — shadcn `Switch` component already exists in the project. | `ThemeSettingModal` | Duplication, missing ARIA semantics |
| 16 | **`Dialog.Description` missing** in `ThemeSettingModal` — Radix warns in dev; screen readers get no dialog description. | `ThemeSettingModal` | Accessibility |
| 17 | **`ICON_MAP` conflates distinct user icons** — `person`, `group`, `people` all map to `Users`. lucide ships `UserRound`, `UsersRound`, `PersonStanding`. | `NavItem` | Visual polish |
| 18 | **`common/select` `<label>` not linked via `htmlFor`/`id`** — screen readers won't associate label with select control. | `common/select` | Accessibility |
| 19 | **`onRowSelected` and external `quickFilterText` props are dead** — no page uses them; unnecessary complexity in `DataTable`. | `DataTable` | API noise |
