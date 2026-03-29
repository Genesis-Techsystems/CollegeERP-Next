# College ERP — Design System

> **Aesthetic Direction: "Slate Academy"**
> Refined institutional software with depth and warmth. Deep slate-900 sidebar, warm off-white canvas, **teal** precision accents, amber warmth highlights. Built for daily use — every interaction must feel deliberate and calm.

---

## 1. Color Palette

### Brand Primaries
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--slate-900` | 222 47% 11% | `#0F172A` | Sidebar background |
| `--slate-800` | 217 33% 17% | `#1E293B` | Sidebar hover/active bg |
| `--teal-500`  | 174 72% 40% | `#14B8A6` | Primary action, CTA button |
| `--teal-400`  | 174 72% 56% | `#2DD4BF` | Active nav icon, left border |
| `--teal-600`  | 175 84% 32% | `#0D9488` | Teal hover states |
| `--amber-500` | 38 92% 50%  | `#F59E0B` | Warm accent, warning badges |
| `--amber-400` | 43 96% 56%  | `#FBBF24` | Lighter amber |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `hsl(40 33% 98%)` | Page background (warm white) |
| `--surface` | `hsl(0 0% 100%)` | Cards, panels |
| `--surface-muted` | `hsl(220 14% 96%)` | Table stripes, inputs |
| `--border` | `hsl(220 13% 91%)` | Dividers, outlines |
| `--text-primary` | `hsl(222 47% 11%)` | Headings |
| `--text-secondary` | `hsl(215 16% 47%)` | Body, descriptions |
| `--text-tertiary` | `hsl(218 11% 65%)` | Placeholders, captions |

### Status Colors
| State | HSL | Use |
|-------|-----|-----|
| Success | `142 71% 45%` | Attendance, passing grades |
| Warning | `38 92% 50%` | Pending fees, deadlines |
| Danger | `0 84% 60%` | Overdue, errors |
| Info | `199 89% 48%` | Announcements |

### Role Badge Colors
| Role | Background | Text |
|------|-----------|------|
| ADMIN / PRINCIPAL | `red-100` | `red-800` |
| STAFF | `blue-100` | `blue-800` |
| STUDENT | `emerald-100` | `emerald-800` |
| PARENT | `purple-100` | `purple-800` |

---

## 2. Typography

### Font Stack
```css
--font-display: 'Geist', sans-serif;   /* headings, UI labels */
--font-body:    'Geist', sans-serif;   /* body text, descriptions */
--font-mono:    'Geist Mono', monospace; /* code, IDs, roll numbers */
```

### Type Scale
| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display-xl` | 2.25rem / 36px | 700 | 1.2 | Page hero titles |
| `display-lg` | 1.875rem / 30px | 700 | 1.25 | Section headers |
| `display-md` | 1.5rem / 24px | 600 | 1.3 | Card titles, h2 |
| `body-lg` | 1.125rem / 18px | 400 | 1.6 | Lead paragraphs |
| `body-md` | 1rem / 16px | 400 | 1.6 | Default body |
| `body-sm` | 0.875rem / 14px | 400 | 1.5 | Secondary info |
| `caption` | 0.75rem / 12px | 500 | 1.4 | Labels, badges |
| `mono` | 0.8125rem / 13px | 400 | 1.5 | IDs, codes |

---

## 3. Spacing & Layout

### Grid System
- **Sidebar width**: 256px (16rem) expanded, 0 collapsed on mobile
- **Topbar height**: 56px (3.5rem)
- **Page padding**: 24px (1.5rem) desktop → 16px mobile
- **Card gap**: 16px (1rem) → 24px on lg screens
- **Content max-width**: 1280px (7xl)

### Border Radius
| Name | Value | Usage |
|------|-------|-------|
| `sm` | 4px | Badges, small tags |
| `DEFAULT` | 8px | Buttons, inputs |
| `lg` | 12px | Cards |
| `xl` | 16px | Modals, panels |
| `2xl` | 20px | Large cards, hero sections |
| `full` | 9999px | Pill badges, avatars |

### Shadows
```css
--shadow-sm:  0 1px 2px rgba(15,23,42,0.06);
--shadow-md:  0 4px 12px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.05);
--shadow-lg:  0 12px 32px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06);
--shadow-card-hover: 0 16px 40px rgba(79,70,229,0.12), 0 4px 12px rgba(15,23,42,0.08);
```

---

## 4. Components

### Buttons
```
Primary:   bg-indigo-600  hover:bg-indigo-700  text-white
Secondary: bg-white       hover:bg-slate-50   border border-slate-200
Ghost:     transparent    hover:bg-slate-100
Danger:    bg-red-600     hover:bg-red-700    text-white
```

Sizing:
- `sm`: h-8, px-3, text-sm
- `DEFAULT`: h-10, px-4, text-sm
- `lg`: h-11, px-6, text-base
- `icon`: h-9, w-9

### Cards
- Background: white
- Border: `border border-slate-100`
- Radius: `rounded-xl`
- Shadow: `shadow-sm`
- Hover: `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`

### Stat Cards (Dashboard)
- Icon container: 40×40 rounded-lg with role-specific gradient
- Value: `text-2xl font-bold`
- Label: `text-sm text-slate-500`
- Left accent border: 3px role color

### Inputs
- Height: 40px
- Border: `border-slate-200`
- Focus: `ring-2 ring-indigo-500/20 border-indigo-400`
- Radius: `rounded-lg`

---

## 5. Loading States

### Skeleton
- Background: `bg-slate-200/80`
- Shimmer animation: linear gradient sweep left-to-right, 2s duration
- Border radius matches the element it replaces

### Spinner Variants
| Variant | Usage |
|---------|-------|
| `spin` | Inline button loaders, form submit |
| `dots` | Section content loading |
| `bars` | Data table loading |
| `page` | Full-page route transitions |
| `pulse` | Avatar, small inline indicators |

### Loading Principles
- Never block more than the relevant section
- Skeletons must match the exact layout they replace
- Minimum 200ms display to prevent flash
- Always pair with `aria-busy` for accessibility

---

## 6. Navigation

### Sidebar
- **Background**: `slate-900` (`#0F172A`)
- **Brand header**: Square teal icon container + college name (bold, uppercase) + "Institutional Intelligence" subtitle
- **Nav items**: ~40px height, 8px vertical padding
  - Default: `text-slate-400` icon + `text-slate-300` label
  - Hover: `bg-slate-700 text-white` — clearly visible on dark bg
  - Active: `bg-slate-800 text-white` + left-border `w-0.5 bg-teal-400` + `text-teal-400` icon
- **Nested items**: Increasing `pl-*` per depth level
- **CTA button**: Full-width `bg-teal-500 hover:bg-teal-400` pill button above footer
- **Footer**: Help Center + Logout text links with icons, `hover:bg-slate-800`

### Topbar
- **Background**: Solid white `bg-white`
- **Border**: `border-b border-slate-200`
- **Height**: 56px
- **Layout**: hamburger (mobile) → search bar (flex-1, max-w-sm) → bell + grid + help icons → divider → user name/role/avatar dropdown
- **Search**: `bg-slate-50 border-slate-200`, focus ring `teal-400`
- **User section**: Name + role stacked (right-aligned), avatar with role-color initials

---

## 7. Motion & Animation

### Principles
1. **Purposeful** — Every animation communicates something (loading, navigation, state change)
2. **Fast** — UI transitions ≤ 200ms, entrance animations ≤ 400ms
3. **Consistent** — Same easing curve throughout: `cubic-bezier(0.4, 0, 0.2, 1)`
4. **Subtle** — No bounces or spring on professional data UI

### Animation Catalog
| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `fade-up` | 400ms | ease-out | Page sections entrance |
| `fade-in` | 200ms | ease-out | Tooltips, dropdowns |
| `slide-in-left` | 300ms | ease-out | Sidebar entrance |
| `scale-in` | 200ms | ease-out | Modal open, card expand |
| `shimmer` | 2000ms | linear | Skeleton loading |
| `spin` | 800ms | linear | Spinner |
| `bounce-dots` | 1400ms | ease-in-out | Dots loader |
| `pulse-ring` | 1500ms | ease-out | Notification pulse |

### Stagger Pattern (Dashboard Cards)
```css
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 60ms; }
.card:nth-child(3) { animation-delay: 120ms; }
.card:nth-child(4) { animation-delay: 180ms; }
```

---

## 8. Iconography

**Library**: `lucide-react` v1.7
**Default size**: 16×16 (nav), 20×20 (actions), 24×24 (page headers)
**Stroke width**: 1.75 (default)

### Icon Categories (mapped to nav items)
```
dashboard, home          → LayoutDashboard, Home
students                 → GraduationCap, UserCheck
staff, people            → Users, UserCog
academics, books         → BookOpen, LibraryBig
exams, assessment        → FileCheck2, ClipboardCheck
fees, payments           → Receipt, CreditCard
attendance               → CalendarCheck, ScanFace
timetable, schedule      → CalendarClock, Clock
reports, analytics       → BarChart3, TrendingUp
settings, config         → Settings2, SlidersHorizontal
announcements            → Megaphone, Bell
library                  → Library, BookMarked
transport                → Bus, MapPin
hostel                   → Building2, BedDouble
```

---

## 9. Accessibility

- **Focus rings**: `ring-2 ring-indigo-500 ring-offset-2` on all interactive elements
- **Color contrast**: All text meets WCAG AA (4.5:1 minimum)
- **Motion**: Respect `prefers-reduced-motion` — disable entrance animations
- **Keyboard**: All interactive components keyboard navigable
- **ARIA**:
  - Sidebar: `role="navigation"`, `aria-label="Main navigation"`
  - Loading: `aria-busy="true"`, `aria-live="polite"`
  - Icons (decorative): `aria-hidden="true"`

---

## 10. File Structure

```
src/
  app/
    globals.css          ← Design tokens, keyframes, base styles
  components/
    layout/
      AppShell.tsx       ← Root layout wrapper
      Sidebar.tsx        ← Navigation sidebar
      Topbar.tsx         ← Header bar
      NavItem.tsx        ← Recursive nav item
    ui/
      loader.tsx         ← Loading animation variants
      skeleton.tsx       ← Shimmer skeleton
      button.tsx         ← CVA button variants
      card.tsx           ← Card component
      badge.tsx          ← Status/role badges
      [rest of shadcn]
```
