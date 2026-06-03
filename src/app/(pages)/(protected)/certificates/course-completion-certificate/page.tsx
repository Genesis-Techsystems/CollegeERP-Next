'use client'

import { useCallback, useMemo, useState } from 'react'
import { Monitor, UserCircle2 } from 'lucide-react'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSessionContext } from '@/context/SessionContext'
import { toastError } from '@/lib/toast'
import { searchStudentsForTc } from '@/services'
import type { StudentFeeSearchRow } from '@/types/fees-collection'

function studentLabel(student: StudentFeeSearchRow): string {
  const name = student.firstName ?? 'Student'
  const id = student.hallticketNumber ?? student.rollNumber ?? student.studentId
  return id ? `${name} (${id})` : name
}

const PURPOSE_OPTIONS = [
  { value: 'higherStudies', label: 'Higher Studies' },
  { value: 'employment', label: 'Employment' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
]

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((month) => ({ value: month.toLowerCase(), label: month }))

function buildPassoutYearOptions() {
  const thisYear = new Date().getFullYear()
  return Array.from({ length: 15 }, (_, index) => {
    const year = thisYear - index
    return { value: String(year), label: String(year) }
  })
}

export default function CourseCompletionCertificatePage() {
  const { user } = useSessionContext()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [resultState, setResultState] = useState('awaiting')
  const [purpose, setPurpose] = useState<string | null>('higherStudies')
  const [passoutMonth, setPassoutMonth] = useState<string | null>('january')
  const [passoutYear, setPassoutYear] = useState<string | null>(String(new Date().getFullYear()))

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 3 || !user?.collegeId) {
        setStudents([])
        return
      }
      setStudentSearchLoading(true)
      try {
        const rows = await searchStudentsForTc({ collegeId: Number(user.collegeId), q })
        setStudents(rows)
      } catch (error) {
        toastError(error, 'Student search failed')
        setStudents([])
      } finally {
        setStudentSearchLoading(false)
      }
    },
    [user?.collegeId],
  )

  const studentOptions = useMemo(() => {
    const base = students.map((student) => ({
      value: String(student.studentId),
      label: studentLabel(student),
    }))
    if (studentId && selectedStudent && !base.some((option) => option.value === studentId)) {
      return [{ value: studentId, label: studentLabel(selectedStudent) }, ...base]
    }
    return base
  }, [students, studentId, selectedStudent])

  const passoutYearOptions = useMemo(() => buildPassoutYearOptions(), [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#d9b44d] bg-muted/30 px-4 py-2.5">
          <Monitor className="h-4 w-4 text-[hsl(var(--card-title))]" />
          <h1 className="text-[28px] font-semibold text-[hsl(var(--card-title))]">Course Complete Certificate</h1>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="max-w-[420px]">
            <Select
              label="Student *"
              value={studentId}
              onChange={(value) => {
                setStudentId(value)
                const pick = students.find((row) => String(row.studentId) === value) ?? null
                setSelectedStudent(pick)
              }}
              options={studentOptions}
              placeholder="Select student"
              searchable
              clearable
              isLoading={studentSearchLoading}
              onSearch={onStudentSearch}
            />
          </div>

          {selectedStudent && (
            <>
              <div className="rounded-sm border border-[#c3d4ef] bg-[#f9fbff] px-4 py-3">
                <div className="flex items-center gap-4">
                  <UserCircle2 className="h-20 w-20 text-muted-foreground" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-[hsl(var(--card-title))]">
                      {selectedStudent.firstName ?? 'Student'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.hallticketNumber ?? selectedStudent.rollNumber ?? '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.collegeCode ?? '—'} / {selectedStudent.academicYear ?? '—'} /{' '}
                      {selectedStudent.courseCode ?? '—'} / {selectedStudent.courseYearName ?? '—'} /{' '}
                      {selectedStudent.section ?? '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedStudent.mobile ?? '—'}</p>
                  </div>
                </div>
              </div>

              <RadioGroup
                value={resultState}
                onValueChange={setResultState}
                className="flex flex-wrap items-center gap-8"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="awaiting" id="course-awaiting-results" />
                  <Label htmlFor="course-awaiting-results" className="font-normal">
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="declared" id="course-results-declared" />
                  <Label htmlFor="course-results-declared" className="font-normal">
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="For *"
                  value={purpose}
                  onChange={setPurpose}
                  options={PURPOSE_OPTIONS}
                  placeholder="Select purpose"
                />
                <Select
                  label="Passout Month *"
                  value={passoutMonth}
                  onChange={setPassoutMonth}
                  options={MONTH_OPTIONS}
                  placeholder="Select month"
                />
                <Select
                  label="Passout Year *"
                  value={passoutYear}
                  onChange={setPassoutYear}
                  options={passoutYearOptions}
                  placeholder="Select year"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button">Print</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
