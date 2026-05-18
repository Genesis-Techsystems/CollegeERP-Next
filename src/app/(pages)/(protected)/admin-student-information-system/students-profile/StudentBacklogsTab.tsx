'use client'

import { useEffect, useMemo, useState } from 'react'
import { Table, TableCard, type TableColumn } from '@/common/components/table'
import {
  loadStudentBacklogsForSemester,
  loadStudentCurriculumShell,
  type StudentCurriculumShell,
} from '@/services'

type AnyRow = Record<string, unknown>

const TITLE_COLOR = '#45b3a2'
const FONT_TITLE = 'text-[15px] font-bold'
const SEM_TAB_BORDER = '#90caf9'

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function cellText(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || '-'
}

const BACKLOG_COLUMNS: TableColumn<AnyRow>[] = [
  { id: '_si', label: 'Sl.No', render: (_r, i) => i + 1 },
  {
    id: 'subjectCode',
    label: 'Subject Code',
    render: (r) => cellText(r, ['subjectCode', 'subject_code', 'Subject_Code', 'SUBJECT_CODE']),
  },
  {
    id: 'subject',
    label: 'Subject',
    render: (r) =>
      cellText(r, [
        'Subject_Name',
        'subjectName',
        'subject_name',
        'subject',
        'failedSubjectName',
      ]),
  },
  {
    id: 'grade',
    label: 'Grade',
    render: (r) => cellText(r, ['grade', 'gradeName', 'grade_name', 'letterGrade', 'letter_grade']),
  },
  {
    id: 'gradePoints',
    label: 'Grade Points',
    render: (r) =>
      cellText(r, ['gradePoints', 'grade_points', 'Grade_Points', 'gradePoint', 'grade_point']),
  },
  {
    id: 'internalMarks',
    label: 'Internal Marks',
    render: (r) =>
      cellText(r, [
        'internalMarks',
        'internal_marks',
        'Internal_Marks',
        'internalMark',
        'sessionalMarks',
        'sessional_marks',
      ]),
  },
  {
    id: 'externalMarks',
    label: 'External Marks',
    render: (r) =>
      cellText(r, [
        'externalMarks',
        'external_marks',
        'External_Marks',
        'externalMark',
        'endExamMarks',
        'end_exam_marks',
        'theoryMarks',
      ]),
  },
  {
    id: 'result',
    label: 'Result',
    render: (r) =>
      cellText(r, [
        'result',
        'resultName',
        'result_name',
        'Result',
        'passFail',
        'pass_fail',
        'examResult',
        'exam_result',
        'backlogStatus',
        'status',
      ]),
  },
  {
    id: 'credits',
    label: 'Credits',
    render: (r) => cellText(r, ['credits', 'credit', 'subjectCredits', 'subject_credits', 'Credits']),
  },
]

type StudentBacklogsTabProps = {
  student: AnyRow
  activeTab: string
}

export function StudentBacklogsTab({ student, activeTab }: StudentBacklogsTabProps) {
  const isActive = activeTab === 'backlogs'
  const [shellLoading, setShellLoading] = useState(false)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [shell, setShell] = useState<StudentCurriculumShell | null>(null)
  const [semesterId, setSemesterId] = useState(0)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [cache, setCache] = useState<Record<number, AnyRow[]>>({})

  const defaultSemesterId = useMemo(() => {
    const fromStudent = Number(
      student.courseYearId ?? student.fk_course_year_id ?? student['courseYear.courseYearId'] ?? 0,
    )
    if (fromStudent > 0) return fromStudent
    return shell?.semesters[0]?.courseYearId ?? 0
  }, [student, shell])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    setShellLoading(true)
    setShell(null)
    setCache({})
    void loadStudentCurriculumShell(student)
      .then((payload) => {
        if (cancelled) return
        setShell(payload)
        const preferred =
          Number(student.courseYearId ?? student.fk_course_year_id ?? 0) ||
          payload.semesters[0]?.courseYearId ||
          0
        setSemesterId(preferred)
      })
      .catch(() => {
        if (!cancelled) setShell(null)
      })
      .finally(() => {
        if (!cancelled) setShellLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student, isActive])

  const activeId = semesterId || defaultSemesterId

  useEffect(() => {
    if (!isActive || !activeId) return
    if (cache[activeId]) {
      setRows(cache[activeId])
      return
    }

    let cancelled = false
    setRowsLoading(true)
    setRows([])
    void loadStudentBacklogsForSemester(student, activeId)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setCache((prev) => ({ ...prev, [activeId]: list }))
        setRows(list)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setRowsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student, isActive, activeId, cache])

  if (!isActive) return null

  const semesters = shell?.semesters ?? []
  const loading = shellLoading || rowsLoading

  return (
    <div className="space-y-4">
      <h2 className={`${FONT_TITLE} text-center`} style={{ color: TITLE_COLOR }}>
        Semwise Backlogs
      </h2>

      <div
        className="scrollbar-hidden flex overflow-x-auto border"
        style={{ borderColor: SEM_TAB_BORDER }}
        role="tablist"
        aria-label="Backlog semesters"
      >
        {shellLoading && semesters.length === 0 ? (
          <span className="px-3 py-2 text-[12px] text-slate-600">Loading semesters…</span>
        ) : (
          semesters.map((sem) => {
            const active = activeId === sem.courseYearId
            return (
              <button
                key={sem.courseYearId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSemesterId(sem.courseYearId)}
                className={`shrink-0 border-r px-3 py-2 text-[11px] font-semibold uppercase tracking-wide last:border-r-0 ${
                  active ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{
                  borderColor: SEM_TAB_BORDER,
                  ...(active ? { backgroundColor: TITLE_COLOR } : {}),
                }}
              >
                {sem.label}
              </button>
            )
          })
        )}
      </div>

      <TableCard withHeaderBorder={false} className="rounded-lg border-slate-200 shadow-none">
        <Table
          embedded
          rows={rows}
          columns={BACKLOG_COLUMNS}
          loading={loading}
          emptyText="No backlog subjects found for this semester."
          pageSize={0}
          density="default"
        />
      </TableCard>
    </div>
  )
}
