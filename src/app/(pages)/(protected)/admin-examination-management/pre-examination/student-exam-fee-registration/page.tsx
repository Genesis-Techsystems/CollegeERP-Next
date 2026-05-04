'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/common/components/search'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import {
  addExamAdditionalFeeReceipt,
  fetchStudentExamFeeRegistrationGridData,
  getUnivExamFiltersRegSup,
  listAdditionalExamFeeTypes,
  listStudents,
  listStudentSubjects,
  saveRegisteredExamSubjects,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>
type AddedFee = {
  courseYearId: number
  courseYearName: string
  examType: 'Regular' | 'Supplementary'
  feeTypeId: number
  feeTypeName: string
  amount: number
  examFeeReceiptId: number | null
}

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getStudentRowId(s: AnyRow, fallback: number): number {
  const id = Number(
    s.studentId ??
      s.id ??
      s.fk_student_id ??
      s.student_detail_id ??
      s.studentDetailId ??
      0,
  )
  return id > 0 ? id : fallback
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const v = Number(row?.[k] ?? 0)
    if (v > 0) return v
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const val = row?.[key]
    if (val != null && String(val).trim() !== '') return String(val)
  }
  return ''
}

export default function StudentExamFeeRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])

  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [studentInfo, setStudentInfo] = useState<AnyRow | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [registeredSubjects, setRegisteredSubjects] = useState<AnyRow[]>([])
  const [checkedSubjectIds, setCheckedSubjectIds] = useState<Set<number>>(new Set())
  const [savingSubjects, setSavingSubjects] = useState(false)
  const [examType, setExamType] = useState<'Regular' | 'Supplementary'>('Regular')

  const [feeTypes, setFeeTypes] = useState<AnyRow[]>([])
  const [feeTypeId, setFeeTypeId] = useState<number | null>(null)
  const [feePreviewAmount, setFeePreviewAmount] = useState(0)
  const [addedFees, setAddedFees] = useState<AddedFee[]>([])
  const [payingFees, setPayingFees] = useState(false)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const exams = useMemo(() => {
    if (filterRows.length === 0) return []
    if (!studentInfo) {
      return dedupeBy(
        filterRows.filter((r) => pickNum(r, ['fk_exam_id', 'examId']) > 0),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      )
    }

    const sidCourse = pickNum(studentInfo, ['courseId', 'fk_course_id', 'course_id'])
    const sidAy = pickNum(studentInfo, ['academicYearId', 'fk_academic_year_id', 'academic_year_id'])
    const sidCollege = pickNum(studentInfo, ['collegeId', 'fk_college_id', 'college_id'])

    let candidates = [...filterRows]

    if (sidCourse > 0) {
      const byCourse = candidates.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === sidCourse)
      if (byCourse.length > 0) candidates = byCourse
    }
    if (sidAy > 0) {
      const byAy = candidates.filter((r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']) === sidAy)
      if (byAy.length > 0) candidates = byAy
    }
    if (sidCollege > 0) {
      const byCollege = candidates.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === sidCollege)
      if (byCollege.length > 0) candidates = byCollege
    }

    return dedupeBy(
      candidates.filter((r) => pickNum(r, ['fk_exam_id', 'examId']) > 0),
      (r) => pickNum(r, ['fk_exam_id', 'examId']),
    )
  }, [filterRows, studentInfo])

  const semesters = useMemo(() => {
    const fromRows = dedupeBy(
      rows,
      (r) => pickNum(r, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fromCourseYearId']),
    ).filter((r) => pickNum(r, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fromCourseYearId']) > 0)
    if (fromRows.length > 0) return fromRows

    if (studentInfo) {
      const sid = pickNum(studentInfo, ['courseYearId', 'fk_course_year_id'])
      if (sid > 0) {
        return [
          {
            courseYearId: sid,
            courseYearName:
              pickText(studentInfo, ['courseYearName', 'course_year_name']) ||
              pickText(studentInfo, ['courseYearCode', 'course_year_code']) ||
              `Semester ${sid}`,
          },
        ]
      }
    }
    return []
  }, [rows, studentInfo])

  const selectedSubjectRows = useMemo(
    () => subjects.filter((s) => checkedSubjectIds.has(pickNum(s, ['fk_subject_id', 'subjectId', 'subject_id']))),
    [subjects, checkedSubjectIds],
  )

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter((s) =>
      `${pickText(s, ['subject_name', 'subjectName', 'shortName'])} ${pickText(s, ['subject_code', 'subjectCode'])}`
        .toLowerCase()
        .includes(q),
    )
  }, [subjects, subjectSearch])

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (!q) {
      setStudents([])
      return
    }
    if (q.length < 3) return
    const rows = await listStudents(q).catch(() => [])
    setStudents(Array.isArray(rows) ? rows : [])
  }

  async function initFilters() {
    setLoading(true)
    try {
      const [filters, addTypes] = await Promise.all([
        getUnivExamFiltersRegSup(employeeId).catch(() => []),
        listAdditionalExamFeeTypes().catch(() => []),
      ])
      setFilterRows(Array.isArray(filters) ? filters : [])
      setFeeTypes(Array.isArray(addTypes) ? addTypes : [])
      if (Array.isArray(addTypes) && addTypes[0]) {
        const id = pickNum(addTypes[0], ['generalDetailId', 'addtExamFeeTypeCatId'])
        setFeeTypeId(id || null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function getList() {
    if (!studentInfo || !examId) return
    const collegeId = Number(studentInfo.collegeId ?? studentInfo.fk_college_id ?? 0)
    const selectedStudentId = Number(studentId ?? getStudentRowId(studentInfo, 0))
    if (!collegeId) return
    setLoading(true)
    try {
      const bundle = await fetchStudentExamFeeRegistrationGridData({
        collegeId,
        examId,
        studentId: selectedStudentId,
      }).catch(() => ({
        receipts: [] as AnyRow[],
        registrations: [] as AnyRow[],
        registeredSubjects: [] as AnyRow[],
      }))
      const receiptRows = Array.isArray(bundle.receipts) ? bundle.receipts : []
      const regRows = Array.isArray(bundle.registrations) ? bundle.registrations : []
      const regSubs = Array.isArray(bundle.registeredSubjects) ? bundle.registeredSubjects : []

      if (receiptRows.length > 0) {
        setRows(receiptRows)
      } else {
        setRows(
          regRows.map((r) => ({
            ...r,
            studentName: r.studentName ?? r.firstName ?? studentInfo.firstName ?? studentInfo.studentName,
            rollNumber: r.rollNumber ?? r.hallticketNumber ?? studentInfo.hallticketNumber ?? studentInfo.rollNumber,
            courseYearName: r.courseYearName ?? r.course_year_name ?? '-',
            receiptNo: '-',
            paymentModeCatDisplayName: '-',
            receiptAmount: r.examFeeAmount ?? r.amount ?? '-',
            regPaymentStatusCatDisplayName: r.regPaymentStatusCatDisplayName ?? r.status ?? 'Registered',
          })),
        )
      }

      setRegisteredSubjects(regSubs)
      setHasFetched(true)

      const firstSem = pickNum((receiptRows[0] ?? regRows[0] ?? {}) as AnyRow, [
        'courseYearId',
        'course_year_id',
        'fk_course_year_id',
        'fromCourseYearId',
      ])
      if (firstSem > 0) {
        setSemesterId(firstSem)
        await loadSemesterSubjects(firstSem, regSubs)
      } else {
        setSemesterId(null)
        setSubjects([])
        setCheckedSubjectIds(new Set())
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadSemesterSubjects(nextSemesterId: number, registeredOverride?: AnyRow[]) {
    if (!studentInfo || !examId || !nextSemesterId) return
    const collegeId = pickNum(studentInfo, ['collegeId', 'fk_college_id'])
    const academicYearId = pickNum(studentInfo, ['academicYearId', 'fk_academic_year_id'])
    const sid = pickNum(studentInfo, ['studentId', 'id', 'fk_student_id'])
    if (!collegeId || !academicYearId || !sid) return
    const subRows = await listStudentSubjects({
      collegeId,
      academicYearId,
      studentId: sid,
      courseYearId: nextSemesterId,
    }).catch(() => [])
    const list = Array.isArray(subRows) ? subRows : []
    setSubjects(list)

    const regSource = registeredOverride ?? registeredSubjects
    const already = new Set(
      regSource.map((r) => pickNum(r, ['fk_subject_id', 'subjectId', 'subject_id'])).filter((x) => x > 0),
    )
    setCheckedSubjectIds(
      new Set(
        list
          .map((s) => pickNum(s, ['fk_subject_id', 'subjectId', 'subject_id']))
          .filter((x) => x > 0 && !already.has(x)),
      ),
    )
  }

  async function onSaveSubjects() {
    if (!studentInfo || !examId || !semesterId || checkedSubjectIds.size === 0) return
    const selected = subjects.filter((s) => checkedSubjectIds.has(pickNum(s, ['fk_subject_id', 'subjectId', 'subject_id'])))
    if (selected.length === 0) return

    const payload = [
      {
        collegeId: pickNum(studentInfo, ['collegeId', 'fk_college_id']),
        courseGroupId: pickNum(studentInfo, ['courseGroupId', 'fk_course_group_id']),
        courseYearId: semesterId,
        regulationId: pickNum(studentInfo, ['regulationId', 'fk_regulation_id']),
        studentId: pickNum(studentInfo, ['studentId', 'id', 'fk_student_id']),
        examId,
        examtypeCatCode: examType === 'Supplementary' ? 'Supple' : 'Regular',
        isActive: true,
        isFeePaid: false,
        examStudentDetailDTOs: selected.map((s) => ({
          ...s,
          courseYearId: semesterId,
          subjectId: pickNum(s, ['fk_subject_id', 'subjectId', 'subject_id']),
          subjectCode: pickText(s, ['subject_code', 'subjectCode']),
          subjectName: pickText(s, ['subject_name', 'subjectName', 'shortName']),
        })),
      },
    ]

    setSavingSubjects(true)
    try {
      await saveRegisteredExamSubjects(payload)
      await getList()
      setCheckedSubjectIds(new Set())
    } finally {
      setSavingSubjects(false)
    }
  }

  function onToggleSubject(id: number, checked: boolean) {
    setCheckedSubjectIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function onAddFee() {
    if (!semesterId || !feeTypeId) return
    const type = feeTypes.find((t) => pickNum(t, ['generalDetailId', 'addtExamFeeTypeCatId']) === Number(feeTypeId))
    if (!type) return
    const feeName = pickText(type, ['generalDetailDisplayName', 'generalDetailName', 'addtExamFeeTypeName']) || 'Additional Fee'
    const amount = Number(type.fee ?? type.amount ?? feePreviewAmount ?? 0)
    const semRow = semesters.find((s) => pickNum(s, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fromCourseYearId']) === semesterId)
    const semName =
      pickText(semRow ?? {}, ['courseYearName', 'course_year_name', 'fromCourseYearName']) ||
      `Semester ${semesterId}`

    setAddedFees((prev) => {
      const exists = prev.findIndex(
        (x) => x.courseYearId === semesterId && x.feeTypeId === Number(feeTypeId) && x.examType === examType,
      )
      if (exists >= 0) {
        const next = [...prev]
        next[exists] = { ...next[exists], amount: feePreviewAmount || amount }
        return next
      }
      return [
        ...prev,
        {
          courseYearId: semesterId,
          courseYearName: semName,
          examType,
          feeTypeId: Number(feeTypeId),
          feeTypeName: feeName,
          amount: feePreviewAmount || amount,
          examFeeReceiptId: null,
        },
      ]
    })
  }

  async function onPayFees() {
    if (!studentInfo || addedFees.length === 0) return
    setPayingFees(true)
    try {
      for (const f of addedFees) {
        await addExamAdditionalFeeReceipt({
          collegeId: pickNum(studentInfo, ['collegeId', 'fk_college_id']),
          addtExamFeeTypeCatId: f.feeTypeId,
          addtExamFeeTypeName: f.feeTypeName,
          addtFeeAmount: Number(f.amount || 0),
          collectedEmpId: employeeId,
          addtReceiptDate: new Date().toISOString().slice(0, 10),
          isActive: true,
        }).catch(() => null)
      }
      setAddedFees([])
      await getList()
    } finally {
      setPayingFees(false)
    }
  }

  useEffect(() => {
    if (!feeTypeId) {
      setFeePreviewAmount(0)
      return
    }
    const t = feeTypes.find((x) => pickNum(x, ['generalDetailId', 'addtExamFeeTypeCatId']) === Number(feeTypeId))
    setFeePreviewAmount(Number(t?.fee ?? t?.amount ?? 0))
  }, [feeTypeId, feeTypes])

  useEffect(() => {
    initFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Examination Fee Collection" subtitle="Manage student exam fee payments" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Examination Fee Collection</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6 space-y-1">
              <Label>Student</Label>
              <Select
                value={studentId ? String(studentId) : null}
                onChange={(v) => {
                  const sid = v ? Number(v) : 0
                  setStudentId(sid)
                  const s = students.find((x, idx) => getStudentRowId(x, idx + 1) === sid) ?? null
                  setStudentInfo(s)
                  setExamId(null)
                }}
                options={students.map((s, i) => ({ value: String(getStudentRowId(s, i + 1)), label: `${s.hallticketNumber ?? s.rollNumber ?? '-'} - ${s.firstName ?? s.studentName ?? '-'}` }))}
                placeholder="Search student name or hallticket…"
                searchable
                onSearch={onSearchStudents}
              />
            </div>
            <div className="md:col-span-5 space-y-1">
              <Label>Exam</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => setExamId(v ? Number(v) : 0)}
                options={exams.map((e, i) => ({ value: String(e.fk_exam_id ?? e.examId ?? i), label: (e.exam_name ?? e.examName) ?? `Exam ${e.fk_exam_id ?? e.examId}` }))}
                placeholder="Select Exam"
              />
            </div>
            <div className="md:col-span-1">
              <Button type="button" className="h-8 text-[12px] w-full" onClick={getList} disabled={loading}>
                Get
              </Button>
            </div>
          </div>
        </div>
      </div>

      {hasFetched && studentInfo && (
        <>
          <div className="app-card p-3">
            <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-8 text-[12px] leading-6">
                  <div className="font-semibold">
                    {pickText(studentInfo, ['firstName', 'studentName', 'student_name']) || '-'}{' '}
                    <span className="text-blue-700">(REGULAR)</span>
                  </div>
                  <div className="text-muted-foreground">
                    {pickText(studentInfo, ['hallticketNumber', 'rollNumber', 'hallticket_number']) || '-'}
                  </div>
                  <div className="text-muted-foreground">
                    {pickText(studentInfo, ['collegeCode']) || '-'} / {pickText(studentInfo, ['academicYear', 'academic_year']) || '-'} /{' '}
                    {pickText(studentInfo, ['courseCode']) || '-'} / {pickText(studentInfo, ['groupCode']) || '-'} /{' '}
                    {pickText(studentInfo, ['courseYearName', 'course_year_name']) || '-'}
                  </div>
                </div>
                <div className="md:col-span-4 text-[12px] leading-7">
                  <div>
                    Quota : <span className="text-blue-700">{pickText(studentInfo, ['quotaDisplayName']) || '-'}</span>
                  </div>
                  <div>
                    Student Status :{' '}
                    <span className="text-green-700 font-medium">{pickText(studentInfo, ['studentStatusDisplayName']) || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="app-card overflow-hidden">
            <div className="px-3 py-2 border-b bg-slate-50">
              <h3 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Select Exam Fee Courses</h3>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-6 text-[12px]">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={examType === 'Regular'} onChange={() => setExamType('Regular')} />
                  Regular
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={examType === 'Supplementary'} onChange={() => setExamType('Supplementary')} />
                  Supplementary
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-2 space-y-1">
                  <Label>Semester *</Label>
                  <Select
                    value={semesterId ? String(semesterId) : null}
                    onChange={(v) => {
                      const id = v ? Number(v) : null
                      setSemesterId(id)
                      if (id) void loadSemesterSubjects(id)
                    }}
                    options={semesters.map((s) => ({
                      value: String(pickNum(s, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fromCourseYearId'])),
                      label:
                        pickText(s, ['courseYearName', 'course_year_name', 'fromCourseYearName']) ||
                        `Semester ${pickNum(s, ['courseYearId', 'course_year_id', 'fk_course_year_id', 'fromCourseYearId'])}`,
                    }))}
                    placeholder="Semester"
                  />
                </div>

                <div className="md:col-span-4 rounded border overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b bg-slate-50 p-2">
                    <SearchInput
                      className="w-full max-w-sm min-w-0"
                      placeholder="Search subjects…"
                      value={subjectSearch}
                      onChange={setSubjectSearch}
                    />
                    <div className="text-[12px]">Courses: {filteredSubjects.length}</div>
                  </div>
                  <div className="max-h-[250px] overflow-auto">
                    {filteredSubjects.map((s, i) => {
                      const sid = pickNum(s, ['fk_subject_id', 'subjectId', 'subject_id'])
                      const checked = checkedSubjectIds.has(sid)
                      return (
                        <div key={`sub-${sid || i}`} className="px-2 py-1 border-t flex items-center gap-2 text-[12px]">
                          <Checkbox checked={checked} onCheckedChange={(v) => onToggleSubject(sid, !!v)} />
                          <span>{pickText(s, ['shortName', 'subject_name', 'subjectName']) || '-'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="md:col-span-3 rounded border overflow-hidden">
                  <div className="px-2 py-2 bg-slate-100 text-[12px] font-medium">Selected Courses: {selectedSubjectRows.length}</div>
                  <div className="max-h-[250px] overflow-auto">
                    {selectedSubjectRows.map((s, i) => (
                      <div key={`sel-${i}`} className="px-2 py-1 border-t text-[12px]">
                        {pickText(s, ['shortName', 'subject_name', 'subjectName']) || '-'}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 rounded border overflow-hidden">
                  <div className="px-2 py-2 bg-slate-100 text-[12px] font-medium">Additional Fee</div>
                  <div className="p-2 space-y-2">
                    <Select
                      value={feeTypeId ? String(feeTypeId) : null}
                      onChange={(v) => setFeeTypeId(v ? Number(v) : null)}
                      options={feeTypes.map((t) => ({
                        value: String(pickNum(t, ['generalDetailId', 'addtExamFeeTypeCatId'])),
                        label: pickText(t, ['generalDetailDisplayName', 'generalDetailName', 'addtExamFeeTypeName']) || 'Additional Fee',
                      }))}
                      placeholder="Fee Type"
                    />
                    <Input
                      type="number"
                      className="h-8 text-[12px]"
                      value={String(feePreviewAmount || 0)}
                      onChange={(e) => setFeePreviewAmount(Number(e.target.value || 0))}
                    />
                    <Button className="h-8 text-[12px] w-full" onClick={onAddFee} disabled={!feeTypeId}>
                      Add Fee
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-8 text-[12px]" onClick={onSaveSubjects} disabled={savingSubjects || checkedSubjectIds.size === 0}>
                  {savingSubjects ? 'Saving...' : 'Save Subjects'}
                </Button>
              </div>
            </div>
          </div>

          {addedFees.length > 0 && (
            <div className="app-card p-3 space-y-2">
              <div className="overflow-auto rounded border">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-1 text-left">SI.No</th>
                      <th className="px-2 py-1 text-left">Semester</th>
                      <th className="px-2 py-1 text-left">Exam Type</th>
                      <th className="px-2 py-1 text-left">Fee Type</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                      <th className="px-2 py-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedFees.map((f, i) => (
                      <tr key={`fee-${i}`} className="border-t">
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{f.courseYearName}</td>
                        <td className="px-2 py-1">{f.examType}</td>
                        <td className="px-2 py-1">{f.feeTypeName}</td>
                        <td className="px-2 py-1 text-right">{f.amount}</td>
                        <td className="px-2 py-1 text-right">
                          <Button variant="ghost" className="h-7 px-2" onClick={() => setAddedFees((prev) => prev.filter((_, idx) => idx !== i))}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button className="h-8 text-[12px]" onClick={onPayFees} disabled={payingFees}>
                  {payingFees ? 'Paying...' : 'Pay Fees'}
                </Button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="app-card p-3">
              <div className="overflow-auto rounded border">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-1">SI.No</th>
                      <th className="text-left px-2 py-1">Student</th>
                      <th className="text-left px-2 py-1">Receipt No</th>
                      <th className="text-left px-2 py-1">Payment Mode</th>
                      <th className="text-left px-2 py-1">Receipt Amount</th>
                      <th className="text-left px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={`p-${r.receiptNo ?? 'na'}-${r.studentName ?? 'na'}-${r.rollNumber ?? 'na'}-${r.receiptAmount ?? 'na'}-${i}`}
                        className="border-t"
                      >
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{r.studentName ?? '-'} ({r.rollNumber ?? '-'})</td>
                        <td className="px-2 py-1">{r.receiptNo ?? r.feeReceiptNo ?? '-'}</td>
                        <td className="px-2 py-1">{r.paymentModeCatDisplayName ?? '-'}</td>
                        <td className="px-2 py-1">{r.receiptAmount ?? r.examFeeAmount ?? '-'}</td>
                        <td className="px-2 py-1">{r.regPaymentStatusCatDisplayName ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}

