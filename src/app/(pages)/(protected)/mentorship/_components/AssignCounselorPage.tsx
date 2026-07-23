'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, UserPlus } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  listAcademicYearsForCollege,
  listActiveCollegesForDepartments,
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
  listCoursesByUniversity,
  listMappedCounselorStudents,
  listStudentsForCounselorAssignment,
  saveCounselorMappings,
  searchEmployeesForMentorship,
  type MentorshipRow,
} from '@/services'
import type { College } from '@/types/college'

type StudentRow = MentorshipRow & {
  studentId?: number
  firstName?: string
  rollNumber?: string
  genderDisplayName?: string
  counselorId?: number
  employeeId?: number
}

function studentLabel(s: StudentRow): string {
  const name = String(s.firstName ?? '')
  const roll = String(s.rollNumber ?? '')
  return roll ? `${name} (${roll})` : name
}

function studentKey(s: StudentRow): number {
  return Number(s.studentId ?? 0)
}

type AssignCounselorPageProps = {
  title?: string
}

export function AssignCounselorPage({ title = 'Assign Counselor' }: Readonly<AssignCounselorPageProps>) {
  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYears, setAcademicYears] = useState<MentorshipRow[]>([])
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courses, setCourses] = useState<MentorshipRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroups, setCourseGroups] = useState<MentorshipRow[]>([])
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYears, setCourseYears] = useState<MentorshipRow[]>([])
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [employees, setEmployees] = useState<MentorshipRow[]>([])
  const [employeeSearching, setEmployeeSearching] = useState(false)
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date())
  const [toDate, setToDate] = useState<Date | null>(() => new Date())

  const [allStudents, setAllStudents] = useState<StudentRow[]>([])
  const [unassigned, setUnassigned] = useState<StudentRow[]>([])
  const [assigned, setAssigned] = useState<StudentRow[]>([])
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<number>>(new Set())
  const [selectedAssigned, setSelectedAssigned] = useState<Set<number>>(new Set())
  const [leftSearch, setLeftSearch] = useState('')
  const [rightSearch, setRightSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [headerLine, setHeaderLine] = useState('')

  useEffect(() => {
    void listActiveCollegesForDepartments()
      .then(setColleges)
      .catch(() => setColleges([]))
  }, [])

  useEffect(() => {
    if (!collegeId || !academicYearId) {
      setCourses([])
      return
    }
    const universityId = Number(colleges.find((c) => c.collegeId === collegeId)?.universityId ?? 0)
    if (!universityId) {
      setCourses([])
      return
    }
    // Angular: listDetailsByTwoIds(courseCrudUrl, universityId, … getDetailsByUniversityIdUrl …)
    void listCoursesByUniversity(universityId)
      .then(setCourses)
      .catch(() => setCourses([]))
  }, [collegeId, academicYearId, colleges])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? String(c.collegeId) })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId),
        label: String(ay.academicYear ?? ay.academicYearId),
      })),
    [academicYears],
  )

  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(c.courseId),
        label: String(c.courseCode ?? c.courseId),
      })),
    [courses],
  )

  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((g) => ({
        value: String(g.courseGroupId),
        label: String(g.groupCode ?? g.groupName ?? g.courseGroupId),
      })),
    [courseGroups],
  )

  const courseYearOptions = useMemo(
    () =>
      courseYears.map((cy) => ({
        value: String(cy.courseYearId),
        label: String(cy.courseYearName ?? cy.courseYearCode ?? cy.courseYearId),
      })),
    [courseYears],
  )

  function resetEmployeeSearch() {
    setEmployeeId(null)
    setEmployees([])
    setEmployeeOptions([])
  }

  function resetStudents() {
    setAllStudents([])
    setUnassigned([])
    setAssigned([])
    setSelectedUnassigned(new Set())
    setSelectedAssigned(new Set())
    setHeaderLine('')
  }

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setAcademicYears([])
    setCourses([])
    setCourseGroups([])
    setCourseYears([])
    resetEmployeeSearch()
    resetStudents()
    if (!cid) return
    try {
      const ay = await listAcademicYearsForCollege(cid)
      setAcademicYears(ay)
    } catch {
      setAcademicYears([])
    }
  }

  function onAcademicYearChange(ayId: number | null) {
    setAcademicYearId(ayId)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setCourseGroups([])
    setCourseYears([])
    resetEmployeeSearch()
    resetStudents()
  }

  async function onCourseChange(coid: number | null) {
    setCourseId(coid)
    setCourseGroupId(null)
    setCourseYearId(null)
    setCourseGroups([])
    setCourseYears([])
    resetEmployeeSearch()
    resetStudents()
    if (!coid) return
    try {
      const [groups, years] = await Promise.all([
        listCourseGroupsByCourse(coid),
        listCourseYearsByCourse(coid),
      ])
      setCourseGroups(groups)
      setCourseYears(years)
    } catch {
      setCourseGroups([])
      setCourseYears([])
    }
  }

  function onCourseGroupChange(gid: number | null) {
    setCourseGroupId(gid)
    setCourseYearId(null)
    resetEmployeeSearch()
    resetStudents()
  }

  function onCourseYearChange(yid: number | null) {
    setCourseYearId(yid)
    resetEmployeeSearch()
    resetStudents()
  }

  /** Angular `calDays` — from date must be ≤ to date. */
  function onFromDateChange(d: Date | null) {
    setFromDate(d)
    if (d && toDate && d.getTime() > toDate.getTime()) {
      toastInfo('From date should be less then To date.')
      setToDate(d)
    }
  }

  function onToDateChange(d: Date | null) {
    if (d && fromDate && fromDate.getTime() > d.getTime()) {
      toastInfo('From date should be less then To date.')
      setToDate(fromDate)
      return
    }
    setToDate(d)
  }

  const loadStudentsForEmployee = useCallback(
    async (eid: number) => {
      if (!collegeId || !academicYearId || !courseId || !courseGroupId || !courseYearId) return
      setLoading(true)
      resetStudents()
      try {
        const [students, mapped] = await Promise.all([
          listStudentsForCounselorAssignment({
            collegeId,
            academicYearId,
            courseId,
            courseGroupId,
            courseYearId,
          }),
          listMappedCounselorStudents({ collegeId, courseGroupId, courseYearId }),
        ])

        // Angular selectedSatff: attach any active mapping; only current employee's students go to assigned;
        // students already mapped to another counselor stay out of both lists (!counselorId → unassigned only).
        let mappingFrom: Date | null = null
        let mappingTo: Date | null = null
        const normalized = students.map((s) => {
          const row = { ...(s as StudentRow) }
          if (row.genderDisplayName === 'Male') row.genderDisplayName = 'M'
          if (row.genderDisplayName === 'Female') row.genderDisplayName = 'F'
          const map = mapped.find(
            (m) => Number(m.studentId) === Number(row.studentId) && m.isActive === true,
          )
          if (map) {
            row.counselorId = Number(map.counselorId)
            row.employeeId = Number(map.employeeId)
            row.fromDate = map.fromDate
            row.toDate = map.toDate
            if (Number(map.employeeId) === eid) {
              if (map.fromDate) mappingFrom = new Date(String(map.fromDate))
              if (map.toDate) mappingTo = new Date(String(map.toDate))
            }
          }
          return row
        })

        setAllStudents(normalized)
        const assignedRows = normalized.filter(
          (s) => Number(s.employeeId) === eid && Boolean(s.counselorId),
        )
        const unassignedRows = normalized.filter((s) => !s.counselorId)
        setAssigned(assignedRows)
        setUnassigned(unassignedRows)
        if (mappingFrom) setFromDate(mappingFrom)
        if (mappingTo) setToDate(mappingTo)

        const college = colleges.find((c) => c.collegeId === collegeId)
        const course = courses.find((c) => Number(c.courseId) === courseId)
        const group = courseGroups.find((g) => Number(g.courseGroupId) === courseGroupId)
        const year = courseYears.find((y) => Number(y.courseYearId) === courseYearId)
        const ay = academicYears.find((a) => Number(a.academicYearId) === academicYearId)
        setHeaderLine(
          [
            course?.courseCode,
            group?.groupCode ?? group?.groupName,
            year?.courseYearName,
            college?.collegeCode,
            ay?.academicYear,
          ]
            .filter(Boolean)
            .join(' / '),
        )
      } catch (e) {
        toastError(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    },
    [
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      colleges,
      courses,
      courseGroups,
      courseYears,
      academicYears,
    ],
  )

  useEffect(() => {
    if (employeeId && courseYearId) void loadStudentsForEmployee(employeeId)
  }, [employeeId, courseYearId, loadStudentsForEmployee])

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearching(true)
    try {
      // Angular enteredEmployee: employeesearch?q=&empStatus=ACTV (no collegeId)
      const found = await searchEmployeesForMentorship(0, q)
      setEmployees(found)
      setEmployeeOptions(
        found.map((e) => ({
          value: String(e.employeeId),
          label: `${e.empNumber ?? ''}${e.firstName ? ` (${String(e.firstName)})` : ''}`.trim(),
        })),
      )
    } catch (e) {
      toastError(getErrorMessage(e))
      setEmployeeOptions([])
    } finally {
      setEmployeeSearching(false)
    }
  }

  const filteredUnassigned = useMemo(() => {
    const q = leftSearch.trim().toLowerCase()
    if (!q) return unassigned
    return unassigned.filter((s) => studentLabel(s).toLowerCase().includes(q))
  }, [unassigned, leftSearch])

  const filteredAssigned = useMemo(() => {
    const q = rightSearch.trim().toLowerCase()
    if (!q) return assigned
    return assigned.filter((s) => studentLabel(s).toLowerCase().includes(q))
  }, [assigned, rightSearch])

  function moveToAssigned() {
    const moving = unassigned.filter((s) => selectedUnassigned.has(studentKey(s)))
    if (!moving.length) return
    setUnassigned((prev) => prev.filter((s) => !selectedUnassigned.has(studentKey(s))))
    setAssigned((prev) => [...prev, ...moving])
    setSelectedUnassigned(new Set())
  }

  function moveToUnassigned() {
    const moving = assigned.filter((s) => selectedAssigned.has(studentKey(s)))
    if (!moving.length) return
    setAssigned((prev) => prev.filter((s) => !selectedAssigned.has(studentKey(s))))
    setUnassigned((prev) => [...prev, ...moving])
    setSelectedAssigned(new Set())
  }

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function assignCounselor() {
    if (!employeeId || !collegeId) {
      toastError('Select college and employee')
      return
    }
    const from = fromDate
    const to = toDate
    if (!from || !to) {
      toastError('Select from and to dates')
      return
    }
    if (from > to) {
      toastInfo('From date should be less then To date.')
      return
    }

    const payload: MentorshipRow[] = []

    for (const s of assigned) {
      payload.push({
        ...s,
        collegeId,
        employeeId,
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        isActive: true,
      })
    }

    for (const s of unassigned) {
      const original = allStudents.find((x) => studentKey(x) === studentKey(s))
      // Angular: only deactivate rows that already had a counselor mapping
      if (original?.counselorId) {
        payload.push({
          ...original,
          isActive: false,
        })
      }
    }

    if (!payload.length) {
      toastInfo('No students to assign.')
      return
    }

    setSaving(true)
    try {
      await saveCounselorMappings(payload)
      toastSuccess('Counselor assignment saved')
      await loadStudentsForEmployee(employeeId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const showStudents = assigned.length > 0 || unassigned.length > 0
  const counselorName =
    (employees.find((e) => Number(e.employeeId) === employeeId)?.firstName as string | undefined) ??
    'Counselor'

  return (
    <FilteredListPage
      title={title}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => void onCollegeChange(v ? Number(v) : null)}
              options={collegeOptions}
              searchable
              className="md:col-span-2"
            />
            <Select
              label="Academic Year *"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => onAcademicYearChange(v ? Number(v) : null)}
              options={academicYearOptions}
              searchable
              disabled={!collegeId}
              className="md:col-span-2"
            />
            <Select
              label="Course *"
              value={courseId ? String(courseId) : null}
              onChange={(v) => void onCourseChange(v ? Number(v) : null)}
              options={courseOptions}
              searchable
              disabled={!academicYearId}
              className="md:col-span-2"
            />
            <Select
              label="Course Group *"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => onCourseGroupChange(v ? Number(v) : null)}
              options={courseGroupOptions}
              searchable
              disabled={!courseId}
              className="md:col-span-3"
            />
            <Select
              label="Course Year *"
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => onCourseYearChange(v ? Number(v) : null)}
              options={courseYearOptions}
              searchable
              disabled={!courseGroupId}
              className="md:col-span-3"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {courseYearId ? (
              <Select
                label="Employee *"
                value={employeeId ? String(employeeId) : null}
                onChange={(v) => setEmployeeId(v ? Number(v) : null)}
                options={employeeOptions}
                searchable
                isLoading={employeeSearching}
                onSearch={(term) => void onEmployeeSearch(term)}
                className="md:col-span-4"
              />
            ) : null}
            <DatePicker
              label="From Date *"
              value={fromDate}
              onChange={onFromDateChange}
              clearable={false}
              className="md:col-span-2"
            />
            <DatePicker
              label="To Date *"
              value={toDate}
              onChange={onToDateChange}
              clearable={false}
              className="md:col-span-2"
            />
          </div>
        </div>
      }
      bodyClassName="border-t-0"
      body={
        showStudents ? (
          <div className="space-y-3">
            {headerLine ? (
              <p className="text-sm font-medium text-[hsl(var(--card-title))]">
                Students — <span className="text-muted-foreground font-normal">{headerLine}</span>
              </p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 border rounded-sm overflow-hidden bg-card">
                <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                  <span>Students</span>
                  <span>{unassigned.length}</span>
                </div>
                <div className="p-2 space-y-2">
                  <SearchInput value={leftSearch} onChange={setLeftSearch} placeholder="Search…" />
                  <ul className="h-[360px] overflow-y-auto border rounded-sm p-1 space-y-0.5">
                    {filteredUnassigned.length === 0 ? (
                      <li className="p-3 text-sm text-muted-foreground">No students</li>
                    ) : (
                      filteredUnassigned.map((s) => {
                        const id = studentKey(s)
                        return (
                          <li key={id}>
                            <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 hover:bg-muted/40 rounded-sm">
                              <input
                                type="checkbox"
                                checked={selectedUnassigned.has(id)}
                                onChange={() => toggleSet(setSelectedUnassigned, id)}
                              />
                              {studentLabel(s)}
                            </label>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>
              </div>

              <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-center gap-2 py-2">
                <Button type="button" size="sm" variant="outline" onClick={moveToAssigned} disabled={loading}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={moveToUnassigned} disabled={loading}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="md:col-span-6 border rounded-sm overflow-hidden bg-card">
                <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                  <span className="truncate">{counselorName}</span>
                  <span>{assigned.length}</span>
                </div>
                <div className="p-2 space-y-2">
                  <SearchInput value={rightSearch} onChange={setRightSearch} placeholder="Search…" />
                  <ul className="h-[360px] overflow-y-auto border rounded-sm p-1 space-y-0.5">
                    {filteredAssigned.length === 0 ? (
                      <li className="p-3 text-sm text-muted-foreground">No students</li>
                    ) : (
                      filteredAssigned.map((s) => {
                        const id = studentKey(s)
                        return (
                          <li key={id}>
                            <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 hover:bg-muted/40 rounded-sm">
                              <input
                                type="checkbox"
                                checked={selectedAssigned.has(id)}
                                onChange={() => toggleSet(setSelectedAssigned, id)}
                              />
                              {studentLabel(s)}
                            </label>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => void assignCounselor()} disabled={saving || loading}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                {saving ? 'Saving…' : 'Assign Counselor'}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading students…</p>
        ) : null
      }
    />
  )
}
