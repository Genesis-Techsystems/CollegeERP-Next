'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import { BookMarked, UserRound } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { MINIO_URL } from '@/config/constants/api'
import { listStudents } from '@/services/pre-examination'
import {
  getExamRevisionStdDetailsBundle,
  listExamRevisionTypes,
  listStudentExamsForRevaluationFee,
  mergeRevaluationReceiptRows,
  type MergedRevaluationReceipt,
} from '@/services/re-evaluation'
import { toastError } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key])
    if (Number.isFinite(val) && val > 0) return val
  }
  return 0
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? '').trim()
    if (val) return val
  }
  return ''
}

function studentSelectLabel(r: AnyRow): string {
  const ht = strFrom(r, ['hallticketNumber', 'hallticket_number', 'rollNumber', 'roll_number'])
  const name = strFrom(r, ['firstName', 'first_name'])
  if (ht && name) return `${ht}(${name})`
  if (ht) return ht
  if (name) return name
  return '-'
}

function statusTextClass(code: string): string {
  const c = code.replaceAll(/\s+/g, '').toUpperCase()
  if (c.includes('INCOLLEGE') || c === 'INCOLLEGE') return 'text-emerald-600 font-medium'
  if (c.includes('PASSED') || c === 'PASSEDOUT') return 'text-slate-600 font-medium'
  if (c.includes('DISCONT')) return 'text-amber-700 font-medium'
  if (c.includes('DETAIN')) return 'text-orange-600 font-medium'
  if (c.includes('DTND')) return 'text-red-600 font-medium'
  return 'text-slate-700 font-medium'
}

function formatReceiptDate(value: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function receiptDetailsLine(r: MergedRevaluationReceipt): string {
  const parts = [r.course_year_code, r.payment_mode].filter(Boolean)
  const codes = r.subjects.map((s) => strFrom(s, ['subject_code', 'subjectCode'])).filter(Boolean)
  if (codes.length > 0) {
    const head = codes.slice(0, 3).join(', ')
    parts.push(codes.length > 3 ? `${head}…` : head)
  }
  return parts.join(' · ') || '-'
}

function applyExamIdFromQuery(examParam: string | null, setExamId: (v: number | null) => void) {
  if (examParam) setExamId(Number(examParam))
}

async function hydrateFromRollQuery(args: {
  roll: string
  sidParam: string | null
  examParam: string | null
  loadExamsForStudent: (sid: number) => Promise<void>
  setStudentRows: (v: AnyRow[]) => void
  setStudentId: (v: number | null) => void
  setStudentRow: (v: AnyRow | null) => void
  setExamId: (v: number | null) => void
}): Promise<void> {
  const { roll, sidParam, examParam, loadExamsForStudent, setStudentRows, setStudentId, setStudentRow, setExamId } = args
  const rows = await listStudents(roll)
  setStudentRows(Array.isArray(rows) ? rows : [])
  const list = Array.isArray(rows) ? rows : []
  const sid = sidParam ? Number(sidParam) : numFrom(list[0] ?? {}, ['studentId', 'student_id', 'fk_student_id'])
  if (sid <= 0) return
  setStudentId(sid)
  const match = list.find((r) => numFrom(r, ['studentId', 'student_id', 'fk_student_id']) === sid)
  setStudentRow(match ?? null)
  await loadExamsForStudent(sid)
  applyExamIdFromQuery(examParam, setExamId)
}

async function hydrateFromStudentIdQuery(args: {
  sidParam: string
  examParam: string | null
  loadExamsForStudent: (sid: number) => Promise<void>
  setStudentId: (v: number | null) => void
  setExamId: (v: number | null) => void
}): Promise<void> {
  const { sidParam, examParam, loadExamsForStudent, setStudentId, setExamId } = args
  const sid = Number(sidParam)
  if (sid <= 0) return
  setStudentId(sid)
  await loadExamsForStudent(sid)
  applyExamIdFromQuery(examParam, setExamId)
}

async function hydrateRevaluationFeeFromSearchParams(args: {
  searchParams: ReadonlyURLSearchParams
  loadExamsForStudent: (sid: number) => Promise<void>
  setLoading: (v: boolean) => void
  setStudentRows: (v: AnyRow[]) => void
  setStudentId: (v: number | null) => void
  setStudentRow: (v: AnyRow | null) => void
  setExamId: (v: number | null) => void
}): Promise<void> {
  const { searchParams, loadExamsForStudent, setLoading, setStudentRows, setStudentId, setStudentRow, setExamId } = args
  const roll = searchParams.get('stdRollNumber') ?? searchParams.get('q') ?? ''
  const sidParam = searchParams.get('studentId')
  const examParam = searchParams.get('examId')
  setLoading(true)
  try {
    if (roll) {
      await hydrateFromRollQuery({
        roll,
        sidParam,
        examParam,
        loadExamsForStudent,
        setStudentRows,
        setStudentId,
        setStudentRow,
        setExamId,
      })
      return
    }
    if (sidParam) {
      await hydrateFromStudentIdQuery({ sidParam, examParam, loadExamsForStudent, setStudentId, setExamId })
    }
  } catch (e) {
    toastError(e, 'Failed to apply URL parameters')
  } finally {
    setLoading(false)
  }
}

function resolvePhotoUrl(row: AnyRow | null): string | null {
  if (!row) return null
  const path = strFrom(row, ['studentPhotoPath', 'student_photo_path', 'photoPath'])
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = MINIO_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

export default function ReEvaluationFeeCollectionPage() {
  const searchParams = useSearchParams()
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const appliedQueryKey = useRef<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [studentRow, setStudentRow] = useState<AnyRow | null>(null)
  const [exams, setExams] = useState<AnyRow[]>([])
  const [examId, setExamId] = useState<number | null>(null)
  const [revisionTypes, setRevisionTypes] = useState<AnyRow[]>([])
  const [revisionTypeId, setRevisionTypeId] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [mergedReceipts, setMergedReceipts] = useState<MergedRevaluationReceipt[]>([])

  useEffect(() => {
    async function loadRevisionTypes() {
      try {
        const rows = await listExamRevisionTypes()
        setRevisionTypes(Array.isArray(rows) ? rows : [])
      } catch (e) {
        toastError(e, 'Failed to load revision types')
      }
    }
    void loadRevisionTypes()
  }, [])

  const loadExamsForStudent = useCallback(
    async (sid: number) => {
      setLoading(true)
      try {
        const rows = await listStudentExamsForRevaluationFee(sid, employeeId)
        setExams(rows)
        const firstId = numFrom(rows[0] ?? {}, ['fk_exam_id', 'examId'])
        setExamId(firstId || null)
      } catch (e) {
        toastError(e, 'Failed to load exams for student')
        setExams([])
        setExamId(null)
      } finally {
        setLoading(false)
      }
    },
    [employeeId],
  )

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 2) {
      setStudentRows([])
      return
    }
    setStudentSearchLoading(true)
    try {
      const rows = await listStudents(q)
      setStudentRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Student search failed')
      setStudentRows([])
    } finally {
      setStudentSearchLoading(false)
    }
  }, [])

  const studentOptions = useMemo(() => {
    const base = studentRows
      .map((r) => ({
        value: String(numFrom(r, ['studentId', 'student_id', 'fk_student_id'])),
        label: studentSelectLabel(r),
      }))
      .filter((o) => o.value !== '0')
    const sid = studentId ? String(studentId) : null
    if (sid && studentRow && !base.some((o) => o.value === sid)) {
      return [{ value: sid, label: studentSelectLabel(studentRow) }, ...base]
    }
    return base
  }, [studentRows, studentId, studentRow])

  const examOptions = useMemo(
    () =>
      exams.map((x) => ({
        value: String(numFrom(x, ['fk_exam_id', 'examId'])),
        label: strFrom(x, ['exam_name', 'examName']),
      })).filter((o) => o.value !== '0'),
    [exams],
  )

  const revisionOptions = useMemo(
    () =>
      revisionTypes.map((x) => ({
        value: String(numFrom(x, ['generalDetailId', 'general_detail_id'])),
        label: strFrom(x, ['generalDetailDisplayName', 'general_detail_display_name', 'generalDetailCode']),
      })).filter((o) => o.value !== '0'),
    [revisionTypes],
  )

  useEffect(() => {
    const roll = searchParams.get('stdRollNumber') ?? searchParams.get('q') ?? ''
    const sidParam = searchParams.get('studentId')
    if (!roll && !sidParam) return
    const key = searchParams.toString()
    if (appliedQueryKey.current === key) return
    appliedQueryKey.current = key

    void hydrateRevaluationFeeFromSearchParams({
      searchParams,
      loadExamsForStudent,
      setLoading,
      setStudentRows,
      setStudentId,
      setStudentRow,
      setExamId,
    })
  }, [searchParams, loadExamsForStudent])

  async function onSelectStudent(value: string | null) {
    const sid = value ? Number(value) : null
    setStudentId(sid)
    setStudentRow(sid ? studentRows.find((r) => numFrom(r, ['studentId', 'student_id', 'fk_student_id']) === sid) ?? null : null)
    setExamId(null)
    setRevisionTypeId(null)
    setShowProfile(false)
    setMergedReceipts([])
    setExams([])
    if (sid && sid > 0) await loadExamsForStudent(sid)
  }

  async function onSelectRevision(value: string | null) {
    const rid = value ? Number(value) : null
    setRevisionTypeId(rid)
    setShowProfile(Boolean(studentId && examId && rid))
    setMergedReceipts([])
    if (!studentId || !examId || !rid) return

    setLoading(true)
    try {
      const bundle = await getExamRevisionStdDetailsBundle({ examId, studentId })
      setMergedReceipts(mergeRevaluationReceiptRows(bundle.receiptRows))
    } catch (e) {
      toastError(e, 'Failed to load re-valuation details')
    } finally {
      setLoading(false)
    }
  }

  const photoSrc = resolvePhotoUrl(studentRow)
  const statusCode = strFrom(studentRow ?? {}, ['studentStatusCode', 'student_status_code'])
  const statusName = strFrom(studentRow ?? {}, ['studentStatusDisplayName', 'student_status_display_name', 'studentStatus'])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Re-Valuation Fee" subtitle="Examination management · Re-valuation" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
          <h2 className="app-card-title">Re-Valuation Fee</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-5">
            <Label>Student</Label>
            <Select
              value={studentId ? String(studentId) : null}
              onChange={(v) => void onSelectStudent(v)}
              options={studentOptions}
              placeholder="Search by name or hall ticket…"
              searchable
              onSearch={(t) => void onStudentSearch(t)}
              isLoading={studentSearchLoading}
              clearable
            />
          </div>
          <div className="space-y-1 md:col-span-5">
            <Label>Exam *</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => {
                const id = v ? Number(v) : null
                setExamId(id)
                setRevisionTypeId(null)
                setShowProfile(false)
                setMergedReceipts([])
              }}
              options={examOptions}
              placeholder="Exam"
              searchable
              disabled={!studentId || exams.length === 0}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Revision Type</Label>
            <Select
              value={revisionTypeId ? String(revisionTypeId) : null}
              onChange={(v) => void onSelectRevision(v)}
              options={revisionOptions}
              placeholder="Type"
              disabled={!examId}
            />
          </div>
        </div>
      </div>

      {showProfile && studentRow && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Re-Valuation Fee</h2>
          </div>
          <div className="mt-3 rounded-md border border-blue-200 bg-muted/40/80 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoSrc} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <UserRound className="h-12 w-12 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-[13px]">
                <p className="text-[15px] font-semibold text-slate-900">{strFrom(studentRow, ['firstName', 'first_name']) || '-'}</p>
                <p className="text-muted-foreground">{strFrom(studentRow, ['rollNumber', 'roll_number', 'hallticketNumber', 'hallticket_number']) || '-'}</p>
                <p className="text-muted-foreground">
                  {[
                    strFrom(studentRow, ['collegeCode', 'college_code']),
                    strFrom(studentRow, ['academicYear', 'academic_year']),
                    strFrom(studentRow, ['courseCode', 'course_code']),
                    strFrom(studentRow, ['groupCode', 'group_code']),
                    strFrom(studentRow, ['courseYearName', 'course_year_name', 'courseYearCode']),
                    strFrom(studentRow, ['section']) ? `Section ${strFrom(studentRow, ['section'])}` : '',
                  ]
                    .filter(Boolean)
                    .join(' / ')}
                </p>
                <p className="text-muted-foreground">{strFrom(studentRow, ['mobile', 'phone', 'studentMobile']) || '-'}</p>
              </div>
              <div className="shrink-0 space-y-1 text-[13px] md:text-right">
                <div>
                  <span className="text-slate-700">Quota : </span>
                  <span className="text-blue-700 font-medium">{strFrom(studentRow, ['quotaDisplayName', 'quota_display_name']) || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-700">Student Status : </span>
                  <span className={statusTextClass(statusCode || statusName)}>{statusName || statusCode || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-semibold">Receipt Date</th>
                <th className="px-3 py-2 text-left font-semibold">Receipt No.</th>
                <th className="px-3 py-2 text-right font-semibold">Receipt Amount</th>
                <th className="px-3 py-2 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {mergedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    {loading ? 'Loading…' : 'No receipt records'}
                  </td>
                </tr>
              ) : (
                mergedReceipts.map((r) => (
                  <tr key={r.fk_exam_addt_fee_receipt_id} className="border-b">
                    <td className="px-3 py-2">{formatReceiptDate(r.receipt_date)}</td>
                    <td className="px-3 py-2">{r.fee_receipt_no || '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.exam_total_amount ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{receiptDetailsLine(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  )
}
