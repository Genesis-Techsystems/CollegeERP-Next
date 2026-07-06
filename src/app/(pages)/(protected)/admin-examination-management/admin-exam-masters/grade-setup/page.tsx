'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NoticeAlert } from '@/common/components/feedback'
import { useSessionContext } from '@/context/SessionContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, TableCard } from '@/common/components/table'
import { CollegeFilterPanel } from '@/common/components/forms'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { Pencil, Plus } from 'lucide-react'
import { createExamGrade, getCollegeFilters, listExamGrades, listRegulations, updateExamGrade } from '@/services/examination'
import { getErrorMessage } from '@/lib/errors'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'

function gradePillClass(grade: string): string {
  const key = grade.trim().toUpperCase()
  if (key === 'A+' || key === 'A') return 'bg-emerald-50 text-emerald-700'
  if (key === 'B') return 'bg-sky-50 text-sky-700'
  if (key === 'C') return 'bg-amber-50 text-amber-700'
  if (key === 'D') return 'bg-indigo-50 text-indigo-700'
  return 'bg-rose-50 text-rose-700'
}

function rangeText(minValue: unknown, maxValue: unknown): string {
  if (minValue == null && maxValue == null) return '—'
  const left = minValue != null ? String(minValue) : ''
  const right = maxValue != null ? String(maxValue) : ''
  return right ? `${left} - ${right}`.trim() : left || '—'
}

const GRADE_COLUMN_ORDER = [
  'slNo',
  'grade',
  'gradeName',
  'points',
  'score',
  'credit',
  'status',
  'action',
] as const

type ColumnKey = (typeof GRADE_COLUMN_ORDER)[number]

export default function GradeSetupPage() {
  const { user } = useSessionContext()
  const hasLoadedFiltersRef = useRef(false)

  const [loadingFilters, setLoadingFilters] = useState(true)
  const [allFilters, setAllFilters] = useState<unknown[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [regulations, setRegulations] = useState<any[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedRegulationId, setSelectedRegulationId] = useState<number | null>(null)
  const [isForDisabled, setIsForDisabled] = useState(false)

  const [rows, setRows] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({
    gradeCode: '',
    gradeName: '',
    minPoints: '',
    maxPoints: '',
    fromPercentage: '',
    toPercentage: '',
    creditPoints: '',
    description: '',
    isActive: true,
    reason: 'active',
  })

  useEffect(() => {
    const orgIdFromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
    const empIdFromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
    const orgIdFromSession = Number(user?.organizationId ?? 0)
    const empIdFromSession = Number(user?.employeeId ?? 0)

    const orgId = orgIdFromStorage || orgIdFromSession || 1
    const empId = empIdFromStorage || empIdFromSession || 31754
    if (hasLoadedFiltersRef.current) return

    async function loadFilters() {
      setLoadingFilters(true)
      try {
        const { filtersData } = await getCollegeFilters(orgId, empId)
        setAllFilters(filtersData)

        // Distinct universities
        const uniMap = new Map<number, any>()
        for (const r of filtersData) {
          if (!uniMap.has(r.fk_university_id)) uniMap.set(r.fk_university_id, r)
        }
        const uniList = Array.from(uniMap.values())
        setUniversities(uniList)

        if (uniList.length > 0) {
          const firstUniId = uniList[0].fk_university_id
          setSelectedUniversityId(firstUniId)
          handleUniversityChange(firstUniId, filtersData)
        }
      } finally {
        setLoadingFilters(false)
      }
    }
    hasLoadedFiltersRef.current = true
    loadFilters()
  }, [user?.employeeId, user?.organizationId])

  function handleUniversityChange(universityId: number, filtersRef?: any[]) {
    setSelectedUniversityId(universityId)
    setSelectedCourseId(null)
    setSelectedRegulationId(null)
    setRegulations([])
    setRows([])
    setHasFetched(false)

    const source = (filtersRef?.length ? filtersRef : allFilters) ?? []
    const filtered = source.filter((r) => r.fk_university_id === universityId)
    const courseMap = new Map<number, any>()
    for (const r of filtered) {
      if (!courseMap.has(r.fk_course_id)) courseMap.set(r.fk_course_id, r)
    }
    setCourses(Array.from(courseMap.values()))
  }

  async function handleCourseChange(courseId: number) {
    setSelectedCourseId(courseId)
    setSelectedRegulationId(null)
    setRows([])
    setHasFetched(false)
    const regs = await listRegulations(courseId)
    setRegulations(regs)
  }

  async function handleGetList() {
    if (!selectedCourseId || !selectedRegulationId) return
    setHasFetched(true)
    setLoadingList(true)
    try {
      const data = await listExamGrades({
        courseId: selectedCourseId,
        regulationId: selectedRegulationId,
        isForDisabled,
      })
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoadingList(false)
    }
  }

  const openAdd = useCallback(() => {
    setNotice(null)
    setEditing(null)
    setForm({
      gradeCode: '',
      gradeName: '',
      minPoints: '',
      maxPoints: '',
      fromPercentage: '',
      toPercentage: '',
      creditPoints: '',
      description: '',
      isActive: true,
      reason: 'active',
    })
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((row: any) => {
    setNotice(null)
    setEditing(row)
    setForm({
      gradeCode: row?.gradeCode ?? '',
      gradeName: row?.gradeName ?? '',
      minPoints: String(row?.minPoints ?? row?.fromPoints ?? row?.minGradePoint ?? ''),
      maxPoints: String(row?.maxPoints ?? row?.toPoints ?? row?.maxGradePoint ?? ''),
      fromPercentage: String(row?.fromPercentage ?? row?.minPercentage ?? row?.minScorePercent ?? ''),
      toPercentage: String(row?.toPercentage ?? row?.maxPercentage ?? row?.maxScorePercent ?? ''),
      creditPoints: String(row?.creditPoints ?? row?.gradePoint ?? ''),
      description: String(row?.description ?? row?.remarks ?? row?.gradeDesc ?? ' '),
      isActive: row?.isActive !== undefined ? !!row.isActive : true,
      reason: String(row?.reason ?? (row?.isActive === false ? '' : 'active')),
    })
    setModalOpen(true)
  }, [])

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setSaving(false)
  }

  async function saveGrade(e: any) {
    e.preventDefault()
    if (!selectedCourseId || !selectedRegulationId) return

    setSaving(true)
    setNotice(null)
    try {
      const payload: Record<string, unknown> = {
        gradeCode: form.gradeCode,
        gradeName: form.gradeName,
        isActive: form.isActive,
        reason: form.isActive ? 'active' : (form.reason?.trim() || null),
        description: form.description?.trim() ? form.description : ' ',
        minPoints: form.minPoints === '' ? null : Number(form.minPoints),
        maxPoints: form.maxPoints === '' ? null : Number(form.maxPoints),
        minScorePercent: form.fromPercentage === '' ? null : Number(form.fromPercentage),
        maxScorePercent: form.toPercentage === '' ? null : Number(form.toPercentage),
        creditPoints: form.creditPoints === '' ? null : Number(form.creditPoints),
      }

      const id = editing?.examGradesId ?? editing?.examGradeId ?? editing?.id
      if (id != null) {
        await updateExamGrade(Number(id), { ...payload, examGradesId: Number(id) })
      } else {
        await createExamGrade({
          ...payload,
          universityId: selectedUniversityId,
          courseId: selectedCourseId,
          regulationId: selectedRegulationId,
          isForDisabled,
        })
      }

      setNotice({ type: 'success', message: `Exam grade ${id != null ? 'updated' : 'created'} successfully.` })
      closeModal()
      await handleGetList()
    } catch (error: unknown) {
      setNotice({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const baseCols = useMemo<Record<ColumnKey, ColDef<any>>>(() => ({
    slNo: {
      colId: 'slNo',
      headerName: 'S.No',
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      width: 80,
      minWidth: 70,
      flex: 0,
    },
    grade: {
      colId: 'grade',
      headerName: 'Grade',
      minWidth: 110,
      valueGetter: (p) => String(p.data?.gradeCode ?? '—'),
      cellRenderer: (p: ICellRendererParams<any>) => {
        const gradeCode = String(p.value ?? '—')
        return (
          <span className={`inline-flex items-center rounded-lg px-2 py-0 text-[10px] font-semibold ${gradePillClass(gradeCode)}`}>
            {gradeCode}
          </span>
        )
      },
    },
    gradeName: { colId: 'gradeName', headerName: 'Grade Name', field: 'gradeName', minWidth: 160, flex: 1 },
    points: {
      colId: 'points',
      headerName: 'Min - Max Points',
      minWidth: 170,
      valueGetter: (p) => rangeText(p.data?.minPoints ?? p.data?.fromPoints ?? p.data?.minGradePoint, p.data?.maxPoints ?? p.data?.toPoints ?? p.data?.maxGradePoint),
    },
    score: {
      colId: 'score',
      headerName: 'Min - Max Score %',
      minWidth: 170,
      valueGetter: (p) => rangeText(p.data?.fromPercentage ?? p.data?.minPercentage ?? p.data?.minScorePercent, p.data?.toPercentage ?? p.data?.maxPercentage ?? p.data?.maxScorePercent),
    },
    credit: {
      colId: 'credit',
      headerName: 'Credit Pts',
      minWidth: 120,
      valueGetter: (p) => p.data?.creditPoints ?? p.data?.gradePoint ?? '—',
    },
    status: {
      colId: 'status',
      headerName: 'Status',
      minWidth: 110,
      cellRenderer: (p: ICellRendererParams<any>) => <StatusBadge status={p.data?.isActive ?? false} />,
    },
    action: {
      colId: 'action',
      headerName: 'Action',
      minWidth: 90,
      width: 90,
      flex: 0,
      sortable: false,
      cellRenderer: (p: ICellRendererParams<any>) => (
        <button
          type="button"
          onClick={() => openEdit(p.data)}
          disabled={!selectedCourseId || !selectedRegulationId}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-300 text-teal-600 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Edit grade"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ),
    },
  }), [openEdit, selectedCourseId, selectedRegulationId])

  const columnDefs = useMemo(
    () => GRADE_COLUMN_ORDER.map((key) => baseCols[key]),
    [baseCols],
  )

	return (
		<PageContainer className="space-y-4">
      <PageHeader title="Grade Setup" subtitle="Configure examination grade bands" />
      {notice && (
        <NoticeAlert
          type={notice.type}
          title={notice.message}
          showIcon
          action={(
            <Button type="button" size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setNotice(null)}>
              Close
            </Button>
          )}
        />
      )}
      <CollegeFilterPanel
        title="Exam Grades"
        collapsible
        universities={universities}
        selectedUniversityId={selectedUniversityId}
        onUniversityChange={handleUniversityChange}
        courses={courses}
        selectedCourseId={selectedCourseId}
        onCourseChange={handleCourseChange}
        regulations={regulations}
        selectedRegulationId={selectedRegulationId}
        onRegulationChange={(id) => { setSelectedRegulationId(id); setRows([]); setHasFetched(false) }}
        isForDisabled={isForDisabled}
        onIsForDisabledChange={(checked) => { setIsForDisabled(checked); setRows([]); setHasFetched(false) }}
        isLoading={loadingFilters}
      >
        <Button
         
         
          onClick={handleGetList}
          disabled={!selectedCourseId || !selectedRegulationId || loadingList} className="h-[30px] px-3 text-[12px] shrink-0">
          Get List
        </Button>
      </CollegeFilterPanel>

      {hasFetched && (
      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loadingList}
          pagination
          paginationPageSize={10}
          toolbar={{
            search: true,
            searchPlaceholder: 'Search grades…',
            pdfDocumentTitle: 'Exam Grades',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              onClick={openAdd}
              disabled={!selectedCourseId || !selectedRegulationId}
              className="h-[30px] px-3 text-[12px]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Exam Grade
            </Button>
          )}
        />
      </TableCard>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeModal() }}>
        <DialogContent hideClose className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-3 border-b bg-gradient-to-r from-slate-50 to-white">
            <DialogTitle className="text-[15px] sm:text-[16px] font-semibold tracking-tight text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Grade' : 'Add Exam Grade'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={saveGrade} className="px-4 py-2.5 space-y-2.5 bg-card">
            {/* Course context bar */}
            <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[12px] text-slate-700 font-medium">Course</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-[12px] text-[hsl(var(--primary))] font-semibold">
                  {(() => {
                    const course = courses.find((c) => c.fk_course_id === selectedCourseId)
                    const reg = regulations.find((r) => r.regulationId === selectedRegulationId)
                    const courseLabel = course?.course_code ?? course?.course_name ?? ''
                    const regLabel = reg?.regulationCode ?? ''
                    const disLabel = isForDisabled ? 'For Disability' : 'Not For Disability'
                    const parts = [courseLabel, regLabel, disLabel].filter(Boolean)
                    return parts.length ? ` / ${parts.join(' / ')}` : ''
                  })()}
                </span>
              </div>
            </div>

            {/* Core fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2.5 pt-0.5">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Grade Name *</Label>
                <Input
                  className="h-8 px-3 text-[12px]"
                  value={form.gradeName}
                  onChange={(e) => setForm((s) => ({ ...s, gradeName: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] text-slate-600">Grade Code *</Label>
                <Input
                  className="h-8 px-3 text-[12px]"
                  value={form.gradeCode}
                  onChange={(e) => setForm((s) => ({ ...s, gradeCode: e.target.value }))}
                />
              </div>
            </div>

            {/* Ranges */}
            <div className="rounded-lg border border-border bg-muted/40/40 p-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-x-3 gap-y-2.5">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[12px] text-slate-600">Min Points</Label>
                  <Input
                    className="h-8 px-3 text-[12px]"
                    inputMode="numeric"
                    value={form.minPoints}
                    onChange={(e) => setForm((s) => ({ ...s, minPoints: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[12px] text-slate-600">Max Points</Label>
                  <Input
                    className="h-8 px-3 text-[12px]"
                    inputMode="numeric"
                    value={form.maxPoints}
                    onChange={(e) => setForm((s) => ({ ...s, maxPoints: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[12px] text-slate-600">Min Score %</Label>
                  <Input
                    className="h-8 px-3 text-[12px]"
                    inputMode="numeric"
                    value={form.fromPercentage}
                    onChange={(e) => setForm((s) => ({ ...s, fromPercentage: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[12px] text-slate-600">Max Score %</Label>
                  <Input
                    className="h-8 px-3 text-[12px]"
                    inputMode="numeric"
                    value={form.toPercentage}
                    onChange={(e) => setForm((s) => ({ ...s, toPercentage: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[12px] text-slate-600">Credit Points</Label>
                  <Input
                    className="h-8 px-3 text-[12px]"
                    inputMode="numeric"
                    value={form.creditPoints}
                    onChange={(e) => setForm((s) => ({ ...s, creditPoints: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[12px] text-slate-600">&nbsp;</Label>
                  <label className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3">
                    <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
                    <span className="text-[12px] text-slate-700">Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-[12px] text-slate-600">Description</Label>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <textarea
                  className="w-full min-h-[90px] resize-y px-3 py-2 text-[12px] leading-relaxed outline-none"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Add notes or description (optional)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="-mx-6 px-6 pt-3 pb-4 bg-card border-t border-border">
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" className="h-8 text-[12px] px-3" onClick={closeModal} disabled={saving}>
                  Close
                </Button>
                <Button type="submit" className="h-8 text-[12px] px-3" disabled={saving}>
                  Save
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
		</PageContainer>
	)
}

