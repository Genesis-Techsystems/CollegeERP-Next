'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listActiveColleges,
  listStudentExamFeeRegistrationPayments,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function OnlineExamFeeRegistrationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [fallbackColleges, setFallbackColleges] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [hasFetched, setHasFetched] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [subjectsOpen, setSubjectsOpen] = useState(false)
  const [transactionsOpen, setTransactionsOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('')
  const [subjectsRows, setSubjectsRows] = useState<AnyRow[]>([])
  const [transactionsRows, setTransactionsRows] = useState<AnyRow[]>([])

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(
    () => dedupeBy(filterRows, (r) => Number(r.fk_course_id)).filter((r) => Number(r.fk_course_id) > 0),
    [filterRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ).filter((r) => Number(r.fk_academic_year_id) > 0),
    [filterRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ).filter((r) => Number(r.fk_exam_id) > 0),
    [filterRows, courseId, academicYearId],
  )
  const derivedColleges = useMemo(
    () =>
      dedupeBy(
        [...filterRows, ...restRows].filter(
          (r) =>
            Number(r.fk_course_id ?? r.courseId ?? 0) === Number(courseId) &&
            Number(r.fk_academic_year_id ?? r.academicYearId ?? 0) === Number(academicYearId) &&
            Number(r.fk_exam_id ?? r.examId ?? 0) === Number(examId),
        ),
        (r) => Number(r.fk_college_id ?? r.collegeId ?? 0),
      ).filter((r) => Number(r.fk_college_id ?? r.collegeId ?? 0) > 0),
    [filterRows, restRows, courseId, academicYearId, examId],
  )

  const colleges = useMemo(
    () =>
      dedupeBy(
        [...derivedColleges, ...fallbackColleges].filter(
          (c) => Number(c.fk_college_id ?? c.collegeId ?? 0) > 0,
        ),
        (c) => Number(c.fk_college_id ?? c.collegeId ?? 0),
      ),
    [derivedColleges, fallbackColleges],
  )

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      `${r.studentName ?? ''} ${r.rollNumber ?? ''} ${r.receiptNo ?? ''} ${r.courseYearName ?? ''} ${r.regPaymentStatusCatDisplayName ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [rows, searchText])

  useEffect(() => {
    async function loadFilters() {
      setLoading(true)
      try {
        const list = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
        const normalized = Array.isArray(list) ? list : []
        setFilterRows(normalized)
        const all = await listActiveColleges().catch(() => [])
        setFallbackColleges(Array.isArray(all) ? all : [])
        const firstCourse = dedupeBy(normalized, (r) => Number(r.fk_course_id)).find((r) => Number(r.fk_course_id) > 0)
        if (firstCourse) setCourseId(Number(firstCourse.fk_course_id))
      } finally {
        setLoading(false)
      }
    }
    void loadFilters()
  }, [employeeId])

  function onCourseChange(v: string) {
    setCourseId(Number(v))
    setAcademicYearId(null)
    setExamId(null)
    setCollegeId(null)
    setRows([])
    setHasFetched(false)
  }

  function onAcademicYearChange(v: string) {
    setAcademicYearId(Number(v))
    setExamId(null)
    setCollegeId(null)
    setRows([])
    setHasFetched(false)
  }

  function onExamChange(v: string) {
    const eid = Number(v)
    setExamId(eid)
    setCollegeId(null)
    setRows([])
    setHasFetched(false)
    void loadCollegesByExam(eid)
  }

  async function loadCollegesByExam(eid: number) {
    if (!courseId || !academicYearId || !eid) {
      setRestRows([])
      return
    }
    const rows = await getUnivExamRestNoTt({
      courseId: Number(courseId),
      examId: Number(eid),
      academicYearId: Number(academicYearId),
      employeeId,
    }).catch(() => [])
    setRestRows(Array.isArray(rows) ? rows : [])

    if (!Array.isArray(rows) || rows.length === 0) return
  }

  async function onGetList() {
    if (!collegeId || !examId) return
    setLoading(true)
    try {
      const list = await listStudentExamFeeRegistrationPayments({ collegeId, examId }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  function onRegister() {
    const q = new URLSearchParams()
    if (courseId) q.set('courseId', String(courseId))
    if (academicYearId) q.set('academicYearId', String(academicYearId))
    if (examId) q.set('examId', String(examId))
    if (collegeId) q.set('collegeId', String(collegeId))
    router.push(`/admin-examination-management/pre-examination/student-exam-fee-registration?${q.toString()}`)
  }

  function onViewSubjects(row: AnyRow) {
    const list = row.examStdRegSubDTOs ?? row.examStudentDetailDTOs ?? row.subjects ?? []
    setSubjectsRows(Array.isArray(list) ? list : [])
    setDialogTitle(`Subjects - ${row.studentName ?? row.student_name ?? '-'}`)
    setSubjectsOpen(true)
  }

  function onViewTransactions(row: AnyRow) {
    const list = row.examStdRegTxnDTOs ?? row.transactions ?? row.examStudentRegTxnDTOs ?? []
    setTransactionsRows(Array.isArray(list) ? list : [])
    setDialogTitle(`Transactions - ${row.studentName ?? row.student_name ?? '-'}`)
    setTransactionsOpen(true)
  }

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      const first = Number(colleges[0]?.fk_college_id ?? colleges[0]?.collegeId ?? 0)
      if (first > 0) setCollegeId(first)
    }
  }, [colleges, collegeId])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Fee Registrations" subtitle="View online exam fee registration payments" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Exam Fee Registrations</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filterOpen && (
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label>Course *</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => onCourseChange(v ?? '')}
                options={courses.map((c) => ({ value: String(c.fk_course_id), label: c.course_code }))}
                placeholder="Course"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year *</Label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => onAcademicYearChange(v ?? '')}
                options={academicYears.map((a) => ({ value: String(a.fk_academic_year_id), label: a.academic_year }))}
                placeholder="Exam Year"
              />
            </div>

            <div className="md:col-span-5 space-y-1">
              <Label>Exam Master *</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => onExamChange(v ?? '')}
                options={exams.map((e) => ({ value: String(e.fk_exam_id), label: (e.exam_name ?? e.examName) ?? `Exam ${e.fk_exam_id}` }))}
                placeholder="Exam Master"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>College *</Label>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => setCollegeId(v ? Number(v) : null)}
                options={colleges.map((c) => ({ value: String(c.fk_college_id ?? c.collegeId), label: c.college_code ?? c.collegeCode ?? c.college_name ?? c.collegeName ?? `College ${c.fk_college_id ?? c.collegeId}` }))}
                placeholder="College"
              />
            </div>

            <div className="md:col-span-1">
              <Button type="button" onClick={onGetList} disabled={loading || !collegeId || !examId} className="h-8 px-3 text-[12px] w-full">
                Get List
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-3 border-b bg-slate-50 flex items-center justify-between gap-3">
            <div className="max-w-[360px]">
              <Input
                className="h-8 text-[12px]"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Student</th>
                  <th className="px-2 py-1 text-left">Course Year</th>
                  <th className="px-2 py-1 text-left">Receipt No.</th>
                  <th className="px-2 py-1 text-left">Payment Mode</th>
                  <th className="px-2 py-1 text-left">Receipt Amount</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Transactions</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={`r-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{r.studentName ?? r.student_name ?? '-'} ({r.rollNumber ?? r.hallticketNumber ?? '-'})</td>
                    <td className="px-2 py-1">{r.courseYearName ?? r.course_year_name ?? '-'}</td>
                    <td className="px-2 py-1">{r.receiptNo ?? r.receipt_no ?? '-'}</td>
                    <td className="px-2 py-1">{r.paymentModeCatDisplayName ?? r.payment_mode_name ?? '-'}</td>
                    <td className="px-2 py-1">{r.receiptAmount ?? r.receipt_amount ?? '-'}</td>
                    <td className="px-2 py-1">{r.regPaymentStatusCatDisplayName ?? r.payment_status ?? '-'}</td>
                    <td className="px-2 py-1">
                      <Button type="button" variant="outline" className="h-7 text-[11px]" onClick={() => onViewTransactions(r)}>
                        View
                      </Button>
                    </td>
                    <td className="px-2 py-1">
                      <Button type="button" variant="outline" className="h-7 text-[11px]" onClick={() => onViewSubjects(r)}>
                        Subjects
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={9} className="px-2 py-6 text-center text-muted-foreground">No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={subjectsOpen} onOpenChange={setSubjectsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto border rounded">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject Code</th>
                  <th className="px-2 py-1 text-left">Subject Name</th>
                </tr>
              </thead>
              <tbody>
                {subjectsRows.map((s, i) => (
                  <tr key={`sub-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{s.subjectCode ?? s.subject_code ?? '-'}</td>
                    <td className="px-2 py-1">{s.subjectName ?? s.subject_name ?? '-'}</td>
                  </tr>
                ))}
                {subjectsRows.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">No subjects found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transactionsOpen} onOpenChange={setTransactionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto border rounded">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Transaction No</th>
                  <th className="px-2 py-1 text-left">Amount</th>
                  <th className="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsRows.map((t, i) => (
                  <tr key={`txn-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{t.transactionNo ?? t.transaction_no ?? '-'}</td>
                    <td className="px-2 py-1">{t.transactionAmount ?? t.amount ?? '-'}</td>
                    <td className="px-2 py-1">{t.transactionStatus ?? t.status ?? '-'}</td>
                  </tr>
                ))}
                {transactionsRows.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={4} className="px-2 py-6 text-center text-muted-foreground">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

