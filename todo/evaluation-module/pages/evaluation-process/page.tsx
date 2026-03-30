'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvaluationProcess {
  processId: number
  subjectName: string
  subjectCode: string
  examName: string
  courseName: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EvaluationProcessPage() {
  const router = useRouter()
  const [processes, setProcesses] = useState<EvaluationProcess[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProcesses = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: replace with real service call
      // const result = await getEvaluationProcesses()
      // setProcesses(result)
      setProcesses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProcesses()
  }, [fetchProcesses])

  function getStatusBadge(status: EvaluationProcess['status']) {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700">
            Completed
          </span>
        )
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700">
            In Progress
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700">
            Pending
          </span>
        )
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Evaluation Process"
        subtitle="Start or continue evaluation for assigned subjects"
      />

      {/* Instructions panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Instructions
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Please follow the steps below to start the evaluation:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
          <li>Ensure that all necessary materials are available.</li>
          <li>Review the instructions carefully before starting.</li>
          <li>Click the &quot;Start Evaluation&quot; button on a subject card when you are ready to begin.</li>
        </ol>
      </div>

      {/* Process cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 animate-pulse"
            >
              <div className="h-5 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="h-8 w-1/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ClipboardCheck className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No evaluation processes available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {processes.map((process) => (
            <div
              key={process.processId}
              className="rounded-lg border border-slate-200 bg-white overflow-hidden"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {process.subjectName}{' '}
                  <span className="text-slate-400 font-normal">({process.subjectCode})</span>
                </p>
                {getStatusBadge(process.status)}
              </div>
              <div className="px-4 py-3 space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Exam:</span> {process.examName}</p>
                <p><span className="font-medium">Course:</span> {process.courseName}</p>
                <p>
                  <span className="font-medium">Period:</span>{' '}
                  {process.startDate} — {process.endDate}
                </p>
              </div>
              <div className="px-4 pb-4">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    router.push(
                      `/evaluation/evaluator-assigned-answer-sheet?subjectCode=${process.subjectCode}`
                    )
                  }
                >
                  Start Evaluation
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
