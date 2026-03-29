'use client'

import { useState } from 'react'
import { useSessionContext } from '@/context/SessionContext'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users, BookOpen, DollarSign, BarChart3,
  CalendarClock, ClipboardCheck, GraduationCap, TrendingUp,
  Receipt, CalendarCheck, ScanFace, FileCheck2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCard {
  label: string
  value: string | number
  icon: React.ElementType
  gradient: string
  badge?: string
}

// ─── Role-based stat cards ────────────────────────────────────────────────────

function getStatCards(userRole: string): StatCard[] {
  switch (userRole) {
    case 'ADMIN':
    case 'PRINCIPAL':
      return [
        { label: 'Total Students',     value: 0,    icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600' },
        { label: 'Active Staff',        value: 0,    icon: Users,         gradient: 'from-emerald-500 to-teal-600' },
        { label: 'Pending Fees',        value: '₹0', icon: Receipt,       gradient: 'from-amber-500 to-orange-600' },
        { label: "Today's Attendance",  value: '0%', icon: ScanFace,      gradient: 'from-purple-500 to-violet-600' },
      ]
    case 'STAFF':
      return [
        { label: 'My Classes Today',     value: 0, icon: CalendarClock,  gradient: 'from-blue-500 to-indigo-600' },
        { label: 'Pending Assignments',  value: 0, icon: ClipboardCheck, gradient: 'from-amber-500 to-orange-600' },
        { label: 'Upcoming Exams',       value: 0, icon: FileCheck2,     gradient: 'from-red-500 to-rose-600' },
        { label: 'Student Count',        value: 0, icon: Users,          gradient: 'from-emerald-500 to-teal-600' },
      ]
    case 'STUDENT':
      return [
        { label: 'Attendance %',    value: '0%', icon: BarChart3,     gradient: 'from-emerald-500 to-teal-600' },
        { label: 'Upcoming Exams', value: 0,    icon: BookOpen,      gradient: 'from-red-500 to-rose-600' },
        { label: 'Fee Due',         value: '₹0', icon: DollarSign,    gradient: 'from-amber-500 to-orange-600' },
        { label: 'Course Progress', value: '0%', icon: TrendingUp,    gradient: 'from-blue-500 to-indigo-600' },
      ]
    case 'PARENT':
      return [
        { label: 'Child Attendance', value: '0%', icon: CalendarCheck,  gradient: 'from-emerald-500 to-teal-600' },
        { label: 'Fee Due',           value: '₹0', icon: Receipt,        gradient: 'from-amber-500 to-orange-600' },
        { label: 'Upcoming Exams',    value: 0,    icon: FileCheck2,     gradient: 'from-red-500 to-rose-600' },
        { label: 'Recent Grades',     value: 0,    icon: ClipboardCheck, gradient: 'from-blue-500 to-indigo-600' },
      ]
    default:
      return [
        { label: 'Total Students',    value: 0,    icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600' },
        { label: 'Active Staff',       value: 0,    icon: Users,         gradient: 'from-emerald-500 to-teal-600' },
        { label: 'Pending Fees',       value: '₹0', icon: Receipt,       gradient: 'from-amber-500 to-orange-600' },
        { label: "Today's Attendance", value: '0%', icon: ScanFace,      gradient: 'from-purple-500 to-violet-600' },
      ]
  }
}

// ─── Role badge styles ─────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
  ADMIN:     'bg-red-50    text-red-700    ring-1 ring-red-200',
  PRINCIPAL: 'bg-red-50    text-red-700    ring-1 ring-red-200',
  STAFF:     'bg-blue-50   text-blue-700   ring-1 ring-blue-200',
  STUDENT:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  PARENT:    'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
}

// ─── Skeleton loading state ────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useSessionContext()

  if (isLoading) return <DashboardSkeleton />
  if (!user) return null

  const statCards = getStatCards(user.userRole)
  const badgeClass = roleBadge[user.userRole] ?? 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'

  return (
    <div className="p-6 space-y-6">
      {/* ── Welcome header ─────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back, {user.firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
              badgeClass
            )}
          >
            {user.roleName}
          </span>
          <span className="text-slate-300 select-none">·</span>
          <span className="text-sm text-slate-500">{user.collegeName}</span>
          <span className="text-slate-300 select-none">·</span>
          <span className="text-sm text-slate-500">{user.academicYear}</span>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {statCards.map((card) => (
          <StatCard key={card.label} card={card} />
        ))}
      </div>

      {/* ── DEBUG: Session user dump ────────────────────────────────────── */}
      <SessionDebugPanel user={user} />
    </div>
  )
}

// ─── DEBUG: Session user panel ────────────────────────────────────────────

import type { SessionUser } from '@/types/user'

function SessionDebugPanel({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false)

  const rows: [string, unknown][] = [
    ['userId',               user.userId],
    ['userName',             user.userName],
    ['firstName',            user.firstName],
    ['lastName',             user.lastName ?? '—'],
    ['userRole',             user.userRole],
    ['userTypeCode',         user.userTypeCode],
    ['roleName',             user.roleName],
    ['collegeId',            user.collegeId],
    ['collegeCode',          user.collegeCode],
    ['collegeName',          user.collegeName],
    ['academicYearId',       user.academicYearId],
    ['academicYear',         user.academicYear],
    ['employeeId',           user.employeeId ?? '—'],
    ['studentId',            user.studentId ?? '—'],
    ['isAdmin',              String(user.isAdmin)],
    ['isPrincipal',          String(user.isPrincipal)],
    ['isManagement',         String(user.isManagement)],
    ['defaultDashboardPath', user.defaultDashboardPath],
  ]

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 text-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 font-mono font-semibold text-amber-800 hover:bg-amber-100 rounded-xl transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        [DEBUG] SessionUser
      </button>

      {open && (
        <div className="px-4 pb-4">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {rows.map(([key, val]) => (
                <tr key={key} className="border-t border-amber-200">
                  <td className="py-1 pr-4 text-amber-700 whitespace-nowrap w-48">{key}</td>
                  <td className="py-1 text-slate-800 break-all">{String(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>


        </div>
      )}
    </div>
  )
}

// ─── Stat card sub-component ───────────────────────────────────────────────

function StatCard({ card }: { card: StatCard }) {
  const Icon = card.icon

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5',
        'shadow-sm hover:shadow-md hover:-translate-y-0.5',
        'transition-all duration-200 ease-out',
        'animate-fade-up'
      )}
    >
      {/* Subtle gradient tint in top-right corner */}
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-8',
          'bg-gradient-to-br',
          card.gradient
        )}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-slate-500 leading-none">
          {card.label}
        </p>
        {/* Icon container with gradient */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'bg-gradient-to-br shadow-sm',
            card.gradient
          )}
        >
          <Icon className="h-4.5 w-4.5 text-white" strokeWidth={1.75} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {card.value}
        </p>
      </div>
    </div>
  )
}
