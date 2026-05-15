'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSessionContext } from '@/context/SessionContext'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { NoticeAlert } from '@/common/components/feedback'
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
import { listExamMarksSetup, listSubjectCategories, saveExamMarksSetup, getMarksSetupFilters } from '@/services'
import { PageContainer, PageHeader } from '@/components/layout'
import { cn } from '@/lib/utils'

/** Common control border used across this page (matches reference light outline). */
const FIELD_OUTLINE = 'border border-[#e1e6ee]'
const FIELD_INPUT = 'h-10 rounded-[8px] bg-white text-[12px]'
const FILTER_INPUT = 'h-9 rounded-[8px] bg-white text-[12px]'
const CHECKBOX_STYLE = 'border-[#cfd6e2] data-[state=checked]:bg-[#17a689] data-[state=checked]:border-[#17a689]'

type AnyRow = Record<string, any>
type Notice = { type: 'success' | 'error'; message: string } | null

function categoryChipClass(label: string): string {
  const value = label.toLowerCase()
  if (value.includes('special')) return 'bg-[#e9f2ff] text-[#005ecb]'
  if (value.includes('lab')) return 'bg-[#fff3d7] text-[#9a6400]'
  return 'bg-[#e8fbf8] text-[#007e7a]'
}

export default function ExamMaxMarksSetupPage() {
  const { user } = useSessionContext()
  const orgId = useMemo(() => {
    const fromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
    const fromSession = Number(user?.organizationId ?? 0)
    return fromStorage || fromSession || 1
  }, [user?.organizationId])
  const empId = useMemo(() => {
    const fromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
    const fromSession = Number(user?.employeeId ?? 0)
    return fromStorage || fromSession || 31754
  }, [user?.employeeId])

  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [regFilterData, setRegFilterData] = useState<AnyRow[]>([])
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
      const [filtersResult, cats] = await Promise.all([
        getMarksSetupFilters(orgId, empId).catch(() => ({ filtersData: [], regulationData: [] })),
        listSubjectCategories().catch(() => []),
      ])
      setFiltersData(Array.isArray(filtersResult.filtersData) ? filtersResult.filtersData : [])
      setRegFilterData(Array.isArray(filtersResult.regulationData) ? filtersResult.regulationData : [])
      setSubjectCats(Array.isArray(cats) ? cats : [])
    }
    loadBase()
  }, [orgId, empId])

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
    setRegulations([])
    setRegulationId(null)
    setRows([])
    if (!courseId || !universityId) return

    const raw = regFilterData.filter(
      (r) =>
        Number(r.fk_university_id) === Number(universityId) &&
        Number(r.fk_course_id) === Number(courseId),
    )

    const seen = new Set<number>()
    const regs: AnyRow[] = []
    for (const r of raw) {
      const id = Number(r.fk_regulation_id ?? 0)
      if (!id || seen.has(id)) continue
      seen.add(id)
      regs.push({
        regulationId: id,
        regulationCode: r.regulation_code ?? r.regulationCode ?? '',
      })
    }

    setRegulations(regs)
    if (regs[0]?.regulationId) setRegulationId(Number(regs[0].regulationId))
  }, [courseId, universityId, regFilterData])

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
      <div className="app-card overflow-hidden shadow-sm">
        <button
          type="button"
          className={cn(
            'w-full px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between text-left rounded-t-md',
            FIELD_OUTLINE,
          )}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <h2 className="text-[15px] font-semibold text-[#007e7a]">Exam Marks Setup</h2>
          <div className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <span>Filter</span>
            <Filter className="h-3.5 w-3.5" />
            {filterOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </button>
        {filterOpen && (
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-3">
              <Label className="text-[13px]">University</Label>
              <Select value={universityId ? String(universityId) : undefined} onValueChange={(v) => setUniversityId(Number(v))}>
                <SelectTrigger className={cn(FILTER_INPUT, FIELD_OUTLINE)}><SelectValue placeholder="University" /></SelectTrigger>
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
              <Label className="text-[13px]">Course</Label>
              <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                <SelectTrigger className={cn(FILTER_INPUT, FIELD_OUTLINE)}><SelectValue placeholder="Course" /></SelectTrigger>
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
              <Label className="text-[13px]">Regulation</Label>
              <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
                <SelectTrigger className={cn(FILTER_INPUT, FIELD_OUTLINE)}><SelectValue placeholder="Regulation" /></SelectTrigger>
                <SelectContent>
                  {regulations.map((r, i) => (
                    <SelectItem key={`r-${r.regulationId ?? i}`} value={String(r.regulationId)}>
                      {r.regulationCode ?? r.regulation_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 h-9">
              <Checkbox
                id="disabled"
                className={CHECKBOX_STYLE}
                checked={isForDisabled}
                onCheckedChange={(v) => setIsForDisabled(Boolean(v))}
              />
              <Label htmlFor="disabled" className="text-[13px]">Is For Disability</Label>
            </div>
            <div className="md:col-span-1">
              <Button
                onClick={getDetails}
                className="h-[30px] w-full px-4 text-[12px] rounded-[10px] text-white border-0 bg-[linear-gradient(135deg,#1D9E75_0%,#1a6fa0_100%)] hover:bg-[linear-gradient(135deg,#1D9E75_0%,#1a6fa0_100%)]"
              >
                Get List
              </Button>
            </div>
          </div>
        )}
      </div>
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

      {rows.length > 0 && (
        <div className="app-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-[#007e7a]">Marks Setup</h3>
            <SearchInput
              className="w-full max-w-sm"
              placeholder="Search marks…"
              value={q}
              onChange={setQ}
            />
          </div>
          <div className="space-y-2">
            {filteredRows.map((r, i) => (
              <div key={`m-${r.subjectCategoryCatDetId}-${i}`} className="rounded-xl border border-[#dde3ec] overflow-hidden bg-white">
                <div className="px-4 py-2 border-b border-[#e8ecf2] bg-[#f8f8f4]">
                  <span className={cn('inline-flex items-center rounded-full px-3 py-0.5 text-[12px] font-semibold', categoryChipClass(String(r.subjectCategoryCode || r.marksSetupName || '')))}>
                    {r.subjectCategoryCode || r.marksSetupName}
                  </span>
                </div>
                <div className="px-4 py-3 overflow-x-auto">
                  <div className="min-w-[920px]">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-[hsl(var(--foreground))]">
                      <span>Marks Setup Name</span>
                      <span>Internal</span>
                      <span>External</span>
                      <span>Ext. Pass %</span>
                      <span>Pass %</span>
                      <span>Final Int. %</span>
                      <span>Final Ext. %</span>
                      <span>Active</span>
                    </div>
                    <div className="mt-2 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-2 items-center">
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} value={r.marksSetupName} onChange={(e) => updateRowText(i, 'marksSetupName', e.target.value)} />
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} type="number" value={r.internalMarks} onChange={(e) => updateRow(i, 'internalMarks', Number(e.target.value))} />
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} type="number" value={r.externalMarks} onChange={(e) => updateRow(i, 'externalMarks', Number(e.target.value))} />
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} type="number" value={r.externalPassPercentage} onChange={(e) => updateRow(i, 'externalPassPercentage', Number(e.target.value))} />
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} type="number" value={r.passPercentage} onChange={(e) => updateRow(i, 'passPercentage', Number(e.target.value))} />
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} type="number" value={r.finalIntPercentage} onChange={(e) => updateRow(i, 'finalIntPercentage', Number(e.target.value))} />
                      <Input className={cn(FIELD_INPUT, FIELD_OUTLINE)} type="number" value={r.finalExtPercentage} onChange={(e) => updateRow(i, 'finalExtPercentage', Number(e.target.value))} />
                      <div className="h-10 flex items-center justify-center">
                        <Checkbox
                          id={`active-${i}`}
                          className={CHECKBOX_STYLE}
                          checked={!!r.isActive}
                          onCheckedChange={(v) => updateRowBool(i, 'isActive', Boolean(v))}
                        />
                      </div>
                    </div>
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

