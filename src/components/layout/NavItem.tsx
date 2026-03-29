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
  ChevronDown,
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

function NavIcon({
  name,
  active,
}: {
  name?: string
  active?: boolean
}) {
  const Icon = (name && ICON_MAP[name]) || ChevronRight
  return (
    <span
      className={cn(
        'flex items-center justify-center h-[18px] w-[18px] shrink-0 transition-colors duration-150',
        active ? 'text-teal-400' : 'text-slate-400'
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

export function NavItem({ item, depth = 0 }: NavItemProps) {
  const pathname = usePathname()
  const { collapsedItems, toggleCollapsed } = useNavigationStore()

  const isOpen = !collapsedItems.has(item.id)
  const hasChildren = item.children && item.children.length > 0
  const isActive =
    item.href === pathname || (item.href ? pathname.startsWith(item.href + '/') : false)

  /* Indent per depth level */
  const paddingLeft =
    depth === 0 ? 'pl-3' : depth === 1 ? 'pl-7' : depth === 2 ? 'pl-11' : 'pl-14'

  const baseLinkClasses = cn(
    'group relative flex items-center gap-2.5 rounded-md py-2 pr-3 text-[13px] font-medium',
    'transition-all duration-150 ease-out',
    paddingLeft
  )

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleCollapsed(item.id)}>
        <CollapsibleTrigger
          className={cn(
            baseLinkClasses,
            'w-full',
            isActive
              ? 'text-white bg-slate-700'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          )}
        >
          {/* Active left-border indicator */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-teal-400"
              aria-hidden="true"
            />
          )}

          <NavIcon name={item.icon} active={isActive} />
          <span className="flex-1 text-left leading-none">{item.label}</span>
          <span
            className={cn(
              'ml-auto shrink-0 text-slate-500 transition-transform duration-200',
              isOpen && 'rotate-90'
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

  return (
    <Link
      href={item.href ?? '#'}
      className={cn(
        baseLinkClasses,
        isActive
          ? [
              'text-white bg-slate-800',
              'hover:bg-slate-700',
            ]
          : [
              'text-slate-300',
              'hover:bg-slate-700 hover:text-white',
              'hover:translate-x-0.5',
            ]
      )}
    >
      {/* Active left-border indicator */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-teal-400"
          aria-hidden="true"
        />
      )}

      <NavIcon name={item.icon} active={isActive} />
      <span className="flex-1 leading-none">{item.label}</span>
    </Link>
  )
}
