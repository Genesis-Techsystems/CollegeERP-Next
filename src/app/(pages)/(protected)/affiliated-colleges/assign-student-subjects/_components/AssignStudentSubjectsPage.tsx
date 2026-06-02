'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, User } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MINIO_URL } from '@/config/constants/api'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  assignAffiliatedStudentSubjects,
  listAffiliatedSubjectCourseYears,
  listAffiliatedStudentSubjects,
  searchAffiliatedStudents,
  updateAffiliatedStudentSubject,
} from '@/services'
import type { AffiliatedStudentSubjectPayload } from '@/services/affiliated-colleges'
import { UpdateStudentSubjectModal } from './UpdateStudentSubjectModal'

type AnyRow = Record<string, unknown>

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

function subjectId(row: AnyRow): number {
  return pickNum(row, ['subjectId', 'fk_subject_id', 'subject_id'])
}

function subjectLabel(row: AnyRow): string {
  const name = pickText(row, ['subjectName', 'subject_name', 'shortName'])
  const code = pickText(row, ['subjectCode', 'subject_code'])
  return code ? `${name} - ${code}` : name
}

function photoSrc(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  return `${MINIO_URL}${path}`
}

export function AssignStudentSubjectsPage() {
  const qc = useQueryClient()
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [availableSubjects, setAvailableSubjects] = useState<AnyRow[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [pendingSubjects, setPendingSubjects] = useState<AnyRow[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [editRow, setEditRow] = useState<AnyRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const selectedStudent = useMemo(
    () => studentOptions.find((s) => String(pickNum(s, ['studentId', 'id'])) === studentId) ?? null,
    [studentOptions, studentId],
  )

  const collegeId = pickNum(selectedStudent, ['collegeId', 'fk_college_id'])
  const academicYearId = pickNum(selectedStudent, ['academicYearId', 'fk_academic_year_id'])
  const courseYearId = pickNum(selectedStudent, ['courseYearId', 'fk_course_year_id'])
  const groupSectionId = pickNum(selectedStudent, ['groupSectionId', 'group_section_id', 'sectionId'])
  const detailStudentId = pickNum(selectedStudent, ['studentId', 'id', 'studentDetailId'])

  const { data: existingSubjects = [], refetch: refetchExisting } = useQuery({
    queryKey: QK.affiliatedColleges.assignSubjects(
      collegeId,
      academicYearId,
      detailStudentId,
      courseYearId,
    ),
    queryFn: () =>
      listAffiliatedStudentSubjects({
        collegeId,
        academicYearId,
        studentId: detailStudentId,
        courseYearId,
      }),
    enabled: collegeId > 0 && academicYearId > 0 && detailStudentId > 0 && courseYearId > 0,
  })

  const filteredAvailable = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    if (!q) return availableSubjects
    return availableSubjects.filter((s) => subjectLabel(s).toLowerCase().includes(q))
  }, [availableSubjects, subjectSearch])

  const selectedRows = useMemo(
    () => availableSubjects.filter((s) => checkedIds.has(subjectId(s))),
    [availableSubjects, checkedIds],
  )

  const allFilteredChecked =
    filteredAvailable.length > 0 &&
    filteredAvailable.every((s) => checkedIds.has(subjectId(s)))

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (q.length < 5) {
      setStudentOptions([])
      return
    }
    setSearchLoading(true)
    try {
      const rows = await searchAffiliatedStudents(q)
      setStudentOptions(rows)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSearchLoading(false)
    }
  }

  async function loadSubjectOptions(student: AnyRow) {
    const cId = pickNum(student, ['collegeId', 'fk_college_id'])
    const ayId = pickNum(student, ['academicYearId', 'fk_academic_year_id'])
    const secId = pickNum(student, ['groupSectionId', 'group_section_id', 'sectionId'])
    const cyId = pickNum(student, ['courseYearId', 'fk_course_year_id'])
    const stId = pickNum(student, ['studentId', 'id'])

    if (!cId || !ayId || !secId || !cyId || !stId) {
      toastError('Student record is missing college, academic year, section, or course year.')
      return
    }

    setLoadingSubjects(true)
    setAvailableSubjects([])
    setCheckedIds(new Set())
    setPendingSubjects([])

    try {
      const [courseYearSubjects, assigned] = await Promise.all([
        listAffiliatedSubjectCourseYears({
          collegeId: cId,
          academicYearId: ayId,
          groupSectionId: secId,
        }),
        listAffiliatedStudentSubjects({
          collegeId: cId,
          academicYearId: ayId,
          studentId: stId,
          courseYearId: cyId,
        }),
      ])

      const assignedIds = new Set(
        assigned.map((r) => pickNum(r, ['subjectId', 'fk_subject_id'])).filter((id) => id > 0),
      )

      const available = courseYearSubjects.filter(
        (s) => !assignedIds.has(subjectId(s)),
      )

      setAvailableSubjects(available)
      const initialChecked = new Set(available.map((s) => subjectId(s)).filter((id) => id > 0))
      setCheckedIds(initialChecked)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoadingSubjects(false)
    }
  }

  function onStudentChange(v: string | null) {
    setStudentId(v)
    setPendingSubjects([])
    setAvailableSubjects([])
    setCheckedIds(new Set())
    if (!v) return
    const student = studentOptions.find((s) => String(pickNum(s, ['studentId', 'id'])) === v)
    if (student) void loadSubjectOptions(student)
  }

  function toggleSubject(id: number, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      for (const s of filteredAvailable) {
        const id = subjectId(s)
        if (id <= 0) continue
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function addExamSubjects() {
    if (selectedRows.length === 0) {
      toastError('Select at least one subject.')
      return
    }
    setPendingSubjects(selectedRows)
  }

  const updateMutation = useMutation({
    mutationFn: updateAffiliatedStudentSubject,
    onSuccess: async () => {
      toastSuccess('Subject updated successfully.')
      setEditOpen(false)
      setEditRow(null)
      await qc.invalidateQueries({ queryKey: QK.affiliatedColleges.all })
      await refetchExisting()
      if (selectedStudent) await loadSubjectOptions(selectedStudent)
    },
    onError: (e) => toastError(getErrorMessage(e)),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || pendingSubjects.length === 0) {
        throw new Error('Add subjects before saving.')
      }
      const payload: AffiliatedStudentSubjectPayload[] = pendingSubjects.map((row) => ({
        isActive: true,
        collegeId: pickNum(selectedStudent, ['collegeId', 'fk_college_id']),
        studentId: pickNum(selectedStudent, ['studentId', 'id']),
        studentbatchId: pickNum(selectedStudent, ['batchId', 'studentbatchId', 'fk_batch_id']),
        regulationId: pickNum(selectedStudent, ['regulationId', 'fk_regulation_id']),
        courseId: pickNum(selectedStudent, ['courseId', 'fk_course_id']),
        courseYearId: pickNum(selectedStudent, ['courseYearId', 'fk_course_year_id']),
        sectionId: pickNum(selectedStudent, ['groupSectionId', 'group_section_id', 'sectionId']),
        academicYearId: pickNum(selectedStudent, ['academicYearId', 'fk_academic_year_id']),
        subjectTypeId: pickNum(row, ['subjecttypeId', 'subjectTypeId', 'fk_subject_type_id']),
        subjectId: subjectId(row),
        subCredits: Number(row.credits ?? row.subCredits ?? 0) || 0,
        cbcsSubjectRegulationFacultyId: null,
      }))
      return assignAffiliatedStudentSubjects(payload)
    },
    onSuccess: async () => {
      toastSuccess('Subjects saved successfully.')
      setPendingSubjects([])
      await qc.invalidateQueries({ queryKey: QK.affiliatedColleges.all })
      await refetchExisting()
      if (selectedStudent) await loadSubjectOptions(selectedStudent)
    },
    onError: (e) => toastError(getErrorMessage(e)),
  })

  const selectOptions = useMemo(
    () =>
      studentOptions.map((s) => {
        const id = pickNum(s, ['studentId', 'id'])
        const hall = pickText(s, ['hallticketNumber', 'rollNumber', 'hallticket_number'])
        const name = pickText(s, ['firstName', 'studentName', 'name'])
        return { value: String(id), label: hall ? `${name} (${hall})` : name }
      }),
    [studentOptions],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Assign Student Subjects" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <span className="font-semibold text-sm text-primary">Assign Student Subjects</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="max-w-xl">
            <Select
              label="Student"
              placeholder="Search by student name or roll no."
              value={studentId}
              onChange={onStudentChange}
              options={selectOptions}
              searchable
              clearable
              isLoading={searchLoading}
              onSearch={(term) => void onSearchStudents(term)}
            />
          </div>

          {selectedStudent ? (
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-2 flex justify-center md:justify-start">
                  {photoSrc(pickText(selectedStudent, ['studentPhotoPath', 'photoPath'])) ? (
                    <img
                      src={photoSrc(pickText(selectedStudent, ['studentPhotoPath', 'photoPath']))}
                      alt=""
                      className="h-24 w-24 rounded object-cover border bg-white"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="h-24 w-24 rounded border bg-white flex items-center justify-center">
                      <User className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="md:col-span-7 text-sm space-y-1">
                  <p className="font-semibold">
                    {pickText(selectedStudent, ['firstName', 'studentName'])}{' '}
                    <span className="text-blue-700 font-medium">
                      ({Boolean(selectedStudent.isLateral) ? 'LATERAL' : 'REGULAR'})
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {pickText(selectedStudent, ['hallticketNumber', 'rollNumber'])}
                  </p>
                  <p className="text-muted-foreground">
                    {[
                      pickText(selectedStudent, ['collegeCode']),
                      pickText(selectedStudent, ['academicYear', 'academic_year']),
                      pickText(selectedStudent, ['courseCode', 'course_code']),
                      pickText(selectedStudent, ['groupCode', 'group_code']),
                      pickText(selectedStudent, ['courseYearName', 'course_year_name']),
                      selectedStudent.section
                        ? `Section ${pickText(selectedStudent, ['section', 'sectionName'])}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                  <p className="text-muted-foreground">
                    {pickText(selectedStudent, ['mobile', 'mobileNumber'])}
                  </p>
                </div>
                <div className="md:col-span-3 text-sm space-y-2">
                  <p>
                    Quota :{' '}
                    <span className="text-blue-700 font-medium">
                      {pickText(selectedStudent, ['quotaDisplayName', 'quota'])}
                    </span>
                  </p>
                  <p>
                    Student Status :{' '}
                    <span className="text-green-700 font-medium">
                      {pickText(selectedStudent, ['studentStatusDisplayName', 'studentStatusCode'])}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {selectedStudent && availableSubjects.length > 0 ? (
            <div className="rounded-lg border border-blue-200 overflow-hidden">
              <div className="bg-sky-100/80 px-4 py-2">
                <h3 className="font-semibold text-sm">Select Exam Subjects</h3>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 border rounded-md overflow-hidden bg-white">
                  <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
                    <SearchInput
                      placeholder="Search..."
                      value={subjectSearch}
                      onChange={setSubjectSearch}
                      className="max-w-xs"
                    />
                    <span className="text-xs text-blue-700 whitespace-nowrap">
                      Subjects: <strong>{checkedIds.size}</strong>
                    </span>
                  </div>
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="w-14 px-2 py-2 text-left">
                            <Checkbox
                              checked={allFilteredChecked}
                              onCheckedChange={(v) => toggleAllFiltered(!!v)}
                            />
                            <span className="ml-1 text-xs">All</span>
                          </th>
                          <th className="px-2 py-2 text-left">Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingSubjects ? (
                          <tr>
                            <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                              Loading subjects…
                            </td>
                          </tr>
                        ) : (
                          filteredAvailable.map((s, i) => {
                            const id = subjectId(s)
                            return (
                              <tr key={id || i} className="border-t">
                                <td className="px-2 py-2">
                                  <Checkbox
                                    checked={checkedIds.has(id)}
                                    onCheckedChange={(v) => toggleSubject(id, !!v)}
                                  />
                                </td>
                                <td className="px-2 py-2">{subjectLabel(s)}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-5 border rounded-md overflow-hidden bg-white">
                  <div className="px-3 py-2 border-b bg-slate-50 text-sm text-blue-700 font-medium">
                    Selected Subjects : {selectedRows.length}
                  </div>
                  <div className="max-h-[360px] overflow-auto divide-y">
                    {selectedRows.map((s, i) => (
                      <div key={subjectId(s) || i} className="px-3 py-2 text-sm">
                        {subjectLabel(s)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 flex items-end">
                  <Button type="button" className="w-full" onClick={addExamSubjects}>
                    Add Subjects
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {pendingSubjects.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="px-4 py-2 border-b bg-slate-50">
                <h3 className="font-semibold text-sm">Exam Subjects</h3>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left w-16">SI No</th>
                      <th className="px-3 py-2 text-left">Subject Type</th>
                      <th className="px-3 py-2 text-left">Subject Name</th>
                      <th className="px-3 py-2 text-left w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSubjects.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">
                          {pickText(row, ['subjecttypeCode', 'subjectType', 'subjectTypeCode'])}
                        </td>
                        <td className="px-3 py-2">{subjectLabel(row)}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() =>
                              setPendingSubjects((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 flex justify-end border-t">
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {existingSubjects.length > 0 && selectedStudent ? (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">
              Student Subjects — {pickText(selectedStudent, ['hallticketNumber', 'rollNumber'])}
            </h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left w-16">SI No</th>
                  <th className="px-3 py-2 text-left">Subject Type</th>
                  <th className="px-3 py-2 text-left">Subject Name</th>
                  <th className="px-3 py-2 text-left w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {existingSubjects.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      {pickText(row, ['subjectTypeCode', 'subjecttypeCode', 'subjectType'])}
                    </td>
                    <td className="px-3 py-2">
                      {pickText(row, ['subjectName', 'subject_name'])}
                      {pickText(row, ['subjectCode', 'subject_code'])
                        ? ` (${pickText(row, ['subjectCode', 'subject_code'])})`
                        : ''}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditRow({
                            ...row,
                            studentId: detailStudentId,
                            stdFirstName: pickText(selectedStudent, ['firstName', 'studentName']),
                          })
                          setEditOpen(true)
                        }}
                      >
                        <PencilIcon className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <UpdateStudentSubjectModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditRow(null)
        }}
        row={editRow}
        studentName={pickText(selectedStudent, ['firstName', 'studentName'])}
        onSave={(payload) => updateMutation.mutate(payload)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContainer>
  )
}
