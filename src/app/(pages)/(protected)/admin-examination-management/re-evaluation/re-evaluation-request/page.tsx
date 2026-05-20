'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import { BookMarked, ChevronDown, Eye, UserRound } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { MINIO_URL } from '@/config/constants/api'
import { listStudents } from '@/services/pre-examination'
import {
  getStudentRevisionRequestHistory,
  listExamRevisionTypes,
  listStudentExamsForRevaluationFee,
  listStudentPhotocopyEvaluationDetails,
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

async function hydrateFromSearchParams(args: {
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

function isPhotocopyRevisionType(row: AnyRow): boolean {
  const label = strFrom(row, ['generalDetailDisplayName', 'general_detail_display_name']).toLowerCase()
  return label.includes('photo')
}

function revisionRowId(data: AnyRow | undefined): string {
  if (!data) return '__no-data__'
  return [
    strFrom(data, ['hallticket_number', 'hallticketNumber']),
    strFrom(data, ['gd_code', 'gdCode']),
    strFrom(data, ['subject_details', 'subjectDetails']),
    strFrom(data, ['course_year_code', 'courseYearCode']),
    String(data.fee_amount ?? data.feeAmount ?? ''),
  ].join('|')
}

const HISTORY_COL_DEFS = {
  siNo: {
    colId: 'siNo',
    headerName: 'SI.No',
    valueGetter: (p: { node?: { rowIndex?: number | null } | null }) => (p.node?.rowIndex ?? 0) + 1,
    width: 72,
    minWidth: 70,
    flex: 0,
    sortable: false,
  } as ColDef<AnyRow>,
  hallTicket: {
    colId: 'hallTicket',
    headerName: 'Hall ticket no.',
    minWidth: 130,
    valueGetter: (p) => strFrom(p.data ?? {}, ['hallticket_number', 'hallticketNumber']) || '—',
  } as ColDef<AnyRow>,
  courseYear: {
    colId: 'courseYear',
    headerName: 'Course/year',
    minWidth: 120,
    valueGetter: (p) => strFrom(p.data ?? {}, ['course_year_code', 'courseYearCode']) || '—',
  } as ColDef<AnyRow>,
  gdCode: {
    colId: 'gdCode',
    headerName: 'GD code',
    minWidth: 100,
    valueGetter: (p) => strFrom(p.data ?? {}, ['gd_code', 'gdCode']) || '—',
  } as ColDef<AnyRow>,
  subjectDetails: {
    colId: 'subjectDetails',
    headerName: 'Subject details',
    minWidth: 220,
    flex: 1,
    valueGetter: (p) => strFrom(p.data ?? {}, ['subject_details', 'subjectDetails']) || '—',
  } as ColDef<AnyRow>,
  feeAmount: {
    colId: 'feeAmount',
    headerName: 'Fee amount',
    minWidth: 110,
    flex: 0,
    cellClass: 'ag-right-aligned-cell',
    valueGetter: (p) => {
      const row = p.data ?? {}
      const v = row.fee_amount ?? row.feeAmount
      if (v != null && String(v).trim() !== '') return `₹ ${v}`
      return '—'
    },
  } as ColDef<AnyRow>,
  view: {
    colId: 'view',
    headerName: 'View',
    width: 72,
    minWidth: 72,
    flex: 0,
    sortable: false,
    suppressSizeToFit: true,
  } as ColDef<AnyRow>,
}

function makePhotocopyViewRenderer(onView: () => void) {
  return function photocopyViewCell(_p: ICellRendererParams<AnyRow>) {
    return (
      <div className="flex h-full items-center justify-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="View evaluation details"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    )
  }
}

export default function ReEvaluationRequestPage() {
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
  const [revisionHistory, setRevisionHistory] = useState<AnyRow[]>([])
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [photocopyOpen, setPhotocopyOpen] = useState(false)
  const [photocopyRows, setPhotocopyRows] = useState<AnyRow[]>([])
  const [photocopyLoading, setPhotocopyLoading] = useState(false)
  const [revisionHistoryLoading, setRevisionHistoryLoading] = useState(false)

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
      exams
        .map((x) => ({
          value: String(numFrom(x, ['fk_exam_id', 'examId'])),
          label: strFrom(x, ['exam_name', 'examName']),
        }))
        .filter((o) => o.value !== '0'),
    [exams],
  )

  const revisionOptions = useMemo(
    () =>
      revisionTypes
        .map((x) => ({
          value: String(numFrom(x, ['generalDetailId', 'general_detail_id'])),
          label: strFrom(x, ['generalDetailDisplayName', 'general_detail_display_name', 'generalDetailCode']),
        }))
        .filter((o) => o.value !== '0'),
    [revisionTypes],
  )

  const selectedRevisionType = useMemo(
    () => revisionTypes.find((t) => numFrom(t, ['generalDetailId', 'general_detail_id']) === revisionTypeId) ?? null,
    [revisionTypes, revisionTypeId],
  )

  const showPhotocopyColumn =
    revisionTypeId != null &&
    Boolean(selectedRevisionType && isPhotocopyRevisionType(selectedRevisionType))

  useEffect(() => {
    const roll = searchParams.get('stdRollNumber') ?? searchParams.get('q') ?? ''
    const sidParam = searchParams.get('studentId')
    if (!roll && !sidParam) return
    const key = searchParams.toString()
    if (appliedQueryKey.current === key) return
    appliedQueryKey.current = key

    void hydrateFromSearchParams({
      searchParams,
      loadExamsForStudent,
      setLoading,
      setStudentRows,
      setStudentId,
      setStudentRow,
      setExamId,
    })
  }, [searchParams, loadExamsForStudent])

  useEffect(() => {
    if (!studentId || !examId) {
      setRevisionHistory([])
      return
    }
    let cancelled = false
    ;(async () => {
      setRevisionHistoryLoading(true)
      try {
        const rows = await getStudentRevisionRequestHistory({ examId, studentId })
        if (!cancelled) setRevisionHistory(Array.isArray(rows) ? rows : [])
      } catch (e) {
        if (!cancelled) {
          toastError(e, 'Failed to load re-evaluation request history')
          setRevisionHistory([])
        }
      } finally {
        if (!cancelled) setRevisionHistoryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studentId, examId])

  async function onSelectStudent(value: string | null) {
    const sid = value ? Number(value) : null
    setStudentId(sid)
    setStudentRow(
      sid ? studentRows.find((r) => numFrom(r, ['studentId', 'student_id', 'fk_student_id']) === sid) ?? null : null,
    )
    setExamId(null)
    setRevisionTypeId(null)
    setRevisionHistory([])
    setExams([])
    if (sid && sid > 0) await loadExamsForStudent(sid)
  }

  const openPhotocopyView = useCallback(async () => {
    if (!studentId || !examId) return
    setPhotocopyOpen(true)
    setPhotocopyLoading(true)
    setPhotocopyRows([])
    try {
      const rows = await listStudentPhotocopyEvaluationDetails({ examId, studentId })
      setPhotocopyRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Failed to load evaluation details')
    } finally {
      setPhotocopyLoading(false)
    }
  }, [studentId, examId])

  const historyColumnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const base: ColDef<AnyRow>[] = [
      HISTORY_COL_DEFS.siNo,
      HISTORY_COL_DEFS.hallTicket,
      HISTORY_COL_DEFS.courseYear,
      HISTORY_COL_DEFS.gdCode,
      HISTORY_COL_DEFS.subjectDetails,
      HISTORY_COL_DEFS.feeAmount,
    ]
    if (showPhotocopyColumn) {
      base.push({
        ...HISTORY_COL_DEFS.view,
        cellRenderer: makePhotocopyViewRenderer(() => {
          void openPhotocopyView()
        }),
      })
    }
    return base
  }, [showPhotocopyColumn, openPhotocopyView])

  const photoSrc = resolvePhotoUrl(studentRow)
  const statusCode = strFrom(studentRow ?? {}, ['studentStatusCode', 'student_status_code'])
  const statusName = strFrom(
    studentRow ?? {},
    ['studentStatusDisplayName', 'student_status_display_name', 'studentStatus'],
  )
  const showProfile = Boolean(studentId && examId)

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Re-evaluation request" subtitle="Examination management · Re-valuation · Request history" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Re-evaluation request</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[13px]"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="reval-request-filters"
          >
            Filters
            <ChevronDown
              className={`ml-1 h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </Button>
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent id="reval-request-filters">
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
                <Label>Exam</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    const id = v ? Number(v) : null
                    setExamId(id)
                    setRevisionTypeId(null)
                  }}
                  options={examOptions}
                  placeholder="Exam"
                  searchable
                  disabled={!studentId || exams.length === 0}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Exam revision type</Label>
                <Select
                  value={revisionTypeId ? String(revisionTypeId) : null}
                  onChange={(v) => setRevisionTypeId(v ? Number(v) : null)}
                  options={revisionOptions}
                  placeholder="Optional"
                  disabled={!examId}
                  clearable
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {showProfile && studentRow && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Student</h2>
          </div>
          <div className="mt-3 rounded-md border border-blue-200 bg-muted/40/80 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <UserRound className="h-12 w-12 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-[13px]">
                <p className="text-[15px] font-semibold text-slate-900">
                  {strFrom(studentRow, ['firstName', 'first_name']) || '-'}
                </p>
                <p className="text-muted-foreground">
                  {strFrom(studentRow, ['rollNumber', 'roll_number', 'hallticketNumber', 'hallticket_number']) || '-'}
                </p>
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
                  <span className="text-blue-700 font-medium">
                    {strFrom(studentRow, ['quotaDisplayName', 'quota_display_name']) || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-700">Student status : </span>
                  <span className={statusTextClass(statusCode || statusName)}>{statusName || statusCode || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={revisionHistory}
            columnDefs={historyColumnDefs}
            loading={revisionHistoryLoading}
            pagination
            paginationPageSize={10}
            getRowId={(p) => revisionRowId(p.data)}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search request history…',
              pdfDocumentTitle: 'Re-evaluation request history',
            }}
            toolbarLeading={(
              <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                Request history
                {revisionHistory.length > 0 ? ` · ${revisionHistory.length} record${revisionHistory.length === 1 ? '' : 's'}` : null}
              </span>
            )}
          />
        </TableCard>
      )}

      <Dialog open={photocopyOpen} onOpenChange={setPhotocopyOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluation details</DialogTitle>
          </DialogHeader>
          {photocopyLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : photocopyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No records returned.</p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    {Object.keys(photocopyRows[0] ?? {}).slice(0, 12).map((k) => (
                      <th key={k} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {photocopyRows.map((r, i) => (
                    <tr key={i} className="border-b">
                      {Object.keys(photocopyRows[0] ?? {})
                        .slice(0, 12)
                        .map((k) => (
                          <td key={k} className="px-2 py-1.5 align-top break-all max-w-[200px]">
                            {r[k] != null ? String(r[k]) : ''}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
