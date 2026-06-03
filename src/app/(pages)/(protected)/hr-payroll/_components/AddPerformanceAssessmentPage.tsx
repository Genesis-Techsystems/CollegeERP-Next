'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { getPerformanceAssessmentQuestions } from '@/services'

export function AddPerformanceAssessmentPage() {
  const searchParams = useSearchParams()
  const empId = searchParams.get('empId')
  const empFirstName = searchParams.get('empFirstName') ?? ''
  const assessmentFeedbackId = searchParams.get('assessmentFeedbackId')

  const { data: questions = [], isFetching, error } = useQuery({
    queryKey: [...QK.hrPayroll.all, 'perfQuestions'],
    queryFn: getPerformanceAssessmentQuestions,
  })

  return (
    <PageContainer className="space-y-5 pb-10">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))] inline-flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden />
          {assessmentFeedbackId ? 'View / Edit Performance Assessment' : 'Take Performance Assessment'}
        </h1>
      </div>

      <div className="app-card p-4 space-y-3 text-[13px]">
        <p>
          <span className="text-muted-foreground">Employee: </span>
          <span className="font-medium text-[hsl(var(--primary))]">{empFirstName || empId}</span>
        </p>
        <p className="text-muted-foreground">
          PBAS 360° assessment form (subjects, gainful engagement, work levels, and question
          ratings) mirrors Angular{' '}
          <code className="text-xs bg-muted px-1 rounded">staff-faculty-details/performance-assessment/add-performance</code>.
          Question schema loaded: <strong>{questions.length}</strong>
          {isFetching ? ' (loading…)' : ''}.
        </p>
        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
        {questions.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 max-h-48 overflow-y-auto text-[12px] text-muted-foreground">
            {questions.slice(0, 8).map((q, i) => (
              <li key={String(q.questionId ?? i)}>{String(q.questionName ?? `Question ${i + 1}`)}</li>
            ))}
            {questions.length > 8 ? <li>…and {questions.length - 8} more</li> : null}
          </ul>
        ) : null}
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href="/hr-payroll/employee/performance-assessment">Back to Performance Assessment</Link>
      </Button>
    </PageContainer>
  )
}
