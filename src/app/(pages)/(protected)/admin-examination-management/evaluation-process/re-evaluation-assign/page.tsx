'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookMarked, ChevronDown } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  assignReevaluationByCodes,
  getReevaluationAssignBundleByCodes,
  getReevaluationAssignSubjects,
} from '@/services/evaluation'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function textFrom(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = String(row[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function numFrom(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string): T[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function ReEvaluationAssignPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [showContent, setShowContent] = useState(false)

  const [allSubjectRows, setAllSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])
  const [stats, setStats] = useState<{
    totalStudents: number
    uploaded: number
    unassigned: number
    assigned: number
    evaluatorCount: number
  }>({
    totalStudents: 0,
    uploaded: 0,
    unassigned: 0,
    assigned: 0,
    evaluatorCount: 0,
  })

  const [courseCode, setCourseCode] = useState<string | null>(null)
  const [examMonthYear, setExamMonthYear] = useState<string | null>(null)
  const [courseYearCode, setCourseYearCode] = useState<string | null>(null)
  const [subjectCode, setSubjectCode] = useState<string | null>(null)

  const [selectedEvaluatorProfileId, setSelectedEvaluatorProfileId] = useState<number | null>(null)
  const [selectedOmrSet, setSelectedOmrSet] = useState<Set<string>>(new Set())
  const [omrSearch, setOmrSearch] = useState('')
  const [evaluatorSearch, setEvaluatorSearch] = useState('')

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        // No inline .catch — let a real failure surface via the toast below
        // instead of silently showing empty dropdowns.
        const rows = await getReevaluationAssignSubjects(employeeId)
        setAllSubjectRows(Array.isArray(rows) ? rows : [])
      } catch (error) {
        toastError(error, 'Failed to load re-evaluation assign filters')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  const courseOptions = useMemo(
    () =>
      dedupeBy(allSubjectRows, (r) => textFrom(r, ['course_code'])).map((r) => {
        const code = textFrom(r, ['course_code'])
        return { value: code, label: code }
      }),
    [allSubjectRows],
  )

  const monthYearOptions = useMemo(() => {
    const rows = allSubjectRows
      .filter((r) => textFrom(r, ['course_code']) === (courseCode ?? ''))
      .sort((a, b) => {
        const da = new Date(textFrom(a, ['exam_month_yr'])).getTime()
        const db = new Date(textFrom(b, ['exam_month_yr'])).getTime()
        return db - da
      })
    return dedupeBy(rows, (r) => textFrom(r, ['exam_month_yr'])).map((r) => {
      const value = textFrom(r, ['exam_month_yr'])
      return { value, label: value }
    })
  }, [allSubjectRows, courseCode])

  const courseYearOptions = useMemo(() => {
    const rows = allSubjectRows.filter(
      (r) =>
        textFrom(r, ['course_code']) === (courseCode ?? '') &&
        textFrom(r, ['exam_month_yr']) === (examMonthYear ?? ''),
    )
    return dedupeBy(rows, (r) => textFrom(r, ['course_year_code'])).map((r) => {
      const value = textFrom(r, ['course_year_code'])
      return { value, label: value }
    })
  }, [allSubjectRows, courseCode, examMonthYear])

  const subjectOptions = useMemo(() => {
    const rows = allSubjectRows.filter(
      (r) =>
        textFrom(r, ['course_code']) === (courseCode ?? '') &&
        textFrom(r, ['exam_month_yr']) === (examMonthYear ?? '') &&
        textFrom(r, ['course_year_code']) === (courseYearCode ?? ''),
    )
    return dedupeBy(rows, (r) => textFrom(r, ['subject_code'])).map((r) => {
      const code = textFrom(r, ['subject_code'])
      const name = textFrom(r, ['subject_name'])
      const label = name ? `${code} - ${name}` : code
      return { value: code, label }
    })
  }, [allSubjectRows, courseCode, examMonthYear, courseYearCode])

  useEffect(() => {
    if (!courseCode && courseOptions[0]) setCourseCode(courseOptions[0].value)
  }, [courseOptions, courseCode])
  useEffect(() => {
    if (monthYearOptions[0]) setExamMonthYear(monthYearOptions[0].value)
  }, [monthYearOptions])
  useEffect(() => {
    if (courseYearOptions[0]) setCourseYearCode(courseYearOptions[0].value)
  }, [courseYearOptions])
  useEffect(() => {
    if (subjectOptions[0]) setSubjectCode(subjectOptions[0].value)
  }, [subjectOptions])

  useEffect(() => {
    setShowContent(false)
    setEvaluatorRows([])
    setStudentRows([])
    setSelectedEvaluatorProfileId(null)
    setSelectedOmrSet(new Set())
  }, [courseCode, examMonthYear, courseYearCode, subjectCode])

  const filteredEvaluators = useMemo(() => {
    const q = evaluatorSearch.trim().toLowerCase()
    if (!q) return evaluatorRows
    return evaluatorRows.filter((r) => textFrom(r, ['evaluator_name']).toLowerCase().includes(q))
  }, [evaluatorRows, evaluatorSearch])

  const allUnmappedUploadedStudents = useMemo(
    () =>
      studentRows.filter(
        (r) => Number(r.is_mapped ?? 0) === 0 && Number(r.is_answerpaper_uploaded ?? 0) === 1,
      ),
    [studentRows],
  )

  const filteredOmrRows = useMemo(() => {
    const q = omrSearch.trim().toLowerCase()
    const source = allUnmappedUploadedStudents
    if (!q) return source
    return source.filter((r) => textFrom(r, ['omr_serial_no']).toLowerCase().includes(q))
  }, [allUnmappedUploadedStudents, omrSearch])

  const selectedOmrRows = useMemo(
    () => allUnmappedUploadedStudents.filter((r) => selectedOmrSet.has(textFrom(r, ['omr_serial_no']))),
    [allUnmappedUploadedStudents, selectedOmrSet],
  )

  function toggleOmr(omr: string, checked: boolean) {
    setSelectedOmrSet((prev) => {
      const next = new Set(prev)
      if (checked) next.add(omr)
      else next.delete(omr)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedOmrSet(new Set())
      return
    }
    setSelectedOmrSet(new Set(filteredOmrRows.map((r) => textFrom(r, ['omr_serial_no']))))
  }

  async function getList() {
    if (!courseCode || !examMonthYear || !courseYearCode || !subjectCode) {
      toastError('Please select all filters.')
      return
    }
    setLoading(true)
    try {
      const bundle = await getReevaluationAssignBundleByCodes({
        employeeId,
        courseCode,
        examMonthYear,
        courseYearCode,
        subjectCode,
      })
      const evaluators = Array.isArray(bundle.evaluators) ? bundle.evaluators : []
      const summary = Array.isArray(bundle.summary) ? bundle.summary : []
      const students = Array.isArray(bundle.students) ? bundle.students : []
      const unassignedOnly = evaluators.filter(
        (r) => Number(r.no_of_students_assigned ?? 0) - Number(r.no_of_evaluations_completed ?? 0) > 0,
      )
      setEvaluatorRows(unassignedOnly)
      setStudentRows(students)
      setSelectedOmrSet(new Set())
      setSelectedEvaluatorProfileId(
        numFrom(unassignedOnly[0], ['pk_exam_evaluator_profile_id']) || null,
      )
      const summaryRow = summary[0] ?? {}
      const totalStudents = Number(summaryRow.totalStudents ?? 0)
      const unassigned = Number(summaryRow.UnAssinged ?? 0)
      const uploaded = Number(summaryRow.NoOfAnswerpapersUploaded ?? 0)
      setStats({
        totalStudents,
        uploaded,
        unassigned,
        assigned: Math.max(totalStudents - unassigned, 0),
        evaluatorCount: unassignedOnly.length,
      })
      setShowContent(true)
    } catch (error) {
      toastError(error, 'Failed to load re-evaluation assign data.')
      setShowContent(false)
    } finally {
      setLoading(false)
    }
  }

  async function assignSelected() {
    if (!selectedEvaluatorProfileId) {
      toastError('Please select an evaluator.')
      return
    }
    if (selectedOmrRows.length === 0) {
      toastError('Please select at least one OMR serial.')
      return
    }
    if (!subjectCode || !examMonthYear || !courseCode || !courseYearCode) {
      toastError('Missing filter data for assignment.')
      return
    }

    const selectedEvaluator = evaluatorRows.find(
      (r) => numFrom(r, ['pk_exam_evaluator_profile_id']) === selectedEvaluatorProfileId,
    )
    const timetableDetIds = textFrom(selectedEvaluator, ['pk_exam_timetable_det_ids'])
    const assignmentIdsCsv = selectedOmrRows
      .map((r) => numFrom(r, ['fk_exam_evaluationassignment_id']))
      .filter((id) => id > 0)
      .join(',')
    if (!assignmentIdsCsv) {
      toastError('Unable to map selected OMR rows to assignment ids.')
      return
    }

    setLoading(true)
    try {
      await assignReevaluationByCodes({
        profileId: selectedEvaluatorProfileId,
        subjectCode,
        examMonthYear,
        courseCode,
        courseYearCode,
        assignmentIdsCsv,
        timetableDetIds,
      })
      toastSuccess('OMR serials assigned successfully.')
      await getList()
    } catch (error) {
      toastError(error, 'Failed to assign selected OMR serials.')
    } finally {
      setLoading(false)
    }
  }

  const allChecked =
    filteredOmrRows.length > 0 &&
    filteredOmrRows.every((r) => selectedOmrSet.has(textFrom(r, ['omr_serial_no'])))

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Re evaluation assign" subtitle="Evaluation process · Re-evaluation assignment" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Re evaluation assign</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[13px]"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
          >
            Filters
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {(
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="space-y-1 md:col-span-2">
                <Label>Course</Label>
                <Select value={courseCode} onChange={setCourseCode} options={courseOptions} searchable />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Exam Month Year</Label>
                <Select value={examMonthYear} onChange={setExamMonthYear} options={monthYearOptions} searchable />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Course Year</Label>
                <Select value={courseYearCode} onChange={setCourseYearCode} options={courseYearOptions} searchable />
              </div>
              <div className="space-y-1 md:col-span-5">
                <Label>Subject</Label>
                <Select value={subjectCode} onChange={setSubjectCode} options={subjectOptions} searchable />
              </div>
              <div className="md:col-span-1">
                <Button className="h-9 w-full" onClick={() => void getList()} disabled={loading}>
                  Get List
                </Button>
              </div>
            </div>

            {showContent && (
              <p className="text-[13px] font-medium">
                Total Students: <span className="text-red-600">{stats.totalStudents}</span> | No.Of AnswerPapers
                Uploaded: <span className="text-red-600">{stats.uploaded}</span> | UnAssigned:{' '}
                <span className="text-red-600">{stats.unassigned}</span> | Assigned:{' '}
                <span className="text-red-600">{stats.assigned}</span> | No of Evaluators:{' '}
                <span className="text-red-600">{stats.evaluatorCount}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {showContent && (
        <div className="app-card p-3 border-t-[3px] border-t-amber-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3 border rounded-md p-2 bg-card">
              <h3 className="text-[14px] font-semibold text-blue-700 px-1 pb-2">Evaluators</h3>
              <div className="px-1 pb-2">
                <SearchInput className="w-full max-w-sm" placeholder="Search evaluator…" value={evaluatorSearch} onChange={setEvaluatorSearch} />
              </div>
              <div className="max-h-[420px] overflow-auto space-y-1 px-1">
                {filteredEvaluators.map((row) => {
                  const profileId = numFrom(row, ['pk_exam_evaluator_profile_id'])
                  const assigned = Number(row.no_of_students_assigned ?? 0)
                  const completed = Number(row.no_of_evaluations_completed ?? 0)
                  return (
                    <label key={profileId} className="flex items-start gap-2 text-[12px]">
                      <input
                        type="radio"
                        name="evaluatorProfile"
                        checked={selectedEvaluatorProfileId === profileId}
                        onChange={() => setSelectedEvaluatorProfileId(profileId)}
                      />
                      <span>
                        {textFrom(row, ['evaluator_name'])} ({completed}/{assigned})
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-4 border rounded-md p-2 bg-card">
              <div className="flex items-center justify-between gap-2 pb-2">
                <SearchInput className="w-full max-w-sm" placeholder="Search OMR…" value={omrSearch} onChange={setOmrSearch} />
                <span className="text-[12px] font-medium text-blue-700">Selected: {selectedOmrSet.size}</span>
              </div>
              <div className="max-h-[420px] overflow-auto border rounded">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-1 text-left w-10">
                        <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                      </th>
                      <th className="px-2 py-1 text-left">Serial No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOmrRows.map((row) => {
                      const omr = textFrom(row, ['omr_serial_no'])
                      return (
                        <tr key={omr} className="border-b">
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedOmrSet.has(omr)}
                              onChange={(e) => toggleOmr(omr, e.target.checked)}
                            />
                          </td>
                          <td className="px-2 py-1">{omr || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:col-span-4 border rounded-md p-2 bg-card">
              <h3 className="text-[12px] font-semibold pb-2">Selected: {selectedOmrSet.size}</h3>
              <div className="max-h-[420px] overflow-auto border rounded">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-1 text-left">OMR Serial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOmrRows.map((row) => (
                      <tr key={textFrom(row, ['omr_serial_no'])} className="border-b">
                        <td className="px-2 py-1 text-blue-700">{textFrom(row, ['omr_serial_no']) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:col-span-1 flex items-end justify-end">
              <Button className="w-full md:w-auto" onClick={() => void assignSelected()} disabled={loading}>
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
