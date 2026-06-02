'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Monitor, UserCircle2 } from 'lucide-react'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSessionContext } from '@/context/SessionContext'
import { QK } from '@/lib/query-keys'
import { toastError } from '@/lib/toast'
import { listFinancialYears, searchStudentsForTc } from '@/services'
import type { StudentFeeSearchRow } from '@/types/fees-collection'

function studentLabel(student: StudentFeeSearchRow): string {
  const name = student.firstName ?? 'Student'
  const id = student.hallticketNumber ?? student.rollNumber ?? student.studentId
  return id ? `${name} (${id})` : name
}

const PURPOSE_OPTIONS = [
  { value: 'trainPass', label: 'Train Pass' },
  { value: 'busPass', label: 'Bus Pass' },
  { value: 'bankLoan', label: 'Bank Loan' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'conduct', label: 'Conduct' },
  { value: 'higherEducation', label: 'Higher Education' },
  { value: 'jobPurpose', label: 'Job Purpose' },
  { value: 'visaPurpose', label: 'VISA Purpose' },
  { value: 'siEvents', label: 'SI Events' },
  { value: 'constableEvents', label: 'Constable Events' },
  { value: 'jobInRevenueDepartment', label: 'Job In Revenue Department' },
  { value: 'jobInElectricalDepartment', label: 'Job In Electrical Department' },
  { value: 'eLitmusExam', label: 'E-Litmus Exam' },
  { value: 'armyRally', label: 'Army Rally' },
  { value: 'sports', label: 'Sports' },
  { value: 'passport', label: 'Passport' },
  { value: 'internship', label: 'Internship' },
  { value: 'other', label: 'Other' },
]

export default function BonafideConductCertificatePage() {
  const { user } = useSessionContext()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [resultState, setResultState] = useState('awaiting')
  const [applyFor, setApplyFor] = useState('applyFor')
  const [purpose, setPurpose] = useState<string | null>(null)
  const [financialYearId, setFinancialYearId] = useState<string | null>(null)

  const { data: financialYears = [] } = useQuery({
    queryKey: QK.financialYears.list(),
    queryFn: listFinancialYears,
  })

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

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#d9b44d] bg-muted/30 px-4 py-2.5">
          <Monitor className="h-4 w-4 text-[hsl(var(--card-title))]" />
          <h1 className="text-[28px] font-semibold text-[hsl(var(--card-title))]">
            Bonafied And Conduct Certificate
          </h1>
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
                className="flex flex-wrap items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="awaiting" id="awaiting-results" />
                  <Label htmlFor="awaiting-results" className="font-normal">
                    Awaiting Results
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="declared" id="results-declared" />
                  <Label htmlFor="results-declared" className="font-normal">
                    Results Declared
                  </Label>
                </div>
              </RadioGroup>

              <RadioGroup
                value={applyFor}
                onValueChange={setApplyFor}
                className="flex flex-wrap items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="applyFor" id="apply-for" />
                  <Label htmlFor="apply-for" className="font-normal">
                    Apply For
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="forIncomeTax" id="for-income-tax" />
                  <Label htmlFor="for-income-tax" className="font-normal">
                    For Income Tax
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="forTransferCertificate" id="for-transfer-certificate" />
                  <Label htmlFor="for-transfer-certificate" className="font-normal">
                    For Transfer Certificate
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="forBank" id="for-bank" />
                  <Label htmlFor="for-bank" className="font-normal">
                    For Bank
                  </Label>
                </div>
              </RadioGroup>

              {applyFor === 'forBank' ? (
                <div className="max-w-[420px]">
                  <Select
                    label="Financial Year"
                    value={financialYearId}
                    onChange={setFinancialYearId}
                    options={financialYears.map((year) => ({
                      value: String(year.financialYearId),
                      label: year.financialYear,
                    }))}
                    placeholder="Select financial year"
                  />
                </div>
              ) : (
                <div className="max-w-[420px]">
                  <Select
                    label="For *"
                    value={purpose}
                    onChange={setPurpose}
                    options={PURPOSE_OPTIONS}
                    placeholder="Select purpose"
                  />
                </div>
              )}

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
