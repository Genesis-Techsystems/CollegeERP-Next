'use client'

/**
 * Exam Barcodes By Seat No — React port of Angular
 * `exam-papers-delivery-process/exam-seatno-barcodes`.
 *
 * Cascade filters (eg_filters → eg_ec_filters → eg_ec_qc_filters), barcode list
 * via `s_get_barcode_details`, dual-table selection, and print stickers (GU).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams, IHeaderParams } from 'ag-grid-community'
import { Printer, Trash2 } from 'lucide-react'
import { FilteredPage } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { rowIndexGetter } from '@/lib/utils'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast'
import { ExamBundlePrintStickersView } from '../exam-bundle-print/ExamBundlePrintStickersView'
import {
  getExamCenterFilterGroups,
  listExamSeatnoBarcodeDetails,
  type AnyRow,
} from '@/services/exam-papers-delivery'

const PAGE_TITLE = 'Exam Barcodes By Seat No'

type Row = AnyRow & { isSelected?: boolean }

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<number | string>()
  const out: T[] = []
  for (const r of rows) {
    const k = keyFn(r)
    if (k == null || k === '' || k === 0 || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

interface FormState {
  academicYearId: string
  examGroupId: string
  examCenterId: string
  examDate: string
  subjectId: string
  ecStdSeatNo: string
}

const EMPTY_FORM: FormState = {
  academicYearId: '',
  examGroupId: '',
  examCenterId: '',
  examDate: '',
  subjectId: '',
  ecStdSeatNo: '0',
}

function rowPk(row: Row): number {
  return num(row.pk_univ_ec_student_id)
}

type SelectAllHeaderParams = IHeaderParams & {
  checked: boolean
  onToggle: (checked: boolean) => void
}

function SelectAllHeader(props: SelectAllHeaderParams) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Checkbox
        checked={props.checked}
        onCheckedChange={(v) => props.onToggle(v === true)}
        aria-label="Select all"
      />
    </div>
  )
}

/** Map seat-no rows to the shape expected by ExamBundlePrintStickersView. */
function toStickerRows(rows: Row[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    ec_seatno: r.ec_seat_no ?? r.ec_seatno,
    fk_univ_exam_bundle_id: num(r.pk_subject_id ?? r.fk_subject_id ?? r.fk_univ_exam_bundle_id),
    bundle_number: txt(r.bundle_number) || txt(r.subject_code),
  }))
}

function makeSelectCellRenderer(toggleRow: (pk: number, checked: boolean) => void) {
  return (p: ICellRendererParams<Row>) => {
    const pk = rowPk(p.data ?? {})
    return (
      <div className="flex items-center justify-center h-full">
        <Checkbox
          checked={p.data?.isSelected === true}
          onCheckedChange={(v) => toggleRow(pk, v === true)}
          aria-label="Select row"
        />
      </div>
    )
  }
}

function makeRemoveRenderer(onRemove: (seatNo: number) => void) {
  return (p: ICellRendererParams<Row>) => {
    const seatNo = num(p.data?.ec_seat_no)
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        title="Remove"
        onClick={() => onRemove(seatNo)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function ExamSeatnoBarcodesPage() {
  const searchParams = useSearchParams()
  const restoredSelected = useRef(false)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([])
  const [ecGroupRows, setEcGroupRows] = useState<Row[]>([])
  const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([])
  const [barcodeRows, setBarcodeRows] = useState<Row[]>([])
  const [selectedRows, setSelectedRows] = useState<Row[]>([])
  const [stickerRows, setStickerRows] = useState<Record<string, unknown>[]>([])
  const [showStickerPrint, setShowStickerPrint] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const clearListState = useCallback(() => {
    setBarcodeRows([])
    setHasFetched(false)
  }, [])

  const loadAcademicYearAndGroups = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const groups = await getExamCenterFilterGroups({ flag: 'eg_filters' })
      const flat: Row[] = []
      for (const g of groups) {
        if (g.length > 0 && txt(g[0].flag) === 'eg_ay_filter') flat.push(...g)
      }
      setEgFilterRows(flat)
    } catch (e) {
      toastError(e, 'Failed to load filters')
    } finally {
      setLoadingFilters(false)
    }
  }, [])

  useEffect(() => {
    void loadAcademicYearAndGroups()
  }, [loadAcademicYearAndGroups])

  useEffect(() => {
    if (restoredSelected.current) return
    const raw = searchParams?.get('data')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSelectedRows(parsed as Row[])
        restoredSelected.current = true
      }
    } catch {
      /* ignore invalid query payload */
    }
  }, [searchParams])

  const academicYears = useMemo(() => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)), [egFilterRows])

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return
    setForm((f) => ({ ...f, academicYearId: String(num(academicYears[0].fk_academic_year_id)) }))
  }, [academicYears, form.academicYearId])

  const examGroups = useMemo(
    () =>
      dedupeBy(
        egFilterRows.filter((r) => num(r.fk_academic_year_id) === Number(form.academicYearId)),
        (r) => num(r.fk_univ_exam_group_id),
      ),
    [egFilterRows, form.academicYearId],
  )

  useEffect(() => {
    if (!examGroups.length || !form.academicYearId || form.examGroupId) return
    setForm((f) => ({ ...f, examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)) }))
  }, [examGroups, form.academicYearId, form.examGroupId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!form.academicYearId || !form.examGroupId) {
        setEcGroupRows([])
        return
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: 'eg_ec_filters',
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
        })
        if (cancelled) return
        const flat: Row[] = []
        for (const g of groups) flat.push(...g)
        setEcGroupRows(flat)
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load exam centers')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [form.academicYearId, form.examGroupId])

  const examCenters = useMemo(() => dedupeBy(ecGroupRows, (r) => num(r.fk_univ_ec_id)), [ecGroupRows])

  useEffect(() => {
    if (!examCenters.length || !form.examGroupId || form.examCenterId) return
    setForm((f) => ({ ...f, examCenterId: String(num(examCenters[0].fk_univ_ec_id)) }))
  }, [examCenters, form.examGroupId, form.examCenterId])

  const examDates = useMemo(() => {
    const source = ecGroupRows.filter((r) => num(r.fk_univ_ec_id) === Number(form.examCenterId))
    return dedupeBy(source, (r) => txt(r.exam_date))
  }, [ecGroupRows, form.examCenterId])

  useEffect(() => {
    if (!examDates.length || !form.examCenterId || form.examDate) return
    setForm((f) => ({ ...f, examDate: txt(examDates[0].exam_date) }))
  }, [examDates, form.examCenterId, form.examDate])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!form.academicYearId || !form.examGroupId || !form.examCenterId || !form.examDate) {
        setQuestionPaperRows([])
        return
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: 'eg_ec_qc_filters',
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
          univExamcenterId: Number(form.examCenterId),
          examDate: form.examDate,
        })
        if (cancelled) return
        setQuestionPaperRows(groups[0] ?? [])
      } catch {
        if (!cancelled) setQuestionPaperRows([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [form.academicYearId, form.examGroupId, form.examCenterId, form.examDate])

  useEffect(() => {
    if (!questionPaperRows.length || !form.examDate || form.subjectId) return
    const first = questionPaperRows[0]
    const sid = num(first?.subjectId ?? first?.fk_subject_id)
    if (sid > 0) setForm((f) => ({ ...f, subjectId: String(sid) }))
  }, [questionPaperRows, form.examDate, form.subjectId])

  const academicYearOptions: SelectOption[] = useMemo(
    () => academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) })),
    [academicYears],
  )
  const examGroupOptions: SelectOption[] = useMemo(
    () => examGroups.map((r) => ({ value: String(num(r.fk_univ_exam_group_id)), label: txt(r.exam_group_code) })),
    [examGroups],
  )
  const examCenterOptions: SelectOption[] = useMemo(
    () => examCenters.map((r) => ({ value: String(num(r.fk_univ_ec_id)), label: txt(r.ec_name) || txt(r.ec_code) })),
    [examCenters],
  )
  const examDateOptions: SelectOption[] = useMemo(
    () => examDates.map((r) => ({ value: txt(r.exam_date), label: txt(r.exam_date) })),
    [examDates],
  )
  const subjectOptions: SelectOption[] = useMemo(
    () =>
      questionPaperRows.map((r) => {
        const sid = num(r.subjectId ?? r.fk_subject_id)
        return {
          value: String(sid),
          label: txt(r.Questionpaper_name ?? r.questionpaper_name) || txt(r.questionpaper_code) || String(sid),
        }
      }),
    [questionPaperRows],
  )

  function onAcademicYearChange(v: string | null) {
    clearListState()
    setForm({
      academicYearId: v ?? '',
      examGroupId: '',
      examCenterId: '',
      examDate: '',
      subjectId: '',
      ecStdSeatNo: form.ecStdSeatNo,
    })
  }

  function onExamGroupChange(v: string | null) {
    clearListState()
    setForm((f) => ({
      ...f,
      examGroupId: v ?? '',
      examCenterId: '',
      examDate: '',
      subjectId: '',
    }))
  }

  function onExamCenterChange(v: string | null) {
    clearListState()
    setForm((f) => ({
      ...f,
      examCenterId: v ?? '',
      examDate: '',
      subjectId: '',
    }))
  }

  function onExamDateChange(v: string | null) {
    clearListState()
    setForm((f) => ({ ...f, examDate: v ?? '', subjectId: '' }))
  }

  function onSubjectChange(v: string | null) {
    clearListState()
    setForm((f) => ({ ...f, subjectId: v ?? '' }))
  }

  async function onGetList() {
    if (!form.academicYearId || !form.examGroupId || !form.examCenterId || !form.examDate || !form.subjectId) {
      toast.info('Please select required filters')
      return
    }
    setHasFetched(true)
    setLoadingList(true)
    try {
      const rows = await listExamSeatnoBarcodeDetails({
        examGroupId: Number(form.examGroupId),
        examCenterId: Number(form.examCenterId),
        examDate: form.examDate,
        subjectId: Number(form.subjectId),
        ecStdSeatNo: Number(form.ecStdSeatNo) || 0,
      })
      setBarcodeRows(rows.map((r) => ({ ...r, isSelected: false })))
      if (rows.length === 0) toast.info('No record(s) found.')
    } catch (e) {
      toastError(e, 'Failed to load barcode list')
      setBarcodeRows([])
    } finally {
      setLoadingList(false)
    }
  }

  const toggleRow = useCallback((pk: number, checked: boolean) => {
    setBarcodeRows((rows) => rows.map((r) => (rowPk(r) === pk ? { ...r, isSelected: checked } : r)))
  }, [])

  const toggleAll = useCallback((checked: boolean) => {
    setBarcodeRows((rows) => rows.map((r) => ({ ...r, isSelected: checked })))
  }, [])

  const allBarcodeRowsSelected = useMemo(
    () => barcodeRows.length > 0 && barcodeRows.every((r) => r.isSelected === true),
    [barcodeRows],
  )

  const examGroupCode = useMemo(() => {
    const eg = examGroups.find((x) => num(x.fk_univ_exam_group_id) === Number(form.examGroupId))
    return txt(eg?.exam_group_code) || txt(selectedRows[0]?.exam_group_code)
  }, [examGroups, form.examGroupId, selectedRows])

  function onAddSelected() {
    const picked = barcodeRows.filter((r) => r.isSelected === true)
    if (!picked.length) {
      toast.info('No rows selected')
      return
    }
    setSelectedRows((prev) => {
      const next = [...prev]
      for (const row of picked) {
        const pk = rowPk(row)
        if (!next.some((x) => rowPk(x) === pk)) next.push({ ...row })
      }
      return next
    })
    toast.info('Selected OMR Serial Numbers Added')
  }

  function onClearSelected() {
    setSelectedRows([])
  }

  function onRemoveSelected(seatNo: number) {
    setSelectedRows((rows) => rows.filter((r) => num(r.ec_seat_no) !== seatNo))
  }

  function onPrintStickersNew() {
    if (!selectedRows.length) return
    setStickerRows(toStickerRows(selectedRows))
    setShowStickerPrint(true)
  }

  const toggleRowRef = useRef(toggleRow)
  toggleRowRef.current = toggleRow
  const toggleAllRef = useRef(toggleAll)
  toggleAllRef.current = toggleAll
  const removeRef = useRef(onRemoveSelected)
  removeRef.current = onRemoveSelected

  const barcodeColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        headerName: '',
        minWidth: 48,
        maxWidth: 52,
        flex: 0,
        headerComponent: SelectAllHeader,
        headerComponentParams: {
          checked: allBarcodeRowsSelected,
          onToggle: (checked: boolean) => toggleAllRef.current(checked),
        },
        cellRenderer: makeSelectCellRenderer((pk, checked) => toggleRowRef.current(pk, checked)),
        sortable: false,
        filter: false,
        pinned: 'left',
      },
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Hall Ticket No', minWidth: 140, valueGetter: (p) => txt(p.data?.hallticket_number) || '—' },
      { headerName: 'Omr Serial No', minWidth: 140, valueGetter: (p) => txt(p.data?.omr_serial_no) || '—' },
      { headerName: 'Seat No', minWidth: 100, valueGetter: (p) => txt(p.data?.ec_seat_no) || '—' },
      { headerName: 'Exam Date', minWidth: 120, valueGetter: (p) => txt(p.data?.exam_date) || '—' },
      { headerName: 'Subject Code', minWidth: 120, valueGetter: (p) => txt(p.data?.subject_code) || '—' },
    ],
    [allBarcodeRowsSelected],
  )

  const selectedColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Hall Ticket No', minWidth: 140, valueGetter: (p) => txt(p.data?.hallticket_number) || '—' },
      { headerName: 'Omr Serial No', minWidth: 140, valueGetter: (p) => txt(p.data?.omr_serial_no) || '—' },
      { headerName: 'Seat No', minWidth: 100, valueGetter: (p) => txt(p.data?.ec_seat_no) || '—' },
      { headerName: 'Exam Date', minWidth: 120, valueGetter: (p) => txt(p.data?.exam_date) || '—' },
      { headerName: 'Subject Code', minWidth: 120, valueGetter: (p) => txt(p.data?.subject_code) || '—' },
      {
        headerName: 'Actions',
        minWidth: 80,
        flex: 0,
        cellRenderer: makeRemoveRenderer((seatNo) => removeRef.current(seatNo)),
      },
    ],
    [],
  )

  const getBarcodeRowId = useCallback(
    (p: { data?: Row }) => {
      const pk = rowPk(p.data ?? {})
      return pk > 0 ? String(pk) : `row-${txt(p.data?.omr_serial_no)}`
    },
    [],
  )

  const getSelectedRowId = useCallback(
    (p: { data?: Row }) => {
      const seat = num(p.data?.ec_seat_no)
      const pk = rowPk(p.data ?? {})
      return pk > 0 ? `sel-${pk}` : `sel-seat-${seat}`
    },
    [],
  )

  if (showStickerPrint) {
    return (
      <ExamBundlePrintStickersView
        stickerRows={stickerRows}
        examGroupCode={examGroupCode}
        variant="stickers-gu"
        onBack={() => setShowStickerPrint(false)}
      />
    )
  }

  return (
    <FilteredPage
      title={PAGE_TITLE}
      filters={(
        <>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Academic Year *">
              <Select
                options={academicYearOptions}
                value={form.academicYearId}
                onChange={onAcademicYearChange}
                placeholder="Academic Year"
                disabled={loadingFilters}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Group *">
              <Select
                options={examGroupOptions}
                value={form.examGroupId}
                onChange={onExamGroupChange}
                placeholder="Exam Group"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Center *">
              <Select
                options={examCenterOptions}
                value={form.examCenterId}
                onChange={onExamCenterChange}
                placeholder="Exam Center"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Date *">
              <Select
                options={examDateOptions}
                value={form.examDate}
                onChange={onExamDateChange}
                placeholder="Exam Date"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Subject *">
              <Select
                options={subjectOptions}
                value={form.subjectId}
                onChange={onSubjectChange}
                placeholder="Subject"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Seat No">
              <Input
                type="number"
                min={0}
                value={form.ecStdSeatNo}
                onChange={(e) => {
                  clearListState()
                  setForm((f) => ({ ...f, ecStdSeatNo: e.target.value }))
                }}
                className="h-8 text-[12px]"
                placeholder="Seat No"
              />
            </GlobalFilterField>
            <GlobalFilterField label=" " className="global-filter-field--action global-filter-field--shrink">
              <Button
                size="sm"
                onClick={() => void onGetList()}
                disabled={loadingList}
                className="h-8 shrink-0 px-3 text-[12px]"
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      )}
      body={
        hasFetched && barcodeRows.length > 0 ? (
          <div className="-mx-5 -my-4 overflow-hidden">
            <DataTable
              bordered={false}
              rowData={barcodeRows}
              columnDefs={barcodeColumnDefs}
              loading={loadingList}
              pagination
              paginationPageSize={10}
              getRowId={getBarcodeRowId}
              title=""
              subtitle=""
              toolbarLeading={<span className="hidden" aria-hidden />}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search…',
                pdfDocumentTitle: PAGE_TITLE,
              }}
              toolbarTrailing={
                <Button
                  type="button"
                  size="sm"
                  className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
                  onClick={onAddSelected}
                >
                  Add Selected
                </Button>
              }
            />
          </div>
        ) : undefined
      }
    >
      {selectedRows.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <DataTable
                rowData={selectedRows}
                columnDefs={selectedColumnDefs}
                pagination
                paginationPageSize={10}
                getRowId={getSelectedRowId}
                title="Selected Exam Barcodes"
                subtitle=""
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search selected…',
                  pdfDocumentTitle: 'Selected Exam Barcodes',
                }}
                toolbarTrailing={
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
                      onClick={onClearSelected}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="app-data-table-toolbar-btn h-9 gap-1.5 px-3 text-[12px]"
                      onClick={onPrintStickersNew}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Stickers New
                    </Button>
                  </>
                }
              />
            </div>
          </div>
        </div>
      )}
    </FilteredPage>
  )
}
