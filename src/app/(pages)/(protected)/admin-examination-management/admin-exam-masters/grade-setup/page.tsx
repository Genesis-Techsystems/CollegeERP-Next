'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSessionContext } from '@/context/SessionContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table/TableCard'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { CollegeFilterPanel } from '@/common/components/forms/CollegeFilterPanel'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { Pencil } from 'lucide-react'
import { createExamGrade, getCollegeFilters, listExamGrades, listRegulations, updateExamGrade } from '@/services/examination'

// ── Pure renderers ────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function gradeCodeRenderer(p: ICellRendererParams) {
  return <span className="font-mono text-xs text-indigo-700">{p.value ?? '—'}</span>
}

function creditPointsRenderer(p: ICellRendererParams) {
  if (!p.value || p.value === '—') return <span className="text-[12px] text-slate-500">—</span>
  return <span className="font-mono text-xs text-sky-700">{p.value}</span>
}

export default function GradeSetupPage() {
  const { user } = useSessionContext()

  const [loadingFilters, setLoadingFilters] = useState(true)
  const [allFilters, setAllFilters] = useState<unknown[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [regulations, setRegulations] = useState<any[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedRegulationId, setSelectedRegulationId] = useState<number | null>(null)
  const [isForDisabled, setIsForDisabled] = useState(false)

  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
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
  })

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      try {
        const orgId = user?.organizationId ?? 0
        const empId = user?.employeeId ?? 0
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
    loadFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    })
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((row: any) => {
    setEditing(row)
    setForm({
      gradeCode: row?.gradeCode ?? '',
      gradeName: row?.gradeName ?? '',
      minPoints: String(row?.minPoints ?? row?.fromPoints ?? row?.minGradePoint ?? ''),
      maxPoints: String(row?.maxPoints ?? row?.toPoints ?? row?.maxGradePoint ?? ''),
      fromPercentage: String(row?.fromPercentage ?? row?.minPercentage ?? ''),
      toPercentage: String(row?.toPercentage ?? row?.maxPercentage ?? ''),
      creditPoints: String(row?.creditPoints ?? row?.gradePoint ?? ''),
      description: String(row?.description ?? row?.remarks ?? row?.gradeDesc ?? ''),
      isActive: row?.isActive !== undefined ? !!row.isActive : true,
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
    try {
      const payload: Record<string, unknown> = {
        // Always include these common fields
        gradeCode: form.gradeCode,
        gradeName: form.gradeName,
        isActive: form.isActive,
        disabled: isForDisabled,
        description: form.description,

        // Common numeric ranges (backend field names can vary; include both)
        minPoints: form.minPoints === '' ? null : Number(form.minPoints),
        maxPoints: form.maxPoints === '' ? null : Number(form.maxPoints),
        fromPercentage: form.fromPercentage === '' ? null : Number(form.fromPercentage),
        toPercentage: form.toPercentage === '' ? null : Number(form.toPercentage),
        creditPoints: form.creditPoints === '' ? null : Number(form.creditPoints),

        // Some installs use `gradePoint` instead of `creditPoints`
        gradePoint: form.creditPoints === '' ? null : Number(form.creditPoints),

        // Relationship hints (different Spring mappings exist; harmless if ignored)
        courseId: selectedCourseId,
        regulationId: selectedRegulationId,
      }

      const id = editing?.examGradesId ?? editing?.examGradeId ?? editing?.id
      if (id != null) {
        await updateExamGrade(Number(id), payload)
      } else {
        await createExamGrade(payload)
      }

      closeModal()
      await handleGetList()
    } finally {
      setSaving(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!q.trim()) return rows
    const lower = q.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
  }, [q, rows])

  const cols = useMemo<ColDef<any>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 60 },
    {
      field: 'gradeCode',
      headerName: 'Grade Code',
      width: 84,
      cellRenderer: gradeCodeRenderer,
    },
    {
      field: 'gradeName',
      headerName: 'Grade Name',
      minWidth: 160,
    },
    {
      headerName: 'Min - Max Points',
      minWidth: 120,
      valueGetter: (p) => {
        const d = p.data ?? {}
        const min = d.minPoints ?? d.fromPoints ?? d.minGradePoint
        const max = d.maxPoints ?? d.toPoints ?? d.maxGradePoint
        if (min == null && max == null) return '—'
        const left = min != null ? String(min) : ''
        const right = max != null ? String(max) : ''
        return right ? `${left} - ${right}`.trim() : left || '—'
      },
    },
    {
      headerName: 'Min - Max Score %',
      minWidth: 150,
      valueGetter: (p) => {
        const d = p.data ?? {}
        const min = d.fromPercentage ?? d.minPercentage
        const max = d.toPercentage ?? d.maxPercentage
        if (min == null && max == null) return '—'
        const left = min != null ? String(min) : ''
        const right = max != null ? String(max) : ''
        return right ? `${left} - ${right}`.trim() : left || '—'
      },
    },
    {
      headerName: 'Credit Points',
      width: 92,
      valueGetter: (p) => {
        const d = p.data ?? {}
        return d.creditPoints ?? d.gradePoint ?? '—'
      },
      cellRenderer: creditPointsRenderer,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 96,
      cellRenderer: statusRenderer,
    },
    {
      headerName: 'Actions',
      minWidth: 100,
      cellRenderer: (p: any) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            // In AG Grid, clicks can be consumed by row/cell handlers; stop propagation so
            // the icon button always opens the modal.
            e.preventDefault()
            e.stopPropagation()
            openEdit(p.data)
          }}
          disabled={!selectedCourseId || !selectedRegulationId}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ], [openEdit, selectedCourseId, selectedRegulationId])

	return (
		<PageContainer className="space-y-5">
      <PageHeader title="Grade Setup" subtitle="Configure examination grade bands" />
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
          disabled={!selectedCourseId || !selectedRegulationId || loadingList} className="h-8 px-3 text-[12px] w-full">
          Get List
        </Button>
      </CollegeFilterPanel>

      {/* Removed duplicate top search (search lives inside the table card header) */}

      {hasFetched && (
      <TableCard
        headerLeft={
          <Input
            className="h-7 max-w-sm text-[12px]"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={rows.length === 0}
          />
        }
        headerRight={
          <Button
            size="sm"
            onClick={openAdd}
            disabled={!selectedCourseId || !selectedRegulationId}
          >
            Add Exam Grade
          </Button>
        }
      >
        <DataTable rowData={filteredRows} columnDefs={cols} loading={loadingList} pagination />
      </TableCard>
      )}

      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) closeModal() }}>
        <DialogContent hideClose className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-3 border-b bg-gradient-to-r from-slate-50 to-white">
            <DialogTitle className="text-[15px] sm:text-[16px] font-semibold tracking-tight text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Grade' : 'Add Exam Grade'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={saveGrade} className="px-4 py-2.5 space-y-2.5 bg-white">
            {/* Course context bar */}
            <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[12px] text-slate-700 font-medium">Course</span>
                <span className="text-slate-400">:</span>
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
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
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
                  <label className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                    <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
                    <span className="text-[12px] text-slate-700">Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-[12px] text-slate-600">Description</Label>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <textarea
                  className="w-full min-h-[90px] resize-y px-3 py-2 text-[12px] leading-relaxed outline-none"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Add notes or description (optional)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="-mx-6 px-6 pt-3 pb-4 bg-white border-t border-slate-200">
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

