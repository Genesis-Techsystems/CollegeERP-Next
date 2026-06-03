'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Filter, Mail, Send } from 'lucide-react'
import { Select, MultiSelect } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { FormField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  getDigitalOnlineSyncFilters,
  listGroupSectionsByFilters,
  listStudentsForPromotionPreview,
  sendBulkEmailToSectionStudents,
  sendBulkEmailToStudents,
  uploadFileForEmail,
} from '@/services'

type AnyRow = Record<string, unknown>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

/** Angular `staff-to-student-email.component.ts` hard-coded sender. */
const FROM_EMAIL_ID = 'dev@gentechsyspro.com'
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024

const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function studentFirstName(r: AnyRow): string {
  return String(r.firstName ?? r.studentName ?? r.student_name ?? '').trim()
}

function studentRoll(r: AnyRow): string {
  return String(r.rollNumber ?? r.registerNo ?? r.register_number ?? r.hallticketNumber ?? '').trim()
}

function studentEmail(r: AnyRow): string {
  return String(r.stdEmailId ?? r.email ?? r.std_email_id ?? '').trim()
}

type StudentPickRow = AnyRow & { checked?: boolean }

export default function StaffToStudentEmailPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)
  const [mode, setMode] = useState<'1' | '2'>('1')

  const [students, setStudents] = useState<StudentPickRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [sending, setSending] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [draftStudents, setDraftStudents] = useState<StudentPickRow[]>([])
  const [draftSearch, setDraftSearch] = useState('')

  const [subject1, setSubject1] = useState('')
  const [body1, setBody1] = useState('')
  const [isEmailAlert1, setIsEmailAlert1] = useState(true)

  const [subject2, setSubject2] = useState('')
  const [body2, setBody2] = useState('')
  const [sectionIds, setSectionIds] = useState<string[]>([])

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

  useEffect(() => {
    if (mode === '1') setSectionIds([])
    else setStudents([])
  }, [mode])

  const colleges = useMemo(() => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)), [filtersData])
  const courses = useMemo(() => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)), 'fk_course_id'), [filtersData, collegeId])
  const courseGroups = useMemo(
    () => uniq(filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0) && n(r.fk_course_id) === (courseId ?? 0)), 'fk_course_group_id'),
    [filtersData, collegeId, courseId],
  )
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0) &&
            n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        'fk_course_year_id',
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  )
  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id').sort((a, b) =>
      String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')),
    )
  }, [academicData, filtersData, collegeId])

  const sectionOptions = useMemo(
    () =>
      sections.map((x) => ({
        value: String(n(x.pk_group_section_id ?? x.groupSectionId)),
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
    setStudents([])
  }, [collegeId])
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id))
  }, [courses, courseId])
  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
    setAcademicYearId(null)
    setGroupSectionId(null)
    setStudents([])
  }, [courseId])
  useEffect(() => {
    if (!courseGroupId && courseGroups.length) setCourseGroupId(n(courseGroups[0].fk_course_group_id))
  }, [courseGroups, courseGroupId])
  useEffect(() => {
    setCourseYearId(null)
    setAcademicYearId(null)
    setGroupSectionId(null)
    setStudents([])
  }, [courseGroupId])
  useEffect(() => {
    if (!courseYearId && courseYears.length) setCourseYearId(n(courseYears[0].fk_course_year_id))
  }, [courseYears, courseYearId])
  useEffect(() => {
    setAcademicYearId(null)
    setGroupSectionId(null)
    setStudents([])
  }, [courseYearId])

  const defaultAyFromStorage = useMemo(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('academicYearId') : null
    const id = raw ? Number(raw) : 0
    return Number.isFinite(id) && id > 0 ? id : 0
  }, [])

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const preferred = academicYears.find((x) => n(x.fk_academic_year_id) === defaultAyFromStorage)
      const curr = [...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]
      setAcademicYearId(n((preferred ?? curr)?.fk_academic_year_id))
    }
  }, [academicYears, academicYearId, defaultAyFromStorage])

  useEffect(() => {
    setGroupSectionId(null)
    setStudents([])
  }, [academicYearId])

  useEffect(() => {
    async function loadSections() {
      if (!collegeId || !courseGroupId || !courseYearId || !academicYearId) {
        setSections([])
        return
      }
      const list = await listGroupSectionsByFilters({
        collegeId,
        academicYearId,
        courseGroupId,
        courseYearId,
      }).catch(() => [])
      setSections(list)
    }
    void loadSections()
  }, [collegeId, courseGroupId, courseYearId, academicYearId])

  useEffect(() => {
    if (!groupSectionId || sectionOptions.length === 0) return
    const stillValid = sectionOptions.some((o) => n(o.value) === groupSectionId)
    if (!stillValid) setGroupSectionId(null)
  }, [sectionOptions, groupSectionId])

  useEffect(() => {
    if (mode !== '1') {
      setStudents([])
      return
    }
    async function load() {
      if (!collegeId || !courseGroupId || !groupSectionId) {
        setStudents([])
        return
      }
      setLoadingStudents(true)
      const list = await listStudentsForPromotionPreview({ collegeId, courseGroupId, groupSectionId }).catch(() => [])
      setStudents((Array.isArray(list) ? list : []).map((row) => ({ ...row, checked: true })))
      setLoadingStudents(false)
    }
    void load()
  }, [mode, collegeId, courseGroupId, groupSectionId])

  const selectedCount = useMemo(() => students.filter((r) => r.checked).length, [students])

  const filteredDraft = useMemo(() => {
    const q = draftSearch.trim().toLowerCase()
    if (!q) return draftStudents
    return draftStudents.filter((row) => {
      const name = studentFirstName(row).toLowerCase()
      const roll = studentRoll(row).toLowerCase()
      const em = studentEmail(row).toLowerCase()
      return name.includes(q) || roll.includes(q) || em.includes(q)
    })
  }, [draftStudents, draftSearch])

  const allDraftChecked = useMemo(
    () => filteredDraft.length > 0 && filteredDraft.every((r) => r.checked),
    [filteredDraft],
  )

  const openPickModal = useCallback(() => {
    setDraftStudents(students.map((x) => ({ ...x, checked: x.checked !== false })))
    setDraftSearch('')
    setPickOpen(true)
  }, [students])

  function setEveryDraft(checked: boolean) {
    const ids = new Set(filteredDraft.map((r) => `${n(r.studentId ?? r.fk_student_id)}-${studentRoll(r)}`))
    setDraftStudents((prev) =>
      prev.map((r) => {
        const key = `${n(r.studentId ?? r.fk_student_id)}-${studentRoll(r)}`
        if (ids.has(key)) return { ...r, checked }
        return r
      }),
    )
  }

  function toggleDraftRow(row: StudentPickRow) {
    const key = `${n(row.studentId ?? row.fk_student_id)}-${studentRoll(row)}`
    setDraftStudents((prev) =>
      prev.map((r) => {
        const k = `${n(r.studentId ?? r.fk_student_id)}-${studentRoll(r)}`
        return k === key ? { ...r, checked: !r.checked } : r
      }),
    )
  }

  function savePickModal() {
    setStudents(draftStudents.map((x) => ({ ...x })))
    setPickOpen(false)
  }

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

  function clearAfterSend() {
    setSubject1('')
    setBody1('')
    setSubject2('')
    setBody2('')
    setSectionIds([])
    setStudents([])
    setGroupSectionId(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSend() {
    const file = fileRef.current?.files?.[0] ?? null

    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId
    ) {
      toastError('Please complete all filters')
      return
    }

    if (mode === '1') {
      if (!groupSectionId) {
        toastError('Please select a section')
        return
      }
      if (!subject1.trim()) {
        toastError('Please enter a subject')
        return
      }
      if (!body1.trim()) {
        toastError('Please enter email content')
        return
      }
      const studentIds = students
        .filter((r) => r.checked)
        .map((r) => n(r.studentId ?? r.fk_student_id))
        .filter((id) => id > 0)
      if (studentIds.length === 0) {
        toastError('No students selected')
        return
      }

      setSending(true)
      try {
        let filePath = ''
        if (file) filePath = await resolveFilePath()

        await sendBulkEmailToStudents({
          studentIds,
          fromEmailId: FROM_EMAIL_ID,
          comments: '',
          mailContentHtml: body1.trim(),
          collegeId,
          filePath,
          subject: subject1.trim(),
          mailContent: body1.trim(),
          isEmailAlert: isEmailAlert1,
        })
        toastSuccess('Email sent successfully')
        clearAfterSend()
      } catch (e) {
        toastError(getErrorMessage(e))
      } finally {
        setSending(false)
      }
      return
    }

    // Mode 2 — sections
    const ids = sectionIds.map((v) => n(v)).filter((id) => id > 0)
    if (ids.length === 0) {
      toastError('Please select at least one section')
      return
    }
    if (!subject2.trim()) {
      toastError('Please enter a subject')
      return
    }
    if (!body2.trim()) {
      toastError('Please enter email content')
      return
    }

    setSending(true)
    try {
      let filePath = ''
      if (file) filePath = await resolveFilePath()

      await sendBulkEmailToSectionStudents({
        collegeId,
        academicYearId,
        courseId,
        courseGroupId,
        courseYearId,
        groupSectionId: groupSectionId ?? '',
        subject: subject2.trim(),
        mailContent: body2.trim(),
        mailContentHtml: body2.trim(),
        sectionIds: ids,
        fromEmailId: FROM_EMAIL_ID,
        isEmailAlert: true,
        filePath,
      })
      toastSuccess('Email sent successfully')
      clearAfterSend()
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const filtersReady = Boolean(collegeId && academicYearId && courseId && courseGroupId && courseYearId)

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Email To Students
          </h1>
          <button
            type="button"
            className="text-sm text-foreground inline-flex items-center gap-1"
            onClick={() => setFilterOpen((v) => !v)}
          >
            Filter
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 space-y-4 border-b">
            <div className="flex flex-wrap gap-6 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="email-mode"
                  checked={mode === '1'}
                  onChange={() => setMode('1')}
                  className="accent-primary"
                />
                To students
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="email-mode"
                  checked={mode === '2'}
                  onChange={() => setMode('2')}
                  className="accent-primary"
                />
                To section
              </label>
            </div>
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
                label="Academic Year *"
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))}
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
                options={courseYears.map((x) => ({ value: String(n(x.fk_course_year_id)), label: s(x.course_year_name) }))}
                searchable
                className="md:col-span-2"
              />
              {mode === '1' ? (
                <Select
                  label="Section *"
                  value={groupSectionId ? String(groupSectionId) : null}
                  onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
                  options={sectionOptions}
                  searchable
                  clearable
                  placeholder="Select section"
                  disabled={!filtersReady}
                  className="md:col-span-2"
                />
              ) : (
                <MultiSelect
                  label="Sections *"
                  value={sectionIds}
                  onChange={setSectionIds}
                  options={sectionOptions}
                  searchable
                  placeholder="Select one or more sections"
                  disabled={!filtersReady}
                  className="md:col-span-2"
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      {filtersReady && (mode === '2' || (mode === '1' && groupSectionId)) ? (
        <div className="app-card p-4 space-y-4">
          {mode === '1' && groupSectionId ? (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span>
                No. of students —{' '}
                <span className="font-semibold tabular-nums">{loadingStudents ? '…' : students.length}</span>
              </span>
              {students.length > 0 ? (
                <>
                  <button type="button" className="text-primary font-medium hover:underline" onClick={openPickModal}>
                    Select students
                  </button>
                  <span className="text-muted-foreground">
                    Selected{' '}
                    <span className="font-semibold text-foreground tabular-nums">{selectedCount}</span>
                  </span>
                </>
              ) : null}
            </div>
          ) : null}

          {mode === '2' ? (
            <p className="text-sm text-muted-foreground">
              Choose one or more sections above, then enter the subject and message. Email is sent to all students in
              those sections.
            </p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <FormField label="Subject *" className="md:col-span-12">
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={mode === '1' ? subject1 : subject2}
                onChange={(e) => (mode === '1' ? setSubject1(e.target.value) : setSubject2(e.target.value))}
                placeholder="Email subject"
              />
            </FormField>
            <FormField label="Message *" className="md:col-span-12">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={mode === '1' ? body1 : body2}
                onChange={(e) => (mode === '1' ? setBody1(e.target.value) : setBody2(e.target.value))}
                placeholder="Email body (plain / HTML as supported by your mail server)"
              />
            </FormField>

            <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center gap-4">
              <FormField label="Attachment (optional)" className="flex-1 mb-0">
                <input
                  ref={fileRef}
                  type="file"
                  className="text-sm w-full"
                  onChange={onFileChange}
                />
              </FormField>
              {mode === '1' ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Checkbox id="email-alert" checked={isEmailAlert1} onCheckedChange={(c) => setIsEmailAlert1(c === true)} />
                  <Label htmlFor="email-alert" className="text-sm font-normal cursor-pointer">
                    Email alert
                  </Label>
                </div>
              ) : null}
            </div>

            <div className="md:col-span-12 flex justify-end">
              <Button
                type="button"
                className="gap-1"
                onClick={() => void handleSend()}
                disabled={
                  sending ||
                  !filtersReady ||
                  (mode === '1' && (!groupSectionId || loadingStudents)) ||
                  (mode === '2' && sectionIds.length === 0)
                }
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send email'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={pickOpen} onOpenChange={(o) => !o && setPickOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student list</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <SearchInput
                className="max-w-sm"
                placeholder="Name / roll / email"
                value={draftSearch}
                onChange={setDraftSearch}
              />
              <div className="text-sm text-muted-foreground">
                Selected:{' '}
                <span className="font-semibold text-foreground">{draftStudents.filter((r) => r.checked).length}</span>
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 w-10">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allDraftChecked}
                          onChange={(e) => setEveryDraft(e.target.checked)}
                        />
                        <span className="sr-only md:not-sr-only md:inline">All</span>
                      </label>
                    </th>
                    <th className="text-left px-3 py-2">Roll no.</th>
                    <th className="text-left px-3 py-2">Student name</th>
                    <th className="text-left px-3 py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDraft.map((row) => (
                    <tr key={`${n(row.studentId ?? row.fk_student_id)}-${studentRoll(row)}`} className="border-b last:border-0">
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={row.checked !== false}
                          onChange={() => toggleDraftRow(row)}
                        />
                      </td>
                      <td className="px-3 py-1.5">{studentRoll(row) || '—'}</td>
                      <td className="px-3 py-1.5">{studentFirstName(row) || '—'}</td>
                      <td className="px-3 py-1.5">{studentEmail(row) || '—'}</td>
                    </tr>
                  ))}
                  {filteredDraft.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        No students match the filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPickOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={savePickModal}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
