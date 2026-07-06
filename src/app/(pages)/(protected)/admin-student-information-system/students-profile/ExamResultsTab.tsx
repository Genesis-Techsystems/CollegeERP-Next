'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  loadStudentExamResultsForSemester,
  loadStudentExamResultsShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from '@/services'

type AnyRow = Record<string, unknown>

const SEM_TAB_CLASS =
  'rounded-none border-b-2 border-transparent px-3 py-2 text-[11px] whitespace-nowrap data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46]/20 data-[state=active]:text-primary data-[state=active]:shadow-none'

const TH_CLASS = 'border border-border bg-[#C3D9FF] px-2 py-1.5 text-left text-xs font-medium'
const TD_CLASS = 'border border-border px-2 py-1.5 text-left text-xs font-medium'
const TD_CENTER = `${TD_CLASS} text-center`

function examValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys)
  return value && value !== '—' ? value : '—'
}

function ExamResultsTable({ rows, loading }: { rows: AnyRow[]; loading: boolean }) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
  }

  const resultLabel =
    rows.length > 0
      ? pickProfileCell(rows[0], ['result', 'examResult', 'exam_result', 'overallResult', 'overall_result'])
      : ''

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${TH_CLASS} w-[5%]`}>SI.No</th>
            <th className={TH_CLASS}>Subject Code</th>
            <th className={TH_CLASS}>Subject</th>
            <th className={`${TH_CLASS} text-center`}>Grade</th>
            <th className={`${TH_CLASS} text-center`}>Grade Points</th>
            <th className={`${TH_CLASS} text-center`}>Internal Marks</th>
            <th className={`${TH_CLASS} text-center`}>External Marks</th>
            <th className={`${TH_CLASS} text-center`}>Credits</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className={`${TH_CLASS} text-center`}>
                <span className="text-sm font-medium text-destructive">No Results are found.</span>
              </td>
            </tr>
          ) : (
            <>
              {rows.map((row, index) => (
                <tr
                  key={`${examValue(row, ['subjectCode', 'subject_code'])}-${index}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-[#f1f6ff]'}
                >
                  <td className={TD_CLASS}>{index + 1}</td>
                  <td className={TD_CLASS}>{examValue(row, ['subjectCode', 'subject_code'])}</td>
                  <td className={TD_CLASS}>
                    {examValue(row, ['subjectName', 'subject_name', 'shortName', 'subjectShortName'])}
                  </td>
                  <td className={TD_CENTER}>{examValue(row, ['grade', 'letterGrade', 'letter_grade'])}</td>
                  <td className={TD_CENTER}>
                    {examValue(row, ['gradePoints', 'grade_points', 'gradePoint'])}
                  </td>
                  <td className={TD_CENTER}>
                    {examValue(row, ['internalMarks', 'internal_marks', 'intMarks', 'int_marks'])}
                  </td>
                  <td className={TD_CENTER}>
                    {examValue(row, ['externalMarks', 'external_marks', 'extMarks', 'ext_marks'])}
                  </td>
                  <td className={TD_CENTER}>{examValue(row, ['credits', 'credit', 'subjectCredits'])}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} className="border border-border px-2 py-2 text-right text-xs font-semibold text-[#0c51a4]">
                  RESULT : {resultLabel && resultLabel !== '—' ? resultLabel : ''}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ExamResultsTab({ student }: { readonly student: AnyRow }) {
  const [semesters, setSemesters] = useState<StudentCurriculumSemester[]>([])
  const [activeSem, setActiveSem] = useState('')
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [semLoading, setSemLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const shell = await loadStudentExamResultsShell(student)
        if (cancelled) return
        setSemesters(shell.semesters)
        if (shell.semesters[0]) setActiveSem(String(shell.semesters[0].courseYearId))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student])

  useEffect(() => {
    const cyId = Number(activeSem)
    if (!cyId) return
    let cancelled = false
    void (async () => {
      setSemLoading(true)
      try {
        const data = await loadStudentExamResultsForSemester(student, cyId)
        if (!cancelled) setRows(data)
      } finally {
        if (!cancelled) setSemLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student, activeSem])

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
  }

  if (!semesters.length) {
    return (
      <div className="space-y-3">
        <p className="text-base font-medium text-[#0c51a4]">Semwise Exam Results</p>
        <p className="py-6 text-center text-sm font-medium text-destructive">No Results are found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border-2 border-[#B2EBF2] p-2">
      <p className="text-base font-medium text-[#0c51a4]">Semwise Exam Results</p>
      <Tabs value={activeSem} onValueChange={setActiveSem}>
        <div className="overflow-x-auto rounded-sm border border-[#ffcf46]">
          <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
            {semesters.map((sem) => (
              <TabsTrigger key={sem.courseYearId} value={String(sem.courseYearId)} className={SEM_TAB_CLASS}>
                {sem.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {semesters.map((sem) => (
          <TabsContent key={sem.courseYearId} value={String(sem.courseYearId)} className="mt-3 p-2">
            {activeSem === String(sem.courseYearId) ? (
              <ExamResultsTable rows={rows} loading={semLoading} />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
