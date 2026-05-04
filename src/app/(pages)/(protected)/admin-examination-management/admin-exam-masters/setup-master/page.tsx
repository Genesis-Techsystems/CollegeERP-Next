'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, TableCard } from '@/common/components/table'
import { Select, MultiSelect } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Filter, ChevronDown, Pencil, Plus } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { GM_CODES } from '@/config/constants/ui'
import {
  createExamFcarSetupMaster,
  getGeneralDetails,
  listActiveColleges,
  listCoursesByCollegeForFcarSetup,
  listExamFcarSetupMasters,
  listRegulationsByCollegeAndCourseForFcar,
  updateExamFcarSetupMaster,
} from '@/services'

function regulationsCell(p: ICellRendererParams<Record<string, unknown>>) {
  const dto = p.data?.regulationDTO
  if (Array.isArray(dto) && dto.length > 0) {
    return (
      <div className="text-[12px] leading-snug space-y-0.5">
        {dto.map((r: Record<string, unknown>, i: number) => (
          <p key={i} className="m-0">{String(r.regulationCode ?? r.regulation_code ?? '')}</p>
        ))}
      </div>
    )
  }
  const raw = p.data?.regulationIds
  if (raw != null && String(raw).trim() !== '') return <span className="text-[12px]">{String(raw)}</span>
  return <span className="text-slate-400">—</span>
}

function boolOptionsCell(p: ICellRendererParams<Record<string, unknown>>) {
  const v = p.data?.isHavingoptions ?? p.data?.is_having_options
  return <span className="text-[12px]">{v ? 'Yes' : 'No'}</span>
}

function statusCell(p: ICellRendererParams<Record<string, unknown>>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

export default function SetupMasterPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loadingColleges, setLoadingColleges] = useState(true)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [colleges, setColleges] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const [regulations, setRegulations] = useState<any[]>([])
  const [resultValidations, setResultValidations] = useState<any[]>([])

  const [formMarkSetupName, setFormMarkSetupName] = useState('')
  const [formRegulationIds, setFormRegulationIds] = useState<string[]>([])
  const [formResultValidationId, setFormResultValidationId] = useState<string | null>(null)
  const [formHavingOptions, setFormHavingOptions] = useState(false)
  const [formIsActive, setFormIsActive] = useState(true)
  const [formReason, setFormReason] = useState('')

  const loadColleges = useCallback(async () => {
    setLoadingColleges(true)
    try {
      const list = await listActiveColleges()
      const arr = Array.isArray(list) ? list : []
      setColleges(arr)
      if (arr.length > 0) {
        const firstId = Number(arr[0].collegeId ?? arr[0].college_id ?? 0)
        setSelectedCollegeId(firstId > 0 ? firstId : null)
      } else {
        setSelectedCollegeId(null)
      }
    } finally {
      setLoadingColleges(false)
    }
  }, [])

  useEffect(() => {
    void loadColleges()
  }, [loadColleges])

  const loadCourses = useCallback(async (collegeId: number) => {
    setLoadingCourses(true)
    try {
      const list = await listCoursesByCollegeForFcarSetup(collegeId)
      const arr = Array.isArray(list) ? list : []
      setCourses(arr)
      if (arr.length > 0) {
        const cid = Number(arr[0].courseId ?? arr[0].course_id ?? 0)
        setSelectedCourseId(cid > 0 ? cid : null)
      } else {
        setSelectedCourseId(null)
      }
    } finally {
      setLoadingCourses(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedCollegeId) {
      setCourses([])
      setSelectedCourseId(null)
      return
    }
    void loadCourses(selectedCollegeId)
  }, [selectedCollegeId, loadCourses])

  const loadGrid = useCallback(async () => {
    if (!selectedCollegeId || !selectedCourseId) {
      setRows([])
      return
    }
    setLoadingGrid(true)
    try {
      const list = await listExamFcarSetupMasters(selectedCollegeId, selectedCourseId)
      setRows(Array.isArray(list) ? list : [])
    } finally {
      setLoadingGrid(false)
    }
  }, [selectedCollegeId, selectedCourseId])

  useEffect(() => {
    void loadGrid()
  }, [loadGrid])

  const filteredRows = useMemo(() => {
    if (!q.trim()) return rows
    const lower = q.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
  }, [q, rows])

  const regulationOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(r.regulationId ?? r.regulation_id ?? ''),
        label: String(r.regulationCode ?? r.regulation_code ?? ''),
      })).filter((o) => o.value !== '0' && o.value !== ''),
    [regulations],
  )

  const resultValidationOptions = useMemo(
    () =>
      resultValidations.map((r) => ({
        value: String(r.generalDetailId ?? r.general_detail_id ?? ''),
        label: String(
          r.generalDetailDisplayName ??
            r.general_detail_display_name ??
            r.generalDetailName ??
            r.general_detail_name ??
            r.generalDetailCode ??
            '',
        ),
      })),
    [resultValidations],
  )

  const loadModalReferenceData = useCallback(async () => {
    if (!selectedCollegeId || !selectedCourseId) return
    const [regs, rv] = await Promise.all([
      listRegulationsByCollegeAndCourseForFcar(selectedCollegeId, selectedCourseId),
      getGeneralDetails(GM_CODES.RESULT_VALIDATION),
    ])
    setRegulations(Array.isArray(regs) ? regs : [])
    setResultValidations(Array.isArray(rv) ? rv : [])
  }, [selectedCollegeId, selectedCourseId])

  async function openModalForAdd() {
    if (!selectedCollegeId || !selectedCourseId) return
    setEditing(null)
    setModalError(null)
    setFormMarkSetupName('')
    setFormRegulationIds([])
    setFormResultValidationId(null)
    setFormHavingOptions(false)
    setFormIsActive(true)
    setFormReason('active')
    try {
      await loadModalReferenceData()
    } catch (e: unknown) {
      setModalError(getErrorMessage(e))
    }
    setModalOpen(true)
  }

  const openModalForEdit = useCallback(async (row: Record<string, unknown>) => {
    if (!selectedCollegeId || !selectedCourseId) return
    setEditing(row)
    setModalError(null)
    setFormMarkSetupName(String(row.markSetupName ?? row.mark_setup_name ?? ''))
    const rawRegs = row.regulationIds ?? row.regulation_ids
    const ids =
      typeof rawRegs === 'string' && rawRegs.trim() !== ''
        ? rawRegs.split(',').map((s) => s.trim()).filter(Boolean)
        : []
    setFormRegulationIds(ids)
    const rvId = row.resultvalidationCatId ?? row.resultvalidation_cat_id
    setFormResultValidationId(rvId != null && Number(rvId) > 0 ? String(rvId) : null)
    setFormHavingOptions(Boolean(row.isHavingoptions ?? row.is_having_options))
    setFormIsActive(row.isActive !== false && row.is_active !== false)
    setFormReason(String(row.reason ?? (row.isActive !== false ? 'active' : '')))
    try {
      await loadModalReferenceData()
    } catch (e: unknown) {
      setModalError(getErrorMessage(e))
    }
    setModalOpen(true)
  }, [selectedCollegeId, selectedCourseId, loadModalReferenceData])

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setSaving(false)
    setModalError(null)
  }

  async function saveModal(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCollegeId || !selectedCourseId) return
    if (!formMarkSetupName.trim()) {
      setModalError('Marks setup name is required.')
      return
    }
    if (!formIsActive && !formReason.trim()) {
      setModalError('Reason is required when inactive.')
      return
    }

    const regulationIdsCsv = formRegulationIds.join(',')
    const payload: Record<string, unknown> = {
      markSetupName: formMarkSetupName.trim(),
      regulationIds: regulationIdsCsv,
      resultvalidationCatId: formResultValidationId ? Number(formResultValidationId) : 0,
      isHavingoptions: formHavingOptions,
      isActive: formIsActive,
      reason: formIsActive ? 'active' : formReason.trim(),
      collegeId: selectedCollegeId,
      courseId: selectedCourseId,
    }

    setSaving(true)
    setModalError(null)
    try {
      const editId = editing?.examFCARSetMasterId ?? editing?.exam_fcar_set_master_id
      if (editId != null) {
        await updateExamFcarSetupMaster(Number(editId), {
          ...payload,
          examFCARSetMasterId: Number(editId),
          createdDt: editing?.createdDt ?? editing?.created_dt,
          createdUser: editing?.createdUser ?? editing?.created_user,
        })
      } else {
        await createExamFcarSetupMaster(payload)
      }
      closeModal()
      await loadGrid()
    } catch (err: unknown) {
      setModalError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<Record<string, unknown>>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 72, flex: 0 },
      { field: 'markSetupName', headerName: 'Marks Setup Name', minWidth: 180 },
      { headerName: 'Regulations', minWidth: 160, cellRenderer: regulationsCell },
      {
        headerName: 'Result Validation',
        minWidth: 160,
        valueGetter: (p) =>
          String(p.data?.resultvalidationCatCode ?? p.data?.resultvalidation_cat_code ?? '—'),
      },
      { headerName: 'Is Having Options', minWidth: 130, cellRenderer: boolOptionsCell },
      { headerName: 'Status', minWidth: 100, cellRenderer: statusCell },
      {
        headerName: 'Actions',
        width: 88,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Record<string, unknown>>) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              void openModalForEdit(p.data ?? {})
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [openModalForEdit],
  )

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? c.college_id ?? ''),
        label: String(c.collegeCode ?? c.college_code ?? c.collegeName ?? c.college_name ?? '—'),
      })),
    [colleges],
  )

  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(c.courseId ?? c.course_id ?? ''),
        label: String(c.courseCode ?? c.course_code ?? c.courseName ?? c.course_name ?? '—'),
      })),
    [courses],
  )

  const selectedCollege = colleges.find((c) => Number(c.collegeId ?? c.college_id) === selectedCollegeId)
  const selectedCourse = courses.find((c) => Number(c.courseId ?? c.course_id) === selectedCourseId)

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Setup Master" subtitle="FCAR marks setup master by college and course (Angular parity)" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Exam Setup Master</h2>
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
          <div className="px-3 py-3 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <Select
                label="College *"
                required
                className="[&_button]:h-8 [&_button]:text-[12px]"
                value={selectedCollegeId != null ? String(selectedCollegeId) : null}
                onChange={(v) => {
                  setSelectedCollegeId(v != null ? Number(v) : null)
                  setSelectedCourseId(null)
                  setRows([])
                }}
                options={collegeOptions}
                disabled={loadingColleges}
                placeholder={loadingColleges ? 'Loading…' : 'Select College'}
              />
              <Select
                label="Course *"
                required
                className="[&_button]:h-8 [&_button]:text-[12px]"
                value={selectedCourseId != null ? String(selectedCourseId) : null}
                onChange={(v) => setSelectedCourseId(v != null ? Number(v) : null)}
                options={courseOptions}
                disabled={!selectedCollegeId || loadingCourses || courses.length === 0}
                placeholder="Select Course"
              />
            </div>
          </div>
        )}
      </div>

      {selectedCourseId != null && (
        <TableCard
          headerLeft={(
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search…"
              className="max-w-sm"
              disabled={rows.length === 0}
            />
          )}
          headerRight={(
            <Button
              type="button"
              size="sm"
              className="h-8 text-[12px]"
              onClick={openModalForAdd}
              disabled={!selectedCollegeId || !selectedCourseId}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Setup
            </Button>
          )}
        >
          <DataTable rowData={filteredRows} columnDefs={columnDefs} loading={loadingGrid} pagination />
        </TableCard>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Exam Setup Master' : 'Add Exam Setup Master'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveModal} className="space-y-4">
            {!editing && selectedCollege && selectedCourse && (
              <p className="text-[12px] text-slate-600">
                <span className="font-medium text-slate-700">Course :</span>{' '}
                <span className="text-[hsl(var(--primary))] font-medium">
                  {String(selectedCollege.collegeCode ?? selectedCollege.college_code)} /{' '}
                  {String(selectedCourse.courseCode ?? selectedCourse.course_code)}
                </span>
              </p>
            )}
            {editing && (
              <p className="text-[12px] text-slate-600">
                <span className="font-medium text-slate-700">Course :</span>{' '}
                <span className="text-[hsl(var(--primary))] font-medium">
                  {String(editing.collegeCode ?? selectedCollege?.collegeCode ?? selectedCollege?.college_code ?? '')} /{' '}
                  {String(editing.courseCode ?? selectedCourse?.courseCode ?? selectedCourse?.course_code ?? '')}
                </span>
              </p>
            )}

            {modalError && <p className="text-sm text-red-600">{modalError}</p>}

            <div className="space-y-1.5">
              <Label className="text-[12px]">Marks Setup Name *</Label>
              <Input
                className="h-9 text-[13px]"
                value={formMarkSetupName}
                onChange={(e) => setFormMarkSetupName(e.target.value)}
                required
              />
            </div>

            <MultiSelect
              label="Regulation"
              searchable
              value={formRegulationIds}
              onChange={setFormRegulationIds}
              options={regulationOptions}
              placeholder="Select regulation(s)"
            />

            <Select
              label="Result Validation"
              value={formResultValidationId}
              onChange={setFormResultValidationId}
              options={resultValidationOptions}
              placeholder="Select"
              clearable
            />

            <label className="flex items-center gap-2 text-[13px]">
              <Checkbox checked={formHavingOptions} onCheckedChange={(c) => setFormHavingOptions(c === true)} />
              Having Options
            </label>

            <label className="flex items-center gap-2 text-[13px]">
              <Checkbox checked={formIsActive} onCheckedChange={(c) => setFormIsActive(c === true)} />
              Active
            </label>

            {!formIsActive && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">Reason</Label>
                <Input className="h-9 text-[13px]" value={formReason} onChange={(e) => setFormReason(e.target.value)} />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
