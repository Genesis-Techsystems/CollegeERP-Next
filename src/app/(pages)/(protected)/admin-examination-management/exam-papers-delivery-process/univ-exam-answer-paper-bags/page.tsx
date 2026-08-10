'use client'

/**
 * Exam Answer Paper Bags — Angular `univ-exam-answer-paper-bags` parity.
 * UI shell matches Exam Center Rooms (`FilteredListPage` + GlobalFilterBarRow).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, X } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { ConfirmDialog, FormModal } from '@/common/components/feedback'
import {
  ActiveStatusField,
  GlobalFilterBarRow,
  GlobalFilterField,
} from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  addListUnivExamAnswerPaperBags,
  listAllActiveUnivExamBags,
  listUnivExamAnswerPaperBagsByBag,
  pickUnivExamAnswerPaperBagId,
  pickUnivExamBagId,
  searchExamOmrSerialNo,
  updateUnivExamAnswerPaperBag,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

interface SelectedOmr {
  univExamBagId: number
  bagSerialNo: string
  omrSerialNo: string
  examOmrId: number
  subjectCode: string
  stdFirstName: string
  subjectName: string
  hallticketNumber: string
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function subjectCell(row: Row | SelectedOmr | undefined): string {
  if (!row) return ''
  const name = txt(row.subjectName)
  const code = txt(row.subjectCode)
  return code ? `${name} (${code})` : name
}

export default function UnivExamAnswerPaperBagsPage() {
  const [bags, setBags] = useState<Row[]>([])
  const [univExamBagId, setUnivExamBagId] = useState('')
  const [bagSerialNo, setBagSerialNo] = useState('')
  const [omrInput, setOmrInput] = useState('')
  const [selectedOmrs, setSelectedOmrs] = useState<SelectedOmr[]>([])
  const [savedRows, setSavedRows] = useState<Row[]>([])
  const [loadingBags, setLoadingBags] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({ isActive: true, reason: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const omrRef = useRef<HTMLInputElement>(null)
  const lastQueryRef = useRef('')

  const bagOptions: SelectOption[] = useMemo(
    () =>
      bags.map((b) => ({
        value: String(pickUnivExamBagId(b)),
        label: txt(b.bagSerialNo) || String(pickUnivExamBagId(b)),
      })),
    [bags],
  )

  const loadBags = useCallback(async () => {
    setLoadingBags(true)
    try {
      const list = await listAllActiveUnivExamBags().catch(() => [])
      setBags(Array.isArray(list) ? list : [])
    } finally {
      setLoadingBags(false)
    }
  }, [])

  const loadSavedForBag = useCallback(async (bagId: number) => {
    if (!bagId) {
      setSavedRows([])
      return
    }
    setLoadingSaved(true)
    try {
      const list = await listUnivExamAnswerPaperBagsByBag(bagId).catch(() => [])
      setSavedRows(Array.isArray(list) ? list : [])
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  useEffect(() => {
    void loadBags()
  }, [loadBags])

  function onBagChange(value: string | null) {
    const next = value ?? ''
    setUnivExamBagId(next)
    setSelectedOmrs([])
    setOmrInput('')
    lastQueryRef.current = ''
    const id = num(next)
    const bag = bags.find((b) => pickUnivExamBagId(b) === id)
    setBagSerialNo(txt(bag?.bagSerialNo))
    void loadSavedForBag(id)
    omrRef.current?.focus()
  }

  /** Angular `enteredOmr`: search when length > 2, keep exact matches. */
  async function handleOmrInput(value: string) {
    setOmrInput(value)
    if (!univExamBagId) {
      if (value.length > 2) toastInfo('Please select Exam Bags first.')
      return
    }
    if (value.length <= 2) return
    if (value === lastQueryRef.current) return
    lastQueryRef.current = value

    try {
      const rows = await searchExamOmrSerialNo(value).catch(() => [])
      const exact = rows.filter((r) => txt(r.omrSerialNo) === value)
      if (exact.length === 0) return

      const bagId = num(univExamBagId)
      setSelectedOmrs((prev) => {
        const next = [...prev]
        for (const r of exact) {
          const examOmrId = num(r.examOmrId)
          const omrSerialNo = txt(r.omrSerialNo)
          const exists = next.some(
            (t) => t.omrSerialNo === omrSerialNo && t.examOmrId === examOmrId,
          )
          if (exists) continue
          next.push({
            univExamBagId: bagId,
            bagSerialNo,
            omrSerialNo,
            examOmrId,
            subjectCode: txt(r.subjectCode),
            stdFirstName: txt(r.stdFirstName),
            subjectName: txt(r.subjectName),
            hallticketNumber: txt(r.hallticketNumber),
          })
        }
        return next
      })
      setOmrInput('')
      lastQueryRef.current = ''
      omrRef.current?.focus()
    } catch (err) {
      toastError(err, 'OMR search failed')
    }
  }

  function deleteSelected(index: number) {
    setSelectedOmrs((prev) => prev.filter((_, i) => i !== index))
  }

  async function confirmSave() {
    if (selectedOmrs.length === 0) return
    setSaving(true)
    try {
      const result = await addListUnivExamAnswerPaperBags(
        selectedOmrs.map((r) => ({ ...r })),
      )
      if (result.existingOmrIds) {
        toastInfo('OMR Serial Number Already Exists')
      } else {
        toastSuccess(result.message || 'Exam answer paper bags saved.')
      }
      setConfirmOpen(false)
      setSelectedOmrs([])
      await loadSavedForBag(num(univExamBagId))
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(row: Row) {
    setEditing(row)
    setEditForm({
      isActive: row.isActive == null ? true : row.isActive === true,
      reason: txt(row.reason),
    })
    setEditOpen(true)
  }

  async function saveEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!editing) return
    if (!editForm.isActive && !editForm.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    const id = pickUnivExamAnswerPaperBagId(editing)
    if (id <= 0) {
      toastError('Unable to determine record id for update.')
      return
    }
    setSavingEdit(true)
    try {
      await updateUnivExamAnswerPaperBag(id, {
        univExamAnswerPaperBagId: id,
        examOmrId: num(editing.examOmrId),
        univExamBagId: num(editing.univExamBagId) || num(univExamBagId),
        isActive: editForm.isActive,
        reason: editForm.isActive ? '' : editForm.reason.trim(),
      })
      toastSuccess('Exam answer paper bag updated.')
      setEditOpen(false)
      await loadSavedForBag(num(univExamBagId))
    } catch (err) {
      toastError(err, 'Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: 'Bag Serial No',
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.bagSerialNo),
      },
      {
        headerName: 'Student Name',
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          const row = p.data
          if (!row) return null
          const name =
            `${txt(row.firstName)} ${txt(row.lastName)}`.trim() ||
            txt(row.stdFirstName)
          const ht = txt(row.hallticketNo) || txt(row.hallticketNumber)
          return (
            <span>
              {name}{' '}
              {ht ? <span className="text-blue-600">({ht})</span> : null}
            </span>
          )
        },
      },
      {
        headerName: 'Subject',
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          const row = p.data
          if (!row) return null
          return (
            <span>
              {txt(row.subjectName)}{' '}
              {txt(row.subjectCode) ? (
                <span className="text-blue-600">({txt(row.subjectCode)})</span>
              ) : null}
            </span>
          )
        },
      },
      {
        headerName: 'Actions',
        width: 80,
        minWidth: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          const row = p.data
          if (!row) return null
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-700"
              onClick={() => openEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )
        },
      },
    ],
    [],
  )

  return (
    <FilteredListPage
      title="Exam Answer Paper Bags"
      filters={
        <>
          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Exam Bags *"
              className="global-filter-field--fx50"
            >
              <Select
                options={bagOptions}
                value={univExamBagId || null}
                onChange={onBagChange}
                placeholder="Exam Bags"
                searchable
                clearable
                isLoading={loadingBags}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Omr serial No"
              className="global-filter-field--fx50"
            >
              <Input
                ref={omrRef}
                className="h-8 text-[12px]"
                value={omrInput}
                placeholder="Omr serial No"
                disabled={!univExamBagId}
                onChange={(e) => void handleOmrInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault()
                }}
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          {/* Pending scanned OMRs — same pattern as Exam Center Rooms selection block */}
          {selectedOmrs.length > 0 ? (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
                Exam Answer Paper Bag - {bagSerialNo || '—'}
              </h3>
              <div className="rounded border overflow-hidden bg-card">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[#C3D9FF]">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-blue-700">
                          SL No.
                        </th>
                        <th className="px-2 py-1.5 text-left font-semibold text-blue-700">
                          Bag Serial No
                        </th>
                        <th className="px-2 py-1.5 text-left font-semibold text-blue-700">
                          Student Name
                        </th>
                        <th className="px-2 py-1.5 text-left font-semibold text-blue-700">
                          Subject
                        </th>
                        <th className="px-2 py-1.5 text-left font-semibold text-blue-700 w-20">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOmrs.map((row, i) => (
                        <tr
                          key={`${row.omrSerialNo}-${row.examOmrId}`}
                          className="border-t"
                        >
                          <td className="px-2 py-1.5">{i + 1}</td>
                          <td className="px-2 py-1.5">{row.bagSerialNo}</td>
                          <td className="px-2 py-1.5">
                            {row.stdFirstName}{' '}
                            {row.hallticketNumber ? (
                              <span className="text-blue-600">
                                ({row.hallticketNumber})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5">
                            {row.subjectName}{' '}
                            {row.subjectCode ? (
                              <span className="text-blue-600">
                                ({row.subjectCode})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => deleteSelected(i)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="h-8 px-6 text-[12px]"
                  onClick={() => setConfirmOpen(true)}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : null}
        </>
      }
      tableHeader={
        bagSerialNo ? (
          <div className="table-context-header">
            <span className="material-icons table-context-header__icon" aria-hidden>
              ballot
            </span>
            <strong className="table-context-header__title">
              Exam Answer Paper Bag - {bagSerialNo}
            </strong>
          </div>
        ) : undefined
      }
      rowData={savedRows}
      columnDefs={columnDefs}
      loading={loadingSaved}
      pagination
      getRowId={(p) =>
        String(
          pickUnivExamAnswerPaperBagId(p.data) ||
            `${txt(p.data.bagSerialNo)}-${txt(p.data.examOmrId)}-${txt(p.data.omrSerialNo)}`,
        )
      }
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Exam Answer Paper Bags',
      }}
    >
      <ConfirmDialog
        open={confirmOpen}
        title="Exam Answer Paper Bag"
        confirmLabel="Save"
        cancelLabel="Close"
        confirmVariant="default"
        isLoading={saving}
        contentClassName="sm:max-w-2xl"
        onCancel={() => !saving && setConfirmOpen(false)}
        onConfirm={() => void confirmSave()}
      >
        <div className="space-y-3 text-sm">
          <div>
            Bag Serial No :{' '}
            <span className="font-medium text-blue-700">
              {selectedOmrs[0]?.bagSerialNo || bagSerialNo}
            </span>
          </div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#C3D9FF]">
                <tr>
                  <th className="px-2 py-1.5 font-semibold text-blue-700">SI.No.</th>
                  <th className="px-2 py-1.5 font-semibold text-blue-700">
                    Bag Serial Number
                  </th>
                  <th className="px-2 py-1.5 font-semibold text-blue-700">
                    Student Name
                  </th>
                  <th className="px-2 py-1.5 font-semibold text-blue-700">Subject</th>
                </tr>
              </thead>
              <tbody>
                {selectedOmrs.map((row, i) => (
                  <tr
                    key={`${row.omrSerialNo}-${row.examOmrId}`}
                    className="border-t"
                  >
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5">{row.bagSerialNo}</td>
                    <td className="px-2 py-1.5">
                      {row.stdFirstName}{' '}
                      {row.hallticketNumber ? (
                        <span className="text-blue-600">
                          ({row.hallticketNumber})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5">{subjectCell(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ConfirmDialog>

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          editing
            ? `Edit Exam Answer Paper Bag - ${txt(editing.firstName) || txt(editing.stdFirstName)} (${txt(editing.hallticketNo) || txt(editing.hallticketNumber)})`
            : 'Edit Exam Answer Paper Bag'
        }
        onSubmit={saveEdit}
        isSubmitting={savingEdit}
        size="md"
      >
        <div className="space-y-3">
          <Select
            label="Exam Bags"
            searchable
            disabled
            options={bagOptions}
            value={
              editing
                ? String(num(editing.univExamBagId) || num(univExamBagId) || '')
                : univExamBagId || null
            }
            onChange={() => undefined}
            placeholder="Exam Bags"
          />
          <div>
            <Label className="sr-only">Status</Label>
            <ActiveStatusField
              isActive={editForm.isActive}
              reason={editForm.reason}
              onActiveChange={(v) =>
                setEditForm((f) => ({ ...f, isActive: v === true }))
              }
              onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
            />
          </div>
        </div>
      </FormModal>
    </FilteredListPage>
  )
}
