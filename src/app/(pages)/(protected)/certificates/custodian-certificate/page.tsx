'use client'

import { useCallback, useMemo, useState } from 'react'
import { Monitor, UserCircle2 } from 'lucide-react'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  { value: 'passport', label: 'Passport' },
  { value: 'bank', label: 'Bank' },
  { value: 'higherEducation', label: 'Higher Education' },
  { value: 'employment', label: 'Employment' },
  { value: 'other', label: 'Other' },
]

const QUALIFICATION_OPTIONS = [
  { value: 'ssc', label: 'S.S.C' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'degree', label: 'Degree' },
  { value: 'btech', label: 'B.Tech' },
] as const

type QualificationValue = (typeof QUALIFICATION_OPTIONS)[number]['value']

export default function CustodianCertificatePage() {
  const { user } = useSessionContext()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [resultState, setResultState] = useState('awaiting')
  const [purpose, setPurpose] = useState<string | null>(null)
  const [selectedQualifications, setSelectedQualifications] = useState<Set<QualificationValue>>(
    () => new Set<QualificationValue>(['ssc']),
  )

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

  function toggleQualification(value: QualificationValue, checked: boolean) {
    setSelectedQualifications((prev) => {
      const next = new Set(prev)
      if (checked) next.add(value)
      else next.delete(value)
      return next
    })
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#d9b44d] bg-muted/30 px-4 py-2.5">
          <Monitor className="h-4 w-4 text-[hsl(var(--card-title))]" />
          <h1 className="text-[28px] font-semibold text-[hsl(var(--card-title))]">Custodian Certificate</h1>
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
                  <RadioGroupItem value="awaiting" id="cust-awaiting-results" />
                  <Label htmlFor="cust-awaiting-results" className="font-normal">
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="declared" id="cust-results-declared" />
                  <Label htmlFor="cust-results-declared" className="font-normal">
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {QUALIFICATION_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`cust-${option.value}`}
                      checked={selectedQualifications.has(option.value)}
                      onCheckedChange={(checked) => toggleQualification(option.value, checked === true)}
                    />
                    <Label htmlFor={`cust-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="max-w-[420px]">
                <Select
                  label="For *"
                  value={purpose}
                  onChange={setPurpose}
                  options={PURPOSE_OPTIONS}
                  placeholder="Select purpose"
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
