'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { toastError } from '@/lib/toast'
import {
  listActiveOrganizations,
  listCollegesByOrganization,
  listAcademicYearsForReadmissionWithProcFallback,
  searchStudentsByKeyword,
  listStudentSubjectsForStudent,
} from '@/services'

type AnyRow = Record<string, any>

const SELECT_CLASS =
  "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"

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

function dedupeByNum(rows: AnyRow[], key: (row: AnyRow) => number): AnyRow[] {
  const seen = new Set<number>()
  return rows.filter((row) => {
    const v = key(row)
    if (!v || seen.has(v)) return false
    seen.add(v)
    return true
  })
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function StudentSubjectsPage() {
  const { user } = useSessionContext()

  const [filterOpen, setFilterOpen] = useState(true)
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingColleges, setLoadingColleges] = useState(false)
  const [loadingAy, setLoadingAy] = useState(false)
  const [loadingStudentSearch, setLoadingStudentSearch] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const [organizations, setOrganizations] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])

  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)

  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [studentOptionsRows, setStudentOptionsRows] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null)

  const [subjects, setSubjects] = useState<AnyRow[]>([])

  const employeeId = Number(user?.employeeId ?? 0)
  const defaultOrgId = Number(user?.organizationId ?? 0)

  useEffect(() => {
    async function loadOrganizations() {
      setLoadingOrgs(true)
      try {
        const rows = await listActiveOrganizations()
        const arr = Array.isArray(rows) ? rows : []
        setOrganizations(arr)
        if (arr.length > 0) {
          const preferred =
            defaultOrgId > 0 && arr.some((r) => pickNum(r, ['organizationId', 'fk_organization_id']) === defaultOrgId)
              ? defaultOrgId
              : pickNum(arr[0], ['organizationId', 'fk_organization_id'])
          setOrganizationId(preferred || null)
        }
      } catch (e) {
        setOrganizations([])
        toastError(e, 'Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
    void loadOrganizations()
  }, [defaultOrgId])

  useEffect(() => {
    async function loadColleges() {
      if (!organizationId) {
        setColleges([])
        setCollegeId(null)
        return
      }
      setLoadingColleges(true)
      try {
        const rows = await listCollegesByOrganization(organizationId)
        const arr = Array.isArray(rows) ? rows : []
        setColleges(arr)
        setCollegeId(arr.length ? pickNum(arr[0], ['collegeId', 'fk_college_id']) : null)
      } catch (e) {
        setColleges([])
        setCollegeId(null)
        toastError(e, 'Failed to load colleges')
      } finally {
        setLoadingColleges(false)
      }
    }
    void loadColleges()
  }, [organizationId])

  useEffect(() => {
    async function loadAcademicYears() {
      if (!collegeId) {
        setAcademicYears([])
        setAcademicYearId(null)
        return
      }
      const cRow = colleges.find((x) => pickNum(x, ['collegeId', 'fk_college_id']) === collegeId)
      const universityId = pickNum(cRow ?? {}, ['universityId', 'fk_university_id'])

      setLoadingAy(true)
      try {
        const rows = await listAcademicYearsForReadmissionWithProcFallback(
          universityId,
          collegeId,
          organizationId ?? 0,
          employeeId,
        )
        const uniq = dedupeByNum(
          Array.isArray(rows) ? rows : [],
          (r) => pickNum(r, ['academicYearId', 'fk_academic_year_id']),
        ).sort(
          (a, b) =>
            parseInt(pickText(b, ['academicYear', 'academic_year']) || '0', 10) -
            parseInt(pickText(a, ['academicYear', 'academic_year']) || '0', 10),
        )
        setAcademicYears(uniq)
        const defaultAy = Number(user?.academicYearId ?? 0)
        const chosen =
          defaultAy > 0 && uniq.some((r) => pickNum(r, ['academicYearId', 'fk_academic_year_id']) === defaultAy)
            ? defaultAy
            : pickNum(uniq[0] ?? {}, ['academicYearId', 'fk_academic_year_id'])
        setAcademicYearId(chosen || null)
      } catch (e) {
        setAcademicYears([])
        setAcademicYearId(null)
        toastError(e, 'Failed to load academic years')
      } finally {
        setLoadingAy(false)
      }
    }
    void loadAcademicYears()
  }, [organizationId, collegeId, colleges, employeeId, user?.academicYearId])

  useEffect(() => {
    setStudentSearchTerm('')
    setStudentOptionsRows([])
    setStudentId(null)
    setSelectedStudent(null)
    setSubjects([])
  }, [organizationId, collegeId, academicYearId])

  const studentSelectOptions = useMemo(
    () =>
      studentOptionsRows.map((row) => ({
        value: String(pickNum(row, ['studentId', 'fk_student_id', 'student_id'])),
        label: `${pickText(row, ['firstName', 'studentName', 'student_name']) || 'Student'} (${pickText(row, ['hallticketNumber', 'rollNumber']) || '-'})`,
      })),
    [studentOptionsRows],
  )

  const subjectRowsFiltered = subjects

  async function searchStudents(term: string) {
    setStudentSearchTerm(term)
    if (term.trim().length <= 4) {
      setStudentOptionsRows([])
      return
    }

    setLoadingStudentSearch(true)
    try {
      const rows = await searchStudentsByKeyword(term)
      setStudentOptionsRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setStudentOptionsRows([])
      toastError(e, 'Student search failed')
    } finally {
      setLoadingStudentSearch(false)
    }
  }

  const loadStudentSubjects = useCallback(async (row: AnyRow) => {
    const sid = pickNum(row, ['studentId', 'fk_student_id', 'student_id'])
    const cid = pickNum(row, ['collegeId', 'fk_college_id']) || (collegeId ?? 0)
    const ayid = pickNum(row, ['academicYearId', 'fk_academic_year_id']) || (academicYearId ?? 0)
    const cyid = pickNum(row, ['courseYearId', 'fk_course_year_id'])
    const sectionId = pickNum(row, ['groupSectionId', 'fk_group_section_id', 'group_section_id'])

    if (!sectionId) {
      toastError(new Error('Section missing'), 'This student is not assigned to any section.')
      setSubjects([])
      return
    }
    if (!sid || !cid || !ayid || !cyid) {
      toastError(new Error('Incomplete student record'), 'Unable to resolve student subject keys.')
      setSubjects([])
      return
    }

    setLoadingSubjects(true)
    try {
      const rows = await listStudentSubjectsForStudent({
        collegeId: cid,
        academicYearId: ayid,
        studentId: sid,
        courseYearId: cyid,
      })
      setSubjects(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setSubjects([])
      toastError(e, 'Failed to load student subjects')
    } finally {
      setLoadingSubjects(false)
    }
  }, [collegeId, academicYearId])

  async function onSelectStudent(value: string | null) {
    const sid = parseSelectNumber(value)
    setStudentId(sid)
    setSubjects([])
    if (!sid) {
      setSelectedStudent(null)
      return
    }
    const row = studentOptionsRows.find((x) => pickNum(x, ['studentId', 'fk_student_id', 'student_id']) === sid) ?? null
    console.log(JSON.stringify(row, null, 2))
    setSelectedStudent(row)
    if (row) await loadStudentSubjects(row)
  }

  const organizationOpts = organizations.map((row) => ({
    value: String(pickNum(row, ['organizationId', 'fk_organization_id'])),
    label: pickText(row, ['orgCode', 'organizationCode', 'organizationName']) || 'Organization',
  }))

  const collegeOpts = colleges.map((row) => ({
    value: String(pickNum(row, ['collegeId', 'fk_college_id'])),
    label: pickText(row, ['collegeCode', 'college_code', 'collegeName']) || 'College',
  }))

  const ayOpts = academicYears.map((row) => ({
    value: String(pickNum(row, ['academicYearId', 'fk_academic_year_id'])),
    label: pickText(row, ['academicYear', 'academic_year']) || 'Academic year',
  }))

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Student Subjects"
        description="Search a student and view assigned subjects."
      />

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
          <h2 className="app-card-title">Student Subjects</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filterOpen && (
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
            <Select
              label="Organization"
              value={organizationId ? String(organizationId) : null}
              onChange={(v) => setOrganizationId(parseSelectNumber(v))}
              options={organizationOpts}
              placeholder="Select organization"
              isLoading={loadingOrgs}
              className={SELECT_CLASS}
            />
            <Select
              label="College"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(parseSelectNumber(v))}
              options={collegeOpts}
              placeholder="Select college"
              isLoading={loadingColleges}
              disabled={!organizationId}
              className={SELECT_CLASS}
            />
            <Select
              label="Academic year"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(parseSelectNumber(v))}
              options={ayOpts}
              placeholder="Select academic year"
              isLoading={loadingAy}
              disabled={!collegeId}
              className={SELECT_CLASS}
            />
            <Select
              label="Student"
              value={studentId ? String(studentId) : null}
              onChange={(v) => void onSelectStudent(v)}
              options={studentSelectOptions}
              placeholder="Search and select student"
              searchable
              onSearch={(term) => void searchStudents(term)}
              isLoading={loadingStudentSearch}
              disabled={!academicYearId}
              className={SELECT_CLASS}
            />
          </div>
        )}
      </div>

      {!!selectedStudent && (
        <div className="app-card p-4">
          <div className="mb-4 text-lg font-semibold text-primary">
  {selectedStudent.collegeCode} | {selectedStudent.academicYear} |{' '}
  {selectedStudent.courseCode} | {selectedStudent.groupCode} |{' '}
  {selectedStudent.courseYearName.trim()} | {selectedStudent.sectionName}
</div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject code</th>
                  <th className="px-2 py-1 text-left">Subject name</th>
                  <th className="px-2 py-1 text-left">Subject type</th>
                  <th className="px-2 py-1 text-left">Regulation</th>
                </tr>
              </thead>
              <tbody>
                {loadingSubjects ? (
                  <tr className="border-t">
                    <td className="px-2 py-2 text-slate-600" colSpan={5}>Loading subjects…</td>
                  </tr>
                ) : subjectRowsFiltered.length === 0 ? (
                  <tr className="border-t">
                    <td className="px-2 py-2 text-slate-600" colSpan={5}>No subjects found.</td>
                  </tr>
                ) : (
                  subjectRowsFiltered.map((row, index) => (
                    <tr key={`subject-${index}`} className="border-t">
                      <td className="px-2 py-1">{index + 1}</td>
                      <td className="px-2 py-1">{pickText(row, ['subjectCode', 'subject_code']) || '-'}</td>
                      <td className="px-2 py-1">{pickText(row, ['subjectName', 'subject_name']) || '-'}</td>
                      <td className="px-2 py-1">
                        {pickText(row, ['subjectTypeName', 'subjectType', 'subject_type_name']) || '-'}
                      </td>
                      <td className="px-2 py-1">
                        {pickText(row, ['regulationName', 'regulationCode', 'regulation_name']) || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
