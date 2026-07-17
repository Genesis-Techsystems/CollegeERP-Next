'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Select } from '@/common/components/select'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  getDigitalOnlineSyncFilters,
  listStaffMappingSections,
  loadAssignStudentsToLabBatches,
  submitLabBatchStudentAssignments,
} from '@/services'

type AnyRow = Record<string, any>

type LabStudent = {
  key: string
  studentId: number
  firstName: string
  rollNumber: string
  gender: 'M' | 'F' | ''
  /** null = unassigned pool; 0–3 = studentBatches index */
  batchIndex: number | null
  originalBatchIndex: number | null
  raw: AnyRow
}

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

function genderCode(raw: unknown): 'M' | 'F' | '' {
  const g = s(raw).trim().toLowerCase()
  if (g === 'm' || g === 'male') return 'M'
  if (g === 'f' || g === 'female') return 'F'
  return ''
}

/** Angular `genericFunctions.moment()` — presentDate from localStorage as DD-MM-YYYY → ISO. */
function presentDateIso(): string {
  const raw = String(localStorage.getItem('presentDate') ?? '').trim()
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd)).toISOString()
  }
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()
}

function batchIdOf(row: AnyRow): number {
  return n(row.studentbatchId ?? row.studentBatchId ?? row.fk_student_batch_id)
}

function distributeStudents(
  students: AnyRow[],
  studentBatches: AnyRow[],
  batchWiseStudents: AnyRow[],
): LabStudent[] {
  const batchIds = studentBatches.slice(0, 4).map(batchIdOf)
  const byStudent = new Map<number, AnyRow>()
  for (const b of batchWiseStudents) {
    const sid = n(b.studentId ?? b.fk_student_id)
    if (sid) byStudent.set(sid, b)
  }

  return students.map((row, idx) => {
    const studentId = n(row.studentId ?? row.fk_student_id) || idx + 1
    const firstName = s(row.firstName ?? row.studentName ?? row.student_name)
    const rollNumber = s(row.rollNumber ?? row.hallticketNumber ?? row.registerNo)
    const gender = genderCode(row.genderDisplayName ?? row.gender)
    const bw = byStudent.get(studentId)
    let batchIndex: number | null = null
    if (bw) {
      const bid = batchIdOf(bw)
      const found = batchIds.findIndex((id) => id > 0 && id === bid)
      if (found >= 0) batchIndex = found
    }
    return {
      key: String(studentId),
      studentId,
      firstName,
      rollNumber,
      gender,
      batchIndex,
      originalBatchIndex: batchIndex,
      raw: row,
    }
  })
}

export default function AssignStudentsToLabBatchesPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [studentBatches, setStudentBatches] = useState<AnyRow[]>([])
  const [batchWiseStudents, setBatchWiseStudents] = useState<AnyRow[]>([])
  const [timetables, setTimetables] = useState<AnyRow[]>([])
  const [labStudents, setLabStudents] = useState<LabStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cardsEnabled, setCardsEnabled] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [dragKey, setDragKey] = useState<string | null>(null)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[])
        setAcademicData(d.academicYearData as AnyRow[])
      })
      .catch(() => {
        setFiltersData([])
        setAcademicData([])
      })
  }, [])

  const colleges = useMemo(
    () => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)),
    [filtersData],
  )
  const courses = useMemo(
    () => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'),
    [filtersData, collegeId],
  )
  const courseGroups = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0),
        ),
        'fk_course_group_id',
      ),
    [filtersData, collegeId, courseId],
  )
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0)
            && n(r.fk_course_id) === (courseId ?? 0)
            && n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        'fk_course_year_id',
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  )
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id').sort(
      (a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')),
    )
  }, [academicData, filtersData, collegeId])
  const sectionOptions = useMemo(
    () =>
      sections.map((x) => ({
        value: String(n(x.pk_group_section_id ?? x.fk_group_section_id ?? x.groupSectionId)),
        label: s(x.section) || s(x.sectionName),
      })),
    [sections],
  )

  useEffect(() => {
    if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id))
  }, [colleges, collegeId])
  useEffect(() => {
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setAcademicYearId(null)
    setGroupSectionId(null)
    setLabStudents([])
    setCardsEnabled(false)
  }, [collegeId])
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id))
  }, [courses, courseId])
  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
    setAcademicYearId(null)
    setGroupSectionId(null)
    setLabStudents([])
    setCardsEnabled(false)
  }, [courseId])
  useEffect(() => {
    if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id))
  }, [courseGroups, courseGroupId])
  useEffect(() => {
    setCourseYearId(null)
    setAcademicYearId(null)
    setGroupSectionId(null)
    setLabStudents([])
    setCardsEnabled(false)
  }, [courseGroupId])
  useEffect(() => {
    if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id))
  }, [courseYears, courseYearId])
  useEffect(() => {
    setAcademicYearId(null)
    setGroupSectionId(null)
    setLabStudents([])
    setCardsEnabled(false)
  }, [courseYearId])
  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      setAcademicYearId(
        n([...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]?.fk_academic_year_id),
      )
    }
  }, [academicYears, academicYearId])
  useEffect(() => {
    setGroupSectionId(null)
    setSections([])
    setLabStudents([])
    setCardsEnabled(false)
  }, [academicYearId])
  useEffect(() => {
    if (!groupSectionId && sections.length) {
      setGroupSectionId(n(sections[0].pk_group_section_id ?? sections[0].fk_group_section_id ?? sections[0].groupSectionId))
    }
  }, [sections, groupSectionId])

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

  const reloadAssignment = useCallback(async () => {
    if (!collegeId || !courseId || !courseGroupId || !academicYearId || !groupSectionId) {
      setLabStudents([])
      setStudentBatches([])
      setBatchWiseStudents([])
      setTimetables([])
      setCardsEnabled(false)
      return
    }
    setLoading(true)
    setCardsEnabled(true)
    try {
      const data = await loadAssignStudentsToLabBatches({
        collegeId,
        courseId,
        courseGroupId,
        groupSectionId,
        academicYearId,
      })
      setStudentBatches(data.studentBatches)
      setBatchWiseStudents(data.batchWiseStudents)
      setTimetables(data.timetables)
      setLabStudents(distributeStudents(data.students, data.studentBatches, data.batchWiseStudents))
      setSelectedKeys(new Set())
      setSearchText('')
    } catch {
      setLabStudents([])
      setStudentBatches([])
      setBatchWiseStudents([])
      setTimetables([])
      toastError('Failed to load students for lab assignment')
    } finally {
      setLoading(false)
    }
  }, [collegeId, courseId, courseGroupId, academicYearId, groupSectionId])

  useEffect(() => {
    void reloadAssignment()
  }, [reloadAssignment])

  const selectedCollege = useMemo(
    () => s(colleges.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.college_code),
    [colleges, collegeId],
  )
  const selectedCourse = useMemo(
    () => s(courses.find((x) => n(x.fk_course_id) === (courseId ?? 0))?.course_code),
    [courses, courseId],
  )
  const selectedGroup = useMemo(
    () => s(courseGroups.find((x) => n(x.fk_course_group_id) === (courseGroupId ?? 0))?.group_code),
    [courseGroups, courseGroupId],
  )
  const selectedYear = useMemo(
    () =>
      s(
        courseYears.find((x) => n(x.fk_course_year_id) === (courseYearId ?? 0))?.course_year_code
          ?? courseYears.find((x) => n(x.fk_course_year_id) === (courseYearId ?? 0))?.course_year_name,
      ),
    [courseYears, courseYearId],
  )
  const selectedAcademic = useMemo(
    () => s(academicYears.find((x) => n(x.fk_academic_year_id) === (academicYearId ?? 0))?.academic_year),
    [academicYears, academicYearId],
  )
  const selectedSectionLabel = useMemo(
    () => sectionOptions.find((x) => n(x.value) === (groupSectionId ?? 0))?.label ?? '-',
    [sectionOptions, groupSectionId],
  )

  const unassigned = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return labStudents.filter((st) => {
      if (st.batchIndex != null) return false
      if (!q) return true
      return st.firstName.toLowerCase().includes(q) || st.rollNumber.toLowerCase().includes(q)
    })
  }, [labStudents, searchText])

  const labPanels = useMemo(() => {
    return studentBatches.slice(0, 4).map((batch, index) => ({
      index,
      batch,
      name: s(batch.batchName ?? batch.batch_name) || `Lab ${index + 1}`,
      students: labStudents.filter((st) => st.batchIndex === index),
    }))
  }, [studentBatches, labStudents])

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function moveSelectedTo(targetIndex: number | null) {
    if (selectedKeys.size === 0) return
    setLabStudents((prev) =>
      prev.map((st) => (selectedKeys.has(st.key) ? { ...st, batchIndex: targetIndex } : st)),
    )
    setSelectedKeys(new Set())
  }

  function moveStudentTo(key: string, targetIndex: number | null) {
    setLabStudents((prev) =>
      prev.map((st) => (st.key === key ? { ...st, batchIndex: targetIndex } : st)),
    )
  }

  function onDropPanel(targetIndex: number | null) {
    if (!dragKey) return
    moveStudentTo(dragKey, targetIndex)
    setDragKey(null)
  }

  async function onSave() {
    if (!collegeId || !courseYearId || !academicYearId) return
    if (timetables.length === 0) {
      toastInfo('First create timetable to assign students to lab batches.')
      return
    }
    if (studentBatches.length === 0) {
      toastError('No lab batches found for this course. Create lab batches first.')
      return
    }

    const endDate = timetables[0]?.endDate ?? timetables[0]?.end_date
    const fromDate = presentDateIso()
    const defaultSubtypeId = n(
      studentBatches[0]?.subtypeId
        ?? studentBatches[0]?.subjectType
        ?? studentBatches[0]?.subjecttypeId,
    )

    const payload: AnyRow[] = []

    for (const st of labStudents) {
      if (st.batchIndex == null) {
        // Angular: unassigned students only posted when they already had a batch row (deactivate)
        const existing = batchWiseStudents.find((b) => n(b.studentId ?? b.fk_student_id) === st.studentId)
        if (!existing) continue
        payload.push({
          ...st.raw,
          studentId: st.studentId,
          studentbatchId: null,
          subjectType: defaultSubtypeId,
          academicYearId,
          collegeId,
          courseYearId,
          fromDate: existing.fromDate ?? fromDate,
          toDate: existing.toDate ?? endDate,
          batchwiseStudentId: existing.batchwiseStudentId ?? existing.batchWiseStudentId,
          createdDt: existing.createdDt,
          createdUser: existing.createdUser,
          isActive: false,
        })
        continue
      }

      const batch = studentBatches[st.batchIndex]
      if (!batch) continue
      const existing = batchWiseStudents.find((b) => n(b.studentId ?? b.fk_student_id) === st.studentId)
      const row: AnyRow = {
        ...st.raw,
        studentId: st.studentId,
        studentbatchId: batchIdOf(batch),
        subjectType: n(batch.subtypeId ?? batch.subjectType ?? defaultSubtypeId),
        academicYearId,
        collegeId,
        courseYearId,
        fromDate,
        toDate: endDate,
      }
      if (existing) {
        row.batchwiseStudentId = existing.batchwiseStudentId ?? existing.batchWiseStudentId
        row.fromDate = existing.fromDate ?? fromDate
        row.toDate = existing.toDate ?? endDate
        row.createdDt = existing.createdDt
        row.createdUser = existing.createdUser
      }
      payload.push(row)
    }

    if (payload.length === 0) {
      toastError('No lab batch changes to save')
      return
    }

    setSaving(true)
    try {
      await submitLabBatchStudentAssignments(payload)
      toastSuccess('Students assigned to lab batches successfully')
      await reloadAssignment()
    } catch {
      toastError('Failed to assign students to lab batches')
    } finally {
      setSaving(false)
    }
  }

  function renderStudentItem(st: LabStudent) {
    return (
      <div
        key={st.key}
        draggable
        onDragStart={() => setDragKey(st.key)}
        onDragEnd={() => setDragKey(null)}
        className="px-3 py-2 text-xs border-b flex items-center gap-2 cursor-grab active:cursor-grabbing"
      >
        <input
          type="checkbox"
          checked={selectedKeys.has(st.key)}
          onChange={(e) => toggleKey(st.key, e.target.checked)}
        />
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
            st.gender === 'F' ? 'bg-pink-100 text-pink-700' : st.gender === 'M' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {st.gender || '?'}
        </span>
        <span className="truncate">
          {st.firstName}(
          <span className="text-blue-700 font-semibold">{st.rollNumber}</span>)
        </span>
      </div>
    )
  }

  function renderPanel(
    title: string,
    count: number,
    list: LabStudent[],
    targetIndex: number | null,
    searchable: boolean,
  ) {
    return (
      <div
        className="border rounded-sm overflow-hidden bg-card h-full"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropPanel(targetIndex)}
      >
        <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
          <span>{title}</span>
          <span>{count}</span>
        </div>
        <div className="p-2">
          {searchable ? (
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
                className="h-9 pl-8"
              />
            </div>
          ) : null}
          <div className="mb-2 flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={selectedKeys.size === 0}
              onClick={() => moveSelectedTo(targetIndex)}
            >
              Move here
            </Button>
          </div>
          <div className="h-[320px] overflow-y-auto border rounded-sm">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading students...</div>
            ) : list.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No students</div>
            ) : (
              list.map(renderStudentItem)
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <FilteredPage
      title="Assign Students To Lab"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course *"
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courses.map((x) => ({ value: String(n(x.fk_course_id)), label: s(x.course_code) }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Group *"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
            options={courseGroups.map((x) => ({
              value: String(n(x.fk_course_group_id)),
              label: s(x.group_code) || s(x.group_name),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Year *"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map((x) => ({
              value: String(n(x.fk_course_year_id)),
              label: s(x.course_year_code) || s(x.course_year_name),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYears.map((x) => ({
              value: String(n(x.fk_academic_year_id)),
              label: s(x.academic_year),
            }))}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Section *"
            value={groupSectionId ? String(groupSectionId) : null}
            onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
            options={sectionOptions}
            searchable
            className="md:col-span-2"
          />
        </div>
      )}
    >
      {cardsEnabled && loading && labStudents.length === 0 ? (
        <div className="app-card p-4 text-sm text-muted-foreground" data-no-page-name>
          Loading students...
        </div>
      ) : cardsEnabled && labStudents.length > 0 ? (
        <div className="app-card p-3" data-no-page-name>
          <div className="mb-2.5 px-1 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-primary">
              Students - {selectedCollege} / {selectedCourse} / {selectedGroup} / {selectedYear} / section{' '}
              {selectedSectionLabel}({selectedAcademic})
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Refresh"
              onClick={() => { void reloadAssignment() }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-4">
              {renderPanel('STUDENTS', unassigned.length, unassigned, null, true)}
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {labPanels.length === 0 ? (
                <div className="col-span-full border rounded-sm p-4 text-sm text-muted-foreground">
                  No lab batches found for this course (subject type LAB). Create lab batches under Academic Batches first.
                </div>
              ) : (
                labPanels.map((panel) =>
                  renderPanel(
                    `Lab : ${panel.name}`,
                    panel.students.length,
                    panel.students,
                    panel.index,
                    false,
                  ),
                )
              )}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button type="button" className="h-9" onClick={() => { void onSave() }} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : cardsEnabled && !loading ? (
        <div className="app-card p-4 text-sm text-muted-foreground" data-no-page-name>
          No students found for the selected filters.
        </div>
      ) : null}
    </FilteredPage>
  )
}
