'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvaluatorDetail {
  subjectName: string
  subjectCode: string
  courseName: string
  validityEndDate: string
  noOfStudentsAssigned: number | null
  noOfEvaluationsCompleted: number | null
  evaluationsPending: number | null
  examSubjectId?: number
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EvaluationDashboardPage() {
  const router = useRouter()
  const [evaluatorDetails, setEvaluatorDetails] = useState<EvaluatorDetail[]>([])
  const [loading, setLoading] = useState(false)

  // ── Fetch evaluator details ─────────────────────────────────────────────
  const fetchEvaluatorDetails = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: replace with real service call
      // const result = await getEvaluatorDashboard()
      // setEvaluatorDetails(result)
      setEvaluatorDetails([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvaluatorDetails()
  }, [fetchEvaluatorDetails])

  function handleCheckPaper(evaluator: EvaluatorDetail) {
    // Navigate to the paper evaluation page
    router.push(
      `/evaluation/evaluator-assigned-answer-sheet?subjectCode=${evaluator.subjectCode}`
    )
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Evaluation Dashboard"
        subtitle="View your assigned subjects and evaluation progress"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 animate-pulse"
            >
              <div className="h-5 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-50 rounded" />
              <div className="h-8 w-1/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : evaluatorDetails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ClipboardList className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No subjects assigned for evaluation</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {evaluatorDetails.map((evaluator, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white overflow-hidden"
            >
              {/* Card header */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800 text-center">
                  {evaluator.subjectName}
                  <span className="text-slate-500 font-normal ml-1">
                    ({evaluator.subjectCode})
                  </span>
                </p>
              </div>

              {/* Course & date info */}
              <div className="px-4 py-3 space-y-1">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Course:</span> {evaluator.courseName}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Evaluation Last Date:</span>{' '}
                  {formatDate(evaluator.validityEndDate)}
                </p>
              </div>

              {/* Stats table */}
              <div className="px-4 pb-3">
                <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b border-r border-slate-200 text-slate-700 font-medium">
                        Assigned
                      </th>
                      <th className="text-left p-2 border-b border-r border-slate-200 text-slate-700 font-medium">
                        Evaluated
                      </th>
                      <th className="text-left p-2 border-b border-slate-200 text-slate-700 font-medium">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-r border-slate-200">
                        {evaluator.noOfStudentsAssigned ?? '—'}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        {evaluator.noOfEvaluationsCompleted ?? '—'}
                      </td>
                      <td className="p-2">
                        {evaluator.evaluationsPending ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action */}
              <div className="px-4 pb-4 text-center">
                <Button size="sm" onClick={() => handleCheckPaper(evaluator)}>
                  Check Paper
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
