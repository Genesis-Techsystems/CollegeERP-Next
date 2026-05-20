'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  listMapRegulationSubjects,
  listRegulationsByCourse,
  listSubjectRegulationsByRegulation,
  listGroupSections,
  saveSubjectRegulations,
} from '@/services'

type AnyRow = Record<string, any>

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function safe(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

const COLS = {
  siNo: { headerName: 'S.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 } as ColDef<AnyRow>,
  subjectCode: { field: 'subjectCode', headerName: 'Subject Code', minWidth: 130, flex: 1 },
  subjectName: { field: 'subjectName', headerName: 'Subject Name', minWidth: 220, flex: 1.2 },
  subjectTypeName: { field: 'subjectTypeName', headerName: 'Subject Type', minWidth: 140, flex: 1 },
  subCreditHrs: { field: 'subCreditHrs', headerName: 'Credits', minWidth: 100, maxWidth: 120, flex: 0 } as ColDef<AnyRow>,
  noExams: { field: 'noExams', headerName: 'No Exam', minWidth: 90, maxWidth: 110, flex: 0 } as ColDef<AnyRow>,
  regulationName: { field: 'regulationName', headerName: 'Regulation', minWidth: 130, flex: 1 },
  stdReg: { field: 'isIncludeInStdReg', headerName: 'Std Reg Subject', minWidth: 130, maxWidth: 150, flex: 0 } as ColDef<AnyRow>,
  actions: { headerName: 'Actions', minWidth: 90, maxWidth: 100, flex: 0 } as ColDef<AnyRow>,
}

function makeDeleteRenderer(onDelete: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded p-1 text-red-600 hover:bg-red-50"
      onClick={() => p.data && onDelete(p.data)}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
function makeNoExamRenderer(onToggle: (row: AnyRow, checked: boolean) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <input
        type="checkbox"
        checked={Boolean(row.noExams)}
        onChange={(e) => onToggle(row, e.target.checked)}
      />
    )
  }
}
function stdRegRenderer(p: ICellRendererParams<AnyRow>) {
  return <span>{p.data?.isIncludeInStdReg ? 'Yes' : 'No'}</span>
}

export default function SubjectAllocationSemRegulationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useMemo(() => ({
    universityId: num(searchParams.get('universityId')),
    collegeId: num(searchParams.get('collegeId')),
    collegeName: safe(searchParams.get('collegeName')),
    courseId: num(searchParams.get('courseId')),
    courseName: safe(searchParams.get('courseName')),
    courseGroupId: num(searchParams.get('courseGroupId')),
    groupName: safe(searchParams.get('groupName')),
    courseYearId: num(searchParams.get('courseYearId')),
    courseYearName: safe(searchParams.get('courseYearName')),
    academicYearId: num(searchParams.get('academicYearId')),
    academicYear: safe(searchParams.get('academicYear')),
    regulationId: num(searchParams.get('regulationId')),
  }), [searchParams])

  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [deletedRows, setDeletedRows] = useState<AnyRow[]>([])
  const [regulationId, setRegulationId] = useState<number | null>(params.regulationId || null)
  const [saving, setSaving] = useState(false)
  const [mapPanelOpen, setMapPanelOpen] = useState(true)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [mapRows, setMapRows] = useState<AnyRow[]>([])

  useEffect(() => {
    if (!params.courseId) return
    listRegulationsByCourse(params.courseId).then(setRegulations).catch(() => setRegulations([]))
  }, [params.courseId])

  useEffect(() => {
    if (!params.courseYearId || !params.academicYearId || !params.courseGroupId) return
    listGroupSections(params.courseYearId, params.academicYearId, params.courseGroupId)
      .then(setSections)
      .catch(() => setSections([]))
  }, [params.courseYearId, params.academicYearId, params.courseGroupId])

  useEffect(() => {
    if (!regulationId) {
      setRows([])
      return
    }
    listSubjectRegulationsByRegulation({
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId,
    }).then((list) => {
      const normalized = list.map((x) => ({
        ...x,
        subjectTypeName: x.subjectTypeName ?? x.subjecttypeName,
        subCreditHrs: x.subjectCourseyears?.[0]?.creditHours ?? x.subCreditHrs ?? '',
        noExams: x.subjectCourseyears?.[0]?.noExams ?? x.noExams ?? false,
      }))
      setRows(normalized)
      setDeletedRows([])
    }).catch(() => setRows([]))
  }, [regulationId, params.collegeId, params.academicYearId, params.courseGroupId, params.courseYearId])

  const regulationCode = useMemo(() => {
    const r = regulations.find((x) => num(x.regulationId ?? x.pk_regulation_id) === (regulationId ?? 0))
    return safe(r?.regulationCode ?? r?.regulationName)
  }, [regulations, regulationId])
  const regulationOptions = useMemo(
    () => regulations.map((r) => ({ value: String(num(r.regulationId ?? r.pk_regulation_id)), label: safe(r.regulationCode ?? r.regulationName) })),
    [regulations],
  )

  function deleteRow(row: AnyRow) {
    setRows((prev) => prev.filter((x) => !(num(x.subjectId) === num(row.subjectId) && num(x.regulationId) === num(row.regulationId))))
    if (row.subjectRegulationId) setDeletedRows((prev) => [...prev, { ...row, isActive: false }])
  }
  function toggleNoExam(row: AnyRow, checked: boolean) {
    setRows((prev) => prev.map((x) => (x === row ? { ...x, noExams: checked } : x)))
  }

  async function saveAll() {
    if (!regulationId) return
    setSaving(true)
    try {
      const payloadRows = [...rows, ...deletedRows].map((row) => {
        if (row.subjectRegulationId) {
          const existingCourseYears = Array.isArray(row.subjectCourseyears) ? row.subjectCourseyears : []
          return {
            ...row,
            subjectCourseyears: existingCourseYears.map((cy: AnyRow) => ({ ...cy, isActive: row.isActive !== false, noExams: Boolean(row.noExams) })),
          }
        }
        const subjectCourseyears = sections.map((sec) => ({
          ...sec,
          isActive: row.isActive !== false,
          noExams: Boolean(row.noExams),
          creditHours: row.subCreditHrs,
          maxWeeklyClasses: row.subCreditHrs,
          preferConsecutive: null,
          subjectId: row.subjectId,
          collegeId: params.collegeId,
        }))
        return {
          ...row,
          academicYearId: params.academicYearId,
          courseYearId: params.courseYearId,
          courseGroupId: params.courseGroupId,
          collegeId: params.collegeId,
          subjectCourseyears,
        }
      })
      await saveSubjectRegulations(payloadRows)
      const refreshed = await listSubjectRegulationsByRegulation({
        collegeId: params.collegeId,
        academicYearId: params.academicYearId,
        courseGroupId: params.courseGroupId,
        courseYearId: params.courseYearId,
        regulationId,
      })
      setRows(refreshed.map((x) => ({
        ...x,
        subjectTypeName: x.subjectTypeName ?? x.subjecttypeName,
        subCreditHrs: x.subjectCourseyears?.[0]?.creditHours ?? x.subCreditHrs ?? '',
        noExams: x.subjectCourseyears?.[0]?.noExams ?? x.noExams ?? false,
      })))
      setDeletedRows([])
    } finally {
      setSaving(false)
    }
  }

  async function openMapModal() {
    if (!regulationId) return
    const mapped = await listMapRegulationSubjects({
      universityId: params.universityId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId,
    }).catch(() => [])
    setMapRows(mapped.map((x) => ({ ...x, checked: false })))
    setMapModalOpen(true)
  }

  function addMappedSubjects() {
    const selected = mapRows.filter((x) => Boolean(x.checked))
    if (selected.length === 0) {
      setMapModalOpen(false)
      return
    }
    setRows((prev) => {
      const next = [...prev]
      for (const item of selected) {
        const sid = num(item.subjectId)
        if (next.some((x) => num(x.subjectId) === sid)) continue
        next.push({
          subjectId: sid,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          subjectTypeName: item.subjecttypeName ?? item.subjectTypeName,
          subCreditHrs: item.subCreditHrs ?? item.subCredits ?? '',
          isIncludeInStdReg: Boolean(item.checked),
          regulationId,
          regulationName: item.regulationName ?? regulationCode,
          noExams: false,
          isActive: true,
        })
      }
      return next
    })
    setMapModalOpen(false)
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    COLS.siNo,
    COLS.subjectCode,
    COLS.subjectName,
    COLS.subjectTypeName,
    COLS.subCreditHrs,
    { ...COLS.noExams, cellRenderer: makeNoExamRenderer(toggleNoExam) },
    COLS.regulationName,
    { ...COLS.stdReg, cellRenderer: stdRegRenderer },
    { ...COLS.actions, cellRenderer: makeDeleteRenderer(deleteRow) },
  ], [rows])

  return (
    <PageContainer>
      <PageHeader title="Course Year Subject Association" />
      <div className="app-card p-3 mb-3">
        <div className="text-[13px] font-semibold text-[hsl(var(--primary))]">
          Course Year Subject Association ({params.collegeName} / {params.academicYear} / {params.courseName} / {params.groupName} / {params.courseYearName})
        </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <p><span className="font-medium">Course :</span> {params.collegeName} / {params.courseName} / {params.groupName}</p>
          <p><span className="font-medium">Academic Year :</span> {params.academicYear}</p>
        </div>
      </div>

      <div className="app-card p-3">
        <div className="flex items-center justify-between">
          <button type="button" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1" onClick={() => setMapPanelOpen((s) => !s)}>
            + Map Regulation Subject
          </button>
          <button type="button" className="text-muted-foreground" onClick={() => setMapPanelOpen((s) => !s)}>
            {mapPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {mapPanelOpen && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Select
              label="Regulation *"
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : null)}
              options={regulationOptions}
              placeholder="Select regulation"
              searchable
            />
            <div className="flex items-end">
              <Button type="button" onClick={() => void openMapModal()} disabled={!regulationId}>
                Map Regulation Subjects
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="app-card mt-3 p-0 overflow-hidden">
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          toolbar={{ search: true, searchPlaceholder: 'Search subjects...' }}
          pagination
          paginationPageSize={10}
        />
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Back</Button>
        <Button type="button" onClick={saveAll} disabled={saving || !regulationId}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>

      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Regulations</DialogTitle>
          </DialogHeader>
          <div className="app-card p-0 overflow-hidden">
            <DataTable
              rowData={mapRows}
              columnDefs={[
                { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 },
                { field: 'subjectCode', headerName: 'Subject Code', minWidth: 140, flex: 1 },
                { field: 'subjectName', headerName: 'Subject Name', minWidth: 260, flex: 1.4 },
                {
                  headerName: 'Add Subject',
                  minWidth: 130,
                  flex: 0,
                  cellRenderer: (p: ICellRendererParams<AnyRow>) => (
                    <input
                      type="checkbox"
                      checked={Boolean(p.data?.checked)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        const sid = num(p.data?.subjectId)
                        setMapRows((prev) => prev.map((r) => (num(r.subjectId) === sid ? { ...r, checked } : r)))
                      }}
                    />
                  ),
                },
              ]}
              pagination
              paginationPageSize={10}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapModalOpen(false)}>Close</Button>
            <Button onClick={addMappedSubjects}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

