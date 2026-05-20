# Navigation System

This document covers the complete navigation system: state management, server-to-client data flow, rendering logic, visual states, and known gaps. It is intended for both developers (where does the code live, how does it work) and UI/UX engineers (every interactive state, animation, and edge case).

---

## 1. Overview

The navigation system provides a role-aware, hierarchical sidebar with three rendering modes (expanded, icon-only collapsed, mobile drawer), persistent user preferences, and auto-collapse after navigation. The nav tree is built server-side from the Spring Boot authorization API and passed to a Zustand store on first client render.

### File Map

| File | Role |
|------|------|
| `src/app/(protected)/layout.tsx` | Server component. Fetches session + user details, builds nav tree, renders AppShell |
| `src/lib/navigation.ts` | Pure utility. `buildNavTree()` converts raw Spring DTO to `NavItem[]` |
| `src/types/navigation.ts` | TypeScript types: `Module`, `SubModule`, `Page`, `NavItem` |
| `src/store/navigation-store.ts` | Zustand store with persistence. All nav state lives here |
| `src/components/layout/AppShell.tsx` | Client shell. Populates store on mount; owns auto-collapse effect; composes layout |
| `src/components/layout/Sidebar.tsx` | Client component. Renders brand header, nav list, footer controls |
| `src/components/layout/NavItem.tsx` | Recursive client component. Renders one nav item at any depth; owns active-state logic |
| `src/components/layout/Topbar.tsx` | Client component. Mobile hamburger, search bar, user dropdown |

### Data Flow Diagram

```
  Spring Boot API (/api/authorization)
         |
         | server fetch (JWT)
         v
  (protected)/layout.tsx   ← Server Component
  ├── getSession()
  ├── springGetUserDetails(jwt)  →  UserDTO { modules[], pages[] }
  ├── buildNavTree(modules, pages)  →  NavItem[]
  └── <AppShell initialNavItems={navItems}>
               |
               | prop (serialized over RSC boundary)
               v
         AppShell.tsx   ← Client Component
         ├── useEffect[once]: setNavItems(initialNavItems)  →  navigation-store
         └── useEffect[pathname]: autoCollapse → setSidebarCollapsed(true)
                    |
                    | store subscription
                    v
              Sidebar.tsx
              └── navItems.map → <NavItem depth=0>
                                    └── NavItem (recursive, depth+1)
```

---

## 2. State & Store

**File:** `src/store/navigation-store.ts`
**Store type:** Zustand with `persist` middleware
**Persist key:** `nav-settings` (localStorage)
**Persistence strategy:** `partialize` — only `autoCollapse` and `isSidebarCollapsed` are written to localStorage. Everything else resets on page load.

### State Shape

| Field | Type | Default | Persisted | Description |
|-------|------|---------|-----------|-------------|
| `navItems` | `NavItem[]` | `[]` | No | Full nav tree, populated once by AppShell on mount |
| `collapsedItems` | `Set<string>` | `new Set()` | No | IDs of manually-collapsed parent items |
| `isSidebarOpen` | `boolean` | `true` | No | Mobile drawer visibility |
| `isSidebarCollapsed` | `boolean` | `false` | Yes | Icon-only compact mode (desktop + mobile) |
| `autoCollapse` | `boolean` | `true` | Yes | Whether sidebar collapses after every navigation |

### Actions

| Action | Signature | What it does | Called by |
|--------|-----------|--------------|-----------|
| `setNavItems` | `(items: NavItem[]) => void` | Replaces nav tree in store | AppShell `useEffect` (once, on mount) |
| `toggleCollapsed` | `(id: string) => void` | Adds or removes `id` from `collapsedItems` Set | `NavItem` trigger click; `handleCollapsedClick` in collapsed mode |
| `toggleSidebar` | `() => void` | Flips `isSidebarOpen` | Topbar hamburger button |
| `setSidebarOpen` | `(open: boolean) => void` | Direct setter for `isSidebarOpen` | Available; currently unused in route-change effect (see Known Issues) |
| `setSidebarCollapsed` | `(collapsed: boolean) => void` | Direct setter for `isSidebarCollapsed` | AppShell auto-collapse effect |
| `toggleSidebarCollapsed` | `() => void` | Flips `isSidebarCollapsed` | Sidebar footer collapse/expand button |
| `toggleAutoCollapse` | `() => void` | Flips `autoCollapse` | Sidebar footer pin/unpin button |

---

## 3. Data Flow

### Server Side — `(protected)/layout.tsx`

The protected layout is a Next.js **Server Component**. It runs on every navigation to a protected route (but is cached by Next.js's segment caching).

1. `getSession()` — reads the encrypted session cookie, returns `{ user, jwt }`. Redirects to `/login` if missing.
2. `springGetUserDetails(jwt)` — calls the Spring Boot authorization API. Returns `UserDTO` with `modules[]` and `pages[]`.
3. `buildNavTree(modules, pages)` — converts the DTO to a `NavItem[]` tree (see below). Wrapped in try/catch; on failure `navItems = []`.
4. Renders `<SessionProvider>` wrapping `<AppShell initialNavItems={navItems}>`.

Raw API data never crosses the RSC boundary — only the normalized `NavItem[]` is serialized.

### `buildNavTree` — `src/lib/navigation.ts`

Replicates Angular's `addModuleToNavigation` + `addPagesToNavigation` logic:

- **Modules** with no pages and no submodules become leaf items with `href`.
- **Modules** with pages or submodules become collapsible parents with `children[]`.
- **SubModules** are nested one level deeper (depth 1), with their pages at depth 2.
- **Standalone pages** (no modules, only pages in the DTO) are built flat.
- hrefs are assembled as `moduleUrl/subModuleUrl/page.url`, then run through `normalizeHref()` to strip any doubled path prefix.
- Module URL is taken from `module.url` if present and not the literal string `'null'`; otherwise derived by splitting `moduleName` on spaces, dropping the word "and", and joining with `-`.
- Node IDs follow the pattern: `module_<moduleId>`, `sub_module_<subModuleId>`, `page_<pageId>`.

### Client Side — `AppShell.tsx`

AppShell is a `'use client'` component. It owns two effects:

**Effect 1 — populate store (runs once):**
```
useEffect(() => {
  if (initialNavItems.length > 0) setNavItems(initialNavItems)
}, [])
```
Intentional empty dependency array. The nav tree only needs to be loaded once per page load; it comes from a server prop, not a reactive value.

**Effect 2 — auto-collapse (runs on pathname change):**
```
useEffect(() => {
  if (prevPathname.current !== pathname && autoCollapse) {
    setSidebarCollapsed(true)
  }
  prevPathname.current = pathname
}, [pathname, autoCollapse, setSidebarCollapsed])
```
`prevPathname` is a `useRef` so it does not cause re-renders. The guard `prevPathname.current !== pathname` prevents the sidebar from collapsing on mount (when both values are the same initial pathname).

---

## 4. NavItem Rendering Logic

**File:** `src/components/layout/NavItem.tsx`

`NavItem` is a recursive component. Each call receives `item: NavItemType` and `depth: number` (default `0`).

### Active State Computation

Runs on every render using `usePathname()`:

```
isSelfActive  = item.href === pathname
             OR pathname.startsWith(item.href + '/')

isChildActive = recursive check: any descendant's href matches pathname
             (via hasActiveDescendant helper)

isActive      = isSelfActive || isChildActive

isOpen        = isActive ? true : !collapsedItems.has(item.id)
```

**Critical rule:** When `isActive` is true, `isOpen` is forced to `true` regardless of `collapsedItems`. A user cannot manually close a parent that contains the current page.

### Rendering Decision Tree

```
NavItem({ item, depth })
│
├─ isSidebarCollapsed?
│   ├─ YES
│   │   ├─ depth > 0? → return null  (sub-items hidden in collapsed mode)
│   │   └─ depth = 0 → render icon-only button
│   │       onClick = handleCollapsedClick()
│   │         1. if hasChildren AND collapsedItems.has(item.id)
│   │              → toggleCollapsed(item.id)   (re-open submenu)
│   │         2. setSidebarCollapsed(false)      (expand sidebar)
│   │
│   └─ NO (sidebar expanded)
│       ├─ hasChildren?
│       │   ├─ YES → render Radix <Collapsible open={isOpen}>
│       │   │         CollapsibleTrigger (button, full width)
│       │   │         CollapsibleContent → children.map(NavItem, depth+1)
│       │   │         onOpenChange → toggleCollapsed(item.id)
│       │   │
│       │   └─ NO → render Next.js <Link>
│       │             aria-current="page" when isActive
│       │             href={item.href ?? '#'}
```

### CSS Classes by State

#### Collapsed Sidebar (icon-only button, depth=0 only)

| State | Classes |
|-------|---------|
| Active | `text-white bg-slate-800` |
| Inactive | `text-slate-300 hover:bg-slate-700 hover:text-white` |
| Active indicator | `absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-indigo-400` |
| Layout | `flex w-full items-center justify-center rounded-md py-2 px-1` |

#### Expanded Sidebar — Collapsible Trigger (parent with children)

| State | Classes |
|-------|---------|
| Child active, self not active | `text-white` (no background) |
| Self active | `text-white bg-slate-700` |
| Inactive | `text-slate-300 hover:bg-slate-700 hover:text-white` |
| Active indicator | same as above |
| Chevron (open) | `rotate-90 transition-transform duration-200` |
| Chevron (closed) | `text-slate-500 transition-transform duration-200` |

#### Expanded Sidebar — Leaf Link

| State | Classes |
|-------|---------|
| Active | `text-white bg-slate-800 hover:bg-slate-700` |
| Inactive | `text-slate-300 hover:bg-slate-700 hover:text-white hover:translate-x-0.5` |
| Active indicator | same as above |

#### Icon Color (`NavIcon` component)

| State | Classes |
|-------|---------|
| Active | `text-indigo-400` |
| Inactive | `text-slate-400` |

### Indentation (expanded sidebar only)

| Depth | Padding class | Pixels |
|-------|---------------|--------|
| 0 (module) | `pl-3` | 12px |
| 1 (submodule) | `pl-7` | 28px |
| 2 (page) | `pl-11` | 44px |
| 3+ (deep) | `pl-14` | 56px |

All items also have `pr-3` on the right.

---

## 5. Sidebar Behaviors

**File:** `src/components/layout/Sidebar.tsx`

### Structure

```
<aside> bg-slate-900, h-full w-full flex flex-col
├── Brand Header    shrink-0, border-b border-slate-800, py-4
├── <nav>           flex-1, overflow-y-auto, scrollbar-sidebar (4px thin)
└── Footer          shrink-0, border-t border-slate-800, px-2 py-2
```

### Brand Header Modes

| Mode | Content |
|------|---------|
| Expanded | Logo (36×36, bg-white/10 rounded) + college name + "Institutional Intelligence" tagline |
| Collapsed | Logo only, centered (`justify-center px-2`) |

College name comes from `useSessionContext()` → `user.collegeName`, falling back to `'College ERP'`.

### Expand/Collapse Mechanics

Width is controlled by a class on the **AppShell wrapper div**, not on the `<aside>` itself:

- Collapsed: `w-16` (64px)
- Expanded: `w-64` (256px)
- Transition: `transition-all duration-300 ease-in-out` on the wrapper

The `<aside>` is always `w-full` — it fills its container.

### Footer Buttons

All four buttons share the base style: `flex w-full items-center rounded-md px-3 py-2 text-[13px] transition-colors duration-150`. When collapsed, `justify-center` replaces `gap-2.5` and text labels are hidden.

| Button | Icon | Action | Visual note |
|--------|------|--------|-------------|
| Collapse/Expand | `PanelLeftClose` / `PanelLeftOpen` | `toggleSidebarCollapsed()` | Icon swaps based on state |
| Auto-collapse toggle | `PinOff` / `Pin` | `toggleAutoCollapse()` | `autoCollapse=true` → `text-slate-400` (PinOff); `autoCollapse=false` → `text-indigo-400` (Pin) |
| Help Center | `HelpCircle` | none (placeholder) | Always `text-slate-400` |
| Logout | `LogOut` | `POST /api/auth/logout` → redirect `/login` | Always `text-slate-400` |

### Scroll Position Save/Restore

When the sidebar collapses to icon-only, the nav list becomes too narrow to be useful, but the scroll position is remembered:

```
useEffect(() => {
  if (isSidebarCollapsed) {
    savedScrollRef.current = nav.scrollTop      // save
  } else {
    requestAnimationFrame(() => {               // restore after transition
      navRef.current.scrollTop = savedScrollRef.current
    })
  }
}, [isSidebarCollapsed])
```

The `requestAnimationFrame` defers the restore until after the 300ms CSS transition and DOM repaint have settled. If `navRef.current` is null at RAF execution time, the restore is silently skipped.

### Active Link Scroll-Into-View

A second effect fires whenever `pathname` or `navItems` change:

```
useEffect(() => {
  const activeLink = navRef.current.querySelector('a[aria-current="page"]')
  if (activeLink) activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}, [pathname, navItems])
```

This keeps the active link visible when the nav tree is tall and the user navigates to a module far down the list.

---

## 6. Auto-Collapse Feature

Auto-collapse causes the sidebar to shrink to icon-only width after every successful navigation. It is enabled by default (`autoCollapse: true`) and persisted in localStorage.

### Mechanism

1. AppShell holds a `prevPathname` ref initialized to the current pathname.
2. On every render triggered by a pathname change, the effect compares `prevPathname.current` with the new `pathname`.
3. If they differ **and** `autoCollapse` is true, `setSidebarCollapsed(true)` is called.
4. `prevPathname.current` is updated to the new pathname unconditionally.

The ref prevents a false trigger on mount (initial render has matching values) and prevents the feature from re-collapsing on unrelated re-renders.

### User Controls

| Action | Icon | State change |
|--------|------|--------------|
| Click "Collapse" button in footer | `PanelLeftClose` | `isSidebarCollapsed = true` (manual) |
| Click "Expand" button in footer | `PanelLeftOpen` | `isSidebarCollapsed = false` (manual) |
| Navigate to a page (auto-collapse on) | — | `isSidebarCollapsed = true` (automatic) |
| Click icon in collapsed mode | — | `isSidebarCollapsed = false` (user-initiated expand) |
| Click Pin (disable auto-collapse) | `Pin` | `autoCollapse = false` |
| Click PinOff (enable auto-collapse) | `PinOff` | `autoCollapse = true` |

When `autoCollapse` is false (pinned), navigating does not collapse the sidebar. The sidebar width remains at `w-64` until the user manually clicks Collapse.

---

## 7. Mobile vs Desktop

The sidebar uses a single component in both contexts; the rendering mode is controlled purely by Tailwind responsive classes.

### Desktop (viewport ≥ 768px / `md:`)

- Sidebar is always in the document flow (sticky, `h-100vh`).
- `isSidebarOpen` has no visible effect — `md:translate-x-0` keeps it on-screen regardless.
- Width is controlled by `isSidebarCollapsed` (`w-16` vs `w-64`).
- Mobile overlay div is hidden (`md:hidden` on the overlay).
- Auto-collapse is the primary feature for desktop users.

### Mobile (viewport < 768px)

- Sidebar is positioned off-screen by default (`-translate-x-full` when `isSidebarOpen = false`).
- Hamburger button in Topbar (`md:hidden`) calls `toggleSidebar()` to set `isSidebarOpen = true`.
- A semi-transparent overlay (`bg-black/40 backdrop-blur-sm`, `z-20`) covers the content area when the sidebar is open. Tap on the overlay does not close the sidebar (no `onClick` handler — see Known Issues).
- `isSidebarCollapsed` applies on mobile too; width classes still switch between `w-16` and `w-64`.
- Sidebar translate-x transition: `duration-300 ease-in-out`.

### State Flag Matrix

| Flag | Desktop effect | Mobile effect |
|------|---------------|---------------|
| `isSidebarOpen = false` | No effect (overridden by `md:translate-x-0`) | Sidebar hidden off-screen left |
| `isSidebarOpen = true` | No effect | Sidebar slides in, overlay shown |
| `isSidebarCollapsed = false` | Width = 256px | Width = 256px |
| `isSidebarCollapsed = true` | Width = 64px, icon-only | Width = 64px, icon-only |
| `autoCollapse = true` | Collapses to 64px on navigate | Collapses to 64px on navigate (but drawer stays open) |

---

## 8. Visual States Reference

### Sidebar Items (expanded)

| Element | State | Background | Text | Left bar | Other |
|---------|-------|-----------|------|----------|-------|
| Leaf link | Active | `bg-slate-800` | `text-white` | `bg-indigo-400` | — |
| Leaf link | Inactive hover | `hover:bg-slate-700` | `hover:text-white` | None | `hover:translate-x-0.5` |
| Leaf link | Inactive default | None | `text-slate-300` | None | — |
| Parent trigger | Self active | `bg-slate-700` | `text-white` | `bg-indigo-400` | — |
| Parent trigger | Child active only | None | `text-white` | `bg-indigo-400` | — |
| Parent trigger | Inactive hover | `hover:bg-slate-700` | `hover:text-white` | None | — |
| Parent trigger | Inactive default | None | `text-slate-300` | None | — |
| Chevron | Open | — | `text-slate-500` | — | `rotate-90` |
| Chevron | Closed | — | `text-slate-500` | — | No rotation |

### Sidebar Items (collapsed, icon-only)

| State | Background | Icon color | Left bar |
|-------|-----------|-----------|----------|
| Active | `bg-slate-800` | `text-indigo-400` | `bg-indigo-400` |
| Inactive default | None | `text-slate-400` | None |
| Inactive hover | `hover:bg-slate-700` | inherits white on hover | None |

### Footer Buttons

| Button | Default color | Hover | Active/Pinned state |
|--------|--------------|-------|-------------------|
| Collapse/Expand | `text-slate-400` | `hover:bg-slate-800 hover:text-white` | — |
| Pin (autoCollapse off) | `text-indigo-400` | `hover:bg-slate-800 hover:text-indigo-300` | Indigo indicates "pinned" |
| PinOff (autoCollapse on) | `text-slate-400` | `hover:bg-slate-800 hover:text-white` | Slate indicates auto-collapse active |
| Help Center | `text-slate-400` | `hover:bg-slate-800 hover:text-white` | — |
| Logout | `text-slate-400` | `hover:bg-slate-800 hover:text-white` | — |

### Topbar

| Element | State | Visual |
|---------|-------|--------|
| User avatar (ADMIN/PRINCIPAL) | Default | `bg-red-100 text-red-700` |
| User avatar (STAFF) | Default | `bg-blue-100 text-blue-700` |
| User avatar (STUDENT) | Default | `bg-emerald-100 text-emerald-700` |
| User avatar (PARENT) | Default | `bg-purple-100 text-purple-700` |
| User avatar (other/default) | Default | `bg-indigo-100 text-indigo-700` |
| Notification bell | Always | Red dot badge (`bg-red-500 ring-2 ring-white`) |
| Search input | Focused | `border-indigo-400 bg-white ring-2 ring-indigo-400/20` (via Tailwind focus styles) |
| Search dropdown result | Active (keyboard/hover) | `bg-accent` |

### CSS Transition Summary

| Element | Properties animated | Duration | Easing |
|---------|-------------------|----------|--------|
| Sidebar width | all (via `transition-all`) | 300ms | ease-in-out |
| Mobile sidebar translate | transform | 300ms | ease-in-out |
| Nav item chevron | transform (rotate) | 200ms | default (ease) |
| Button/link colors | colors | 150ms | default |
| Inactive leaf hover translate | transform | 150ms | default |
| Page entry | opacity + translateY (`animate-fade-up`) | 400ms | ease-out |
| Collapsible height | height (Radix built-in animation) | ~250ms | ease |

---

## 9. Edge Cases

All 14 documented edge cases:

**1. Persistent collapsed state on first load**
- Trigger: User had `isSidebarCollapsed: true` in localStorage before visiting the app.
- Behavior: Sidebar initializes in icon-only mode. All sub-items are hidden. User must click an icon or the PanelLeftOpen button to expand.
- Note: Works correctly because the store reads localStorage before the first render.

**2. Auto-collapse fires on navigation**
- Trigger: `autoCollapse = true` and user clicks any nav link.
- Behavior: `pathname` changes, AppShell effect detects `prevPathname.current !== pathname`, calls `setSidebarCollapsed(true)`. The 300ms CSS transition plays.
- Note: The 300ms transition means the sidebar visually collapses after the page content has already changed.

**3. Manual collapse of expanded parent**
- Trigger: User clicks a CollapsibleTrigger for an inactive (non-active) parent in expanded sidebar.
- Behavior: `toggleCollapsed(item.id)` adds the ID to `collapsedItems`. Radix Collapsible animates the content to height 0 (~250ms).
- Note: `collapsedItems` is in-memory only. Refreshing the page resets all manual collapses.

**4. User tries to close the active parent**
- Trigger: User clicks the CollapsibleTrigger of the parent whose child is the current active page.
- Behavior: `toggleCollapsed` adds the ID to `collapsedItems`. On re-render, `isActive = true` forces `isOpen = true`, overriding `collapsedItems`. The panel snaps back open immediately.
- Note: This is intentional — the active item must always be reachable in the sidebar. The animation plays close then immediately open, which creates a brief flicker. Consider preventing the click when `isActive` is true.

**5. Clicking icon in collapsed mode when submenu was manually closed**
- Trigger: User collapses the sidebar while a parent module is in `collapsedItems` (manually closed). User then clicks the module icon.
- Behavior: `handleCollapsedClick` first calls `toggleCollapsed(item.id)` to remove it from `collapsedItems`, then calls `setSidebarCollapsed(false)`. The expanded sidebar shows the module open.
- Note: Prevents a confusing state where expanding the sidebar shows a collapsed module with no visible active child.

**6. Scroll position restoration after expand**
- Trigger: User scrolls nav, collapses sidebar, then expands it.
- Behavior: On collapse, `savedScrollRef.current = nav.scrollTop`. On expand, `requestAnimationFrame` restores `nav.scrollTop` to the saved value.
- Note: If the nav tree changed between collapse and expand (e.g., different API response), the scroll restores to the same pixel offset, which may no longer correspond to the same item. No crash.

**7. `collapsedItems` not persisted — resets on refresh**
- Trigger: User manually closes several modules, then refreshes the page.
- Behavior: `collapsedItems` resets to `new Set()`. All parents start open (unless active-state logic keeps them open naturally).
- Note: Intentional design decision. Persisting collapse state risks stale entries if the nav tree changes after an API update.

**8. Missing or unknown icon name**
- Trigger: Spring API returns an `iconName` value not present in `ICON_MAP` (e.g., any unmapped string).
- Behavior: `resolveIcon(name)` returns `undefined`. `NavIcon` falls back to `LayoutDashboard` (for modules) or `ChevronRight` (for pages).
- Note: No crash, no error. The visual result is a small chevron icon where a domain icon was expected. Add the key to `ICON_MAP` to fix.

**9. Pathname not matching any nav href**
- Trigger: User navigates to a route that exists in the app but has no corresponding `NavItem` (e.g., a detail page, a modal route, a 404).
- Behavior: No item shows as active. All items render in their default inactive style. User can still navigate back via the sidebar.
- Note: Expected behavior. Nav doesn't need to model every sub-route.

**10. RAF timing edge case**
- Trigger: `navRef.current` is replaced or unmounted between the RAF call and its execution (e.g., Sidebar unmounts during a fast route transition).
- Behavior: The guard `if (navRef.current)` prevents a null-reference crash. Scroll is simply not restored.
- Note: Extremely rare in practice. The sidebar doesn't unmount during normal navigation.

**11. Mobile sidebar does not auto-close after navigation**
- Trigger: Mobile user taps a nav link. The route changes.
- Behavior: `isSidebarOpen` stays `true`. The sidebar remains visible over the content until the user manually taps the hamburger or dismisses it.
- Note: **Known gap.** `setSidebarOpen(false)` is not called in the AppShell `pathname` effect. See Known Issues.

**12. Leaf item with no `href`**
- Trigger: `buildNavTree` produces a page node where `page.url` is undefined/empty, or `item.href` is not set.
- Behavior: `NavItem` renders `<Link href="#">`. Clicking scrolls the page to the top. Non-functional but no crash.
- Note: The `#` fallback is in `NavItem` line `href={item.href ?? '#'}`. The data origin is `buildNavTree`; ensure `page.url` is populated in the Spring API.

**13. Very deep nesting (depth > 3)**
- Trigger: A `NavItem` child tree goes deeper than 3 levels (unusual but possible if `buildNavTree` is called with unusual data).
- Behavior: All items at depth 3 and beyond receive `pl-14` (56px). They visually appear at the same indentation level as depth-3 items.
- Note: The current data model only supports 3 levels (module → submodule → page). Depth > 3 is not expected from the Spring API.

**14. `buildNavTree` API failure**
- Trigger: `springGetUserDetails` throws (network error, 5xx, malformed response).
- Behavior: The `try/catch` in `(protected)/layout.tsx` sets `navItems = []`. AppShell receives an empty array, `setNavItems` is never called (the `length > 0` guard). Sidebar renders an empty nav list. App is otherwise functional.
- Note: The user sees a blank sidebar with only the footer buttons. No error boundary is needed because the catch prevents the crash from propagating.

---

## 10. Icon System

**File:** `src/components/layout/NavItem.tsx` (top of file, `ICON_MAP` constant)

Icons come from the `lucide-react` package. The `ICON_MAP` object maps string keys (from the Spring API's `iconName` field) to Lucide `React.ElementType` components.

### Resolution Flow

Icons come from the Spring Boot API's `iconName` field. The `resolveIcon()` function handles two formats:

```
item.icon (string from API)
    |
    ├─ Single-word (e.g. "dashboard", "school")
    │       └─ Direct lookup: ICON_MAP[name]
    │
    └─ Multi-word CSS class (e.g. "fa fa-graduation-cap", "icon-home")
            └─ Strip fa-/icon-/glyphicon- prefix from last token
               Try underscore form ("graduation_cap")
               Try dashed form ("graduation-cap")
               Fallback: next token, same logic
```

If nothing resolves: `kind='module'` → `LayoutDashboard`, `kind='page'` → `ChevronRight`.

### Full ICON_MAP (200+ entries)

Organized by category. All keys are the exact string the Spring Boot API returns in `iconName`.

| Category | Example keys |
|----------|-------------|
| Dashboard / Core | `dashboard`, `home`, `apps`, `grid_view`, `widgets`, `layers` |
| People / HR | `people`, `group`, `groups`, `person`, `person_add`, `supervisor_account`, `manage_accounts`, `how_to_reg`, `badge`, `contacts`, `face` |
| Academics | `school`, `book`, `menu_book`, `library_books`, `local_library`, `class`, `subject`, `science`, `biotech`, `history_edu`, `auto_stories`, `edit_note` |
| Exams / Assessment | `assignment`, `assessment`, `assignment_turned_in`, `fact_check`, `quiz`, `grading`, `task`, `task_alt`, `checklist`, `score`, `grade`, `stars`, `emoji_events` |
| Finance / Fees | `attach_money`, `money`, `payment`, `receipt`, `receipt_long`, `credit_card`, `account_balance`, `account_balance_wallet`, `savings`, `currency_rupee`, `paid`, `request_quote`, `point_of_sale` |
| Attendance / Biometric | `fingerprint`, `attendance`, `how_to_vote`, `co_present`, `transfer_within_a_station` |
| Timetable / Calendar | `event`, `event_note`, `event_available`, `today`, `calendar_today`, `calendar_month`, `date_range`, `schedule`, `alarm`, `timer`, `view_timeline` |
| Reports / Analytics | `bar_chart`, `stacked_bar_chart`, `insert_chart`, `area_chart`, `show_chart`, `trending_up`, `analytics`, `donut_large`, `pie_chart`, `leaderboard`, `query_stats`, `table_chart` |
| Settings / Config | `settings`, `settings_applications`, `tune`, `build`, `handyman`, `admin_panel_settings`, `filter_list`, `category` |
| Communication | `announcement`, `campaign`, `notifications`, `notifications_active`, `email`, `mail`, `message`, `sms`, `chat`, `forum`, `send` |
| Transport / Location | `directions_bus`, `bus_alert`, `local_taxi`, `directions_car`, `location_on`, `location_city`, `map`, `navigation`, `place`, `route` |
| Hostel / Buildings | `hotel`, `house`, `domain`, `business`, `apartment`, `corporate_fare`, `bedroom_parent`, `king_bed`, `night_shelter` |
| Library / Files | `upload`, `download`, `file_upload`, `cloud_upload`, `folder`, `folder_open`, `insert_drive_file`, `file_copy`, `print`, `picture_as_pdf`, `attachment`, `link` |
| Admin / Security | `security`, `verified_user`, `gpp_good`, `lock`, `vpn_key`, `key`, `password`, `enhanced_encryption` |
| IT / Tech | `computer`, `laptop`, `phone_android`, `memory`, `storage`, `dns`, `cloud`, `wifi`, `code`, `terminal`, `api`, `database`, `schema` |
| Misc / General | `info`, `help`, `warning`, `error`, `new_releases`, `bolt`, `favorite`, `medical_services`, `star`, `bookmark`, `arrow_forward`, `chevron_right`, `search`, `edit`, `delete`, `refresh`, `sync` |

### FontAwesome (multi-word) aliases

Multi-word icon values like `"fa fa-graduation-cap"` or `"icon-home"` are resolved by `resolveIcon()` which strips the `fa-`/`icon-` prefix, converts dashes to underscores, and looks up in the same `ICON_MAP`. Example: `"fa fa-graduation-cap"` → `"graduation_cap"` → `GraduationCap`.

### Adding a New Icon

1. Import the icon from `lucide-react` at the top of `NavItem.tsx`.
2. Add a key/value entry to `ICON_MAP`.
3. Set the corresponding `iconName` in the Spring Boot data.

No other files need to change.

---

## 11. Topbar

**File:** `src/components/layout/Topbar.tsx`

The Topbar is a `'use client'` component rendered at the top of the main content area.

- **Height:** `h-14` (56px)
- **Background:** `bg-white`, `border-b border-slate-200`

| Element | Behavior |
|---------|----------|
| Hamburger (Menu icon) | `md:hidden` — calls `toggleSidebar()` |
| Live search input | Full-width on the left. Fetches all accessible pages for the current user from Spring Boot on mount. Filters by display name prefix as user types. Shows dropdown of up to 8 results. Keyboard: `↓`/`↑` to navigate results, `Enter` to navigate, `Escape` to close. |
| Bell icon | Renders with a static red dot badge. Non-interactive. |
| LayoutGrid icon | Non-interactive. |
| Help icon | Non-interactive. |
| User dropdown | Shows name + role. "Profile" item is disabled (`opacity-60`). "Sign out" calls `POST /api/auth/logout` → `/login`. |

---

## 12. Known Issues & Gaps

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Mobile sidebar does not close after navigation | `AppShell.tsx`, auto-collapse effect | On mobile, after tapping a nav link, the drawer stays open and covers the content. User must manually dismiss it. | Add `if (isMobile && isSidebarOpen) setSidebarOpen(false)` to the pathname effect in AppShell, or call `setSidebarOpen(false)` unconditionally alongside `setSidebarCollapsed(true)`. |
| Mobile overlay has no tap-to-close handler | `AppShell.tsx`, overlay div | Tapping the dark backdrop behind the sidebar on mobile does nothing. | Add `onClick={() => setSidebarOpen(false)}` to the overlay div. |
| `collapsedItems` resets on page refresh | `navigation-store.ts`, `partialize` | Users who manually collapse several modules lose that arrangement on refresh. | Intentional for now; add `collapsedItems` to `partialize` with custom serialization if it becomes a UX issue (Set is not JSON-serializable by default). |
| Active parent flickers on close attempt | `NavItem.tsx`, `isOpen` forced true | Clicking a CollapsibleTrigger of an active parent causes a brief close-then-open animation. | Guard the `onOpenChange` call: `onOpenChange={() => { if (!isActive) toggleCollapsed(item.id) }}`. |
| "Profile" menu item is disabled | `Topbar.tsx` | The Profile dropdown item exists but has `disabled` and `cursor-not-allowed`. No user profile page exists. | Implement a profile page or remove the item. |

---

## 13. Extending the Nav

### Adding a New Module or Page

The nav tree is built entirely from the Spring Boot authorization API response. To add a new module or page:

1. Register the module/submodule/page in the Spring Boot backend database.
2. Ensure the user's role has the appropriate permissions so the item appears in the `/api/authorization` response.
3. Create the corresponding Next.js route under `src/app/(protected)/`.
4. The `buildNavTree` function in `src/lib/navigation.ts` will automatically include the new item on next login.

No frontend nav configuration files need to be edited for standard items.

### Adding a New Icon

See Section 10. Summary: import from `lucide-react`, add to `ICON_MAP` in `NavItem.tsx`, set `iconName` in the backend data.

### Adding a New Footer Action to the Sidebar

1. Open `src/components/layout/Sidebar.tsx`.
2. Add a `<button>` inside the footer `<div>` (the `shrink-0 border-t ...` div at the bottom of `<aside>`).
3. Follow the existing button pattern for collapsed/expanded display:
   ```tsx
   <button
     type="button"
     className={cn(
       'flex w-full items-center rounded-md px-3 py-2 text-[13px] text-slate-400',
       'hover:bg-slate-800 hover:text-white transition-colors duration-150',
       isSidebarCollapsed ? 'justify-center' : 'gap-2.5',
     )}
   >
     <YourIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
     {!isSidebarCollapsed && <span>Label</span>}
   </button>
   ```
4. If the action requires new state, add it to `navigation-store.ts`. If it should persist across sessions, add the field to the `partialize` object.

### Adding a New Sidebar State Flag

1. Add the field and its action(s) to the `NavigationState` interface in `navigation-store.ts`.
2. Add the default value and action implementation in the `create` call.
3. If it should persist, add the field name to the `partialize` return object.
4. Consume it via `useNavigationStore()` in any client component.
