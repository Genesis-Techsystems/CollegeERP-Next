'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '@/context/SessionContext'
import type { ColDef } from 'ag-grid-community'
import { Select } from '@/common/components/select'
import { Eye } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createExamQuestionPaper,
  downloadAndOpenQuestionPaperPdf,
  getAssignQuestionPaperTemplateList,
  getEvaluationExamFilters,
  getEvaluationExamRestBundle,
  getQuestionPaperTemplateViewRows,
  listEvaluationSubjects,
  listFinalizableQuestionPapers,
  markQuestionPaperPdfAvailability,
  updateExamQuestionPaper,
  uploadQuestionPaperFiles,
} from '@/services/evaluation-process'
import { clearProcGetCache } from '@/services/crud'
import { FilteredListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

/** Survives filter changes; never stores blob:/data: URLs (those die on refresh). */
const QP_PATH_CACHE_KEY = 'examQuestionPaperMarks.filePaths'
const isDurableFilePath = (path: string) =>
  Boolean(path) && !/^(blob:|data:)/i.test(path)

type QpPathCacheEntry = { qp?: string; as?: string; qpOk?: boolean; asOk?: boolean }
function readQpPathCache(): Record<string, QpPathCacheEntry> {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(QP_PATH_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, QpPathCacheEntry>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
function writeQpPathCache(
  id: number,
  opts: { qp?: string; as?: string; qpOk?: boolean; asOk?: boolean },
) {
  if (!id || typeof sessionStorage === 'undefined') return
  const nextQp = opts.qp && isDurableFilePath(opts.qp) ? opts.qp : ''
  const nextAs = opts.as && isDurableFilePath(opts.as) ? opts.as : ''
  if (!nextQp && !nextAs && opts.qpOk == null && opts.asOk == null) return
  const cache = readQpPathCache()
  const prev = cache[String(id)] ?? {}
  cache[String(id)] = {
    qp: nextQp || prev.qp,
    as: nextAs || prev.as,
    qpOk: opts.qpOk ?? prev.qpOk,
    asOk: opts.asOk ?? prev.asOk,
  }
  sessionStorage.setItem(QP_PATH_CACHE_KEY, JSON.stringify(cache))
}
function mergeRowFilePaths(row: AnyRow, cache: Record<string, QpPathCacheEntry>): AnyRow {
  const id = pickNum(row, [
    'pk_exam_questionpaper_id',
    'questionPaperId',
    'examQuestionPaperId',
    'exam_questionpaper_id',
    'id',
  ])
  const cached = id ? cache[String(id)] : undefined
  const qp =
    pickText(row, ['questionPaperPath', 'questionpaper_path']) ||
    cached?.qp ||
    ''
  const as =
    pickText(row, ['modelAnswerSheetPath', 'modelanswersheet_path']) ||
    cached?.as ||
    ''
  return {
    ...row,
    questionpaper_path: qp || row.questionpaper_path,
    questionPaperPath: qp || row.questionPaperPath,
    modelanswersheet_path: as || row.modelanswersheet_path,
    modelAnswerSheetPath: as || row.modelAnswerSheetPath,
    _qpPdfAvailable: Boolean(row._qpPdfAvailable || qp || cached?.qpOk),
    _asPdfAvailable: Boolean(row._asPdfAvailable || as || cached?.asOk),
  }
}

function rowHasQpPreview(row: AnyRow | undefined): boolean {
  if (!row) return false
  return Boolean(
    row._qpPdfAvailable ||
      pickText(row, ['questionPaperPath', 'questionpaper_path', 'questionPaper']),
  )
}
function rowHasAsPreview(row: AnyRow | undefined): boolean {
  if (!row) return false
  return Boolean(
    row._asPdfAvailable ||
      pickText(row, ['modelAnswerSheetPath', 'modelanswersheet_path', 'modelAnswerPaper']),
  )
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
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [editingRow, setEditingRow] = useState<AnyRow | null>(null)
  const [uploadRow, setUploadRow] = useState<AnyRow | null>(null)
  const [uploadQpFiles, setUploadQpFiles] = useState<File[]>([])
  const [uploadAsFiles, setUploadAsFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [templateRows, setTemplateRows] = useState<AnyRow[]>([])
  const [templateId, setTemplateId] = useState<number>(0)
  const [viewTemplateOpen, setViewTemplateOpen] = useState(false)
  const [viewTemplateTitle, setViewTemplateTitle] = useState('')
  const [viewTemplateMode, setViewTemplateMode] = useState<'questions' | 'template'>('template')
  const [viewTemplateLoading, setViewTemplateLoading] = useState(false)
  const [viewTemplateRows, setViewTemplateRows] = useState<AnyRow[]>([])
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
  const { user } = useSessionContext()
  const employeeId = Number(
    user?.employeeId ?? globalThis?.localStorage?.getItem('employeeId') ?? 0,
  )
  const organizationId = Number(
    user?.organizationId ?? globalThis?.localStorage?.getItem('organizationId') ?? 1,
  ) || 1
  /** Angular generalDetailId for Question Paper Status "Prepared". */
  const PREPARED_STATUS_CAT_DET_ID = 621
  const empNumber =
    String(globalThis?.localStorage?.getItem('empNumber') ?? '') ||
    String(user?.userName ?? '')
  const userName =
    String(user?.firstName ?? '') ||
    String(globalThis?.localStorage?.getItem('uName') ?? '') ||
    String(globalThis?.localStorage?.getItem('userName') ?? '') ||
    String(user?.userName ?? '')
  const preparedEmpLabel = userName
    ? empNumber
      ? `${empNumber} (${userName})`
      : userName
    : empNumber || `Employee ${employeeId}`
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
  const [formErrors, setFormErrors] = useState<Partial<Record<
    'questionPaperTitle' | 'questionPaperCode' | 'setNumber' | 'totalQuestions' | 'totalMarks' | 'passMarks' | 'statusComments',
    string
  >>>({})

  function clearFormError(key: keyof typeof formErrors) {
    setFormErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

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
    setFormErrors({})
  }

  async function saveQuestionPaper() {
    // Angular required (visible *): Title, Code, Set Number, Total Questions,
    // Total Marks, Pass Marks, Status Comments — show under each field.
    const nextErrors: typeof formErrors = {}
    if (!form.questionPaperTitle?.trim()) nextErrors.questionPaperTitle = 'Question Paper Title is required.'
    if (!form.questionPaperCode?.trim()) nextErrors.questionPaperCode = 'Question Paper Code is required.'
    if (!form.setNumber?.trim()) nextErrors.setNumber = 'Set Number is required.'
    if (!String(form.totalQuestions ?? '').trim()) nextErrors.totalQuestions = 'Total Questions is required.'
    if (!String(form.totalMarks ?? '').trim()) nextErrors.totalMarks = 'Total Marks is required.'
    if (!String(form.passMarks ?? '').trim()) nextErrors.passMarks = 'Pass Marks is required.'
    if (!form.statusComments?.trim()) nextErrors.statusComments = 'Status Comments is required.'
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!examId || !courseYearId || !subjectId) {
      toastError('Please select Exam, Course Year and Subject before saving.')
      return
    }
    setLoading(true)
    try {
      // Match Angular add-questionpaper-modal submit() payload for
      // domain/create/ExamQuestionPapers.
      const preparedDateIso = (() => {
        const raw = form.preparedDate || toDateOnlyISO(new Date())
        if (raw.includes('T')) return raw
        const [y, m, d] = raw.split('-').map(Number)
        if (!y || !m || !d) return new Date().toISOString()
        const now = new Date()
        return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString()
      })()
      const statusCatDetId = PREPARED_STATUS_CAT_DET_ID
      const payload = {
        organizationId: String(organizationId),
        regulationId: regulationId ?? undefined,
        subjectId,
        examId,
        courseYearId,
        questionPaperCode: form.questionPaperCode.trim(),
        questionPaperTitle: form.questionPaperTitle.trim(),
        setNumber: form.setNumber.trim(),
        passMarks: String(form.passMarks).trim(),
        totalMarks: String(form.totalMarks).trim(),
        totalQuestions: String(form.totalQuestions).trim(),
        preparedByEmpId: String(form.preparedByEmpId || employeeId || ''),
        preparedDate: preparedDateIso,
        questionPaperStatusCatDetId: statusCatDetId,
        statusComments: form.statusComments.trim(),
        isApproved: true,
        approvedByEmpId: '',
        approvedDate: '',
        isActive: form.isActive,
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

  // AG Grid caches the action-cell renderers, so a closure over filter state
  // goes stale (it captures the first render's null/0 ids). Read the current
  // selection from a ref that we refresh every render — this guarantees the
  // navigation carries the live subjectId/subjectCode to manage-questions /
  // question-bank (Angular passes these via parameters.manageQuestions).
  const navStateRef = useRef({
    courseId,
    academicYearId,
    examId,
    subjectId,
    regulationId,
    selectedSubject,
  })
  navStateRef.current = {
    courseId,
    academicYearId,
    examId,
    subjectId,
    regulationId,
    selectedSubject,
  }

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

  // Hydrate preparedByEmpId once user data is available -- handles the
  // SSR/hydration race where employeeId is 0 on first render.
  useEffect(() => {
    if (employeeId > 0) {
      setForm((s) => (s.preparedByEmpId === employeeId || editingRow ? s : { ...s, preparedByEmpId: employeeId }))
    }
  }, [employeeId, editingRow])

  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId, regulationId, courseYearId, subjectId])

  async function getList() {
    setLoading(true)
    try {
      // Angular getQuestionpapers — always hit network after mutations.
      clearProcGetCache('s_get_examevaluation_bycodes')
      const list = await listFinalizableQuestionPapers({
        employeeId,
        examId: examId ?? 0,
        courseYearId: courseYearId ?? 0,
        subjectId: subjectId ?? 0,
        regulationId: regulationId ?? 0,
        organizationId,
      }).catch(() => [])
      // list_questionpaper_list often nulls path fields; enrich + download probe
      // so the eye still shows when Angular's downloadQPAndAnswerSheet has a PDF.
      const cache = readQpPathCache()
      const merged = (Array.isArray(list) ? list : []).map((r) =>
        mergeRowFilePaths(r, cache),
      )
      const withPdf = await markQuestionPaperPdfAvailability(merged)
      const finalRows = withPdf.map((row) => {
        const id = pickNum(row, [
          'pk_exam_questionpaper_id',
          'questionPaperId',
          'examQuestionPaperId',
          'exam_questionpaper_id',
          'id',
        ])
        writeQpPathCache(id, {
          qp: pickText(row, ['questionPaperPath', 'questionpaper_path']),
          as: pickText(row, ['modelAnswerSheetPath', 'modelanswersheet_path']),
          qpOk: Boolean(row._qpPdfAvailable),
          asOk: Boolean(row._asPdfAvailable),
        })
        return row
      })
      setRows(finalRows)
      setHasFetched(true)
      // Angular's getTemplateDetails() runs after subject selection / list —
      // keep templates ready for "+ Exam Question Paper".
      await loadTemplatesForFilters()
    } finally {
      setLoading(false)
    }
  }

  function rowQuestionPaperId(row: AnyRow): number {
    // Angular UploadPapers uses pk_exam_questionpaper_id — prefer that first.
    return pickNum(row, [
      'pk_exam_questionpaper_id',
      'questionPaperId',
      'examQuestionPaperId',
      'exam_questionpaper_id',
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
    // Read the live filter selection from the ref (see navStateRef above) so
    // the ids are never the stale first-render values.
    const { courseId, academicYearId, examId, subjectId, regulationId, selectedSubject } =
      navStateRef.current
    const params = new URLSearchParams({
      examQuestionPaperId: String(rowQuestionPaperId(row)),
      questionPaperId: String(rowQuestionPaperId(row)),
      examQuestionPaperTemplateId: String(rowTemplateId(row)),
      pkEQPTid: String(rowTemplateId(row)),
      questionPaperTitle: pickText(row, ['questionPaperTitle', 'questionpaper_title']),
      questionpaper_title: pickText(row, ['questionPaperTitle', 'questionpaper_title']),
      questionPaperCode: pickText(row, ['questionPaperCode', 'questionpaper_code', 'paperCode']),
      examName: pickText(row, ['exam_name', 'examName']),
      // Angular derives subjectName/subjectCode from the selected subject
      // filter (exam-question-paper-marks.component getQuestionpapers), not
      // from the question-paper row -- the list proc doesn't return them.
      // Prefer the row when present, otherwise fall back to the filter.
      subjectName:
        pickText(row, ['subject_name', 'subjectName']) ||
        pickText(selectedSubject, ['subject_name', 'subjectName']),
      subjectCode:
        pickText(row, ['subject_code', 'subjectCode']) ||
        pickText(selectedSubject, ['subjectCode', 'subject_code']),
      totalmarks: String(pickNum(row, ['totalmarks', 'totalMarks'])),
      courseId: String(courseId ?? 0),
      academicYearId: String(academicYearId ?? 0),
      examId: String(examId ?? 0),
      subjectId: String(subjectId ?? 0),
      regulationId: String(regulationId ?? 0),
    })
    router.push(`${path}?${params.toString()}`)
  }
  function viewQuestions(row: AnyRow) {
    const tplId = rowTemplateId(row)
    const qpId = rowQuestionPaperId(row)
    const title =
      pickText(row, ['questionPaperTitle', 'questionpaper_title']) ||
      pickText(row, ['template_title', 'templateTitle']) ||
      ''
    if (tplId > 0) {
      void openViewTemplateModal(tplId, title, qpId, 'questions')
    } else {
      navigateWithRow(
        '/admin-examination-management/evaluation-process/exam-question-paper-marks/view-template',
        row,
      )
    }
  }

  async function openViewTemplateModal(
    tplId: number,
    title: string,
    qpId?: number,
    mode: 'questions' | 'template' = 'template',
  ) {
    setViewTemplateTitle(title)
    setViewTemplateMode(mode)
    setViewTemplateRows([])
    setViewTemplateOpen(true)
    setViewTemplateLoading(true)
    try {
      // Always call s_get_examquestionpaper_details (Angular view-template-modal).
      // Pass 0/null when no template selected — matches Angular network call.
      const rows = await getQuestionPaperTemplateViewRows(
        tplId > 0 ? tplId : null,
        qpId,
      ).catch(() => [])
      setViewTemplateRows(Array.isArray(rows) ? rows : [])
    } finally {
      setViewTemplateLoading(false)
    }
  }

  async function loadTemplatesForFilters(opts?: { notifyIfMissing?: boolean }): Promise<AnyRow[]> {
    if (!examId || !courseYearId || !regulationId || !subjectId) {
      setTemplateRows([])
      setTemplateId(0)
      return []
    }
    const tmpls = await getAssignQuestionPaperTemplateList({
      examId,
      courseYearId,
      regulationId,
      subjectId,
    }).catch(() => [])
    const tmplList = (Array.isArray(tmpls) ? tmpls : []).filter((t) => {
      const id = pickNum(t, [
        'fk_exam_questionpaper_template_id',
        'examQuestionPaperTemplateId',
        'questionPaperTemplateId',
      ])
      const title = pickText(t, [
        'template_title',
        'templateTitle',
        'template_name',
        'templateName',
      ])
      return id > 0 || !!title
    })
    setTemplateRows(tmplList)
    const firstId = pickNum(tmplList[0] ?? {}, [
      'fk_exam_questionpaper_template_id',
      'examQuestionPaperTemplateId',
      'questionPaperTemplateId',
    ])
    if (firstId > 0) setTemplateId(firstId)
    else setTemplateId(0)
    if (opts?.notifyIfMissing && (tmplList.length === 0 || firstId <= 0)) {
      toastError('Template not assigned for the selected subject')
    }
    return tmplList
  }
  function printQP(row: AnyRow) {
    // Angular Print QP navigates to /view-template (the print-friendly
    // template view) with the row context. Match that.
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/view-template',
      row,
    )
  }
  function printQA(row: AnyRow) {
    // Angular Print QA navigates to /print-qa with the row context.
    navigateWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa',
      row,
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
  /** Prefer Spring downloadQPAndAnswerSheet (base64) — same as Angular Network preview. */
  const openQpDownload = useCallback(
    async (row: AnyRow | undefined, kind: 'questionPaper' | 'modelAnswer') => {
      const id = rowQuestionPaperId(row ?? {})
      if (!id) {
        toastError('Question paper id is missing on this row.')
        return
      }
      try {
        await downloadAndOpenQuestionPaperPdf(id, kind)
        writeQpPathCache(id, {
          qpOk: kind === 'questionPaper' ? true : undefined,
          asOk: kind === 'modelAnswer' ? true : undefined,
        })
      } catch (error: any) {
        const msg = String(error?.message ?? 'Failed to open document.')
        if (/no records?/i.test(msg)) {
          toastError(
            kind === 'modelAnswer'
              ? 'Model answer PDF is not available for this paper.'
              : 'Question paper PDF is not available for this paper.',
          )
          return
        }
        toastError(msg)
      }
    },
    [],
  )

  /** Pull stored path(s) from upload API payload when list refresh lags. */
  function extractUploadedPaths(data: unknown): { qp: string; as: string } {
    const out = { qp: '', as: '' }
    if (!data) return out
    if (typeof data === 'string') {
      out.qp = data
      return out
    }
    if (Array.isArray(data)) {
      const first = data[0]
      if (typeof first === 'string') out.qp = first
      else if (first && typeof first === 'object') {
        out.qp = pickText(first as AnyRow, [
          'questionPaperPath',
          'questionpaper_path',
          'questionPaper',
          'path',
        ])
        out.as = pickText(first as AnyRow, [
          'modelAnswerSheetPath',
          'modelanswersheet_path',
          'modelAnswerPaper',
          'modelAnswerPath',
        ])
      }
      return out
    }
    if (typeof data === 'object') {
      const row = data as AnyRow
      out.qp = pickText(row, [
        'questionPaperPath',
        'questionpaper_path',
        'questionPaper',
        'path',
      ])
      out.as = pickText(row, [
        'modelAnswerSheetPath',
        'modelanswersheet_path',
        'modelAnswerPaper',
        'modelAnswerPath',
      ])
      // Some APIs return [{qpPath}, {asPath}] nested under data.result
      if (!out.qp && Array.isArray(row.result)) {
        return extractUploadedPaths(row.result)
      }
    }
    return out
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
    setUploadQpFiles([])
    setUploadAsFiles([])
  }

  async function submitUpload() {
    if (!uploadRow) return
    const id = rowQuestionPaperId(uploadRow)
    if (!id) {
      toastError('Question paper id is missing on this row.')
      return
    }
    if (uploadQpFiles.length === 0 && uploadAsFiles.length === 0) {
      toastError('Choose at least one file to upload.')
      return
    }
    setUploading(true)
    try {
      const result = await uploadQuestionPaperFiles({
        examQuestionPaperId: id,
        questionPapers: uploadQpFiles,
        modelAnswerPapers: uploadAsFiles,
      })
      const fromApi = extractUploadedPaths(result.data)
      writeQpPathCache(id, {
        qp: fromApi.qp,
        as: fromApi.as,
        qpOk: Boolean(fromApi.qp || uploadQpFiles.length > 0),
        asOk: Boolean(fromApi.as || uploadAsFiles.length > 0),
      })
      const msg = (result.message || '').trim()
      if (msg && !/no records?/i.test(msg) && result.success === false && !result.persisted) {
        toastError(msg)
      } else {
        toastSuccess(msg && !/no records?/i.test(msg) ? msg : 'Files uploaded.')
      }
      setUploadRow(null)
      setUploadQpFiles([])
      setUploadAsFiles([])
      // Angular UploadPapers success path → getQuestionpapers()
      // Probe downloadQPAndAnswerSheet so eye shows even when list paths stay null.
      await getList()
    } catch (error: any) {
      const msg = String(error?.message ?? 'Failed to upload files.')
      if (!/no records?/i.test(msg)) {
        toastError(msg)
      }
      try {
        await getList()
      } catch {
        /* ignore */
      }
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
          if (!rowHasQpPreview(p.data)) {
            return <span className="text-[11px] text-muted-foreground">No Docs Uploaded</span>
          }
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-blue-700"
              onClick={() => void openQpDownload(p.data, 'questionPaper')}
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
          if (!rowHasAsPreview(p.data)) {
            return <span className="text-[11px] text-muted-foreground">No Docs Uploaded</span>
          }
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-blue-700"
              onClick={() => void openQpDownload(p.data, 'modelAnswer')}
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
        minWidth: 290,
        width: 290,
        flex: 0,
        pinned: 'right',
        cellRenderer: (p: { data?: AnyRow }) => {
          const row = p.data ?? {}
          const hasTemplate = rowTemplateId(row) > 0
          return (
            <div className="flex items-center gap-1.5 flex-nowrap">
              {hasTemplate ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px] whitespace-nowrap shrink-0" onClick={() => manageQuestions(row)}>
                  Manage Question
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-[11px] whitespace-nowrap shrink-0" onClick={() => assignTemplate(row)}>
                  Assign Template
                </Button>
              )}
              {hasTemplate && (
                <Button size="sm" className="h-7 text-[11px] whitespace-nowrap shrink-0" onClick={() => uploadPapers(row)}>
                  Upload QP &amp; AS
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [router, openQpDownload],
  )

  return (
    <FilteredListPage
      title="Exam Question Paper"
      filters={(
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
              options={subjects.map((s) => ({
                value: String(pickNum(s, ['fk_subject_id', 'subjectId'])),
                label: pickText(s, ['subjectName', 'subject_name']) || pickText(s, ['subjectCode', 'subject_code']),
              }))}
              placeholder="Subject"
            />
          </div>
          <div className="md:col-span-2">
            <Button className="h-8 px-3 text-[12px] w-full" onClick={getList} disabled={loading}>
              Get List
            </Button>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
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
            resetForm()
            setForm((s) => ({ ...s, preparedByEmpId: employeeId }))
            setOpenAddModal(true)
            // Angular getTemplateDetails() when opening create with subject selected
            void loadTemplatesForFilters({ notifyIfMissing: true })
          }}
        >
          + Exam Question Paper
        </Button>
      )}
    >
      <Dialog
        open={openAddModal}
        onOpenChange={(v) => {
          setOpenAddModal(v)
          if (!v) {
            setEditingRow(null)
            // Keep templateRows / templateId loaded from Get List so the
            // next "+ Exam Question Paper" click still has them.
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? 'Edit Question Paper' : 'Create Question Paper'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[13px]">
            <div className="md:col-span-3 space-y-1">
              <Label className="text-[12px]">Course</Label>
              <Input value={pickText(selectedCourse, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-'} disabled className="h-9 text-[12px]" placeholder="Course" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label className="text-[12px]">Academic Year</Label>
              <Input value={pickText(selectedAcademicYear, ['academic_year', 'academicYear']) || '-'} disabled className="h-9 text-[12px]" placeholder="Academic Year" />
            </div>
            <div className="md:col-span-6 space-y-1">
              <Label className="text-[12px]">Exam</Label>
              <Input value={pickText(selectedExam, ['exam_name', 'examName']) || '-'} disabled className="h-9 text-[12px]" placeholder="Exam" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-[12px]">Regulation Id</Label>
              <Input value={pickText(regulations.find((r) => pickNum(r, ['regulationId', 'fk_regulation_id']) === Number(regulationId)), ['regulationCode', 'regulation_code']) || '-'} disabled className="h-9 text-[12px]" placeholder="Regulation Id" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label className="text-[12px]">Course Years</Label>
              <Input value={pickText(selectedCourseYear, ['course_year_name', 'courseYearName', 'course_year_code', 'courseYearCode']) || '-'} disabled className="h-9 text-[12px]" placeholder="Course Years" />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">Subject</Label>
              <Input value={pickText(selectedSubject, ['subject_name', 'subjectName']) || pickText(selectedSubject, ['subject_code', 'subjectCode']) || '-'} disabled className="h-9 text-[12px]" placeholder="Subject" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label className="text-[12px]">Template</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Select
                    value={templateId ? String(templateId) : null}
                    onChange={(v) => setTemplateId(Number(v) || 0)}
                    options={templateRows
                      .map((t) => {
                        const id = pickNum(t, [
                          'fk_exam_questionpaper_template_id',
                          'examQuestionPaperTemplateId',
                          'questionPaperTemplateId',
                        ])
                        const label =
                          pickText(t, [
                            'template_title',
                            'templateTitle',
                            'template_name',
                            'templateName',
                          ]) || (id > 0 ? `Template #${id}` : '')
                        return id > 0 && label
                          ? { value: String(id), label }
                          : null
                      })
                      .filter((o): o is { value: string; label: string } => o != null)}
                    placeholder={
                      templateRows.length === 0
                        ? 'No template assigned'
                        : 'Template'
                    }
                    disabled={
                      templateRows.filter(
                        (t) =>
                          pickNum(t, [
                            'fk_exam_questionpaper_template_id',
                            'examQuestionPaperTemplateId',
                            'questionPaperTemplateId',
                          ]) > 0,
                      ).length === 0
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0"
                  aria-label="View Template"
                  title="View Template"
                  onClick={() => {
                    const selected = templateRows.find(
                      (t) =>
                        pickNum(t, [
                          'fk_exam_questionpaper_template_id',
                          'examQuestionPaperTemplateId',
                          'questionPaperTemplateId',
                        ]) === Number(templateId),
                    )
                    const title =
                      pickText(selected ?? {}, [
                        'template_title',
                        'templateTitle',
                        'template_name',
                        'templateName',
                      ]) || ''
                    // Always call list_exam_questionpaper_details (Angular eye icon)
                    void openViewTemplateModal(templateId || 0, title)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="md:col-span-12 border-t pt-3 mt-1" />

            <div className="md:col-span-6 space-y-1">
              <Label className="text-[12px]">
                Question Paper Title <span className="text-red-600">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperTitle}
                onChange={(e) => {
                  setForm((s) => ({ ...s, questionPaperTitle: e.target.value }))
                  clearFormError('questionPaperTitle')
                }}
                placeholder="Question Paper Title"
              />
              {formErrors.questionPaperTitle ? (
                <p className="text-[11px] text-destructive">{formErrors.questionPaperTitle}</p>
              ) : null}
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label className="text-[12px]">
                Question Paper Code <span className="text-red-600">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperCode}
                onChange={(e) => {
                  setForm((s) => ({ ...s, questionPaperCode: e.target.value }))
                  clearFormError('questionPaperCode')
                }}
                placeholder="Question Paper Code"
              />
              {formErrors.questionPaperCode ? (
                <p className="text-[11px] text-destructive">{formErrors.questionPaperCode}</p>
              ) : null}
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label className="text-[12px]">
                Set Number <span className="text-red-600">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                value={form.setNumber}
                onChange={(e) => {
                  setForm((s) => ({ ...s, setNumber: e.target.value }))
                  clearFormError('setNumber')
                }}
                placeholder="Set Number"
              />
              {formErrors.setNumber ? (
                <p className="text-[11px] text-destructive">{formErrors.setNumber}</p>
              ) : null}
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">
                Total Questions <span className="text-red-600">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalQuestions}
                onChange={(e) => {
                  setForm((s) => ({ ...s, totalQuestions: e.target.value }))
                  clearFormError('totalQuestions')
                }}
                placeholder="Total Questions"
              />
              {formErrors.totalQuestions ? (
                <p className="text-[11px] text-destructive">{formErrors.totalQuestions}</p>
              ) : null}
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">
                Total Marks <span className="text-red-600">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalMarks}
                onChange={(e) => {
                  setForm((s) => ({ ...s, totalMarks: e.target.value }))
                  clearFormError('totalMarks')
                }}
                placeholder="Total Marks"
              />
              {formErrors.totalMarks ? (
                <p className="text-[11px] text-destructive">{formErrors.totalMarks}</p>
              ) : null}
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">
                Pass Marks <span className="text-red-600">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                value={form.passMarks}
                onChange={(e) => {
                  setForm((s) => ({ ...s, passMarks: e.target.value }))
                  clearFormError('passMarks')
                }}
                placeholder="Pass Marks"
              />
              {formErrors.passMarks ? (
                <p className="text-[11px] text-destructive">{formErrors.passMarks}</p>
              ) : null}
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">Prepared Employee</Label>
              <Select
                value={
                  form.preparedByEmpId
                    ? String(form.preparedByEmpId)
                    : employeeId > 0
                      ? String(employeeId)
                      : null
                }
                onChange={(v) =>
                  setForm((s) => ({ ...s, preparedByEmpId: Number(v) || employeeId }))
                }
                options={preparedEmpOptions}
                placeholder="Prepared Employee"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">Prepared Date</Label>
              <Input
                type="date"
                className="h-9 text-[12px] org-modal-date-input pr-10"
                value={form.preparedDate}
                onChange={(e) => setForm((s) => ({ ...s, preparedDate: e.target.value }))}
                placeholder="Prepared Date"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label className="text-[12px]">Question Paper Status</Label>
              <Select
                value={form.questionPaperStatus ?? null}
                onChange={(v) => setForm((s) => ({ ...s, questionPaperStatus: v ?? '' }))}
                options={[
                  { value: 'Prepared', label: 'Prepared' },
                  { value: 'In Review', label: 'In Review' },
                  { value: 'Approved', label: 'Approved' },
                ]}
                placeholder="Question Paper Status"
              />
            </div>
            <div className="md:col-span-12 space-y-1">
              <Label className="text-[12px]">
                Status Comments <span className="text-red-600">*</span>
              </Label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.statusComments}
                onChange={(e) => {
                  setForm((s) => ({ ...s, statusComments: e.target.value }))
                  clearFormError('statusComments')
                }}
                placeholder="Status Comments"
              />
              {formErrors.statusComments ? (
                <p className="text-[11px] text-destructive">{formErrors.statusComments}</p>
              ) : null}
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((s) => ({ ...s, isActive: v === true, reason: v === true ? 'active' : s.reason }))
                }
              />
              <Label className="text-[12px]">Active</Label>
            </div>
            {!form.isActive && (
              <div className="md:col-span-8 space-y-1">
                <Label className="text-[12px]">Reason</Label>
                <Input
                  className="h-9 text-[12px]"
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                  placeholder="Reason"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenAddModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => void saveQuestionPaper()} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(uploadRow)}
        onOpenChange={(v) => {
          if (!v) {
            setUploadRow(null)
            setUploadQpFiles([])
            setUploadAsFiles([])
          }
        }}
      >
        <DialogContent className="max-w-xl">
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
            <div className="flex items-center gap-3">
              <b className="shrink-0 w-44 text-[13px]">Question Paper :-</b>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,image/*"
                className="text-[12px] file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => setUploadQpFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            {uploadQpFiles.length > 0 ? (
              <p className="ml-44 -mt-2 text-[11px] text-muted-foreground">
                Selected: {uploadQpFiles.map((f) => f.name).join(', ')}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <b className="shrink-0 w-44 text-[13px]">Model Answer Paper :-</b>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,image/*"
                className="text-[12px] file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => setUploadAsFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            {uploadAsFiles.length > 0 ? (
              <p className="ml-44 -mt-2 text-[11px] text-muted-foreground">
                Selected: {uploadAsFiles.map((f) => f.name).join(', ')}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadRow(null)
                setUploadQpFiles([])
                setUploadAsFiles([])
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

      <Dialog open={viewTemplateOpen} onOpenChange={setViewTemplateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px] text-[hsl(var(--primary))]">
              {viewTemplateMode === 'questions' ? 'View Questions' : 'Template View'}
              {viewTemplateTitle ? <span className="text-slate-700"> - {viewTemplateTitle}</span> : null}
            </DialogTitle>
          </DialogHeader>
          <div className="text-[13px]">
            {viewTemplateLoading ? (
              <p className="py-6 text-center text-muted-foreground">Loading…</p>
            ) : viewTemplateRows.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No template details found.</p>
            ) : (
              <table className="w-full border-collapse" id="template-view-table">
                <tbody>
                  {viewTemplateRows.map((t, i) => {
                    const level1 = Number(t.level1no ?? 0)
                    const groupNo = Number(t.groupno ?? 0)
                    const subGroupNo = Number(t.subgroupno ?? 0)
                    const code = t.questioncode ?? null
                    const down = String(t.displaydowntext ?? '').trim()
                    const cells: React.ReactNode[] = []
                    if (level1 > 0 && groupNo === 0 && subGroupNo === 0) {
                      cells.push(
                        <tr key={`vt-${i}-title`}>
                          <td colSpan={4} className="text-center font-semibold py-1">
                            {t.QuestionTitle}
                          </td>
                        </tr>,
                      )
                    }
                    if (level1 > 0 && groupNo > 0 && subGroupNo === 0) {
                      cells.push(
                        <tr key={`vt-${i}-grp`}>
                          <td className="py-1 pr-2"><b>{groupNo}.</b></td>
                          <td className="py-1 pr-2">&nbsp;&nbsp;</td>
                          <td className="w-full py-1">{t.QuestionTitle}</td>
                          <td className="py-1 pl-2 text-right"><b>{t.question_marks}</b></td>
                        </tr>,
                      )
                    }
                    if (code != null) {
                      cells.push(
                        <tr key={`vt-${i}-code`}>
                          <td className="py-1 pr-2 align-top">&nbsp;&nbsp;</td>
                          <td className="py-1 pr-2 align-top">{code})</td>
                          <td
                            className="w-full py-1 align-top"
                            dangerouslySetInnerHTML={{
                              __html: String(t.question ?? t.QuestionTitle ?? ''),
                            }}
                          />
                          <td className="py-1 pl-2 text-right align-top">
                            {t.individual_question_marks}
                          </td>
                        </tr>,
                      )
                    }
                    if (down) {
                      cells.push(
                        <tr key={`vt-${i}-down`}>
                          <td colSpan={4} className="text-center py-1">
                            <b>{down}</b>
                          </td>
                        </tr>,
                      )
                    }
                    return cells
                  })}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTemplateOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </FilteredListPage>
  )
}
