'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ColDef } from 'ag-grid-community'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import {
  enrichGroupYearRegulationRows,
  getDigitalOnlineSyncFilters,
  listGroupYearRegulationDetails,
  listRegulationsAdmin,
  listStaffMappingSections,
} from '@/services'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Merge nested Spring DTO fragments onto a flat row so columns and actions see familiar keys. */
function flattenGroupYearRegulationRow(raw: AnyRow): AnyRow {
  const r: AnyRow = { ...raw }
  const mergeShallow = (obj: AnyRow | null | undefined) => {
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue
      const cur = r[k]
      if (cur === undefined || cur === null || cur === '') r[k] = v
    }
  }
  mergeShallow(raw.subject)
  mergeShallow(raw.Subject)
  mergeShallow(raw.subjectregulation)
  mergeShallow(raw.subjectRegulation)
  mergeShallow(raw.Subjectregulation)
  for (const key of ['subjectregulation', 'subjectRegulation', 'Subjectregulation'] as const) {
    const v = raw[key]
    if (Array.isArray(v) && v[0] && typeof v[0] === 'object') mergeShallow(v[0] as AnyRow)
  }
  const scr = raw.subjectCourseyear ?? raw.subjectCourseYear ?? raw.subjectCourseyr ?? raw.subjectcourseyear
  if (scr && typeof scr === 'object') {
    mergeShallow(scr as AnyRow)
    const sro = (scr as AnyRow).subjectregulation ?? (scr as AnyRow).subjectRegulation ?? (scr as AnyRow).Subjectregulation
    if (sro && typeof sro === 'object') mergeShallow(sro as AnyRow)
  }
  const gDetail = raw.groupYrRegulationDetail ?? raw.groupyrRegulationDetail ?? raw.GroupyrRegulationDetail
  if (gDetail && typeof gDetail === 'object') {
    mergeShallow(gDetail)
    mergeShallow((gDetail as AnyRow).subject)
    mergeShallow((gDetail as AnyRow).Subject)
    mergeShallow((gDetail as AnyRow).subjectregulation)
    mergeShallow((gDetail as AnyRow).subjectRegulation)
    mergeShallow((gDetail as AnyRow).Subjectregulation)
  }
  const sid = n(
    r.subjectRegulationId
    ?? r.subjectregulationId
    ?? r.pk_subject_regulation_id
    ?? r.pkSubjectRegulationId
    ?? r.fk_subject_regulation_id
    ?? r.subjectRegulation?.subjectRegulationId
    ?? r.subjectregulation?.subjectRegulationId
    ?? r.Subjectregulation?.subjectRegulationId,
  )
  if (sid) r.subjectRegulationId = sid
  return r
}

function subjectRegulationIdFromRow(row: AnyRow): number {
  return n(
    row.subjectRegulationId
    ?? row.subjectregulationId
    ?? row.pk_subject_regulation_id
    ?? row.pkSubjectRegulationId
    ?? row.fk_subject_regulation_id
    ?? row.subjectRegulation?.subjectRegulationId
    ?? row.subjectregulation?.subjectRegulationId
    ?? row.Subjectregulation?.subjectRegulationId,
  )
}

function subjectTypeFromRow(row: AnyRow): string {
  const fromObj = (o: unknown) => {
    if (!o || typeof o !== 'object') return ''
    const x = o as AnyRow
    return s(
      x.generalDetailName
      ?? x.generalDetailCode
      ?? x.general_detail_name
      ?? x.name
      ?? x.description
      ?? x.subjectTypeName
      ?? x.subjecttypename,
    )
  }
  const nested =
    fromObj(row.subjectTypeGeneralDetail)
    || fromObj(row.subjecttypeGeneralDetail)
    || fromObj(row.generalDetail)
    || (row.subjectType && typeof row.subjectType === 'object' ? fromObj(row.subjectType) : '')
    || (row.subject_type && typeof row.subject_type === 'object' ? fromObj(row.subject_type) : '')
    || fromObj(row.subjecttype)
    || fromObj(row.subject?.subjectType)
    || fromObj(row.Subject?.subjectType)
  if (nested) return nested
  const scalar = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : undefined)
  return s(
    // Same field as university curriculum regulation-subjects grid (Angular "THEORY" / "LAB")
    scalar(row.subjecttypeCode)
    ?? scalar(row.subjectTypeCode)
    ?? scalar(row.subjecttype_code)
    ?? scalar(row.subjectType)
    ?? scalar(row.subject_type)
    ?? row.subjectTypeName
    ?? row.subjecttypename
    ?? row.subjectTypedesc
    ?? row.subject_typedesc
    ?? row.typeName
    ?? row.subjectTypeCode
    ?? row.generalDetailName
    ?? row.general_detail_name
    ?? scalar(row.fk_subjecttype_catdet_id),
  )
}

type ActionsFilterCtx = {
  contextLine: string
  regulationId: number | null
  collegeId: number | null
  academicYearId: number | null
  courseGroupId: number | null
  courseYearId: number | null
}

function makeActionsRenderer(filters: ActionsFilterCtx) {
  return (p: any) => {
    const row = p.data ?? {}
    const sid = subjectRegulationIdFromRow(row)
    const subjectId = n(
      row.subjectId
      ?? row.fk_subject_id
      ?? row.pk_subject_id
      ?? row.subject?.subjectId
      ?? row.Subject?.subjectId,
    )
    const sub = s(row.subjectName ?? row.subject_name)
    const reg = s(row.regulationName ?? row.regulationCode ?? row.regulation_name)
    const qs = new URLSearchParams({ sub, ctx: filters.contextLine, reg })
    if (sid) {
      qs.set('subjectRegulationId', String(sid))
      if (subjectId) qs.set('subjectId', String(subjectId))
      if (filters.regulationId) qs.set('regulationId', String(filters.regulationId))
      if (filters.courseYearId) qs.set('courseYearId', String(filters.courseYearId))
    } else if (
      subjectId
      && filters.regulationId
      && filters.collegeId
      && filters.academicYearId
      && filters.courseGroupId
      && filters.courseYearId
    ) {
      qs.set('subjectId', String(subjectId))
      qs.set('regulationId', String(filters.regulationId))
      qs.set('collegeId', String(filters.collegeId))
      qs.set('academicYearId', String(filters.academicYearId))
      qs.set('courseGroupId', String(filters.courseGroupId))
      qs.set('courseYearId', String(filters.courseYearId))
    } else {
      return <span className="text-xs text-muted-foreground">—</span>
    }
    const unitsHref = `/academics/subject-mapping/add-subject-units?${qs.toString()}`
    return (
      <div className="text-xs inline-flex max-w-full flex-nowrap items-center gap-x-1.5 whitespace-nowrap">
        <Link href={unitsHref} className="shrink-0 text-blue-700 font-medium hover:underline">
          Assign Units
        </Link>
        <span className="shrink-0 text-muted-foreground">|</span>
        <span className="shrink-0 text-muted-foreground">Assign Lesson Planning</span>
      </div>
    )
  }
}

export default function SubjectUnitTopicsPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [sections, setSections] = useState<AnyRow[]>([])

  const [rows, setRows] = useState<AnyRow[]>([])
  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    Promise.all([
      getDigitalOnlineSyncFilters(orgId, empId),
      listRegulationsAdmin().catch(() => []),
    ]).then(([d, regs]) => {
      setFiltersData(d.filtersData as AnyRow[])
      setAcademicData(d.academicYearData as AnyRow[])
      setRegulations(Array.isArray(regs) ? regs : [])
    }).catch(() => {
      setFiltersData([])
      setAcademicData([])
      setRegulations([])
    })
  }, [])

  const colleges = useMemo(() => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)), [filtersData])
  const courses = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'), [filtersData, collegeId])
  const courseGroups = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0)), 'fk_course_group_id'), [filtersData, collegeId, courseId])
  const courseYears = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0) && n(r.fk_course_group_id) === (courseGroupId ?? 0)), 'fk_course_year_id').sort((a, b) => n(a.year_order) - n(b.year_order)), [filtersData, collegeId, courseId, courseGroupId])
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id')
      .sort((a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')))
  }, [academicData, filtersData, collegeId])

  useEffect(() => { if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id)) }, [colleges, collegeId])
  useEffect(() => { setCourseId(null); setRegulationId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [collegeId])
  useEffect(() => { if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id)) }, [courses, courseId])
  useEffect(() => { setRegulationId(null); setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseId])
  useEffect(() => { if (!regulationId && regulations.length) setRegulationId(n(regulations[0].regulationId)) }, [regulations, regulationId])
  useEffect(() => { setCourseGroupId(null); setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [regulationId])
  useEffect(() => { if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id)) }, [courseGroups, courseGroupId])
  useEffect(() => { setCourseYearId(null); setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseGroupId])
  // Course Year stays empty until the user selects one — do not auto-pick first option.
  useEffect(() => { setAcademicYearId(null); setGroupSectionId(null); setRows([]) }, [courseYearId])
  useEffect(() => { if (!academicYearId && academicYears.length) setAcademicYearId(n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id)) }, [academicYears, academicYearId])
  useEffect(() => { setGroupSectionId(null); setRows([]); setSections([]) }, [academicYearId])
  useEffect(() => { if (!groupSectionId && sections.length) setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].groupSectionId)) }, [sections, groupSectionId])

  useEffect(() => {
    async function loadSections() {
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !academicYearId) {
        setSections([])
        return
      }
      const organizationId = Number(localStorage.getItem('organizationId') ?? 0)
      const employeeId = Number(localStorage.getItem('employeeId') ?? 0)
      const list = await listStaffMappingSections({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => [])
      setSections(list)
    }
    void loadSections()
  }, [collegeId, courseId, courseGroupId, courseYearId, academicYearId])

  useEffect(() => {
    async function loadRows() {
      if (!courseYearId || !courseGroupId || !regulationId) {
        setRows([])
        return
      }
      setLoading(true)
      const list = await listGroupYearRegulationDetails({
        coursegroupId: courseGroupId,
        courseyearId: courseYearId,
        regulationId,
      }).catch(() => [])
      const flat = Array.isArray(list) ? list.map(flattenGroupYearRegulationRow) : []
      const enriched = regulationId
        ? await enrichGroupYearRegulationRows(flat, {
          regulationId,
          collegeId: collegeId ?? 0,
          academicYearId: academicYearId ?? 0,
          courseGroupId: courseGroupId ?? 0,
          courseYearId: courseYearId ?? 0,
        })
        : flat
      setRows(enriched)
      setLoading(false)
    }
    void loadRows()
  }, [courseYearId, courseGroupId, regulationId, collegeId, academicYearId])

  const contextLine = useMemo(() => {
    const c = s(courses.find((x) => n(x.fk_course_id) === courseId)?.course_code)
    const g = s(courseGroups.find((x) => n(x.fk_course_group_id) === courseGroupId)?.group_code)
    const y = s(courseYears.find((x) => n(x.fk_course_year_id) === courseYearId)?.course_year_name)
    return [s(colleges.find((x) => n(x.fk_college_id) === collegeId)?.college_code), c, g, y].filter(Boolean).join(' / ')
  }, [colleges, courses, courseGroups, courseYears, collegeId, courseId, courseGroupId, courseYearId])

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => [
    { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 },
    {
      headerName: 'Subject',
      minWidth: 240,
      flex: 1.5,
      valueGetter: (p: any) => s(p.data?.subjectName ?? p.data?.subject_name ?? p.data?.name),
    },
    {
      headerName: 'Subject Code',
      minWidth: 130,
      flex: 0.8,
      valueGetter: (p: any) => s(p.data?.subjectCode ?? p.data?.subject_code ?? p.data?.code),
    },
    {
      headerName: 'Subject Type',
      minWidth: 120,
      flex: 0.8,
      valueGetter: (p: any) => subjectTypeFromRow(p.data ?? {}),
    },
    {
      headerName: 'Regulation',
      minWidth: 120,
      flex: 0.8,
      valueGetter: (p: any) => s(
        p.data?.regulationName
        ?? p.data?.regulation_name
        ?? p.data?.regulationCode
        ?? p.data?.regulation_code,
      ),
    },
    {
      headerName: 'Actions',
      minWidth: 240,
      flex: 1.2,
      cellRenderer: makeActionsRenderer({
        contextLine,
        regulationId,
        collegeId,
        academicYearId,
        courseGroupId,
        courseYearId,
      }),
    },
  ], [contextLine, regulationId, collegeId, academicYearId, courseGroupId, courseYearId])

  return (
    <FilteredListPage
      title="Subject Unit Topics"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select label="College *" value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))} searchable />
          <Select label="Course *" value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))} searchable disabled={!collegeId} />
          <Select label="Regulation *" value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulations.map((x) => ({ value: String(n(x.regulationId)), label: s(x.regulationCode || x.regulationName) }))} searchable disabled={!courseId} />
          <Select label="Course Group *" value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroups.map((x) => ({ value: String(n(x.fk_course_group_id)), label: s(x.group_code) }))} searchable disabled={!regulationId} />
          <Select label="Course Year *" value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))} searchable disabled={!courseGroupId} />
        </div>
      )}
      notice={courseYearId ? (
        <div className="px-1 text-[13px] text-blue-700 font-semibold">{contextLine}</div>
      ) : undefined}
      rowData={courseYearId ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      toolbar={{ search: true, searchPlaceholder: 'Search unit/topic' }}
      pagination
      paginationPageSize={10}
    />
  )
}

