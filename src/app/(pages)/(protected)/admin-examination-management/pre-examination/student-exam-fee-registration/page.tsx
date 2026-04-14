'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import {
  getUnivExamFiltersRegSup,
  listStudents,
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

export default function StudentExamFeeRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [payments, setPayments] = useState<AnyRow[]>([])

  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [studentId, setStudentId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [studentInfo, setStudentInfo] = useState<AnyRow | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const exams = useMemo(() => {
    if (!studentInfo) return []
    const sidCourse = Number(studentInfo.courseId ?? studentInfo.fk_course_id ?? 0)
    const sidAy = Number(studentInfo.academicYearId ?? studentInfo.fk_academic_year_id ?? 0)
    const sidCollege = Number(studentInfo.collegeId ?? studentInfo.fk_college_id ?? 0)
    const byCourse = filterRows.filter((r) => Number(r.fk_course_id) === sidCourse)
    const byAy = sidAy > 0 ? byCourse.filter((r) => Number(r.fk_academic_year_id) === sidAy) : byCourse
    const byCollege = sidCollege > 0 ? byAy.filter((r) => Number(r.fk_college_id) === sidCollege) : byAy
    return dedupeBy(byCollege, (r) => Number(r.fk_exam_id)).filter((r) => Number(r.fk_exam_id) > 0)
  }, [filterRows, studentInfo])

  async function searchStudents() {
    const q = studentSearch.trim()
    if (q.length < 3) return
    const rows = await listStudents(q).catch(() => [])
    setStudents(Array.isArray(rows) ? rows : [])
  }

  async function initFilters() {
    setLoading(true)
    try {
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      setFilterRows(rows)
    } finally {
      setLoading(false)
    }
  }

  async function getList() {
    if (!studentInfo || !examId) return
    const collegeId = Number(studentInfo.collegeId ?? studentInfo.fk_college_id ?? 0)
    if (!collegeId) return
    setLoading(true)
    try {
      const rows = await listStudentExamFeeRegistrationPayments({ collegeId, examId }).catch(() => [])
      setPayments(Array.isArray(rows) ? rows : [])
    } finally {
      setLoading(false)
    }
  }

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
            <div className="md:col-span-3 space-y-1">
              <Label>Student Search</Label>
              <div className="flex gap-2">
                <Input
                  className="h-8 text-[12px]"
                  placeholder="Search student name / hallticket"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={searchStudents}>
                  Search
                </Button>
              </div>
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Student</Label>
              <Select
                value={studentId ? String(studentId) : null}
                onChange={(v) => {
                  const sid = v ? Number(v) : 0
                  setStudentId(sid)
                  const s = students.find((x) => Number(x.studentId ?? x.id) === sid) ?? null
                  setStudentInfo(s)
                  setExamId(null)
                }}
                options={students.map((s, i) => ({ value: String(s.studentId ?? s.id ?? i), label: (s.hallticketNumber ?? s.rollNumber ?? '-') + ' - ' + (s.firstName ?? s.studentName ?? '-') }))}
                placeholder="Select Student"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
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

      {payments.length > 0 && (
        <div className="app-card p-4">
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
                {payments.map((r, i) => (
                  <tr key={`p-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{r.studentName ?? '-'} ({r.rollNumber ?? '-'})</td>
                    <td className="px-2 py-1">{r.receiptNo ?? '-'}</td>
                    <td className="px-2 py-1">{r.paymentModeCatDisplayName ?? '-'}</td>
                    <td className="px-2 py-1">{r.receiptAmount ?? '-'}</td>
                    <td className="px-2 py-1">{r.regPaymentStatusCatDisplayName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

