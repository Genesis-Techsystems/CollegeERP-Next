'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSessionContext } from '@/context/SessionContext'
import { MINIO_URL } from '@/config/constants/api'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast'
import {
  fetchStudentDetail,
  listAcademicYearsForReadmissionWithProcFallback,
  listActiveOrganizations,
  listCollegesByOrganization,
  listCourseGroups,
  listCourseGroupsForCourseCascade,
  listCourseYearsByCourse,
  listCoursesByUniversity,
  listCoursesForUniversityCascade,
  listGroupSectionsByFilters,
  listStudentsForPromotionPreview,
  normalizeStudentRow,
  resolveUniversityIdForReadmission,
  searchStudentsByKeyword,
} from '@/services'

type AnyRow = Record<string, any>

const PAGE_SIZES = [10, 25, 50, 100]

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function studentRowId(row: AnyRow, index: number): number {
  return pickNum(row, ['studentId', 'fk_student_id', 'student_id', 'id', 'studentDetailId']) || index + 1
}

function mergeDetail(row: AnyRow): AnyRow {
  const chunks = [row.studentDetail, row.StudentDetail, row.studentProfile, row.StudentProfile].filter(
    (v): v is AnyRow => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
  )
  const nested = chunks.reduce<AnyRow>((acc, cur) => ({ ...acc, ...cur }), {})
  return { ...row, ...nested }
}

function photoUrl(row: AnyRow): string | null {
  const m = mergeDetail(row)
  const p = pickText(m, ['studentPhotoPath', 'student_photo_path', 'photoPath'])
  if (!p) return null
  if (p.startsWith('http')) return p
  const base = MINIO_URL.replace(/\/$/, '')
  const path = p.startsWith('/') ? p : `/${p}`
  return base ? `${base}${path}` : p
}

/** Angular banner: `MVSR | 2025-2026 | B.E. | ECE | II YEAR IV SEM | A` */
function academicPathLine(row: AnyRow): string {
  return [
    pickText(row, ['collegeCode', 'college_code']),
    pickText(row, ['academicYear', 'academic_year']),
    pickText(row, ['courseCode', 'courseName', 'course_code', 'course_name']),
    pickText(row, ['groupCode', 'group_code', 'groupName', 'group_name']),
    pickText(row, ['courseYearName', 'course_year_name', 'courseYearCode']),
    pickText(row, ['section', 'sectionName', 'group_section_name', 'groupSectionName']),
  ]
    .filter(Boolean)
    .join(' | ')
}

function admissionTypeLabel(row: AnyRow): string {
  const lateral = Boolean(row.isLateral ?? row.is_lateral)
  return lateral ? 'LATERAL' : 'REG'
}

function studentProfileHref(studentId: number, check = 1): string {
  return `/admin-student-information-system/students-profile?studentId=${studentId}&check=${check}`
}

function studentEditHref(studentId: number, check = 1): string {
  return `/admin-student-information-system/edit-student?studentId=${studentId}&check=${check}`
}

function studentOptionLabel(row: AnyRow): string {
  const name = pickText(row, ['firstName', 'studentName', 'student_name']) || '-'
  const ht = pickText(row, ['hallticketNumber', 'rollNumber', 'hallticket_number']) || '-'
  return `${name}(${ht})`
}

export default function StudentDetailsPage() {
  const router = useRouter()
  const { user } = useSessionContext()

  const [filterOpen, setFilterOpen] = useState(true)
  const [mode, setMode] = useState<'student' | 'section'>('student')

  const [organizations, setOrganizations] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])

  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [resolvedUniversityId, setResolvedUniversityId] = useState(0)

  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingColleges, setLoadingColleges] = useState(false)

  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [bannerText, setBannerText] = useState('')
  const [loadingRows, setLoadingRows] = useState(false)

  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(0)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailRow, setDetailRow] = useState<AnyRow | null>(null)

  const defaultOrgId = Number(user?.organizationId ?? 0)
  const defaultAyId = Number(user?.academicYearId ?? 0)

  const univId = useMemo(() => {
    const c = colleges.find((x) => pickNum(x, ['collegeId', 'fk_college_id']) === collegeId)
    return c ? pickNum(c, ['universityId', 'fk_university_id', 'univId']) : 0
  }, [colleges, collegeId])

  const effectiveUnivId = univId || resolvedUniversityId

  const goToProfile = useCallback(
    (row: AnyRow) => {
      const sid = studentRowId(row, 0)
      if (!sid) return
      router.push(studentProfileHref(sid, 0))
    },
    [router],
  )

  const goToEditStudent = useCallback(
    (row: AnyRow) => {
      const sid = studentRowId(row, 0)
      if (!sid) return
      router.push(studentEditHref(sid, 1))
    },
    [router],
  )

  const openDetail = useCallback(async (row: AnyRow) => {
    const sid = studentRowId(row, 0)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailRow(mergeDetail(normalizeStudentRow(row)))
    try {
      const full = sid > 0 ? await fetchStudentDetail(sid) : null
      if (full) setDetailRow(mergeDetail(normalizeStudentRow({ ...row, ...full })))
    } catch (e) {
      toastError(e, 'Failed to load student details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const studentSelectOptions = useMemo(
    () =>
      studentOptions.map((row, i) => ({
        value: String(studentRowId(row, i + 1)),
        label: studentOptionLabel(row),
      })),
    [studentOptions],
  )

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pagedRows = useMemo(() => {
    const start = safePage * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, safePage, pageSize])

  const rangeLabel = useMemo(() => {
    if (rows.length === 0) return '0 - 0 of 0'
    const start = safePage * pageSize + 1
    const end = Math.min(rows.length, (safePage + 1) * pageSize)
    return `${start} - ${end} of ${rows.length}`
  }, [rows.length, safePage, pageSize])

  useEffect(() => {
    setPage(0)
  }, [rows, pageSize])

  useEffect(() => {
    if (mode !== 'section') return
    async function loadOrgs() {
      setLoadingOrgs(true)
      try {
        const list = await listActiveOrganizations()
        const arr = Array.isArray(list) ? list : []
        setOrganizations(arr)
        if (arr.length) {
          const preferred =
            defaultOrgId > 0 && arr.some((r) => pickNum(r, ['organizationId', 'fk_organization_id']) === defaultOrgId)
              ? defaultOrgId
              : pickNum(arr[0], ['organizationId', 'fk_organization_id'])
          setOrganizationId(preferred || null)
        }
      } catch {
        setOrganizations([])
      } finally {
        setLoadingOrgs(false)
      }
    }
    void loadOrgs()
  }, [mode, defaultOrgId])

  useEffect(() => {
    if (mode !== 'section' || !organizationId) {
      setColleges([])
      setCollegeId(null)
      return
    }
    async function loadColleges() {
      const orgId = organizationId
      if (!orgId) return
      setLoadingColleges(true)
      try {
        const list = await listCollegesByOrganization(orgId)
        const arr = Array.isArray(list) ? list : []
        setColleges(arr)
        setCollegeId(arr.length ? pickNum(arr[0], ['collegeId', 'fk_college_id']) : null)
      } catch {
        setColleges([])
        setCollegeId(null)
      } finally {
        setLoadingColleges(false)
      }
    }
    void loadColleges()
  }, [mode, organizationId])

  useEffect(() => {
    if (mode !== 'section') return
    setResolvedUniversityId(0)
  }, [mode, collegeId])

  useEffect(() => {
    if (mode !== 'section' || !collegeId) {
      setAcademicYears([])
      setAcademicYearId(null)
      return
    }
    let cancelled = false
    async function loadAy() {
      const cid = collegeId
      if (!cid) return
      try {
        let resolvedUniv = univId
        if (!resolvedUniv) {
          resolvedUniv = await resolveUniversityIdForReadmission({ collegeId: cid }, 0)
        }
        if (!cancelled) setResolvedUniversityId(resolvedUniv > 0 ? resolvedUniv : 0)
        const ayRows = await listAcademicYearsForReadmissionWithProcFallback(
          resolvedUniv,
          cid,
          organizationId ?? defaultOrgId,
          Number(user?.employeeId ?? 0),
        )
        if (cancelled) return
        const list = Array.isArray(ayRows) ? ayRows : []
        setAcademicYears(list)
        const ids = list.map((r) => pickNum(r, ['academicYearId', 'fk_academic_year_id']))
        setAcademicYearId((prev) => {
          if (prev && ids.includes(prev)) return prev
          if (defaultAyId > 0 && ids.includes(defaultAyId)) return defaultAyId
          return list.length ? pickNum(list[0], ['academicYearId', 'fk_academic_year_id']) : null
        })
      } catch {
        if (!cancelled) {
          setAcademicYears([])
          setAcademicYearId(null)
        }
      }
    }
    void loadAy()
    return () => {
      cancelled = true
    }
  }, [mode, collegeId, univId, organizationId, defaultOrgId, defaultAyId, user?.employeeId])

  useEffect(() => {
    if (mode !== 'section') return
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setGroupSectionId(null)
    setCourses([])
    setCourseGroups([])
    setCourseYears([])
    setSections([])
  }, [mode, academicYearId, collegeId])

  useEffect(() => {
    if (mode !== 'section') return
    async function loadCourses() {
      const uid = effectiveUnivId
      if (!uid || !academicYearId) {
        setCourses([])
        setCourseId(null)
        return
      }
      try {
        let list = await listCoursesByUniversity(uid).catch(() => [])
        if (!Array.isArray(list) || list.length === 0) {
          list = await listCoursesForUniversityCascade(uid)
        }
        setCourses(Array.isArray(list) ? list : [])
        setCourseId(list?.length ? pickNum(list[0], ['courseId', 'fk_course_id']) : null)
      } catch {
        setCourses([])
        setCourseId(null)
      }
    }
    void loadCourses()
  }, [mode, effectiveUnivId, academicYearId])

  useEffect(() => {
    if (mode !== 'section') return
    setCourseGroupId(null)
    setCourseYearId(null)
    setGroupSectionId(null)
    setCourseGroups([])
    setCourseYears([])
    setSections([])
  }, [mode, courseId])

  useEffect(() => {
    if (mode !== 'section') return
    async function loadCg() {
      if (!courseId) {
        setCourseGroups([])
        setCourseGroupId(null)
        return
      }
      try {
        let list: AnyRow[] = (await listCourseGroups(courseId).catch(() => [])) as AnyRow[]
        if (list.length === 0) {
          list = await listCourseGroupsForCourseCascade(courseId)
        }
        setCourseGroups(list)
        setCourseGroupId(list.length ? pickNum(list[0], ['courseGroupId', 'fk_course_group_id']) : null)
      } catch {
        setCourseGroups([])
        setCourseGroupId(null)
      }
    }
    void loadCg()
  }, [mode, courseId])

  useEffect(() => {
    if (mode !== 'section') return
    async function loadCy() {
      if (!courseId) {
        setCourseYears([])
        setCourseYearId(null)
        return
      }
      try {
        const list = await listCourseYearsByCourse(courseId)
        setCourseYears(Array.isArray(list) ? list : [])
        setCourseYearId(list?.length ? pickNum(list[0], ['courseYearId', 'fk_course_year_id']) : null)
      } catch {
        setCourseYears([])
        setCourseYearId(null)
      }
    }
    void loadCy()
  }, [mode, courseId, courseGroupId])

  useEffect(() => {
    if (mode !== 'section') return
    async function loadSec() {
      if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) {
        setSections([])
        setGroupSectionId(null)
        return
      }
      try {
        const list = await listGroupSectionsByFilters({
          collegeId,
          academicYearId,
          courseGroupId,
          courseYearId,
        })
        setSections(Array.isArray(list) ? list : [])
      } catch {
        setSections([])
      }
    }
    void loadSec()
  }, [mode, collegeId, academicYearId, courseGroupId, courseYearId])

  const loadStudentById = useCallback(async (sid: number) => {
    setLoadingRows(true)
    try {
      const match =
        studentOptions.find((row, idx) => studentRowId(row, idx + 1) === sid) ?? null
      const detail = await fetchStudentDetail(sid)
      const merged = mergeDetail(
        normalizeStudentRow({ ...(match ?? {}), ...(detail ?? {}), studentId: sid }),
      )
      setRows([merged])
      setBannerText(academicPathLine(merged))
    } catch (e) {
      toastError(e, 'Failed to load student')
      setRows([])
      setBannerText('')
    } finally {
      setLoadingRows(false)
    }
  }, [studentOptions])

  const loadSectionStudents = useCallback(async () => {
    if (!collegeId || !courseGroupId || !groupSectionId) return
    setLoadingRows(true)
    try {
      const list = await listStudentsForPromotionPreview({
        collegeId,
        courseGroupId,
        groupSectionId,
      })
      const normalized = (Array.isArray(list) ? list : []).map((row) =>
        mergeDetail(normalizeStudentRow(row)),
      )
      setRows(normalized)
      const secRow = sections.find(
        (s) => pickNum(s, ['groupSectionId', 'fk_group_section_id']) === groupSectionId,
      )
      const bannerFrom =
        normalized[0] ??
        ({
          collegeCode: pickText(colleges.find((c) => pickNum(c, ['collegeId', 'fk_college_id']) === collegeId) ?? {}, [
            'collegeCode',
            'college_code',
          ]),
          academicYear: pickText(
            academicYears.find((a) => pickNum(a, ['academicYearId', 'fk_academic_year_id']) === academicYearId) ?? {},
            ['academicYear', 'academic_year'],
          ),
          courseCode: pickText(courses.find((c) => pickNum(c, ['courseId', 'fk_course_id']) === courseId) ?? {}, [
            'courseCode',
            'course_code',
          ]),
          groupCode: pickText(
            courseGroups.find((g) => pickNum(g, ['courseGroupId', 'fk_course_group_id']) === courseGroupId) ?? {},
            ['groupCode', 'group_code'],
          ),
          courseYearName: pickText(
            courseYears.find((y) => pickNum(y, ['courseYearId', 'fk_course_year_id']) === courseYearId) ?? {},
            ['courseYearName', 'course_year_name'],
          ),
          section: pickText(secRow ?? {}, ['section', 'groupSectionName', 'group_section_name']),
        } as AnyRow)
      setBannerText(academicPathLine(bannerFrom))
    } catch (e) {
      toastError(e, 'Failed to load students')
      setRows([])
      setBannerText('')
    } finally {
      setLoadingRows(false)
    }
  }, [
    collegeId,
    courseGroupId,
    groupSectionId,
    sections,
    colleges,
    academicYears,
    courses,
    courseGroups,
    courseYears,
    courseId,
    courseYearId,
    academicYearId,
  ])

  useEffect(() => {
    if (mode !== 'student' || !selectedStudentId) {
      if (mode === 'student') {
        setRows([])
        setBannerText('')
      }
      return
    }
    void loadStudentById(selectedStudentId)
  }, [mode, selectedStudentId, loadStudentById])

  useEffect(() => {
    if (mode !== 'section') return
    if (!groupSectionId) {
      setRows([])
      setBannerText('')
      return
    }
    void loadSectionStudents()
  }, [mode, groupSectionId, loadSectionStudents])

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (q.length === 0) {
      setStudentOptions([])
      return
    }
    if (q.length < 3) return
    setStudentSearchLoading(true)
    try {
      const list = await searchStudentsByKeyword(q)
      setStudentOptions(Array.isArray(list) ? list : [])
    } catch {
      setStudentOptions([])
    } finally {
      setStudentSearchLoading(false)
    }
  }

  function resetOnModeChange() {
    setRows([])
    setBannerText('')
    setSelectedStudentId(null)
    setStudentOptions([])
    setPage(0)
  }

  const orgOptions = organizations.map((r) => ({
    value: String(pickNum(r, ['organizationId', 'fk_organization_id'])),
    label: pickText(r, ['orgCode', 'organizationCode', 'organizationName']) || 'Organization',
  }))
  const collegeOptions = colleges.map((r) => ({
    value: String(pickNum(r, ['collegeId', 'fk_college_id'])),
    label: pickText(r, ['collegeCode', 'college_code', 'collegeName']) || 'College',
  }))
  const ayOptions = academicYears.map((r) => ({
    value: String(pickNum(r, ['academicYearId', 'fk_academic_year_id'])),
    label: pickText(r, ['academicYear', 'academic_year', 'academic_year_name']) || 'Academic Year',
  }))
  const courseOptions = courses.map((r) => ({
    value: String(pickNum(r, ['courseId', 'fk_course_id'])),
    label: pickText(r, ['courseCode', 'course_code', 'courseName']) || 'Course',
  }))
  const cgOptions = courseGroups.map((r) => ({
    value: String(pickNum(r, ['courseGroupId', 'fk_course_group_id'])),
    label: pickText(r, ['groupCode', 'group_code', 'groupName']) || 'Course Group',
  }))
  const cyOptions = courseYears.map((r) => ({
    value: String(pickNum(r, ['courseYearId', 'fk_course_year_id'])),
    label: pickText(r, ['courseYearName', 'course_year_name']) || 'Course Year',
  }))
  const secOptions = sections.map((r) => ({
    value: String(pickNum(r, ['groupSectionId', 'fk_group_section_id'])),
    label: pickText(r, ['section', 'groupSectionName', 'group_section_name']) || 'Section',
  }))

  return (
    <PageContainer className="space-y-4">
      <ModeRadios
        mode={mode}
        onStudent={() => {
          setMode('student')
          resetOnModeChange()
        }}
        onSection={() => {
          setMode('section')
          resetOnModeChange()
        }}
      />

      <FilterCard
        title="Students Search"
        open={filterOpen}
        onOpenChange={setFilterOpen}
        fieldMaxWidth={mode === 'student' ? '28rem' : undefined}
      >
        <FilterFields
            mode={mode}
            studentSelectOptions={studentSelectOptions}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            studentSearchLoading={studentSearchLoading}
            onSearchStudents={onSearchStudents}
            orgOptions={orgOptions}
            collegeOptions={collegeOptions}
            ayOptions={ayOptions}
            courseOptions={courseOptions}
            cgOptions={cgOptions}
            cyOptions={cyOptions}
            secOptions={secOptions}
            organizationId={organizationId}
            setOrganizationId={setOrganizationId}
            collegeId={collegeId}
            setCollegeId={setCollegeId}
            academicYearId={academicYearId}
            setAcademicYearId={setAcademicYearId}
            courseId={courseId}
            setCourseId={setCourseId}
            courseGroupId={courseGroupId}
            setCourseGroupId={setCourseGroupId}
            courseYearId={courseYearId}
            setCourseYearId={setCourseYearId}
            groupSectionId={groupSectionId}
            setGroupSectionId={setGroupSectionId}
            loadingOrgs={loadingOrgs}
            loadingColleges={loadingColleges}
            sectionsEmpty={sections.length === 0}
          />
      </FilterCard>

      {(rows.length > 0 || loadingRows) && (
        <div className="app-card overflow-hidden">
          {bannerText ? (
            <div className="border-b border-slate-200 bg-slate-50/40 px-3 py-2">
              <p className="text-[13px] font-semibold text-[hsl(var(--primary))]">{bannerText}</p>
            </div>
          ) : null}

          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-sky-50/80 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-24">Photo</th>
                  <th className="px-3 py-2 text-left font-medium">Student Name</th>
                  <th className="px-3 py-2 text-left font-medium w-[280px]" />
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr className="border-t">
                    <td colSpan={3} className="px-3 py-6 text-slate-600">
                      Loading…
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={3} className="px-3 py-6 text-slate-600">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <StudentListRow
                      key={`std-${studentRowId(row, safePage * pageSize + index + 1)}-${index}`}
                      row={row}
                      profileHref={studentProfileHref(studentRowId(row, safePage * pageSize + index + 1), 0)}
                      onViewProfile={() => goToProfile(row)}
                      onViewDetails={() => void openDetail(row)}
                      onEditDetails={() => goToEditStudent(row)}
                      onSendCredentials={() =>
                        toast.message('Use User Management → Student Accounts to send credentials.')
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            pageSize={pageSize}
            setPageSize={setPageSize}
            rangeLabel={rangeLabel}
            page={safePage}
            pageCount={pageCount}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={rows.length === 0}
          />
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Profile</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-slate-600 py-4">Loading…</p>
          ) : !detailRow ? (
            <p className="text-sm text-slate-600 py-4">No student selected.</p>
          ) : (
            <StudentProfilePanel row={detailRow} />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function ModeRadios({
  mode,
  onStudent,
  onSection,
}: {
  mode: 'student' | 'section'
  onStudent: () => void
  onSection: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm px-1">
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input type="radio" checked={mode === 'student'} onChange={onStudent} />
        Search By Student
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input type="radio" checked={mode === 'section'} onChange={onSection} />
        Search By Section
      </label>
    </div>
  )
}

function FilterFields(props: {
  mode: 'student' | 'section'
  studentSelectOptions: { value: string; label: string }[]
  selectedStudentId: number | null
  setSelectedStudentId: (id: number | null) => void
  studentSearchLoading: boolean
  onSearchStudents: (term: string) => void
  orgOptions: { value: string; label: string }[]
  collegeOptions: { value: string; label: string }[]
  ayOptions: { value: string; label: string }[]
  courseOptions: { value: string; label: string }[]
  cgOptions: { value: string; label: string }[]
  cyOptions: { value: string; label: string }[]
  secOptions: { value: string; label: string }[]
  organizationId: number | null
  setOrganizationId: (id: number | null) => void
  collegeId: number | null
  setCollegeId: (id: number | null) => void
  academicYearId: number | null
  setAcademicYearId: (id: number | null) => void
  courseId: number | null
  setCourseId: (id: number | null) => void
  courseGroupId: number | null
  setCourseGroupId: (id: number | null) => void
  courseYearId: number | null
  setCourseYearId: (id: number | null) => void
  groupSectionId: number | null
  setGroupSectionId: (id: number | null) => void
  loadingOrgs: boolean
  loadingColleges: boolean
  sectionsEmpty: boolean
}) {
  const p = props
  return (
    <>
      {p.mode === 'student' ? (
        <Select
            label="Student"
            placeholder="Search student name / hallticket"
            value={p.selectedStudentId ? String(p.selectedStudentId) : null}
            options={p.studentSelectOptions}
            searchable
            clearable
            isLoading={p.studentSearchLoading}
            className={FILTER_CARD_SELECT_CLASS}
            onSearch={(term) => p.onSearchStudents(term)}
            onChange={(v) => p.setSelectedStudentId(v ? Number(v) : null)}
          />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Select
            label="Organization"
            value={p.organizationId ? String(p.organizationId) : null}
            onChange={(v) => p.setOrganizationId(v ? Number(v) : null)}
            options={p.orgOptions}
            placeholder="Organization"
            isLoading={p.loadingOrgs}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="College"
            value={p.collegeId ? String(p.collegeId) : null}
            onChange={(v) => p.setCollegeId(v ? Number(v) : null)}
            options={p.collegeOptions}
            placeholder="College"
            isLoading={p.loadingColleges}
            disabled={!p.organizationId}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Academic Year"
            value={p.academicYearId ? String(p.academicYearId) : null}
            onChange={(v) => p.setAcademicYearId(v ? Number(v) : null)}
            options={p.ayOptions}
            placeholder="Academic Year"
            disabled={!p.collegeId}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Course"
            value={p.courseId ? String(p.courseId) : null}
            onChange={(v) => p.setCourseId(v ? Number(v) : null)}
            options={p.courseOptions}
            placeholder="Course"
            disabled={!p.academicYearId}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Course Group"
            value={p.courseGroupId ? String(p.courseGroupId) : null}
            onChange={(v) => p.setCourseGroupId(v ? Number(v) : null)}
            options={p.cgOptions}
            placeholder="Course Group"
            disabled={!p.courseId}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Course Year"
            value={p.courseYearId ? String(p.courseYearId) : null}
            onChange={(v) => p.setCourseYearId(v ? Number(v) : null)}
            options={p.cyOptions}
            placeholder="Course Year"
            disabled={!p.courseGroupId}
            className={FILTER_CARD_SELECT_CLASS}
          />
          <Select
            label="Section"
            value={p.groupSectionId ? String(p.groupSectionId) : null}
            onChange={(v) => p.setGroupSectionId(v ? Number(v) : null)}
            options={p.secOptions}
            placeholder="Section"
            searchable
            disabled={!p.courseYearId || p.sectionsEmpty}
            className={FILTER_CARD_SELECT_CLASS}
          />
        </div>
      )}
    </>
  )
}

function StudentListRow({
  row,
  profileHref,
  onViewProfile,
  onViewDetails,
  onEditDetails,
  onSendCredentials,
}: {
  row: AnyRow
  profileHref: string
  onViewProfile: () => void
  onViewDetails: () => void
  onEditDetails: () => void
  onSendCredentials: () => void
}) {
  const photo = photoUrl(row)
  const ht = pickText(row, ['hallticketNumber', 'rollNumber', 'hallticket_number'])
  const name = pickText(row, ['firstName', 'studentName', 'student_name'])
  const path = academicPathLine(row)
  const mobile = pickText(row, ['mobileNumber', 'mobile_number', 'mobile', 'phone'])
  const reg = admissionTypeLabel(row)

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- MinIO student photo
          <img src={photo} alt="" className="h-14 w-14 rounded border object-cover bg-white" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-400">
            <User className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-[hsl(var(--primary))]">
          <Link href={profileHref} className="hover:underline">
            {ht ? `${ht}, ` : ''}
            {name || '-'}
          </Link>
          <span className="font-normal text-[hsl(var(--primary))]"> ({reg})</span>
        </p>
        {path ? <p className="mt-0.5 text-amber-800/90">{path}</p> : null}
        <p className="mt-0.5 text-slate-600">{mobile ? `${mobile} |` : '—'}</p>
      </td>
      <td className="px-3 py-3 text-[11px] text-[hsl(var(--primary))] whitespace-nowrap">
        <button type="button" className="hover:underline" onClick={onViewProfile}>
          View Profile
        </button>
        <span className="mx-1 text-slate-400">|</span>
        <button type="button" className="hover:underline" onClick={onEditDetails}>
          Edit details
        </button>
        <span className="mx-1 text-slate-400">||</span>
        <button type="button" className="hover:underline" onClick={onViewDetails}>
          View details
        </button>
        <span className="mx-1 text-slate-400">|</span>
        <Link
          href="/user-management/student-accounts"
          className="hover:underline"
          onClick={(e) => {
            e.preventDefault()
            onSendCredentials()
          }}
        >
          Send Credentials
        </Link>
      </td>
    </tr>
  )
}

function TablePagination({
  pageSize,
  setPageSize,
  rangeLabel,
  page,
  pageCount,
  onPrev,
  onNext,
  disabled,
}: {
  pageSize: number
  setPageSize: (n: number) => void
  rangeLabel: string
  page: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
  disabled: boolean
}) {
  return (
    <PaginationFooter>
      <div className="flex items-center gap-2 text-[12px] text-slate-700">
        <span>Items per page:</span>
        <select
          className="h-7 rounded border border-slate-300 bg-white px-2 text-[12px]"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          disabled={disabled}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-slate-700">
        <span>{rangeLabel}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={disabled || page <= 0}
            onClick={onPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={disabled || page >= pageCount - 1}
            onClick={onNext}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PaginationFooter>
  )
}

function PaginationFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2">
      {children}
    </div>
  )
}

function StudentProfilePanel({ row }: { row: AnyRow }) {
  const photo = photoUrl(row)
  const reg = admissionTypeLabel(row)
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-20 w-20 rounded-md border object-cover" />
        ) : (
          <AvatarPlaceholder />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-[12px]">
        <p className="text-[14px] font-semibold text-slate-900">
          {pickText(row, ['hallticketNumber', 'rollNumber'])}, {pickText(row, ['firstName', 'studentName'])}{' '}
          <span className="text-blue-600">({reg})</span>
        </p>
        <p className="text-amber-800/90">{academicPathLine(row)}</p>
        <p className="text-slate-600">{pickText(row, ['mobileNumber', 'mobile', 'phone']) || '—'}</p>
        <p className="text-slate-600">{pickText(row, ['email', 'studentEmail', 'stdEmailId']) || '—'}</p>
      </div>
    </div>
  )
}

function AvatarPlaceholder() {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-500">
      <User className="h-8 w-8" strokeWidth={1.75} aria-hidden />
    </div>
  )
}
