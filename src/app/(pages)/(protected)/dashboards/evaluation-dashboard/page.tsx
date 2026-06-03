'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { getEvaluatorDashboard, type EvaluatorDetail } from '@/services/evaluation'
import { formatDate } from '@/common/generic-functions'

function pendingCount(detail: EvaluatorDetail): number {
  const assigned = detail.noOfStudentsAssigned ?? 0
  const completed = detail.noOfEvaluationsCompleted ?? 0
  return Math.max(0, assigned - completed)
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
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
            <div className="h-9 bg-slate-100 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Subject Card ─────────────────────────────────────────────────────────────

function SubjectCard({ detail, onCheckPaper }: { detail: EvaluatorDetail; onCheckPaper: (d: EvaluatorDetail) => void }) {
  const assigned = detail.noOfStudentsAssigned ?? 0
  const completed = detail.noOfEvaluationsCompleted ?? 0
  const pending = pendingCount(detail)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="bg-muted/40 border-b border-border px-5 py-4 text-center">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{detail.subjectName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail.subjectCode}</p>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[110px]">Course</span>
            <span className="text-slate-800 font-medium">{detail.courseName || '—'}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[110px]">Evaluation Last Date</span>
            <span className="text-slate-800 font-medium">{formatDate(detail.validityEndDate)}</span>
          </div>
        </div>

        {/* Stats mini-table */}
        <div className="rounded-lg border border-slate-100 divide-x divide-slate-100 flex text-center overflow-hidden">
          <div className="flex-1 py-2.5 px-2">
            <p className="text-lg font-bold text-slate-800">{assigned}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Assigned</p>
          </div>
          <div className="flex-1 py-2.5 px-2">
            <p className="text-lg font-bold text-emerald-600">{completed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Evaluated</p>
          </div>
          <div className="flex-1 py-2.5 px-2">
            <p className="text-lg font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Due</p>
          </div>
        </div>

        {/* Action */}
        <Button
          size="sm"
          className="w-full mt-auto"
          onClick={() => onCheckPaper(detail)}
        >
          Check Paper
        </Button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EvaluationDashboardPage() {
  const router = useRouter()
  const { user } = useSessionContext()

  const [details, setDetails] = useState<EvaluatorDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.userId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    getEvaluatorDashboard(user.userId)
      .then((result) => {
        if (!cancelled) {
          setDetails(result)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load evaluation dashboard.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.userId])

  function handleCheckPaper(detail: EvaluatorDetail) {
    const params = new URLSearchParams({
      examEvaluatorProfileId: String(detail.examEvaluatorProfileId),
      examEvaluatorProfileDetId: String(detail.examEvaluatorProfileDetId),
      subjectName: detail.subjectName,
      subjectCode: detail.subjectCode,
    })
    router.push(`/evaluation/evaluator-assigned-answer-sheet?${params.toString()}`)
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Evaluation Dashboard"
        subtitle="Your subject assignments and evaluation progress"
      />

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && details.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <ClipboardList className="h-12 w-12" />
          <p className="text-base font-medium">No subjects assigned for evaluation</p>
        </div>
      )}

      {!loading && !error && details.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {details.map((detail) => (
            <SubjectCard
              key={`${detail.examEvaluatorProfileId}-${detail.examEvaluatorProfileDetId}`}
              detail={detail}
              onCheckPaper={handleCheckPaper}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
