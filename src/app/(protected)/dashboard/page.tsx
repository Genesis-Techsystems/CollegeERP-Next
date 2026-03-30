'use client'

import { useSessionContext } from '@/context/SessionContext'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/data-display/StatCard'
import { PageContainer } from '@/components/shared/PageContainer'
import {
  Users, BookOpen, DollarSign, BarChart3,
  CalendarClock, ClipboardCheck, GraduationCap, TrendingUp,
  Receipt, CalendarCheck, ScanFace, FileCheck2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardData {
  label: string
  value: string | number
  icon: LucideIcon
  colorVariant: 'default' | 'success' | 'warning' | 'error'
  /** Tailwind left-border accent class, e.g. "border-l-4 border-l-indigo-500" */
  borderAccent: string
}

// ─── Role-based stat cards ────────────────────────────────────────────────────

function getStatCards(userRole: string): StatCardData[] {
  switch (userRole) {
    case 'ADMIN':
    case 'PRINCIPAL':
      return [
        { label: 'Total Students',    value: 0,    icon: GraduationCap, colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-500' },
        { label: 'Active Staff',       value: 0,    icon: Users,         colorVariant: 'success', borderAccent: 'border-l-4 border-l-emerald-500' },
        { label: 'Pending Fees',       value: '₹0', icon: Receipt,       colorVariant: 'warning', borderAccent: 'border-l-4 border-l-amber-500' },
        { label: "Today's Attendance", value: '0%', icon: ScanFace,      colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-400' },
      ]
    case 'STAFF':
      return [
        { label: 'My Classes Today',    value: 0, icon: CalendarClock,  colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-500' },
        { label: 'Pending Assignments', value: 0, icon: ClipboardCheck, colorVariant: 'warning', borderAccent: 'border-l-4 border-l-amber-500' },
        { label: 'Upcoming Exams',      value: 0, icon: FileCheck2,     colorVariant: 'error',   borderAccent: 'border-l-4 border-l-rose-500' },
        { label: 'Student Count',       value: 0, icon: Users,          colorVariant: 'success', borderAccent: 'border-l-4 border-l-emerald-500' },
      ]
    case 'STUDENT':
      return [
        { label: 'Attendance %',    value: '0%', icon: BarChart3,  colorVariant: 'success', borderAccent: 'border-l-4 border-l-emerald-500' },
        { label: 'Upcoming Exams', value: 0,    icon: BookOpen,   colorVariant: 'error',   borderAccent: 'border-l-4 border-l-rose-500' },
        { label: 'Fee Due',         value: '₹0', icon: DollarSign, colorVariant: 'warning', borderAccent: 'border-l-4 border-l-amber-500' },
        { label: 'Course Progress', value: '0%', icon: TrendingUp, colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-500' },
      ]
    case 'PARENT':
      return [
        { label: 'Child Attendance', value: '0%', icon: CalendarCheck, colorVariant: 'success', borderAccent: 'border-l-4 border-l-emerald-500' },
        { label: 'Fee Due',           value: '₹0', icon: Receipt,       colorVariant: 'warning', borderAccent: 'border-l-4 border-l-amber-500' },
        { label: 'Upcoming Exams',    value: 0,    icon: FileCheck2,    colorVariant: 'error',   borderAccent: 'border-l-4 border-l-rose-500' },
        { label: 'Recent Grades',     value: 0,    icon: ClipboardCheck, colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-500' },
      ]
    default:
      return [
        { label: 'Total Students',    value: 0,    icon: GraduationCap, colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-500' },
        { label: 'Active Staff',       value: 0,    icon: Users,         colorVariant: 'success', borderAccent: 'border-l-4 border-l-emerald-500' },
        { label: 'Pending Fees',       value: '₹0', icon: Receipt,       colorVariant: 'warning', borderAccent: 'border-l-4 border-l-amber-500' },
        { label: "Today's Attendance", value: '0%', icon: ScanFace,      colorVariant: 'default', borderAccent: 'border-l-4 border-l-indigo-400' },
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
    <PageContainer className="space-y-6">
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
    </PageContainer>
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
    <PageContainer className="space-y-6">
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
          <StatCard
            key={card.label}
            title={card.label}
            value={card.value}
            icon={card.icon}
            colorVariant={card.colorVariant}
            className={cn('animate-fade-up rounded-l-none', card.borderAccent)}
          />
        ))}
      </div>

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 tracking-tight">Recent Activity</h2>
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
          <BarChart3 className="h-8 w-8 opacity-40" />
          <p className="text-sm">Activity feed coming soon</p>
        </div>
      </div>

    </PageContainer>
  )
}

