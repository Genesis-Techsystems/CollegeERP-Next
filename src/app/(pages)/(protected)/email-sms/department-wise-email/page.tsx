'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Filter, Send } from 'lucide-react'
import { Select, MultiSelect } from '@/common/components/select'
import { FormField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'
import {
  listActiveCollegesForDepartments,
  listDepartmentsByCollege,
  listAcademicYearsByUniversity,
  listCoursesByUniversity,
  listCourseGroupsForCourseCascade,
  listInternalExamAverageCourseYears,
  resolveUniversityIdForReadmission,
  sendBulkEmailToEmployeesDepartmentWise,
  sendBulkEmailToStudentsByCourseYears,
  uploadFileForEmail,
} from '@/services'

type AnyRow = Record<string, unknown>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

const FROM_EMAIL_DEFAULT = 'dev@gentechsyspro.com'
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024

/** Domain `College` list rows often omit `universityId` or use `fk_university_id` / nested `University`. */
function universityIdFromCollegeRow(c: College | null): number {
  if (!c) return 0
  const row = c as unknown as Record<string, unknown>
  const keys = ['universityId', 'fk_university_id', 'fk_universityId', 'univId', 'univ_id'] as const
  for (const k of keys) {
    const v = Number(row[k] ?? 0)
    if (Number.isFinite(v) && v > 0) return v
  }
  const nested = row.university ?? row.University
  if (nested && typeof nested === 'object') {
    const u = nested as Record<string, unknown>
    const v = Number(u.universityId ?? u.fk_university_id ?? 0)
    if (Number.isFinite(v) && v > 0) return v
  }
  return 0
}

function readPrincipalCollegeLock(): { locked: boolean; collegeId: number | null } {
  if (typeof globalThis.window === 'undefined') return { locked: false, collegeId: null }
  const raw =
    globalThis.localStorage?.getItem('isPRINCIPAL') ??
    globalThis.localStorage?.getItem('isPrincipal') ??
    ''
  const locked = raw === 'true' || raw === '1'
  const cid = Number(globalThis.localStorage?.getItem('collegeId') ?? 0)
  return { locked, collegeId: Number.isFinite(cid) && cid > 0 ? cid : null }
}

export default function DepartmentWiseEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [mode, setMode] = useState<'1' | '2'>('1')

  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [principalLock, setPrincipalLock] = useState(false)

  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearIds, setCourseYearIds] = useState<string[]>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])

  const [subject1, setSubject1] = useState('')
  const [body1, setBody1] = useState('')
  const [isEmailAlert1, setIsEmailAlert1] = useState(true)

  const [subject2, setSubject2] = useState('')
  const [body2, setBody2] = useState('')
  const [isEmailAlert2, setIsEmailAlert2] = useState(true)

  const [sending, setSending] = useState(false)
  /** When college list rows omit university id, filled by {@link resolveUniversityIdForReadmission}. */
  const [resolvedUniversityId, setResolvedUniversityId] = useState(0)

  useEffect(() => {
    const { locked, collegeId: forcedCid } = readPrincipalCollegeLock()
    setPrincipalLock(locked)
    listActiveCollegesForDepartments()
      .then((rows) => {
        setColleges(rows)
        if (locked && forcedCid && rows.some((c) => c.collegeId === forcedCid)) {
          setCollegeId(forcedCid)
        } else if (!locked && rows.length) {
          setCollegeId((prev) => prev ?? rows[0].collegeId)
        }
      })
      .catch(() => setColleges([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial college only
  }, [])

  const selectedCollege = useMemo(() => colleges.find((c) => c.collegeId === collegeId) ?? null, [colleges, collegeId])

  const rowUniversityId = useMemo(() => universityIdFromCollegeRow(selectedCollege), [selectedCollege])
  const effectiveUniversityId = rowUniversityId || resolvedUniversityId

  useEffect(() => {
    setResolvedUniversityId(0)
  }, [collegeId])

  useEffect(() => {
    if (!collegeId || rowUniversityId > 0) return
    let cancelled = false
    void resolveUniversityIdForReadmission({ collegeId }, 0).then((uid) => {
      if (!cancelled && uid > 0) setResolvedUniversityId(uid)
    })
    return () => {
      cancelled = true
    }
  }, [collegeId, rowUniversityId])

  useEffect(() => {
    if (!collegeId) {
      setAcademicYears([])
      setDepartments([])
      return
    }
    if (!effectiveUniversityId) {
      setAcademicYears([])
    } else {
      listAcademicYearsByUniversity(effectiveUniversityId)
        .then(setAcademicYears)
        .catch(() => setAcademicYears([]))
    }
    listDepartmentsByCollege(collegeId)
      .then((d) => {
        setDepartments(d)
        const empDept = Number(globalThis.localStorage?.getItem('empDeptId') ?? 0)
        if (empDept > 0 && d.some((x) => x.departmentId === empDept)) {
          setDepartmentIds((prev) => (prev.length === 0 ? [String(empDept)] : prev))
        }
      })
      .catch(() => setDepartments([]))
  }, [collegeId, effectiveUniversityId])

  useEffect(() => {
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYears([])
    setCourseYearIds([])
  }, [collegeId])

  const defaultAyFromStorage = useMemo(() => {
    const raw = typeof globalThis.window !== 'undefined' ? globalThis.localStorage.getItem('academicYearId') : null
    const id = raw ? Number(raw) : 0
    return Number.isFinite(id) && id > 0 ? id : 0
  }, [])

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const preferred = academicYears.find(
        (x) =>
          n(x.academicYearId ?? x.academic_year_id ?? x.acdmYearId) === defaultAyFromStorage,
      )
      const curr = [...academicYears].sort((a, b) => String(b.fromDate ?? '').localeCompare(String(a.fromDate ?? '')))[0]
      const pick = preferred ?? curr
      setAcademicYearId(n(pick?.academicYearId ?? pick?.academic_year_id ?? pick?.acdmYearId))
    }
  }, [academicYears, academicYearId, defaultAyFromStorage])

  useEffect(() => {
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYears([])
    setCourseYearIds([])
  }, [academicYearId])

  useEffect(() => {
    if (!effectiveUniversityId) {
      setCourses([])
      return
    }
    listCoursesByUniversity(effectiveUniversityId)
      .then(setCourses)
      .catch(() => setCourses([]))
  }, [academicYearId, effectiveUniversityId])

  useEffect(() => {
    if (!courseId) {
      setCourseGroups([])
      setCourseGroupId(null)
      setCourseYears([])
      setCourseYearIds([])
      return
    }
    listCourseGroupsForCourseCascade(courseId)
      .then(setCourseGroups)
      .catch(() => setCourseGroups([]))
  }, [courseId])

  useEffect(() => {
    if (!courseGroupId) {
      setCourseYears([])
      setCourseYearIds([])
      return
    }
    if (!courseId) return
    listInternalExamAverageCourseYears(courseId)
      .then(setCourseYears)
      .catch(() => setCourseYears([]))
  }, [courseGroupId, courseId])

  useEffect(() => {
    if (!courseId && courses.length) {
      const stored = Number(globalThis.localStorage?.getItem('courseId') ?? 0)
      const firstId = n(courses[0].courseId ?? courses[0].course_id)
      const pick =
        stored > 0 && courses.some((c) => n(c.courseId ?? c.course_id) === stored)
          ? stored
          : firstId
      setCourseId(pick)
    }
  }, [courses, courseId])

  useEffect(() => {
    if (!courseGroupId && courseGroups.length) {
      const stored = Number(globalThis.localStorage?.getItem('courseGroupId') ?? 0)
      const gid = (g: AnyRow) => n(g.courseGroupId ?? g.course_group_id ?? g.fk_course_group_id)
      const pick =
        stored > 0 && courseGroups.some((g) => gid(g) === stored) ? stored : gid(courseGroups[0])
      setCourseGroupId(pick)
    }
  }, [courseGroups, courseGroupId])

  const courseYearOptions = useMemo(
    () =>
      courseYears.map((cy) => ({
        value: String(n(cy.courseYearId)),
        label: s(cy.courseYearName ?? cy.course_year_name ?? cy.name),
      })),
    [courseYears],
  )

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.departmentId), label: d.deptCode || d.deptName })),
    [departments],
  )

  const canComposeStudent =
    mode === '1' &&
    collegeId &&
    academicYearId &&
    courseId &&
    courseGroupId &&
    courseYearIds.length > 0
  const canComposeEmployee = mode === '2' && collegeId && departmentIds.length > 0

  const canSend =
    mode === '1'
      ? Boolean(canComposeStudent && subject1.trim() && body1.trim())
      : Boolean(canComposeEmployee && subject2.trim() && body2.trim())

  function onFileChange() {
    const el = fileRef.current
    const f = el?.files?.[0]
    if (!f) return
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toastError('File size must not exceed 24 MB')
      el.value = ''
    }
  }

  async function resolveFilePath(): Promise<string> {
    const el = fileRef.current
    const f = el?.files?.[0]
    if (!f) return ''
    const fd = new FormData()
    fd.append('file', f, f.name)
    return uploadFileForEmail(fd)
  }

  const clearForm = useCallback(() => {
    setSubject1('')
    setBody1('')
    setSubject2('')
    setBody2('')
    setCourseYearIds([])
    setDepartmentIds([])
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const switchMode = (m: '1' | '2') => {
    setMode(m)
    clearForm()
  }

  async function handleSend() {
    const file = fileRef.current?.files?.[0] ?? null

    if (mode === '1') {
      if (!collegeId || !academicYearId || !courseId || !courseGroupId) {
        toastError('Please complete college, academic year, course, and course group')
        return
      }
      if (courseYearIds.length === 0) {
        toastError('Select at least one course year')
        return
      }
      if (!subject1.trim() || !body1.trim()) {
        toastError('Subject and message are required')
        return
      }
      setSending(true)
      try {
        let filePath = ''
        if (file) filePath = await resolveFilePath()
        await sendBulkEmailToStudentsByCourseYears({
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          subject: subject1.trim(),
          mailContent: body1.trim(),
          mailContentHtml: body1.trim(),
          fromEmailId: FROM_EMAIL_DEFAULT,
          isEmailAlert: isEmailAlert1,
          courseYearIds: courseYearIds.map((id) => n(id)),
          filePath,
        })
        toastSuccess('Email sent successfully')
        clearForm()
      } catch (e) {
        toastError(getErrorMessage(e))
      } finally {
        setSending(false)
      }
      return
    }

    if (!collegeId || departmentIds.length === 0) {
      toastError('Please select a college and at least one department')
      return
    }
    if (!subject2.trim() || !body2.trim()) {
      toastError('Subject and message are required')
      return
    }
    setSending(true)
    try {
      let filePath = ''
      if (file) filePath = await resolveFilePath()
      await sendBulkEmailToEmployeesDepartmentWise({
        collegeId,
        subject: subject2.trim(),
        mailContent: body2.trim(),
        mailContentHtml: body2.trim(),
        fromEmailId: FROM_EMAIL_DEFAULT,
        isEmailAlert: isEmailAlert2,
        courseYearIds: [],
        departmentIds: departmentIds.map((id) => n(id)),
        filePath,
      })
      toastSuccess('Email sent successfully')
      clearForm()
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card border-t-[3px] border-t-amber-300 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            Send Email To Department Wise
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-foreground hover:text-foreground/80"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="department-wise-email-filters"
          >
            Filter
            <Filter className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent id="department-wise-email-filters">
            <div className="space-y-4 p-4 pt-3">
              <RadioGroup
                value={mode}
                onValueChange={(v) => switchMode(v as '1' | '2')}
                className="flex flex-wrap gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="dw-mode-student" />
                  <Label htmlFor="dw-mode-student" className="cursor-pointer text-sm font-normal">
                    Student
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="dw-mode-employee" />
                  <Label htmlFor="dw-mode-employee" className="cursor-pointer text-sm font-normal">
                    Employee
                  </Label>
                </div>
              </RadioGroup>

              {mode === '1' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 xl:items-end">
                  <Select
                    label="College *"
                    value={collegeId ? String(collegeId) : null}
                    onChange={(v) => setCollegeId(v ? Number(v) : null)}
                    options={colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode }))}
                    searchable
                    disabled={principalLock}
                  />
                  <Select
                    label="Academic Year *"
                    value={academicYearId ? String(academicYearId) : null}
                    onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                    options={academicYears.map((x) => ({
                      value: String(n(x.academicYearId ?? x.academic_year_id ?? x.acdmYearId)),
                      label: s(x.academicYear ?? x.academic_year ?? x.displayName ?? x.name),
                    }))}
                    searchable
                    disabled={!collegeId}
                  />
                  <Select
                    label="Course *"
                    value={courseId ? String(courseId) : null}
                    onChange={(v) => setCourseId(v ? Number(v) : null)}
                    options={courses.map((x) => ({
                      value: String(n(x.courseId ?? x.course_id)),
                      label: s(x.courseCode ?? x.course_code ?? x.name),
                    }))}
                    searchable
                    disabled={!academicYearId}
                  />
                  <Select
                    label="Course Group *"
                    value={courseGroupId ? String(courseGroupId) : null}
                    onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
                    options={courseGroups.map((x) => ({
                      value: String(n(x.courseGroupId ?? x.course_group_id ?? x.fk_course_group_id)),
                      label: s(x.groupCode ?? x.group_code ?? x.groupName ?? x.group_name),
                    }))}
                    searchable
                    disabled={!courseId}
                  />
                  <MultiSelect
                    label="Course Year *"
                    value={courseYearIds}
                    onChange={setCourseYearIds}
                    options={courseYearOptions}
                    searchable
                    placeholder="Select course year(s)"
                    disabled={!courseGroupId || courseYearOptions.length === 0}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                  <Select
                    label="College *"
                    value={collegeId ? String(collegeId) : null}
                    onChange={(v) => setCollegeId(v ? Number(v) : null)}
                    options={colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode }))}
                    searchable
                    disabled={principalLock}
                    className="md:col-span-6"
                  />
                  <MultiSelect
                    label="Departments *"
                    value={departmentIds}
                    onChange={setDepartmentIds}
                    options={departmentOptions}
                    searchable
                    placeholder="Select departments"
                    disabled={!collegeId || departmentOptions.length === 0}
                    className="md:col-span-6"
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {(canComposeStudent || canComposeEmployee) && (
        <div className="app-card p-0 overflow-hidden">
          <div className="border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold text-foreground">Compose email</h2>
          </div>
          <div className="space-y-4 p-4">
            <FormField label="Subject *">
              <input
                type="text"
                className="app-control flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-[length:var(--app-control-font-size)] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={mode === '1' ? subject1 : subject2}
                onChange={(e) => (mode === '1' ? setSubject1(e.target.value) : setSubject2(e.target.value))}
                placeholder="Subject"
              />
            </FormField>
            <FormField label="Message *">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={mode === '1' ? body1 : body2}
                onChange={(e) => (mode === '1' ? setBody1(e.target.value) : setBody2(e.target.value))}
                placeholder="Message"
              />
            </FormField>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <FormField label="Attachment (optional)" className="mb-0 min-w-[200px] flex-1">
                <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.pdf,.doc" className="w-full text-sm" onChange={onFileChange} />
              </FormField>
              {mode === '1' ? (
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox id="alert1" checked={isEmailAlert1} onCheckedChange={(c) => setIsEmailAlert1(c === true)} />
                  <Label htmlFor="alert1" className="cursor-pointer text-sm font-normal">
                    Email alert
                  </Label>
                </div>
              ) : (
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox id="alert2" checked={isEmailAlert2} onCheckedChange={(c) => setIsEmailAlert2(c === true)} />
                  <Label htmlFor="alert2" className="cursor-pointer text-sm font-normal">
                    Email alert
                  </Label>
                </div>
              )}
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button type="button" className="gap-1" onClick={() => void handleSend()} disabled={sending || !canSend}>
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : 'Send email'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
                  onClick={clearForm}
                  disabled={sending}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
