'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings2,
  BarChart3,
  CalendarClock,
  Receipt,
  ClipboardCheck,
  Home,
  ChevronRight,
  UserCog,
  FileCheck2,
  TrendingUp,
  Megaphone,
  Library,
  Bus,
  Building2,
  SlidersHorizontal,
  Bell,
  BookMarked,
  CalendarCheck,
  CreditCard,
  ScanFace,
  MapPin,
  BedDouble,
  LibraryBig,
} from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import type { NavItem as NavItemType } from '@/types/navigation'

const ICON_MAP: Record<string, React.ElementType> = {
  /* Core pages */
  dashboard:       LayoutDashboard,
  home:            Home,

  /* People */
  people:          Users,
  person:          Users,
  group:           Users,
  staff:           UserCog,
  students:        GraduationCap,

  /* Academics */
  school:          GraduationCap,
  book:            BookOpen,
  library_books:   LibraryBig,
  library:         Library,
  book_marked:     BookMarked,
  academics:       BookOpen,

  /* Exams & Assessments */
  assignment:      ClipboardCheck,
  assessment:      FileCheck2,
  exam:            FileCheck2,

  /* Finance */
  attach_money:    CreditCard,
  payment:         Receipt,
  fee:             Receipt,

  /* Attendance */
  attendance:      ScanFace,
  calendar_today:  CalendarCheck,

  /* Timetable / Schedule */
  event:           CalendarClock,
  timetable:       CalendarClock,
  schedule:        CalendarClock,

  /* Reports */
  bar_chart:       BarChart3,
  trending_up:     TrendingUp,
  reports:         BarChart3,

  /* Settings */
  settings:        Settings2,
  config:          SlidersHorizontal,

  /* Communication */
  announcement:    Megaphone,
  bell:            Bell,

  /* Transport / Hostel */
  transport:       Bus,
  location:        MapPin,
  hostel:          Building2,
  bed:             BedDouble,
}

function NavIcon({ name, active }: { name?: string; active?: boolean }) {
  const Icon = (name && ICON_MAP[name]) || ChevronRight
  return (
    <span
      className={cn(
        'flex items-center justify-center h-[18px] w-[18px] shrink-0 transition-colors duration-150',
        active ? 'text-indigo-400' : 'text-slate-400',
      )}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} aria-hidden="true" />
    </span>
  )
}

interface NavItemProps {
  item: NavItemType
  depth?: number
}

/** Recursively checks if any descendant has an href matching the current pathname. */
function hasActiveDescendant(item: NavItemType, pathname: string): boolean {
  if (!item.children) return false
  return item.children.some(
    (child) =>
      child.href === pathname ||
      (child.href ? pathname.startsWith(child.href + '/') : false) ||
      hasActiveDescendant(child, pathname),
  )
}

export function NavItem({ item, depth = 0 }: NavItemProps) {
  const pathname = usePathname()
  const { collapsedItems, toggleCollapsed, isSidebarCollapsed, isSidebarHovered, setSidebarCollapsed } =
    useNavigationStore()

  const hasChildren = item.children && item.children.length > 0

  const isSelfActive =
    item.href === pathname || (item.href ? pathname.startsWith(item.href + '/') : false)
  const isChildActive = hasChildren ? hasActiveDescendant(item, pathname) : false
  const isActive = isSelfActive || isChildActive

  const isOpen = isActive ? true : !collapsedItems.has(item.id)

  // True only when sidebar is collapsed AND the mouse is not hovering over it
  const isEffectivelyCollapsed = isSidebarCollapsed && !isSidebarHovered

  /* ── Icon-only mode: only top-level module icons shown ──────────── */
  if (isEffectivelyCollapsed) {
    // Sub-items are hidden — only depth-0 module icons render
    if (depth > 0) return null

    function handleCollapsedClick() {
      // Re-open submenu if user had manually closed it
      if (hasChildren && collapsedItems.has(item.id)) {
        toggleCollapsed(item.id)
      }
      // Permanently expand the sidebar
      setSidebarCollapsed(false)
    }

    return (
      <button
        type="button"
        title={item.label}
        onClick={handleCollapsedClick}
        className={cn(
          'group relative flex w-full items-center justify-center rounded-md py-2 px-1',
          'transition-all duration-150 ease-out',
          isActive
            ? 'text-white bg-slate-800'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white',
        )}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-indigo-400"
            aria-hidden="true"
          />
        )}
        <NavIcon name={item.icon} active={isActive} />
      </button>
    )
  }

  /* Indent depth (used in expanded view) */
  const paddingLeft =
    depth === 0 ? 'pl-3' : depth === 1 ? 'pl-7' : depth === 2 ? 'pl-11' : 'pl-14'

  const baseLinkClasses = cn(
    'group relative flex items-center gap-2.5 rounded-md py-2 text-[13px] font-medium',
    'transition-all duration-150 ease-out',
    `pr-3 ${paddingLeft}`,
  )

  /* ── Expanded: parent items (collapsible groups) ─────────────────── */
  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleCollapsed(item.id)}>
        <CollapsibleTrigger
          // data attributes let Sidebar's scroll effect target the active parent module
          {...(depth === 0 ? { 'data-nav-module': '', 'data-active': isActive ? 'true' : undefined } : {})}
          className={cn(
            baseLinkClasses,
            'w-full',
            isChildActive && !isSelfActive
              ? 'text-white'
              : isActive
              ? 'text-white bg-slate-700'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white',
          )}
        >
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-indigo-400"
              aria-hidden="true"
            />
          )}
          <NavIcon name={item.icon} active={isActive} />
          <span className="flex-1 text-left leading-none">{item.label}</span>
          <span
            className={cn(
              'ml-auto shrink-0 text-slate-500 transition-transform duration-200',
              isOpen && 'rotate-90',
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="mt-0.5 space-y-0.5">
            {item.children!
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((child) => (
                <li key={child.id}>
                  <NavItem item={child} depth={depth + 1} />
                </li>
              ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  /* ── Expanded: leaf items ────────────────────────────────────────── */
  return (
    <Link
      href={item.href ?? '#'}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        baseLinkClasses,
        isActive
          ? ['text-white bg-slate-800', 'hover:bg-slate-700']
          : ['text-slate-300', 'hover:bg-slate-700 hover:text-white', 'hover:translate-x-0.5'],
      )}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-indigo-400"
          aria-hidden="true"
        />
      )}
      <NavIcon name={item.icon} active={isActive} />
      <span className="flex-1 leading-none">{item.label}</span>
    </Link>
  )
}
