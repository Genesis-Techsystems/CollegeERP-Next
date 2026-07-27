'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FilteredListPage } from '@/components/layout'
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  listExamOnlinePapers,
  listInternalExamsForOnlinePapers,
  listStaffCoursesForExamOnlinePapers,
  publishExamOnlinePaper,
  type ExamMasterOnlineRow,
  type ExamOnlinePaperRow,
  type StaffSubjectClass,
} from '@/services'

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function formatExamDate(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function examTypeSuffix(exam: ExamMasterOnlineRow | null | undefined): string {
  if (!exam) return ''
  if (exam.isInternalExam) return ' (Internal)'
  if (exam.isRegularExam) return ' (Regular)'
  if (exam.isSupplyExam) return ' (Supple)'
  return ''
}

function courseLabel(c: StaffSubjectClass): string {
  const row = c as Record<string, unknown>
  return [
    row.collegeCode,
    row.courseCode,
    row.groupCode,
    row.courseYearName,
    row.section,
    row.subjectName,
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .map(String)
    .join(' / ')
}

function examLabel(exam: ExamMasterOnlineRow): string {
  const range = `${formatExamDate(exam.fromDate)} - ${formatExamDate(exam.toDate)}`
  return `${String(exam.examName ?? '')} (${range})${examTypeSuffix(exam)}`
}

/** Angular `staff-examinations/exam-online-paper` (OnlineExamsComponent). */
export function ExamOnlinePapersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading)

  const [courses, setCourses] = useState<StaffSubjectClass[]>([])
  const [exams, setExams] = useState<ExamMasterOnlineRow[]>([])
  const [papers, setPapers] = useState<ExamOnlinePaperRow[]>([])
  const [subjectCourseyearId, setSubjectCourseyearId] = useState<number | null>(
    null,
  )
  const [examId, setExamId] = useState<number | null>(null)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadingExams, setLoadingExams] = useState(false)
  const [loadingPapers, setLoadingPapers] = useState(false)

  const empId = employeeId || Number(readStorage('employeeId') || 0)
  const queryScyId = Number(searchParams.get('subjectCourseyearId') || 0)
  const queryExamId = Number(searchParams.get('examId') || 0)

  const selectedCourse = useMemo(
    () =>
      courses.find((c) => Number(c.subjectCourseyearId) === subjectCourseyearId) ??
      null,
    [courses, subjectCourseyearId],
  )

  const examDetails = useMemo(
    () => exams.find((e) => Number(e.examId) === examId) ?? null,
    [exams, examId],
  )

  const courseOptions: SelectOption[] = useMemo(
    () =>
      courses.map((c) => ({
        value: String(c.subjectCourseyearId),
        label: courseLabel(c),
      })),
    [courses],
  )

  const examOptions: SelectOption[] = useMemo(
    () =>
      exams.map((e) => ({
        value: String(e.examId),
        label: examLabel(e),
      })),
    [exams],
  )

  const loadPapers = useCallback(
    async (course: StaffSubjectClass, selectedExamId: number) => {
      const collegeId = Number(course.collegeId ?? 0)
      if (!collegeId || !empId || !selectedExamId) {
        setPapers([])
        return
      }
      setLoadingPapers(true)
      try {
        const list = await listExamOnlinePapers({
          collegeId,
          examId: selectedExamId,
          employeeId: empId,
        })
        setPapers(list)
        if (list.length === 0) toastSuccess('No Record(s) found.')
      } catch (e) {
        toastError(getErrorMessage(e))
        setPapers([])
      } finally {
        setLoadingPapers(false)
      }
    },
    [empId],
  )

  const loadExamsForCourse = useCallback(
    async (
      courseList: StaffSubjectClass[],
      scyId: number,
      preferredExamId?: number,
    ) => {
      const course =
        courseList.find((c) => Number(c.subjectCourseyearId) === scyId) ?? null
      setExamId(null)
      setExams([])
      setPapers([])
      const courseId = Number(course?.courseId ?? 0)
      const academicYearId = Number(course?.academicYearId ?? 0)
      if (!courseId || !academicYearId) return

      setLoadingExams(true)
      try {
        const list = await listInternalExamsForOnlinePapers({
          courseId,
          academicYearId,
        })
        setExams(list)
        const prefer = preferredExamId && preferredExamId > 0 ? preferredExamId : 0
        if (prefer > 0 && list.some((e) => Number(e.examId) === prefer) && course) {
          setExamId(prefer)
          await loadPapers(course, prefer)
        }
      } catch (e) {
        toastError(getErrorMessage(e))
        setExams([])
      } finally {
        setLoadingExams(false)
      }
    },
    [loadPapers],
  )

  useEffect(() => {
    if (!empId || isResolving || sessionLoading) return
    setLoadingCourses(true)
    void (async () => {
      try {
        const list = await listStaffCoursesForExamOnlinePapers(empId)
        setCourses(list)
        const prefer = queryScyId > 0 ? queryScyId : 0
        if (prefer > 0 && list.some((c) => Number(c.subjectCourseyearId) === prefer)) {
          setSubjectCourseyearId(prefer)
          await loadExamsForCourse(list, prefer, queryExamId)
        }
      } catch (e) {
        toastError(getErrorMessage(e))
        setCourses([])
      } finally {
        setLoadingCourses(false)
      }
    })()
  }, [empId, isResolving, sessionLoading, queryScyId, queryExamId, loadExamsForCourse])

  const onCourseChange = (v: string | null) => {
    const id = v ? Number(v) : null
    setSubjectCourseyearId(id)
    setExamId(null)
    setExams([])
    setPapers([])
    if (id) void loadExamsForCourse(courses, id)
  }

  const onExamChange = (v: string | null) => {
    const id = v ? Number(v) : null
    setExamId(id)
    setPapers([])
    if (id && selectedCourse) void loadPapers(selectedCourse, id)
  }

  const addPaperQuery = useCallback(() => {
    if (!selectedCourse || !examId || !examDetails) return null
    const row = selectedCourse as Record<string, unknown>
    const q = new URLSearchParams()
    const set = (k: string, v: unknown) => {
      if (v != null && String(v) !== '') q.set(k, String(v))
    }
    set('collegeId', row.collegeId)
    set('collegeCode', row.collegeCode)
    set('courseCode', row.courseCode)
    set('academicYear', row.academicYear)
    set('courseId', row.courseId)
    set('academicYearId', row.academicYearId)
    set('subjectCourseyearId', row.subjectCourseyearId)
    set('subjectId', row.subjectId)
    set('subjectName', row.subjectName)
    set('courseYearName', row.courseYearName)
    set('courseYearId', row.courseYearId)
    set('section', row.section)
    set('groupCode', row.groupCode)
    set('examId', examId)
    set('examName', examDetails.examName)
    set('fromDate', examDetails.fromDate)
    set('toDate', examDetails.toDate)
    return q
  }, [selectedCourse, examId, examDetails])

  const columnDefs = useMemo<ColDef<ExamOnlinePaperRow>[]>(() => {
    return [
      {
        headerName: 'SI.No',
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: 'Exam Paper',
        field: 'paperName',
        minWidth: 200,
        autoHeight: true,
        cellRenderer: (p: ICellRendererParams<ExamOnlinePaperRow>) => {
          const row = p.data
          if (!row) return null
          const isOnline = row.exampapertypeCatdetCode === 'ONLINE'
          const qCount = Array.isArray(row.examOnlineQuestionDTOS)
            ? row.examOnlineQuestionDTOS.length
            : 0
          return (
            <div className="leading-snug py-1">
              <p className="font-medium">{String(row.paperName ?? '')}</p>
              {isOnline ? (
                <p className="text-xs text-primary">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() =>
                      toastSuccess('Question list opens from Add Online Paper flow.')
                    }
                  >
                    Question ({qCount})
                  </button>
                  {!row.isPublished ? (
                    <>
                      {' | '}
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => {
                          const q = addPaperQuery()
                          if (!q) return
                          q.set('examOnlinePaperId', String(row.examOnlinePaperId ?? ''))
                          q.set('paperName', String(row.paperName ?? ''))
                          q.set('permission', 'Add')
                          router.push(
                            `/staff-examinations/exam-online-paper/add-online-paper/add-question?${q.toString()}`,
                          )
                        }}
                      >
                        Add
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        field: 'exampapertypeCatdetName',
        headerName: 'Paper Type',
        minWidth: 120,
      },
      {
        field: 'setno',
        headerName: 'Set No.',
        minWidth: 90,
        width: 90,
        flex: 0,
      },
      {
        headerName: 'Question Paper',
        minWidth: 120,
        cellRenderer: (p: ICellRendererParams<ExamOnlinePaperRow>) => {
          const row = p.data
          if (!row) return null
          if (row.exampapertypeCatdetCode === 'ONLINE') return <span>-</span>
          if (row.examPaperUrl) {
            return (
              <a
                href={String(row.examPaperUrl)}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Document1
              </a>
            )
          }
          return <span>No Documents</span>
        },
      },
      {
        headerName: 'Prepared On',
        field: 'preparedOn',
        minWidth: 120,
        valueFormatter: (p) => formatExamDate(p.value),
      },
      {
        headerName: 'Assigned To',
        minWidth: 110,
        cellRenderer: (p: ICellRendererParams<ExamOnlinePaperRow>) => {
          const row = p.data
          if (!row) return null
          if (!row.isPublished) return <span>-</span>
          return (
            <Button
              type="button"
              size="sm"
              className="bg-[#00b9ff] hover:bg-[#00a8e8] text-white"
              onClick={() => {
                const q = new URLSearchParams()
                q.set('examOnlinePaperId', String(row.examOnlinePaperId ?? ''))
                q.set('examId', String(row.examId ?? examId ?? ''))
                if (selectedCourse?.subjectCourseyearId != null) {
                  q.set(
                    'subjectCourseyearId',
                    String(selectedCourse.subjectCourseyearId),
                  )
                }
                router.push(
                  `/staff-examinations/exam-online-paper/view-online-paper?${q.toString()}`,
                )
              }}
            >
              View
            </Button>
          )
        },
      },
      {
        headerName: 'Actions',
        minWidth: 140,
        flex: 0,
        width: 160,
        cellRenderer: (p: ICellRendererParams<ExamOnlinePaperRow>) => {
          const row = p.data
          if (!row) return null
          if (row.isPublished) {
            return <span className="text-sm text-muted-foreground">Published</span>
          }
          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const q = addPaperQuery()
                  if (!q) return
                  q.set('examOnlinePaperId', String(row.examOnlinePaperId ?? ''))
                  router.push(
                    `/staff-examinations/exam-online-paper/add-online-paper?${q.toString()}`,
                  )
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#00b9ff] hover:bg-[#00a8e8] text-white"
                onClick={() => {
                  void (async () => {
                    try {
                      const res = await publishExamOnlinePaper(row)
                      if (res.success) {
                        toastSuccess(res.message || 'Published')
                        if (selectedCourse && examId) {
                          await loadPapers(selectedCourse, examId)
                        }
                      } else {
                        toastError(res.message || 'Publish failed')
                      }
                    } catch (e) {
                      toastError(getErrorMessage(e))
                    }
                  })()
                }}
              >
                Publish
              </Button>
            </div>
          )
        },
      },
    ]
  }, [addPaperQuery, examId, loadPapers, router, selectedCourse])

  const examHeader =
    examId && examDetails ? (
      <div className="flex items-center justify-between gap-3 -mt-1 mb-1">
        <p className="text-sm font-medium">
          {String(examDetails.examName ?? '')} (
          {formatExamDate(examDetails.fromDate)} -{' '}
          {formatExamDate(examDetails.toDate)})
          <span className="text-[#0014ff] font-medium">
            {examDetails.isInternalExam
              ? ' [Internal]'
              : examDetails.isRegularExam
                ? ' [Regular]'
                : examDetails.isSupplyExam
                  ? ' [Supple]'
                  : ''}
          </span>
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const q = addPaperQuery()
            if (!q) return
            router.push(
              `/staff-examinations/exam-online-paper/add-online-paper?${q.toString()}`,
            )
          }}
        >
          Add Paper
        </Button>
      </div>
    ) : null

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Course *" className="!flex-[1_1_50%] !min-w-[16rem]">
        <Select
          value={subjectCourseyearId != null ? String(subjectCourseyearId) : null}
          onChange={onCourseChange}
          options={courseOptions}
          placeholder="Course"
          isLoading={loadingCourses || isResolving || sessionLoading}
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam *" className="!flex-[1_1_45%] !min-w-[14rem]">
        <Select
          value={examId != null ? String(examId) : null}
          onChange={onExamChange}
          options={examOptions}
          placeholder="Exam"
          isLoading={loadingExams}
          disabled={!subjectCourseyearId}
          clearable={false}
        />
      </GlobalFilterField>
    </GlobalFilterBarRow>
  )

  return (
    <FilteredListPage
      title="Exam Online Papers"
      notice={examHeader}
      filters={filters}
      filtersCollapsible
      filtersDefaultOpen
      {...(examId
        ? {
            rowData: papers,
            columnDefs,
            loading: loadingPapers,
            pagination: true,
            height: 'auto' as const,
            toolbar: { search: true, searchPlaceholder: 'Search' },
          }
        : { body: null })}
    >
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </FilteredListPage>
  )
}
