'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Info } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'

function EvaluationPaperContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()

  const subjectCode = searchParams.get('subjectCode') ?? ''
  const answerId = searchParams.get('answerId') ?? ''

  const [starting, setStarting] = useState(false)

  const universityCode = user?.universityCode ?? ''
  const isMecsOrMvsr = universityCode === 'MECS' || universityCode === 'MVSR'

  const handleStart = useCallback(async () => {
    setStarting(true)
    try {
      router.push(`/evaluation/evaluator-assigned-answer-sheet?subjectCode=${subjectCode}`)
    } finally {
      setStarting(false)
    }
  }, [router, subjectCode, answerId])

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Paper Evaluation"
        subtitle="Please read the instructions carefully before starting"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Welcome</h2>
          <p className="text-sm text-muted-foreground">
            You are about to begin the evaluation process.
            {subjectCode && (
              <span className="block mt-1 font-medium text-slate-700">Subject Code: {subjectCode}</span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-800">Instructions</h3>
          </div>

          {isMecsOrMvsr ? (
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>Valuator is advised to go through instructions carefully before starting evaluation.</li>
              <li>Valuator is requested to keep appointment strictly confidential.</li>
              <li>Avoid erratic valuation and ensure fair, uniform marking for all questions.</li>
              <li>Evaluate a maximum of 60 answer scripts per day by spending proper time per session.</li>
              <li>Check all pages of the booklet and award marks for all answered questions.</li>
              <li>If an answer is struck off in answer booklet, award only zero for such answers.</li>
              {universityCode === 'MECS' && (
                <li>For onscreen evaluation support, kindly contact the Additional Controller, MECS.</li>
              )}
              {universityCode === 'MVSR' && (
                <li>For onscreen evaluation support, kindly contact the Additional Controller, MVSREC.</li>
              )}
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li>Ensure all necessary materials are available.</li>
              <li>Review the instructions carefully before starting.</li>
              <li>Click the &quot;Start Evaluation&quot; button below when ready.</li>
            </ol>
          )}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting...' : 'Start Evaluation'}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}

export default function EvaluationPaperPage() {
  return (
    <Suspense fallback={<PageContainer className="py-8 text-sm text-muted-foreground">Loading…</PageContainer>}>
      <EvaluationPaperContent />
    </Suspense>
  )
}
