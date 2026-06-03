'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, BookOpen, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { StatCard } from '@/common/components/data-display'
import { useSessionContext } from '@/context/SessionContext'
import { getEvaluatorDashboard, type EvaluatorDetail } from '@/services/evaluation'
import { formatDate } from '@/common/generic-functions'

function pendingCount(detail: EvaluatorDetail): number {
  return Math.max(0, (detail.noOfStudentsAssigned ?? 0) - (detail.noOfEvaluationsCompleted ?? 0))
}

type CardStatus = 'in-progress' | 'completed' | 'pending'

function getCardStatus(detail: EvaluatorDetail): CardStatus {
  const completed = detail.noOfEvaluationsCompleted ?? 0
  const pending   = pendingCount(detail)
  if (pending === 0) return 'completed'
  if (completed > 0) return 'in-progress'
  return 'pending'
}

// Returns how urgent the deadline is
type DeadlineUrgency = 'overdue' | 'soon' | 'normal' | 'none'

function deadlineUrgency(dateStr: string | null | undefined): DeadlineUrgency {
  if (!dateStr) return 'none'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'none'
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (diffDays < 0)  return 'overdue'
  if (diffDays <= 3) return 'soon'
  return 'normal'
}

// Sort order: pending → in-progress → completed
const STATUS_ORDER: Record<CardStatus, number> = { pending: 0, 'in-progress': 1, completed: 2 }

// ─── Status Pill ──────────────────────────────────────────────────────────────

const STATUS_PILL: Record<CardStatus, { label: string; className: string }> = {
  'in-progress': { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  completed:     { label: 'Completed',   className: 'bg-emerald-100 text-emerald-700' },
  pending:       { label: 'Pending',     className: 'bg-amber-100 text-amber-700' },
}

function StatusPill({ status }: { status: CardStatus }) {
  const { label, className } = STATUS_PILL[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

// ─── Status accent — left border color per card ───────────────────────────────

const STATUS_ACCENT: Record<CardStatus, string> = {
  pending:       'border-l-amber-400',
  'in-progress': 'border-l-blue-400',
  completed:     'border-l-emerald-400',
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
            <div className="h-4 w-20 bg-slate-100 rounded mb-2" />
            <div className="h-7 w-12 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden border-l-4 border-l-slate-200 animate-pulse">
            <div className="bg-slate-100 h-16" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-px bg-slate-100 my-3" />
              <div className="flex gap-4">
                <div className="h-10 bg-slate-100 rounded flex-1" />
                <div className="h-10 bg-slate-100 rounded flex-1" />
                <div className="h-10 bg-slate-100 rounded flex-1" />
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-2" />
              <div className="h-9 bg-slate-100 rounded mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Process Card ─────────────────────────────────────────────────────────────

function ProcessCard({
  detail,
  onNavigate,
}: {
  detail: EvaluatorDetail
  onNavigate: (d: EvaluatorDetail) => void
}) {
  const assigned  = detail.noOfStudentsAssigned ?? 0
  const completed = detail.noOfEvaluationsCompleted ?? 0
  const pending   = pendingCount(detail)
  const status    = getCardStatus(detail)
  const urgency   = deadlineUrgency(detail.validityEndDate)
  const pct       = assigned > 0 ? Math.round((completed / assigned) * 100) : 0

  const deadlineClasses: Record<DeadlineUrgency, string> = {
    overdue: 'text-red-600 font-semibold',
    soon:    'text-amber-600 font-semibold',
    normal:  'text-slate-800 font-medium',
    none:    'text-slate-800 font-medium',
  }

  const buttonLabel =
    status === 'completed'   ? 'View' :
    status === 'in-progress' ? 'Continue' :
    'Start Evaluation'

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden flex flex-col border-l-4 ${STATUS_ACCENT[status]}`}>

      {/* Card header */}
      <div className="bg-muted/40 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{detail.subjectName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{detail.subjectCode}</p>
          </div>
          <StatusPill status={status} />
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col gap-4">

        {/* Meta info */}
        <div className="space-y-1.5 text-sm">
          {detail.courseName && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs w-16 shrink-0">Course</span>
              <span className="text-slate-700 font-medium text-xs truncate" title={detail.courseName}>
                {detail.courseName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs w-16 shrink-0">Deadline</span>
            <span className={`text-xs flex items-center gap-1 ${deadlineClasses[urgency]}`}>
              {urgency === 'overdue' && <AlertTriangle className="h-3 w-3 shrink-0" />}
              {urgency === 'soon'    && <AlertTriangle className="h-3 w-3 shrink-0" />}
              {formatDate(detail.validityEndDate)}
              {urgency === 'overdue' && <span className="text-[10px] font-bold ml-0.5">(Overdue)</span>}
              {urgency === 'soon'    && <span className="text-[10px] font-bold ml-0.5">(Due soon)</span>}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="rounded-lg border border-slate-100 divide-x divide-slate-100 flex text-center overflow-hidden">
          <div className="flex-1 py-2.5 px-2">
            <p className="text-lg font-bold text-slate-800">{assigned}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Assigned</p>
          </div>
          <div className="flex-1 py-2.5 px-2">
            <p className="text-lg font-bold text-emerald-600">{completed}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Done</p>
          </div>
          <div className="flex-1 py-2.5 px-2">
            <p className="text-lg font-bold text-amber-600">{pending}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pending</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground">Progress</span>
            <span className="text-[11px] font-bold text-slate-600">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-200'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate(detail)}
          className={`mt-auto w-full h-9 rounded-lg text-sm font-semibold transition-colors ${
            status === 'completed'
              ? 'border border-border text-slate-600 hover:bg-muted/40'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ANSWER_SHEETS_PATH = '/admin-examination-management/evaluation-process/evaluator-subjects/answer-sheets'

export default function EvaluatorSubjectsPage() {
  const router      = useRouter()
  const { user }    = useSessionContext()

  const [details, setDetails] = useState<EvaluatorDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    getEvaluatorDashboard(user.userId)
      .then((result) => { if (!cancelled) setDetails(result) })
      .catch((err)   => { if (!cancelled) setError(err?.message ?? 'Failed to load evaluation processes.') })
      .finally(()    => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user?.userId])

  // Sort: pending → in-progress → completed
  const sorted = useMemo(
    () => [...details].sort((a, b) => STATUS_ORDER[getCardStatus(a)] - STATUS_ORDER[getCardStatus(b)]),
    [details],
  )

  // Aggregate stats across all subjects
  const totals = useMemo(() => ({
    subjects:  details.length,
    assigned:  details.reduce((s, d) => s + (d.noOfStudentsAssigned ?? 0), 0),
    completed: details.reduce((s, d) => s + (d.noOfEvaluationsCompleted ?? 0), 0),
    pending:   details.reduce((s, d) => s + pendingCount(d), 0),
  }), [details])

  function handleNavigate(detail: EvaluatorDetail) {
    const params = new URLSearchParams({
      examEvaluatorProfileId:    String(detail.examEvaluatorProfileId),
      examEvaluatorProfileDetId: String(detail.examEvaluatorProfileDetId),
      subjectName: detail.subjectName,
      subjectCode: detail.subjectCode,
    })
    router.push(`${ANSWER_SHEETS_PATH}?${params.toString()}`)
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Evaluator Subjects"
        subtitle="Manage your subject evaluations"
      />

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && details.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 opacity-40" />
          <p className="text-base font-medium">No evaluation processes assigned</p>
        </div>
      )}

      {!loading && !error && details.length > 0 && (
        <>
          {/* Overall summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              title="Total Subjects"
              value={totals.subjects}
              icon={BookOpen}
              colorVariant="default"
            />
            <StatCard
              title="Papers Evaluated"
              value={`${totals.completed} / ${totals.assigned}`}
              icon={CheckCircle2}
              colorVariant="success"
            />
            <StatCard
              title="Pending Papers"
              value={totals.pending}
              icon={Clock3}
              colorVariant="warning"
            />
          </div>

          {/* Subject cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sorted.map((detail) => (
              <ProcessCard
                key={`${detail.examEvaluatorProfileId}-${detail.examEvaluatorProfileDetId}`}
                detail={detail}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  )
}
