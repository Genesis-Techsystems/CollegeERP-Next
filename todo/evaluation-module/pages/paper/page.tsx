'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Info } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EvaluationPaperPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()

  const subjectCode = searchParams.get('subjectCode') ?? ''
  const answerId = searchParams.get('answerId') ?? ''

  const [starting, setStarting] = useState(false)

  // Derive university code for conditional instruction text
  const universityCode = user?.universityCode ?? ''
  const isMECSOrMVSR = universityCode === 'MECS' || universityCode === 'MVSR'

  const handleStart = useCallback(async () => {
    setStarting(true)
    try {
      // TODO: call API to mark evaluation as started
      // await startEvaluation({ subjectCode, answerId })
      router.push(
        `/evaluation/evaluator-assigned-answer-sheet?subjectCode=${subjectCode}`
      )
    } finally {
      setStarting(false)
    }
  }, [router, subjectCode, answerId])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Paper Evaluation"
        subtitle="Please read the instructions carefully before starting"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Welcome card */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Welcome</h2>
          <p className="text-sm text-slate-500">
            You are about to begin the evaluation process.
            {subjectCode && (
              <span className="block mt-1 font-medium text-slate-700">
                Subject Code: {subjectCode}
              </span>
            )}
          </p>
        </div>

        {/* Instructions card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-800">Instructions</h3>
          </div>

          {isMECSOrMVSR ? (
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>Valuator is advised to go through the instructions carefully before starting the evaluation.</li>
              <li>Valuator is requested to keep his/her appointment strictly confidential.</li>
              <li>Avoid erratic valuation such as allotting zero marks where the candidate deserves more marks and/or not valuing some questions.</li>
              <li>Valuator shall evaluate a maximum of 60 answer scripts per day (30 scripts in each session) by spending at least 3 to 4 hours per session.</li>
              <li>Valuator should follow scrupulously the scheme of valuation, in awarding marks, and have to evaluate the answer scripts uniformly.</li>
              <li>Valuator should allot the marks for all the questions answered by the student and check till the last page of the booklet.</li>
              <li>If any answer is found to be struck off in answer booklet, the valuator may award only zero for such answers.</li>
              {universityCode === 'MECS' && (
                <li>Queries if any, regarding onscreen evaluation, kindly contact the Additional Controller, MECS.</li>
              )}
              {universityCode === 'MVSR' && (
                <li>Queries if any, regarding onscreen evaluation, kindly contact the Additional Controller, MVSREC.</li>
              )}
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>Ensure that all necessary materials are available.</li>
              <li>Review the instructions carefully before starting.</li>
              <li>Click the &quot;Start Evaluation&quot; button below when you are ready to begin.</li>
            </ol>
          )}
        </div>

        {/* Action */}
        <div className="text-center">
          <Button size="lg" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start Evaluation'}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
