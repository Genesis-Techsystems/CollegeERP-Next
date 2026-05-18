'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Printer } from 'lucide-react'
import { Table, TableCard, type TableColumn } from '@/common/components/table'
import {
  fetchStudentProfileAcademicDetails,
  loadStudentCurriculumShell,
  loadStudentProfileExaminationForSemester,
  type StudentCurriculumShell,
} from '@/services'

type AnyRow = Record<string, unknown>

const TITLE_COLOR = '#1976d2'
const SECTION_TITLE_CLASS = 'text-[14px] font-semibold'
const SEM_LABEL_CLASS = 'text-[12px] font-semibold uppercase tracking-wide'

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function cellText(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || '-'
}

function formatMonthYear(value: unknown): string {
  if (!value) return '-'
  const raw = String(value).trim()
  if (!raw) return '-'
  const d = value instanceof Date ? value : new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  return raw
}

const ACADEMIC_COLUMNS: TableColumn<AnyRow>[] = [
  {
    id: 'class',
    label: 'Class',
    render: (r) =>
      cellText(r, ['className', 'class_name', 'class', 'qualificationName', 'qualification_name', 'qualification']),
  },
  {
    id: 'stateBoard',
    label: 'State Board',
    render: (r) =>
      cellText(r, ['stateBoardName', 'state_board_name', 'stateBoard', 'state_board', 'boardName', 'board_name']),
  },
  {
    id: 'yearOfStudy',
    label: 'Year Of Study',
    render: (r) => cellText(r, ['yearOfStudy', 'year_of_study', 'studyYear', 'study_year', 'yearNo', 'year_no']),
  },
  {
    id: 'passing',
    label: 'Month & Year Of Passing',
    render: (r) =>
      formatMonthYear(
        r.monthYearOfPassing ??
          r.month_year_of_passing ??
          r.yearOfPassing ??
          r.year_of_passing ??
          r.passingMonthYear ??
          r.passing_month_year,
      ),
  },
  {
    id: 'percentage',
    label: 'Percentage or CGPA',
    render: (r) => {
      const pct = pickText(r, ['percentage', 'percent', 'marksPercentage', 'marks_percentage'])
      const cgpa = pickText(r, ['cgpa', 'CGPA', 'gradePoint', 'grade_point'])
      if (pct && cgpa) return `${pct} / ${cgpa}`
      return pct || cgpa || '-'
    },
  },
  {
    id: 'totalMarks',
    label: 'Total Marks',
    render: (r) => cellText(r, ['totalMarks', 'total_marks', 'marksObtained', 'marks_obtained', 'obtainedMarks']),
  },
]

const EXAM_COLUMNS: TableColumn<AnyRow>[] = [
  {
    id: 'subCode',
    label: 'Sub Code',
    render: (r) => cellText(r, ['subjectCode', 'subject_code', 'Subject_Code', 'SUBJECT_CODE']),
  },
  {
    id: 'subjectName',
    label: 'Subject Name',
    render: (r) => cellText(r, ['Subject_Name', 'subjectName', 'subject_name', 'subject']),
  },
  {
    id: 'grade',
    label: 'Grade',
    render: (r) => cellText(r, ['grade', 'gradeName', 'grade_name', 'letterGrade', 'letter_grade']),
  },
  {
    id: 'credits',
    label: 'Credits',
    render: (r) => cellText(r, ['credits', 'credit', 'subjectCredits', 'subject_credits', 'Credits']),
  },
  {
    id: 'remarks',
    label: 'Remarks',
    render: (r) => cellText(r, ['remarks', 'remark', 'resultRemarks', 'result_remarks']) || '-',
  },
]

type StudentProfilePrintViewProps = {
  student: AnyRow
  studentId: number
}

export function StudentProfilePrintView({ student, studentId }: StudentProfilePrintViewProps) {
  const [loading, setLoading] = useState(true)
  const [academicRows, setAcademicRows] = useState<AnyRow[]>([])
  const [shell, setShell] = useState<StudentCurriculumShell | null>(null)
  const [examBySemester, setExamBySemester] = useState<Record<number, AnyRow[]>>({})

  const detailsHref = useMemo(
    () => `/admin-student-information-system/students-profile?studentId=${studentId}&check=1`,
    [studentId],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [academic, curriculumShell] = await Promise.all([
          fetchStudentProfileAcademicDetails(student),
          loadStudentCurriculumShell(student),
        ])
        if (cancelled) return
        setAcademicRows(academic)
        setShell(curriculumShell)

        const results = await Promise.all(
          curriculumShell.semesters.map(async (sem) => {
            const rows = await loadStudentProfileExaminationForSemester(student, sem.courseYearId)
            return { courseYearId: sem.courseYearId, rows }
          }),
        )
        if (cancelled) return

        const map: Record<number, AnyRow[]> = {}
        for (const { courseYearId, rows } of results) {
          if (rows.length > 0) map[courseYearId] = rows
        }
        setExamBySemester(map)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [student])

  const semestersWithExams = useMemo(() => {
    if (!shell) return []
    return shell.semesters.filter((sem) => (examBySemester[sem.courseYearId]?.length ?? 0) > 0)
  }, [shell, examBySemester])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-2.5" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0" style={{ color: TITLE_COLOR }} aria-hidden />
          <h1 className="text-[14px] font-semibold tracking-wide" style={{ color: TITLE_COLOR }}>
            Student Profile
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center text-pink-500 hover:text-pink-600"
            aria-label="Print student profile"
          >
            <Printer className="h-4 w-4" />
          </button>
          <Link href={detailsHref} className="text-[12px] font-medium hover:underline" style={{ color: '#45b3a2' }}>
            Student Details
          </Link>
          <Link
            href="/admin-student-information-system/students-list"
            className="text-[12px] font-medium hover:underline"
            style={{ color: '#45b3a2' }}
          >
            Back to Students Search
          </Link>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5">
        <section className="space-y-2">
          <h2 className={SECTION_TITLE_CLASS} style={{ color: TITLE_COLOR }}>
            Academic Details
          </h2>
          <TableCard>
            <Table
              embedded
              rows={academicRows}
              columns={ACADEMIC_COLUMNS}
              loading={loading}
              emptyText="No academic details found."
              pageSize={0}
              density="compact"
            />
          </TableCard>
        </section>

        <section className="space-y-4">
          <h2 className={SECTION_TITLE_CLASS} style={{ color: TITLE_COLOR }}>
            Examination
          </h2>
          {loading ? (
            <p className="text-[12px] text-slate-600">Loading examination results…</p>
          ) : semestersWithExams.length === 0 ? (
            <p className="text-[12px] text-slate-600">No examination results found.</p>
          ) : (
            semestersWithExams.map((sem) => (
              <div key={sem.courseYearId} className="space-y-2">
                <p className={SEM_LABEL_CLASS} style={{ color: TITLE_COLOR }}>
                  {sem.label}
                </p>
                <TableCard>
                  <Table
                    embedded
                    rows={examBySemester[sem.courseYearId] ?? []}
                    columns={EXAM_COLUMNS}
                    pageSize={0}
                    density="compact"
                  />
                </TableCard>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  )
}
