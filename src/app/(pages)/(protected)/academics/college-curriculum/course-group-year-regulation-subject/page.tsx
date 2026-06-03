'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SubjectModal from '@/app/(pages)/(protected)/academics/subjects/SubjectModal'
import {
  listGroupYearRegulationSubjects,
  listSubjectCategories,
  listSubjectsByCourse,
  saveGroupYearRegulationSubjects,
  softDeleteGroupYearRegulationDetail,
} from '@/services'

type AnyRow = Record<string, any>

type FormState = {
  subjectId: number | null
  subjectCategoryCatDetId: number | null
  lectures: string
  tutorials: string
  practicals: string
  internalmarks: string
  externalmarks: string
  credits: string
  isBridgeCourse: boolean
}

const defaultForm: FormState = {
  subjectId: null,
  subjectCategoryCatDetId: null,
  lectures: '',
  tutorials: '',
  practicals: '',
  internalmarks: '',
  externalmarks: '',
  credits: '',
  isBridgeCourse: false,
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function safe(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function toNumberOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const BASE_COLS = {
  siNo: { headerName: 'S.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 } as ColDef<AnyRow>,
  subjectCode: { field: 'subjectCode', headerName: 'Subject Code', minWidth: 110, flex: 1 },
  subjectName: { field: 'subjectName', headerName: 'Subject Name', minWidth: 180, flex: 1.2 },
  subjectType: { field: 'subjecttypeCode', headerName: 'Subject Type', minWidth: 120, flex: 1 },
  category: { field: 'subjectCategoryCatDetCode', headerName: 'Subject Category', minWidth: 130, flex: 1 },
  lectures: { field: 'lectures', headerName: 'Lecture', minWidth: 90, maxWidth: 110, flex: 0 },
  tutorials: { field: 'tutorials', headerName: 'Tutorial', minWidth: 90, maxWidth: 110, flex: 0 },
  practicals: { field: 'practicals', headerName: 'Practical', minWidth: 90, maxWidth: 110, flex: 0 },
  internal: { field: 'internalmarks', headerName: 'Internal', minWidth: 90, maxWidth: 110, flex: 0 },
  external: { field: 'externalmarks', headerName: 'External', minWidth: 90, maxWidth: 110, flex: 0 },
  credits: { field: 'credits', headerName: 'Credits', minWidth: 90, maxWidth: 100, flex: 0 },
  bridge: {
    headerName: 'Bridge',
    minWidth: 90,
    maxWidth: 100,
    valueGetter: (p: ICellRendererParams<AnyRow>) => (p.data?.isBridgeCourse ? 'Yes' : 'No'),
    flex: 0,
  } as ColDef<AnyRow>,
  actions: { headerName: 'Actions', minWidth: 110, maxWidth: 130, flex: 0 } as ColDef<AnyRow>,
}

function makeActionsRenderer(onEdit: (row: AnyRow) => void, onDelete: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={() => p.data && onEdit(p.data)}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-1 text-red-600 hover:bg-red-50"
        onClick={() => p.data && onDelete(p.data)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function CourseGroupYearRegulationSubjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const context = useMemo(() => ({
    universityId: num(searchParams.get('universityId')),
    universityName: safe(searchParams.get('universityName')),
    courseGroupId: num(searchParams.get('courseGroupId')),
    groupName: safe(searchParams.get('groupName')),
    courseYearId: num(searchParams.get('courseYearId')),
    courseYearName: safe(searchParams.get('courseYearName')),
    courseId: num(searchParams.get('courseId')),
    courseName: safe(searchParams.get('courseName')),
    regulationId: num(searchParams.get('regulationId')),
    regulationName: safe(searchParams.get('regulationName')),
  }), [searchParams])

  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [subjectCategories, setSubjectCategories] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [removedRows, setRemovedRows] = useState<AnyRow[]>([])
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subjectModalOpen, setSubjectModalOpen] = useState(false)

  useEffect(() => {
    if (!context.courseId) return
    listSubjectsByCourse(context.courseId).then(setSubjects).catch(() => setSubjects([]))
    listSubjectCategories().then(setSubjectCategories).catch(() => setSubjectCategories([]))
  }, [context.courseId])

  const loadRows = useCallback(async () => {
    if (!context.courseGroupId || !context.courseYearId || !context.regulationId) return
    setLoading(true)
    try {
      const list = await listGroupYearRegulationSubjects(context.courseGroupId, context.courseYearId, context.regulationId)
      setRows(Array.isArray(list) ? list : [])
      setRemovedRows([])
      setEditingId(null)
      setForm(defaultForm)
    } finally {
      setLoading(false)
    }
  }, [context.courseGroupId, context.courseYearId, context.regulationId])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const subjectOptions = useMemo(
    () => subjects.map((x) => ({ value: String(num(x.subjectId ?? x.pk_subject_id)), label: `${safe(x.subjectCode)} - ${safe(x.subjectName)}` })),
    [subjects],
  )
  const categoryOptions = useMemo(
    () => subjectCategories.map((x) => ({ value: String(num(x.generalDetailId ?? x.pk_gd_id)), label: safe(x.generalDetailDisplayName ?? x.generalDetailCode) })),
    [subjectCategories],
  )

  function clearForm() {
    setForm(defaultForm)
    setEditingId(null)
  }

  function hydrateSubjectFields(subjectId: number): Partial<AnyRow> {
    const s = subjects.find((x) => num(x.subjectId ?? x.pk_subject_id) === subjectId)
    if (!s) return {}
    return {
      subjectId,
      subjectCode: safe(s.subjectCode),
      subjectName: safe(s.subjectName),
      subjecttypeId: num(s.subjectTypeId ?? s.subjecttypeId),
      subjecttypeCode: safe(s.subjecttypeCode ?? s.subjectTypeName),
      credits: num(s.subCredits),
    }
  }

  function buildRowFromForm(current?: AnyRow): AnyRow | null {
    if (!form.subjectId) return null
    const fromSubject = hydrateSubjectFields(form.subjectId)
    if (!fromSubject.subjectId) return null
    const category = subjectCategories.find((x) => num(x.generalDetailId ?? x.pk_gd_id) === (form.subjectCategoryCatDetId ?? 0))
    return {
      ...current,
      ...fromSubject,
      subjectCategoryCatDetId: form.subjectCategoryCatDetId ?? undefined,
      subjectCategoryCatDetCode: safe(category?.generalDetailCode),
      lectures: toNumberOrNull(form.lectures),
      tutorials: toNumberOrNull(form.tutorials),
      practicals: toNumberOrNull(form.practicals),
      internalmarks: toNumberOrNull(form.internalmarks),
      externalmarks: toNumberOrNull(form.externalmarks),
      credits: toNumberOrNull(form.credits) ?? num(fromSubject.credits),
      isBridgeCourse: form.isBridgeCourse,
      courseYearId: context.courseYearId,
      regulationId: context.regulationId,
      courseGroupId: context.courseGroupId,
      isActive: true,
    }
  }

  function onAddOrUpdate() {
    const row = buildRowFromForm(rows.find((x) => num(x.subjectId) === editingId))
    if (!row) return
    if (!editingId) {
      const duplicate = rows.some((x) => num(x.subjectId) === num(row.subjectId))
      if (duplicate) return
      setRows((prev) => [...prev, row])
      clearForm()
      return
    }
    setRows((prev) => prev.map((x) => (num(x.subjectId) === editingId ? row : x)))
    clearForm()
  }

  function onEdit(row: AnyRow) {
    setEditingId(num(row.subjectId))
    setForm({
      subjectId: num(row.subjectId),
      subjectCategoryCatDetId: num(row.subjectCategoryCatDetId) || null,
      lectures: safe(row.lectures),
      tutorials: safe(row.tutorials),
      practicals: safe(row.practicals),
      internalmarks: safe(row.internalmarks),
      externalmarks: safe(row.externalmarks),
      credits: safe(row.credits),
      isBridgeCourse: Boolean(row.isBridgeCourse),
    })
  }

  function onDelete(row: AnyRow) {
    setRows((prev) => prev.filter((x) => num(x.subjectId) !== num(row.subjectId)))
    if (num(row.groupyrRegDetailId)) setRemovedRows((prev) => [...prev, row])
    if (editingId && editingId === num(row.subjectId)) clearForm()
  }

  async function onSave() {
    setSaving(true)
    try {
      for (const row of removedRows) {
        if (num(row.groupyrRegDetailId)) {
          // eslint-disable-next-line no-await-in-loop
          await softDeleteGroupYearRegulationDetail(num(row.groupyrRegDetailId))
        }
      }
      if (rows.length > 0) await saveGroupYearRegulationSubjects(rows)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    BASE_COLS.siNo,
    BASE_COLS.subjectCode,
    BASE_COLS.subjectName,
    BASE_COLS.subjectType,
    BASE_COLS.category,
    BASE_COLS.lectures,
    BASE_COLS.tutorials,
    BASE_COLS.practicals,
    BASE_COLS.internal,
    BASE_COLS.external,
    BASE_COLS.credits,
    BASE_COLS.bridge,
    { ...BASE_COLS.actions, cellRenderer: makeActionsRenderer(onEdit, onDelete) },
  ], [editingId, rows])

  return (
    <PageContainer>
      <PageHeader title="University Curriculum Regulation Subjects" />

      <div className="app-card p-3 mb-3">
        <div className="text-[13px] font-semibold text-blue-700">
          {context.universityName} / {context.courseName} / {context.groupName} / {context.courseYearName} / {context.regulationName}
        </div>
      </div>

      <div className="app-card p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="app-card-title">Add Regulation Subject</h3>
          <button
            type="button"
            className="text-sm font-medium text-red-600 hover:underline"
            onClick={() => setSubjectModalOpen(true)}
          >
            + New Subject
          </button>
        </div>

        <div className="grid grid-cols-8 items-end gap-2">
          <div className="min-w-0">
            <Select
              label=""
              value={form.subjectId ? String(form.subjectId) : null}
              onChange={(v) => {
                const id = v ? Number(v) : null
                const details = id ? hydrateSubjectFields(id) : {}
                setForm((prev) => ({
                  ...prev,
                  subjectId: id,
                  credits: details.credits ? String(details.credits) : prev.credits,
                }))
              }}
              options={subjectOptions}
              placeholder="Select subject"
              searchable
            />
          </div>
          <div className="min-w-0">
            <Select
              label=""
              value={form.subjectCategoryCatDetId ? String(form.subjectCategoryCatDetId) : null}
              onChange={(v) => setForm((prev) => ({ ...prev, subjectCategoryCatDetId: v ? Number(v) : null }))}
              options={categoryOptions}
              placeholder="Select category"
              searchable
            />
          </div>
          <Input placeholder="Lectures" type="number" value={form.lectures} onChange={(e) => setForm((p) => ({ ...p, lectures: e.target.value }))} />
          <Input placeholder="Tutorials" type="number" value={form.tutorials} onChange={(e) => setForm((p) => ({ ...p, tutorials: e.target.value }))} />
          <Input placeholder="Practicals" type="number" value={form.practicals} onChange={(e) => setForm((p) => ({ ...p, practicals: e.target.value }))} />
          <Input placeholder="Internal Marks" type="number" value={form.internalmarks} onChange={(e) => setForm((p) => ({ ...p, internalmarks: e.target.value }))} />
          <Input placeholder="External Marks" type="number" value={form.externalmarks} onChange={(e) => setForm((p) => ({ ...p, externalmarks: e.target.value }))} />
          <Input placeholder="Credits" type="number" value={form.credits} onChange={(e) => setForm((p) => ({ ...p, credits: e.target.value }))} />

        </div>
        <div className="mt-2 flex items-center justify-end gap-2">
          <label className="inline-flex items-center gap-2 text-[12px] font-medium whitespace-nowrap">
            <input
              type="checkbox"
              checked={form.isBridgeCourse}
              onChange={(e) => setForm((p) => ({ ...p, isBridgeCourse: e.target.checked }))}
            />
            <span>Bridge Course</span>
          </label>
          <Button type="button" onClick={onAddOrUpdate}>{editingId ? 'Update' : 'Add'}</Button>
          <Button type="button" variant="outline" onClick={clearForm}>Clear</Button>
        </div>
      </div>

      <div className="app-card mt-3 p-0 overflow-hidden">
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          toolbar={{ search: true, searchPlaceholder: 'Search subjects...' }}
          pagination
          paginationPageSize={10}
        />
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/academics/university-curriculum')}
        >
          Back
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {context.courseId ? (
        <SubjectModal
          open={subjectModalOpen}
          onClose={() => setSubjectModalOpen(false)}
          row={null}
          courseId={context.courseId}
          existingRows={subjects}
          onSaved={async () => {
            const list = await listSubjectsByCourse(context.courseId).catch(() => subjects)
            setSubjects(list)
          }}
        />
      ) : null}
    </PageContainer>
  )
}
