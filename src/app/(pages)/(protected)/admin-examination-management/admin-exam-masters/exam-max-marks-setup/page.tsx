'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Alert } from 'antd'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchInput } from '@/common/components/search'
import {
  getCollegeFilters,
  listExamMarksSetup,
  listRegulations,
  listSubjectCategories,
  saveExamMarksSetup,
} from '@/services/examination'
import { PageContainer, PageHeader } from '@/components/layout'
import { cn } from '@/lib/utils'

/** 1px solid light-black border on all data-entry controls (`border` = 1px in Tailwind). */
const FIELD_OUTLINE = 'border-[1px] border-solid border-black/25'

type AnyRow = Record<string, any>
type Notice = { type: 'success' | 'error'; message: string } | null

export default function ExamMaxMarksSetupPage() {
  const orgId = 0
  const empId = 31754

  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [subjectCats, setSubjectCats] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])

  const [universityId, setUniversityId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [isForDisabled, setIsForDisabled] = useState(false)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [filterOpen, setFilterOpen] = useState(true)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    async function loadBase() {
      const [clgFilters, cats] = await Promise.all([
        getCollegeFilters(orgId, empId).catch(() => ({ filtersData: [], academicData: [] })),
        listSubjectCategories().catch(() => []),
      ])
      setFiltersData(Array.isArray(clgFilters.filtersData) ? clgFilters.filtersData : [])
      setSubjectCats(Array.isArray(cats) ? cats : [])
    }
    loadBase()
  }, [])

  const universities = useMemo(() => dedupe(filtersData, 'fk_university_id'), [filtersData])
  const courses = useMemo(
    () => dedupe(filtersData.filter((x) => Number(x.fk_university_id) === Number(universityId)), 'fk_course_id'),
    [filtersData, universityId],
  )

  useEffect(() => {
    if (universities[0]?.fk_university_id) setUniversityId(Number(universities[0].fk_university_id))
  }, [universities])

  useEffect(() => {
    if (courses[0]?.fk_course_id) setCourseId(Number(courses[0].fk_course_id))
    else setCourseId(null)
    setRegulationId(null)
    setRegulations([])
    setRows([])
  }, [courses])

  useEffect(() => {
    async function loadReg() {
      setRegulations([])
      setRegulationId(null)
      setRows([])
      if (!courseId) return
      const list = await listRegulations(courseId).catch(() => [])
      const regs = Array.isArray(list) ? list : []
      setRegulations(regs)
      if (regs[0]?.regulationId) setRegulationId(Number(regs[0].regulationId))
    }
    loadReg()
  }, [courseId])

  async function getDetails() {
    setRows([])
    if (!courseId || !regulationId) return
    setLoading(true)
    const data = await listExamMarksSetup(courseId, regulationId, isForDisabled).catch(() => [])
    const existing = Array.isArray(data) ? data : []

    const byCat = new Map<number, AnyRow>()
    for (const r of existing as AnyRow[]) {
      const key = Number(r.subjectCategoryCatDetId ?? r.subjectCategory?.generalDetailId ?? 0)
      if (key) byCat.set(key, r)
    }

    const merged = subjectCats.map((cat) => {
      const key = Number(cat.generalDetailId)
      const r = byCat.get(key)
      return {
        marksSetupId: r?.marksSetupId ?? null,
        subjectCategoryCatDetId: key,
        subjectCategoryCode: r?.subjectCategoryCode ?? cat.generalDetailCode ?? '',
        marksSetupName: r?.marksSetupName ?? cat.generalDetailDisplayName ?? cat.generalDetailCode ?? '',
        internalMarks: Number(r?.internalMarks ?? 0),
        externalMarks: Number(r?.externalMarks ?? 0),
        passPercentage: Number(r?.passPercentage ?? 0),
        externalPassPercentage: Number(r?.externalPassPercentage ?? 0),
        finalIntPercentage: Number(r?.finalIntPercentage ?? 0),
        finalExtPercentage: Number(r?.finalExtPercentage ?? 0),
        isActive: r?.isActive ?? true,
      }
    })
    setRows(merged)
    setLoading(false)
  }

  function updateRow(idx: number, field: string, value: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: Number.isFinite(value) ? value : 0 } : r)),
    )
  }

  function updateRowText(idx: number, field: string, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function updateRowBool(idx: number, field: string, value: boolean) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      `${r.subjectCategoryCode ?? ''} ${r.marksSetupName ?? ''}`.toLowerCase().includes(s),
    )
  }, [rows, q])

  async function save() {
    if (!universityId || !courseId || !regulationId || rows.length === 0) return
    setNotice(null)
    const payload = rows.map((r) => ({
      marksSetupId: r.marksSetupId ?? undefined,
      subjectCategoryCatDetId: r.subjectCategoryCatDetId,
      marksSetupName: r.marksSetupName,
      internalMarks: Number(r.internalMarks ?? 0),
      externalMarks: Number(r.externalMarks ?? 0),
      passPercentage: Number(r.passPercentage ?? 0),
      externalPassPercentage: Number(r.externalPassPercentage ?? 0),
      finalIntPercentage: Number(r.finalIntPercentage ?? 0),
      finalExtPercentage: Number(r.finalExtPercentage ?? 0),
      disabled: isForDisabled,
      isActive: true,
      university: { universityId },
      course: { courseId },
      regulation: { regulationId },
    }))
    const res = await saveExamMarksSetup(payload).catch(() => ({ success: false, message: 'Save failed' }))
    if ((res as any)?.success === false) {
      setNotice({ type: 'error', message: (res as any)?.message ?? 'Save failed' })
      return
    }
    setNotice({ type: 'success', message: (res as any)?.message ?? 'Saved' })
    await getDetails()
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Marks Setup" subtitle="Configure maximum marks per subject" />
      <div className="app-card overflow-hidden">
        <button
          type="button"
          className={cn(
            'w-full px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between text-left rounded-t-md',
            FIELD_OUTLINE,
          )}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Marks Setup</h2>
          <div className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <span>Filter</span>
            <Filter className="h-3.5 w-3.5" />
            {filterOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </button>
        {filterOpen && (
          <div className="px-3 py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-3">
              <Label>University</Label>
              <Select value={universityId ? String(universityId) : undefined} onValueChange={(v) => setUniversityId(Number(v))}>
                <SelectTrigger className={cn('h-8 text-[12px]', FIELD_OUTLINE)}><SelectValue placeholder="University" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u, i) => (
                    <SelectItem key={`u-${u.fk_university_id ?? i}`} value={String(u.fk_university_id)}>
                      {u.university_code ?? u.university_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Course</Label>
              <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                <SelectTrigger className={cn('h-8 text-[12px]', FIELD_OUTLINE)}><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c, i) => (
                    <SelectItem key={`c-${c.fk_course_id ?? i}`} value={String(c.fk_course_id)}>
                      {c.course_code ?? c.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Regulation</Label>
              <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
                <SelectTrigger className={cn('h-8 text-[12px]', FIELD_OUTLINE)}><SelectValue placeholder="Regulation" /></SelectTrigger>
                <SelectContent>
                  {regulations.map((r, i) => (
                    <SelectItem key={`r-${r.regulationId ?? i}`} value={String(r.regulationId)}>
                      {r.regulationCode ?? r.regulation_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 h-8">
              <Checkbox
                id="disabled"
                className={FIELD_OUTLINE}
                checked={isForDisabled}
                onCheckedChange={(v) => setIsForDisabled(Boolean(v))}
              />
              <Label htmlFor="disabled">Is For Disability</Label>
            </div>
            <div className="md:col-span-1">
              <Button onClick={getDetails} className={cn('h-8 px-3 text-[12px] w-full', FIELD_OUTLINE)}>Get List</Button>
            </div>
          </div>
        )}
      </div>
      {notice && (
        <Alert
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

      {rows.length > 0 && (
        <div className="app-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[hsl(var(--primary))]">Marks Setup</h3>
            <SearchInput
              className={cn('h-8 text-[12px] w-[260px] rounded-md', FIELD_OUTLINE)}
              placeholder="Search"
              value={q}
              onChange={setQ}
            />
          </div>
          <div className="space-y-2">
            {filteredRows.map((r, i) => (
              <div key={`m-${r.subjectCategoryCatDetId}-${i}`} className="border border-slate-300 rounded-md p-3">
                <div className="text-blue-700 font-medium text-[13px] mb-2">{r.subjectCategoryCode || r.marksSetupName}</div>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="w-[230px] space-y-1">
                    <Label>Marks Setup Name</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} value={r.marksSetupName} onChange={(e) => updateRowText(i, 'marksSetupName', e.target.value)} />
                  </div>
                  <div className="w-[82px] space-y-1">
                    <Label>Internal</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} type="number" value={r.internalMarks} onChange={(e) => updateRow(i, 'internalMarks', Number(e.target.value))} />
                  </div>
                  <div className="w-[82px] space-y-1">
                    <Label>External</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} type="number" value={r.externalMarks} onChange={(e) => updateRow(i, 'externalMarks', Number(e.target.value))} />
                  </div>
                  <div className="w-[96px] space-y-1">
                    <Label className="whitespace-nowrap">External Pass %</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} type="number" value={r.externalPassPercentage} onChange={(e) => updateRow(i, 'externalPassPercentage', Number(e.target.value))} />
                  </div>
                  <div className="w-[82px] space-y-1">
                    <Label className="whitespace-nowrap">Pass %</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} type="number" value={r.passPercentage} onChange={(e) => updateRow(i, 'passPercentage', Number(e.target.value))} />
                  </div>
                  <div className="w-[96px] space-y-1">
                    <Label className="whitespace-nowrap">Final Internal %</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} type="number" value={r.finalIntPercentage} onChange={(e) => updateRow(i, 'finalIntPercentage', Number(e.target.value))} />
                  </div>
                  <div className="w-[96px] space-y-1">
                    <Label className="whitespace-nowrap">Final External %</Label>
                    <Input className={cn('h-8 text-[12px]', FIELD_OUTLINE)} type="number" value={r.finalExtPercentage} onChange={(e) => updateRow(i, 'finalExtPercentage', Number(e.target.value))} />
                  </div>
                  <div className="w-[95px] flex items-center gap-2 h-8 self-end pb-1">
                    <Checkbox
                      id={`active-${i}`}
                      className={FIELD_OUTLINE}
                      checked={!!r.isActive}
                      onCheckedChange={(v) => updateRowBool(i, 'isActive', Boolean(v))}
                    />
                    <Label htmlFor={`active-${i}`}>Active</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button className={cn('h-8 text-[12px]', FIELD_OUTLINE)} onClick={save} disabled={rows.length === 0}>Save</Button>
          </div>
        </div>
      )}

    </PageContainer>
  )
}

function dedupe<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const v = String(item?.[key] ?? '')
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(item)
  }
  return out
}

