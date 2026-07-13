'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Select as CommonSelect } from '@/common/components/select'
import { ConfirmDialog } from '@/common/components/feedback'
import {
  getCompleteExamProcessFilters,
  runCompleteExamFinalizeAction,
  runCompleteExamFinalizeProfiles,
  runCompleteExamReEvaluationAssignments,
  runCompleteExamResultProcessing,
  runCompleteExamResultProcessingPublish,
  runCompleteExamSetupAssignments,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'
import { useRouter } from 'next/navigation'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}
function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? '').trim()
    if (v) return v
  }
  return ''
}
function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = numFrom(row, keys)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function ActionCard({
  title,
  subtitle,
  button,
  onClick,
  disabled,
}: Readonly<{
  title: string
  subtitle: string
  button: string
  onClick: () => void
  disabled?: boolean
}>) {
  return (
    <div className="border rounded-md p-3 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      <Button className="h-8 text-[12px]" onClick={onClick} disabled={disabled}>
        {button}
      </Button>
    </div>
  )
}

export default function CompleteExamProcessPage() {
  const router = useRouter()
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [pending, setPending] = useState<{
    title: string
    description: string
    fn: () => Promise<void | string>
    success: string
  } | null>(null)

  const courses = useMemo(() => dedupeBy(filters, ['fk_course_id', 'courseId']), [filters])
  const years = useMemo(
    () =>
      dedupeBy(
        filters.filter((x) => numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId)),
        ['fk_academic_year_id', 'academicYearId'],
      ),
    [filters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        ['fk_exam_id', 'examId'],
      ),
    [filters, courseId, academicYearId],
  )
  const courseOptions = useMemo(
    () => courses.map((x) => ({ value: String(numFrom(x, ['fk_course_id', 'courseId'])), label: strFrom(x, ['course_code', 'courseCode']) })).filter((o) => o.value !== '0'),
    [courses],
  )
  const yearOptions = useMemo(
    () => years.map((x) => ({ value: String(numFrom(x, ['fk_academic_year_id', 'academicYearId'])), label: strFrom(x, ['academic_year', 'academicYear']) })).filter((o) => o.value !== '0'),
    [years],
  )
  const examOptions = useMemo(
    () => exams.map((x) => ({ value: String(numFrom(x, ['fk_exam_id', 'examId'])), label: strFrom(x, ['exam_name', 'examName']) })).filter((o) => o.value !== '0'),
    [exams],
  )

  useEffect(() => {
    async function run() {
      setLoading(true)
      try {
        const rows = await getCompleteExamProcessFilters(employeeId).catch(() => [])
        setFilters(rows)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [employeeId])
  useEffect(() => {
    if (courses[0]) setCourseId(numFrom(courses[0], ['fk_course_id', 'courseId']))
  }, [courses])
  useEffect(() => {
    if (years[0]) setAcademicYearId(numFrom(years[0], ['fk_academic_year_id', 'academicYearId']))
  }, [years])
  useEffect(() => {
    if (exams[0]) setExamId(numFrom(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])

  async function runAction(fn: () => Promise<void | string>, successMessage: string) {
    if (!examId) return
    setLoading(true)
    try {
      // Result-processing procs resolve with the backend message (Angular shows result.message)
      const message = await fn()
      toastSuccess(typeof message === 'string' && message ? message : successMessage)
    } catch (e) {
      toastError(e, 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  // Irreversible finalize/setup actions are gated behind a confirmation.
  function confirmAction(
    title: string,
    fn: () => Promise<void | string>,
    success: string,
    description = 'This action is irreversible and cannot be undone. Do you want to continue?',
  ) {
    if (!examId) return
    setPending({ title, description, fn, success })
  }
  const selectedExamId = examId ?? 0

  return (
    <FilteredPage
      title="Complete Exam Process"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course">
            <CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" searchable />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Year">
            <CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={yearOptions} placeholder="Exam Year" searchable />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Master">
            <CommonSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam Master" searchable />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
      <div className="app-card p-3 space-y-3">
        <h3 className="text-[14px] font-semibold">Complete Exam Process</h3>
        <ActionCard title="Finalise Evaluator Profiles" subtitle="Finalise evaluator profiles by skipping committee." button="Finalise Evaluator Profiles" disabled={!examId || loading} onClick={() => confirmAction('Finalise Evaluator Profiles?', () => runCompleteExamFinalizeProfiles(), 'Evaluator profiles finalised')} />
        <ActionCard title="Setup Assignments" subtitle="Review student assignments, OMR details, and answer papers." button="Setup Assignments" disabled={!examId || loading} onClick={() => confirmAction('Setup Assignments?', () => runCompleteExamSetupAssignments(selectedExamId), 'Assignments setup completed')} />
        <ActionCard title="Finalize Evaluation Status" subtitle="Update status from Evaluated to Finalized." button="Finalize Evaluation Status" disabled={!examId || loading} onClick={() => confirmAction('Finalize Evaluation Status?', () => runCompleteExamFinalizeAction('exam_finalise_evaluation_status', selectedExamId), 'Evaluation status finalized')} />
        <ActionCard title="Finalize Evaluation Marks" subtitle="Finalize marks after finalized evaluation status." button="Finalize Evaluation Marks" disabled={!examId || loading} onClick={() => confirmAction('Finalize Evaluation Marks?', () => runCompleteExamFinalizeAction('exam_finalise_evaluation_marks', selectedExamId), 'Evaluation marks finalized')} />
        <ActionCard title="Marks Entered Status" subtitle="View evaluator marks status report." button="Verify Exam Marks" disabled={!examId || loading} onClick={() => router.push('/admin-examination-management/post-examination/verify-exam-marks')} />
      </div>

      <div className="app-card p-3 space-y-3">
        <h3 className="text-[14px] font-semibold">Exam Re-Evaluation</h3>
        <ActionCard title="Setup Re-Evaluation Assignments" subtitle="Review re-evaluation assignments and answer papers." button="Setup Re-Evaluation Assignments" disabled={!examId || loading} onClick={() => confirmAction('Setup Re-Evaluation Assignments?', () => runCompleteExamReEvaluationAssignments(selectedExamId), 'Re-evaluation assignments setup completed')} />
        <ActionCard title="Finalize Re-Evaluation Status" subtitle="Update status from Evaluated to Finalized." button="Finalize Re-Evaluation Status" disabled={!examId || loading} onClick={() => confirmAction('Finalize Re-Evaluation Status?', () => runCompleteExamFinalizeAction('exam_finalise_reevaluation_status', selectedExamId), 'Re-evaluation status finalized')} />
        <ActionCard title="Finalize Re-Evaluation Marks" subtitle="Finalize marks after finalized re-evaluation status." button="Finalize Re-Evaluation Marks" disabled={!examId || loading} onClick={() => confirmAction('Finalize Re-Evaluation Marks?', () => runCompleteExamFinalizeAction('exam_finalise_reevaluation_marks', selectedExamId), 'Re-evaluation marks finalized')} />
      </div>

      <div className="app-card p-3 space-y-3">
        <h3 className="text-[14px] font-semibold">Result Processing</h3>
        <div className="flex gap-2">
          <Button className="h-8 text-[12px]" disabled={!examId || loading} onClick={() => void runAction(() => runCompleteExamResultProcessing(selectedExamId), 'Result processing completed')}>Result Processing</Button>
          <Button className="h-8 text-[12px]" disabled={!examId || loading} onClick={() => void runAction(() => runCompleteExamResultProcessingPublish(selectedExamId), 'Result publishing completed')}>Publish Result Processing</Button>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        description={pending?.description}
        confirmLabel="Proceed"
        confirmVariant="default"
        isLoading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return
          const { fn, success } = pending
          setPending(null)
          void runAction(fn, success)
        }}
      />
    </FilteredPage>
  )
}

