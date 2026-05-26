'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/common/components/select'
import { ChevronDown, Eye, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createExamQuestionPaper,
  getAssignQuestionPaperTemplateList,
  getEvaluationExamFilters,
  getEvaluationExamRestBundle,
  listEvaluationSubjects,
  listExamQuestionPapers,
  updateExamQuestionPaper,
  uploadQuestionPaperFiles,
} from '@/services/evaluation-process'
import { PageContainer, PageHeader } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { toDateOnlyISO } from '@/common/generic-functions'

type AnyRow = Record<string, any>
const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function ExamQuestionPaperMarksPage() {
  const router = useRouter()
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [editingRow, setEditingRow] = useState<AnyRow | null>(null)
  const [uploadRow, setUploadRow] = useState<AnyRow | null>(null)
  const [uploadQpFile, setUploadQpFile] = useState<File | null>(null)
  const [uploadAsFile, setUploadAsFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [templateRows, setTemplateRows] = useState<AnyRow[]>([])
  const [templateId, setTemplateId] = useState<number>(0)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const empNumber = globalThis?.localStorage?.getItem('empNumber') ?? ''
  const userName = globalThis?.localStorage?.getItem('uName') ?? globalThis?.localStorage?.getItem('userName') ?? ''
  const preparedEmpLabel = userName ? `${empNumber} (${userName})` : empNumber || `Employee ${employeeId}`
  const preparedEmpOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    if (employeeId > 0) {
      options.push({ value: String(employeeId), label: preparedEmpLabel })
    }
    if (editingRow) {
      const priorId = pickNum(editingRow, [
        'preparedByEmpId',
        'fk_preparedby_emp_id',
        'preparedbyEmpId',
      ])
      if (priorId > 0 && priorId !== employeeId) {
        const priorName =
          pickText(editingRow, [
            'preparedby_emp_name',
            'preparedByEmpName',
            'preparedBy',
            'preparedByEmp',
          ]) || `Employee ${priorId}`
        const priorNumber = pickText(editingRow, [
          'preparedby_emp_number',
          'preparedByEmpNumber',
        ])
        const label = priorNumber ? `${priorNumber} (${priorName})` : priorName
        options.push({ value: String(priorId), label })
      }
    }
    return options
  }, [employeeId, preparedEmpLabel, editingRow])
  const [form, setForm] = useState({
    questionPaperTitle: '',
    questionPaperCode: '',
    setNumber: '',
    totalQuestions: '',
    totalMarks: '',
    passMarks: '',
    preparedByEmpId: employeeId,
    preparedDate: toDateOnlyISO(new Date()),
    questionPaperStatus: 'Prepared',
    statusComments: '',
    isActive: true,
    reason: 'active',
  })

  function resetForm() {
    setForm({
      questionPaperTitle: '',
      questionPaperCode: '',
      setNumber: '',
      totalQuestions: '',
      totalMarks: '',
      passMarks: '',
      preparedByEmpId: employeeId,
      preparedDate: toDateOnlyISO(new Date()),
      questionPaperStatus: 'Prepared',
      statusComments: '',
      isActive: true,
      reason: 'active',
    })
  }

  async function saveQuestionPaper() {
    if (!form.questionPaperTitle || !form.questionPaperCode) {
      toastError('Question Paper Title and Code are required.')
      return
    }
    if (!examId || !courseYearId || !subjectId) {
      toastError('Please select Exam, Course Year and Subject before saving.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        questionPaperTitle: form.questionPaperTitle,
        questionPaperCode: form.questionPaperCode,
        setNumber: form.setNumber || null,
        totalQuestions: Number(form.totalQuestions || 0),
        totalMarks: Number(form.totalMarks || 0),
        passMarks: Number(form.passMarks || 0),
        preparedByEmpId: form.preparedByEmpId || null,
        preparedDate: form.preparedDate || null,
        questionPaperStatus: form.questionPaperStatus || null,
        statusComments: form.statusComments || null,
        isActive: form.isActive,
        reason: form.isActive ? 'active' : form.reason || null,
        examId,
        courseYearId,
        subjectId,
        regulationId: regulationId ?? undefined,
        academicYearId: academicYearId ?? undefined,
        courseId: courseId ?? undefined,
        examQuestionPaperTemplateId: templateId || null,
      }
      const editingId = editingRow ? rowQuestionPaperId(editingRow) : 0
      if (editingId > 0) {
        await updateExamQuestionPaper(editingId, payload)
        toastSuccess('Question paper updated successfully.')
      } else {
        await createExamQuestionPaper(payload)
        toastSuccess('Question paper saved successfully.')
      }
      setOpenAddModal(false)
      setEditingRow(null)
      resetForm()
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to save question paper.')
    } finally {
      setLoading(false)
    }
  }

  const courses = useMemo(() => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [baseRows, courseId, academicYearId],
  )
  const regulations = useMemo(() => dedupeBy(regulationRows, (r) => pickNum(r, ['regulationId', 'fk_regulation_id'])), [regulationRows])
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows,
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId', 'course_year_id']),
      ),
    [restRows],
  )
  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => pickNum(r, ['subjectId', 'fk_subject_id'])), [subjectRows])
  const selectedCollegeId = useMemo(() => pickNum(restRows[0], ['fk_college_id', 'collegeId']), [restRows])
  const selectedCourseGroupId = useMemo(() => pickNum(restRows[0], ['fk_course_group_id', 'courseGroupId']), [restRows])
  const selectedCourse = useMemo(
    () => courses.find((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)) ?? null,
    [courses, courseId],
  )
  const selectedAcademicYear = useMemo(
    () => academicYears.find((r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId)) ?? null,
    [academicYears, academicYearId],
  )
  const selectedExam = useMemo(
    () => exams.find((r) => pickNum(r, ['fk_exam_id', 'examId']) === Number(examId)) ?? null,
    [exams, examId],
  )
  const selectedCourseYear = useMemo(
    () => courseYears.find((r) => pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)) ?? null,
    [courseYears, courseYearId],
  )
  const selectedSubject = useMemo(
    () => subjects.find((r) => pickNum(r, ['fk_subject_id', 'subjectId']) === Number(subjectId)) ?? null,
    [subjects, subjectId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getEvaluationExamFilters(employeeId).catch(() => [])
        const rows = Array.isArray(list) ? list : []
        setBaseRows(rows)
        if (rows[0]) setCourseId(pickNum(rows[0], ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (academicYears[0]) setAcademicYearId(pickNum(academicYears[0], ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])
  useEffect(() => {
    async function loadRest() {
      if (!courseId || !examId || !academicYearId) return
      const bundle = await getEvaluationExamRestBundle({ courseId, examId, academicYearId, employeeId }).catch(() => ({ restFilters: [], regulations: [] }))
      const rows = Array.isArray(bundle.restFilters) ? bundle.restFilters : []
      setRestRows(rows)
      setRegulationRows(Array.isArray(bundle.regulations) ? bundle.regulations : [])
      if (rows[0]) {
        const defaultReg = pickNum((Array.isArray(bundle.regulations) ? bundle.regulations : [])[0], ['regulationId', 'fk_regulation_id'])
        setRegulationId(defaultReg || pickNum(rows[0], ['fk_regulation_id', 'regulationId']) || null)
        setCourseYearId(pickNum(rows[0], ['fk_course_year_id', 'courseYearId']) || null)
      }
    }
    void loadRest()
  }, [courseId, examId, academicYearId, employeeId])
  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !examId || !academicYearId || !courseYearId || !regulationId || !selectedCollegeId || !selectedCourseGroupId) {
        setSubjectRows([])
        return
      }
      const list = await listEvaluationSubjects({
        collegeId: selectedCollegeId,
        courseId,
        courseGroupId: selectedCourseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      setSubjectRows(Array.isArray(list) ? list : [])
    }
    void loadSubjects()
  }, [selectedCollegeId, selectedCourseGroupId, courseId, examId, academicYearId, courseYearId, regulationId, employeeId])
  useEffect(() => {
    if (!subjectId && subjects[0]) setSubjectId(pickNum(subjects[0], ['fk_subject_id', 'subjectId']))
  }, [subjects, subjectId])

  // Load assigned templates whenever the modal opens with enough context
  // (exam / course year / regulation / subject). Mirrors Angular
  // getTemplateDetails() which calls s_get_question_paper_assignments.
  useEffect(() => {
    if (!openAddModal) return
    if (!examId || !courseYearId || !regulationId || !subjectId) {
      setTemplateRows([])
      return
    }
    let cancelled = false
    void (async () => {
      const rows = await getAssignQuestionPaperTemplateList({
        examId,
        courseYearId,
        regulationId,
        subjectId,
      }).catch(() => [])
      if (cancelled) return
      const list = Array.isArray(rows) ? rows : []
      setTemplateRows(list)
      // If not editing, default to the first assigned template (Angular parity).
      if (!editingRow && list.length > 0) {
        const firstId = pickNum(list[0], [
          'fk_exam_questionpaper_template_id',
          'examQuestionPaperTemplateId',
          'questionPaperTemplateId',
        ])
        if (firstId > 0) setTemplateId(firstId)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [openAddModal, examId, courseYearId, regulationId, subjectId, editingRow])
  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId, regulationId, courseYearId, subjectId])

  async function getList() {
    setLoading(true)
    try {
      const list = await listExamQuestionPapers({
        examId: examId ?? undefined,
        courseYearId: courseYearId ?? undefined,
        subjectId: subjectId ?? undefined,
      }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  function rowQuestionPaperId(row: AnyRow): number {
    return pickNum(row, [
      'examQuestionPaperId',
      'exam_questionpaper_id',
      'questionPaperId',
      'pk_exam_questionpaper_id',
      'id',
    ])
  }
  function rowTemplateId(row: AnyRow): number {
    return pickNum(row, [
      'examQuestionPaperTemplateId',
      'fk_exam_questionpaper_template_id',
      'questionPaperTemplateId',
    ])
  }
  function navigateWithRow(path: string, row: AnyRow) {
    const params = new URLSearchParams({
      examQuestionPaperId: String(rowQuestionPaperId(row)),
      examQuestionPaperTemplateId: String(rowTemplateId(row)),
      questionPaperTitle: pickText(row, ['questionPaperTitle', 'questionpaper_title']),
      questionPaperCode: pickText(row, ['questionPaperCode', 'questionpaper_code', 'paperCode']),
    })
    router.push(`${path}?${params.toString()}`)
  }
  function viewQuestions(row: AnyRow) {
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/view-template',
      row,
    )
  }
  function printQP(row: AnyRow) {
    const url = pickText(row, ['questionPaperPath', 'questionpaper_path'])
    if (url) {
      globalThis?.open?.(url, '_blank')
      return
    }
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa',
      { ...row, printMode: 'QP' },
    )
  }
  function printQA(row: AnyRow) {
    const url = pickText(row, ['modelAnswerSheetPath', 'modelanswersheet_path'])
    if (url) {
      globalThis?.open?.(url, '_blank')
      return
    }
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa',
      { ...row, printMode: 'QA' },
    )
  }
  function editRow(row: AnyRow) {
    setEditingRow(row)
    setTemplateId(rowTemplateId(row))
    setForm({
      questionPaperTitle: pickText(row, ['questionPaperTitle', 'questionpaper_title']),
      questionPaperCode: pickText(row, ['questionPaperCode', 'questionpaper_code', 'paperCode']),
      setNumber: pickText(row, ['setNumber', 'setnumber', 'setNo']),
      totalQuestions: String(pickNum(row, ['totalQuestions', 'totalquestions']) || ''),
      totalMarks: String(pickNum(row, ['totalMarks', 'totalmarks']) || ''),
      passMarks: String(pickNum(row, ['passMarks', 'passmarks']) || ''),
      preparedByEmpId:
        pickNum(row, ['preparedByEmpId', 'fk_preparedby_emp_id', 'preparedbyEmpId']) || employeeId,
      preparedDate: pickText(row, ['preparedDate', 'prepared_date']) || toDateOnlyISO(new Date()),
      questionPaperStatus: pickText(row, ['questionPaperStatus', 'question_status']) || 'Prepared',
      statusComments: pickText(row, ['statusComments', 'status_comments']),
      isActive: row.isActive === true || row.is_active === true,
      reason: pickText(row, ['reason']) || 'active',
    })
    setOpenAddModal(true)
  }
  function openFile(url: string | null | undefined) {
    if (!url) return
    globalThis?.open?.(url, '_blank')
  }
  function manageQuestions(row: AnyRow) {
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/manage-questions-paper',
      row,
    )
  }
  function assignTemplate(row: AnyRow) {
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/assign-question-template',
      row,
    )
  }
  function uploadPapers(row: AnyRow) {
    setUploadRow(row)
    setUploadQpFile(null)
    setUploadAsFile(null)
  }

  async function submitUpload() {
    if (!uploadRow) return
    const id = rowQuestionPaperId(uploadRow)
    if (!id) {
      toastError('Question paper id is missing on this row.')
      return
    }
    if (!uploadQpFile && !uploadAsFile) {
      toastError('Choose at least one file to upload.')
      return
    }
    setUploading(true)
    try {
      const { message } = await uploadQuestionPaperFiles({
        examQuestionPaperId: id,
        questionPaper: uploadQpFile,
        modelAnswerPaper: uploadAsFile,
      })
      toastSuccess(message || 'Files uploaded.')
      setUploadRow(null)
      setUploadQpFile(null)
      setUploadAsFile(null)
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to upload files.')
    } finally {
      setUploading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 82, pinned: 'left' },
      {
        field: 'questionPaperTitle',
        headerName: 'Question Paper Title',
        minWidth: 280,
        autoHeight: true,
        cellRenderer: (p: { data?: AnyRow }) => {
          const row = p.data ?? {}
          return (
            <div className="py-1">
              <p className="font-medium text-[12px]">
                {pickText(row, ['questionPaperTitle', 'questionpaper_title']) || '-'}
              </p>
              <p className="text-[11px] text-blue-700">
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => viewQuestions(row)}
                >
                  View Questions
                </button>
                {' | '}
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => printQP(row)}
                >
                  Print QP
                </button>
                {' | '}
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => printQA(row)}
                >
                  Print QA
                </button>
                {' | '}
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => editRow(row)}
                >
                  Edit
                </button>
              </p>
            </div>
          )
        },
      },
      {
        field: 'paperCode',
        headerName: 'QP Code',
        minWidth: 110,
        valueGetter: (p) =>
          pickText(p.data, ['questionPaperCode', 'questionpaper_code', 'paperCode']) || '-',
      },
      {
        field: 'courseYearCode',
        headerName: 'Course Year',
        minWidth: 120,
        valueGetter: (p) => pickText(p.data, ['courseYearCode', 'courseYearName']) || '-',
      },
      {
        field: 'setNo',
        headerName: 'Set No.',
        minWidth: 95,
        valueGetter: (p) => pickText(p.data, ['setNumber', 'setnumber', 'setNo']) || '-',
      },
      {
        headerName: 'Total Questions',
        minWidth: 130,
        valueGetter: (p) => pickNum(p.data, ['totalQuestions', 'totalquestions']) || '-',
      },
      {
        headerName: 'Total Marks',
        minWidth: 120,
        valueGetter: (p) => pickNum(p.data, ['totalMarks', 'totalmarks']) || '-',
      },
      {
        headerName: 'Pass Marks',
        minWidth: 110,
        valueGetter: (p) => pickNum(p.data, ['passMarks', 'passmarks']) || '-',
      },
      {
        headerName: 'Question Paper',
        minWidth: 130,
        cellRenderer: (p: { data?: AnyRow }) => {
          const url = pickText(p.data, ['questionPaperPath', 'questionpaper_path'])
          if (!url) return <span className="text-[11px] text-muted-foreground">No Docs Uploaded</span>
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => openFile(url)}
              aria-label="View question paper"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )
        },
      },
      {
        headerName: 'Answer Sheet',
        minWidth: 120,
        cellRenderer: (p: { data?: AnyRow }) => {
          const url = pickText(p.data, ['modelAnswerSheetPath', 'modelanswersheet_path'])
          if (!url) return <span className="text-[11px] text-muted-foreground">No Docs Uploaded</span>
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => openFile(url)}
              aria-label="View answer sheet"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )
        },
      },
      {
        headerName: 'View Template',
        minWidth: 125,
        cellRenderer: (p: { data?: AnyRow }) => {
          if (!rowTemplateId(p.data ?? {}))
            return <span className="text-[11px] text-muted-foreground">No Docs Uploaded</span>
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => p.data && viewQuestions(p.data)}
              aria-label="View template"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )
        },
      },
      {
        headerName: 'Prepared By',
        minWidth: 130,
        valueGetter: (p) => pickText(p.data, ['preparedByEmp', 'preparedby_emp_name', 'preparedBy']) || '-',
      },
      {
        headerName: 'Prepared Date',
        minWidth: 130,
        valueGetter: (p) => pickText(p.data, ['preparedDate', 'prepared_date']) || '-',
      },
      {
        headerName: 'Question Paper Status',
        minWidth: 150,
        valueGetter: (p) => pickText(p.data, ['questionPaperStatus', 'question_status']) || '-',
      },
      {
        headerName: 'Status Comments',
        minWidth: 160,
        valueGetter: (p) => pickText(p.data, ['statusComments', 'status_comments']) || '-',
      },
      {
        headerName: 'Approved By',
        minWidth: 130,
        valueGetter: (p) => pickText(p.data, ['approvedByEmp', 'approvedby_emp_name']) || '-',
      },
      {
        headerName: 'Approved Date',
        minWidth: 130,
        valueGetter: (p) => pickText(p.data, ['approvedDate', 'approved_date']) || '-',
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 105,
        cellRenderer: (p: { data?: AnyRow }) => (
          <StatusBadge status={p.data?.isActive === true || p.data?.is_active === true} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 220,
        cellRenderer: (p: { data?: AnyRow }) => {
          const row = p.data ?? {}
          const hasTemplate = rowTemplateId(row) > 0
          return (
            <div className="flex items-center gap-1.5">
              {hasTemplate ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => manageQuestions(row)}>
                  Manage Question
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => assignTemplate(row)}>
                  Assign Template
                </Button>
              )}
              {hasTemplate && (
                <Button size="sm" className="h-7 text-[11px]" onClick={() => uploadPapers(row)}>
                  Upload QP & AS
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Question Paper" subtitle="Manage question paper marks setup" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Question Paper</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Course</label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => setCourseId(v ? Number(v) : 0)}
                options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode', 'course_name', 'courseName']) }))}
                placeholder="Course"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Academic Year</label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => setAcademicYearId(v ? Number(v) : 0)}
                options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])), label: pickText(a, ['academic_year', 'academicYear']) }))}
                placeholder="Academic Year"
              />
            </div>
            <div className="md:col-span-6">
              <label className="text-[12px] text-muted-foreground">Exam</label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => setExamId(v ? Number(v) : 0)}
                options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) }))}
                placeholder="Exam"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[12px] text-muted-foreground">Regulation Id</label>
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => setRegulationId(v ? Number(v) : 0)}
                options={regulations.map((r) => ({ value: String(pickNum(r, ['fk_regulation_id', 'regulationId'])), label: pickText(r, ['regulationCode', 'regulation_code']) || `R${pickNum(r, ['regulationId', 'fk_regulation_id'])}` }))}
                placeholder="Regulation"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Course Years *</label>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => setCourseYearId(v ? Number(v) : 0)}
                options={courseYears.map((y) => ({ value: String(pickNum(y, ['fk_course_year_id', 'courseYearId'])), label: pickText(y, ['course_year_name', 'courseYearName', 'course_year_code', 'courseYearCode']) }))}
                placeholder="Course Year"
              />
            </div>
            <div className="md:col-span-5">
              <label className="text-[12px] text-muted-foreground">Subject</label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => setSubjectId(v ? Number(v) : 0)}
                options={subjects.map((s) => ({ value: String(pickNum(s, ['fk_subject_id', 'subjectId'])), label: pickText(s, ['subjectCode', 'subject_code', 'subjectName', 'subject_name']) }))}
                placeholder="Subject"
              />
            </div>
            <div className="md:col-span-2">
              <Button className="h-8 px-3 text-[12px] w-full" onClick={getList} disabled={loading}>
                Get List
              </Button>
            </div>
          </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4">
            <DataTable
              rowData={rows}
              columnDefs={cols}
              pagination
              loading={loading}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search…',
                pdfDocumentTitle: 'Exam Question Paper',
              }}
              toolbarTrailing={(
                <Button
                  type="button"
                  size="sm"
                  className="h-[30px] px-3 text-[12px]"
                  onClick={() => {
                    setEditingRow(null)
                    setTemplateId(0)
                    resetForm()
                    setOpenAddModal(true)
                  }}
                >
                  + Exam Question Paper
                </Button>
              )}
            />
          </div>
        </div>
      )}

      <Dialog
        open={openAddModal}
        onOpenChange={(v) => {
          setOpenAddModal(v)
          if (!v) {
            setEditingRow(null)
            setTemplateId(0)
            setTemplateRows([])
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-[hsl(var(--primary))]">
              {editingRow ? 'Edit Question Paper' : 'Create Question Paper'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[13px]">
            <div className="md:col-span-3 space-y-1">
              <Label>Course</Label>
              <Input value={pickText(selectedCourse, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Academic Year</Label>
              <Input value={pickText(selectedAcademicYear, ['academic_year', 'academicYear']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-6 space-y-1">
              <Label>Exam</Label>
              <Input value={pickText(selectedExam, ['exam_name', 'examName']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Regulation Id</Label>
              <Input value={pickText(regulations.find((r) => pickNum(r, ['regulationId', 'fk_regulation_id']) === Number(regulationId)), ['regulationCode', 'regulation_code']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Course Years</Label>
              <Input value={pickText(selectedCourseYear, ['course_year_name', 'courseYearName', 'course_year_code', 'courseYearCode']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Subject</Label>
              <Input value={pickText(selectedSubject, ['subject_code', 'subjectCode', 'subject_name', 'subjectName']) || '-'} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Template</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Select
                    value={templateId ? String(templateId) : null}
                    onChange={(v) => setTemplateId(Number(v) || 0)}
                    options={templateRows.map((t) => ({
                      value: String(
                        pickNum(t, [
                          'fk_exam_questionpaper_template_id',
                          'examQuestionPaperTemplateId',
                          'questionPaperTemplateId',
                        ]),
                      ),
                      label:
                        pickText(t, [
                          'template_title',
                          'templateTitle',
                          'template_name',
                          'templateName',
                        ]) || '-',
                    }))}
                    placeholder={templateRows.length === 0 ? 'No template assigned' : 'Template'}
                    disabled={templateRows.length === 0}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0"
                  aria-label="View Template"
                  title="View Template"
                  disabled={!templateId}
                  onClick={() => {
                    if (!templateId) return
                    const params = new URLSearchParams({
                      examQuestionPaperTemplateId: String(templateId),
                    })
                    router.push(
                      `/admin-examination-management/evaluation-process/exam-question-paper-marks/view-template?${params.toString()}`,
                    )
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="md:col-span-12 border-t pt-3 mt-1" />

            <div className="md:col-span-6 space-y-1">
              <Label>Question Paper Title *</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperTitle}
                onChange={(e) => setForm((s) => ({ ...s, questionPaperTitle: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Question Paper Code *</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperCode}
                onChange={(e) => setForm((s) => ({ ...s, questionPaperCode: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Set Number</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.setNumber}
                onChange={(e) => setForm((s) => ({ ...s, setNumber: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Total Questions</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalQuestions}
                onChange={(e) => setForm((s) => ({ ...s, totalQuestions: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Total Marks</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalMarks}
                onChange={(e) => setForm((s) => ({ ...s, totalMarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Pass Marks</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.passMarks}
                onChange={(e) => setForm((s) => ({ ...s, passMarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Prepared Employee</Label>
              <Select
                value={form.preparedByEmpId ? String(form.preparedByEmpId) : null}
                onChange={(v) =>
                  setForm((s) => ({ ...s, preparedByEmpId: Number(v) || employeeId }))
                }
                options={preparedEmpOptions}
                placeholder="Prepared Employee"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Prepared Date</Label>
              <Input
                type="date"
                className="h-9 text-[12px]"
                value={form.preparedDate}
                onChange={(e) => setForm((s) => ({ ...s, preparedDate: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Question Paper Status</Label>
              <Select
                value={form.questionPaperStatus ?? null}
                onChange={(v) => setForm((s) => ({ ...s, questionPaperStatus: v ?? '' }))}
                options={[
                  { value: 'Prepared', label: 'Prepared' },
                  { value: 'In Review', label: 'In Review' },
                  { value: 'Approved', label: 'Approved' },
                ]}
              />
            </div>
            <div className="md:col-span-12 space-y-1">
              <Label>Status Comments</Label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.statusComments}
                onChange={(e) => setForm((s) => ({ ...s, statusComments: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((s) => ({ ...s, isActive: v === true, reason: v === true ? 'active' : s.reason }))
                }
              />
              <Label>Active</Label>
            </div>
            {!form.isActive && (
              <div className="md:col-span-8 space-y-1">
                <Label>Reason</Label>
                <Input
                  className="h-9 text-[12px]"
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddModal(false)}>Close</Button>
            <Button onClick={() => void saveQuestionPaper()} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(uploadRow)}
        onOpenChange={(v) => {
          if (!v) {
            setUploadRow(null)
            setUploadQpFile(null)
            setUploadAsFile(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] text-[hsl(var(--primary))]">
              Upload Question Paper &amp; Model Answer Paper
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-[13px]">
            {uploadRow ? (
              <p className="text-[12px] text-muted-foreground">
                {pickText(uploadRow, ['questionPaperTitle', 'questionpaper_title'])} (
                {pickText(uploadRow, ['questionPaperCode', 'questionpaper_code', 'paperCode']) || '-'})
              </p>
            ) : null}
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Question Paper</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="h-9 text-[12px] file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => setUploadQpFile(e.target.files?.[0] ?? null)}
              />
              {uploadQpFile ? (
                <p className="text-[11px] text-muted-foreground">Selected: {uploadQpFile.name}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px] font-semibold">Model Answer Paper</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="h-9 text-[12px] file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => setUploadAsFile(e.target.files?.[0] ?? null)}
              />
              {uploadAsFile ? (
                <p className="text-[11px] text-muted-foreground">Selected: {uploadAsFile.name}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadRow(null)
                setUploadQpFile(null)
                setUploadAsFile(null)
              }}
              disabled={uploading}
            >
              Close
            </Button>
            <Button onClick={() => void submitUpload()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageContainer>
  )
}
