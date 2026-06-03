/**
 * Evaluation module service layer.
 *
 * Mirrors Angular: college_erp_evaluation/src/app/services/crud.service.ts
 * and Angular constants in src/app/common/constants.ts for evaluation endpoints.
 *
 * All calls route through /api/proxy/ — never call Spring Boot directly.
 */

import { crud, domainUpdate, putDetails, uploadFile } from '@/services/crud'
import { EXAM_EVAL_API } from '@/config/constants/api'
import { parseApiError } from '@/lib/errors'
import { txt } from '@/common/utils/data-helpers'
import { getUnivExamFiltersByType } from '@/services/pre-examination'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvaluatorDetail {
  examEvaluatorProfileDetId: number
  examEvaluatorProfileId: number
  validityStartDate: string
  validityEndDate: string
  noOfStudentsAssigned: number | null
  noOfEvaluationsCompleted: number | null
  evaluationsPending: number | null
  courseName: string
  subjectName: string
  subjectCode: string
  examSubjectId?: number
}

export interface StudentAnswerPaper {
  examEvaluationAssignmentId: number
  studentAnswerPaperId: number
  studentAnswerPath: string | null
  omrSerialNo: string
  evaluatedTotalMarks: number | null
  answerSheetCheckDate: string | null
  evaluatedAnswerPaperPath: string | null
  /** Numeric status code: 626=New, 627=Assigned, 628=InProgress, 629=Evaluated, 631=Finalized, 632=Reject */
  evaluationStatusCatDetId: number
  /** String status code: 'New', 'Assigned', 'InProgress', 'Evaluated', 'Finalised', 'Reject' */
  evaluationStatusCatDetCode: string
  /** PDF page range restriction, e.g. "0,1" — from GeneralSettings EVALPDFSTARTEND */
  settingValue?: string
}

export interface QuestionMark {
  questionPaperMarksId: number
  /** Question number label, e.g. "1", "2a" */
  qno: string
  /** Question code for grouping/colour */
  qvalue: string
  calculated_total_marks: number
  question: string
  /** Saved StudentEvaluationPage id — 0 if not yet saved */
  studentEvaluationPageId: number
  isNotAnswered: boolean
  /** Max marks for this question */
  questionMarks: number
  /** PART level: 1=A, 2=B, 3=C etc. */
  level1No: number
  groupNo: number
  /** Marks awarded by evaluator; null = not yet marked */
  answeredMarks: number | null
  color: string
  rgb_color?: string
  /** 1 = not yet evaluated, 0 = evaluated */
  no_action_yet: number
  isCheckedForNotAnswered?: boolean
  error_message?: string
  /**
   * Saved mark-stamp position for restoration on page reload.
   * Coordinates are in BASE_SCALE (1.5) canvas pixel space, matching Angular.
   * Null when the question has no saved stamp (e.g. Not Answered, or never placed).
   */
  mbtn_x: number | null
  mbtn_y: number | null
  mbtn_pageNum: number | null
}

export interface EvalAssignmentDetail {
  examEvaluationAssignmentId: number
  evaluationStatusCatDetId: number
  omrSerialNo: string
  evaluationEndDate: string | null
  evaluationStartDate: string | null
  evaluatedTotalMarks: number | null
  examEvaluatorProfileDetId: number
  evaluationTime: number | null
  studentanswerPath?: string
  /** MinIO-relative path to the question paper PDF (for "View Question" button). */
  questionPaperPath?: string
  /** MinIO-relative path to the model/sample answer sheet PDF. */
  modelAnswerPaperPath?: string
  /** Maximum marks for the question paper — from questionpaper_total_marks */
  qpTotalMarks?: number
}

export interface ExamQuestionPaper {
  pk_exam_questionpaper_id: number
  questionpaper_title: string
  questionpaper_code: string
  setnumber: number
  totalquestions: number
  totalmarks: number
  passmarks: number
  PrepareByEmp?: string
  questionPaperPath?: string
  modelAnswerSheetPath?: string
  fk_exam_questionpaper_template_id?: number
  isActive: boolean
  subject_code?: string
  subject_name?: string
  exam_name?: string
  fk_subject_id?: number
  fk_exam_id?: number
  fk_regulation_id?: number
  fk_course_id?: number
}

export interface EvalTemplate {
  examQpTemplateId: number
  templateTitle: string
  totalmarks: number
  templateDescription?: string
  templateStatusId?: number
  isActive: boolean
}

// ─── Evaluator Dashboard ──────────────────────────────────────────────────────

/** Raw row shape returned by exam_evaluator_profileDetails array */
interface RawEvalProfileDet {
  examEvaluatorProfileDetId: number
  examEvaluatorProfileId?: number
  subjectCode: string
  noOfStudentsAssigned: number | null
  noOfEvaluationsCompleted: number | null
  validityStartDate: string | null
  validityEndDate: string | null
}

/** Raw row shape returned by subject_details array */
interface RawSubjectDetail {
  subjectCode: string
  subjectName: string
  courseName: string
}

/** Raw top-level profile returned by exam_evaluatorProfiles_details */
interface RawEvalProfile {
  examEvaluatorProfileId: number
}

/** Raw data envelope from the getevaluatordetails endpoint */
interface RawEvaluatorDashboard {
  exam_evaluator_profileDetails: RawEvalProfileDet[]
  subject_details: RawSubjectDetail[]
  /** May be a single object or array of one */
  exam_evaluatorProfiles_details: RawEvalProfile | RawEvalProfile[]
}

/**
 * Fetches evaluator's subject assignments and joins the three raw arrays
 * exactly as Angular does (loop subjects → sum up profile rows per subjectCode).
 *
 * Angular reference: evaluation-dashboard.component.ts getEvaluatorDetails()
 */
export async function getEvaluatorDashboard(userId: number | string): Promise<EvaluatorDetail[]> {
  const raw = await crud.fetchDetails<RawEvaluatorDashboard>(EXAM_EVAL_API.GET_EVALUATOR_DETAILS, {
    userId: String(userId),
  })

  const profileDets: RawEvalProfileDet[] = Array.isArray(raw?.exam_evaluator_profileDetails)
    ? raw.exam_evaluator_profileDetails
    : []
  const subjects: RawSubjectDetail[] = Array.isArray(raw?.subject_details)
    ? raw.subject_details
    : []
  const profileRaw = raw?.exam_evaluatorProfiles_details
  const profile: RawEvalProfile | null = profileRaw
    ? Array.isArray(profileRaw)
      ? (profileRaw[0] ?? null)
      : profileRaw
    : null

  const result: EvaluatorDetail[] = []

  for (const subject of subjects) {
    // Find all profile-detail rows for this subject
    const matching = profileDets.filter((x) => x.subjectCode === subject.subjectCode)

    let examEvaluatorProfileDetId = 0
    let sa = 0
    let ec = 0
    let validityStartDate = ''
    let validityEndDate = ''

    for (const row of matching) {
      examEvaluatorProfileDetId = row.examEvaluatorProfileDetId
      sa += row.noOfStudentsAssigned ?? 0
      ec += row.noOfEvaluationsCompleted ?? 0
      validityStartDate = row.validityStartDate ?? ''
      validityEndDate = row.validityEndDate ?? ''
    }

    // Angular skips subjects where total assigned === 0
    if (sa === 0) continue

    result.push({
      examEvaluatorProfileDetId,
      examEvaluatorProfileId: profile?.examEvaluatorProfileId ?? 0,
      validityStartDate,
      validityEndDate,
      noOfStudentsAssigned: sa,
      noOfEvaluationsCompleted: ec,
      evaluationsPending: sa - ec,
      courseName: subject.courseName,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
    })
  }

  return result
}

// ─── Assigned Answer Papers ───────────────────────────────────────────────────

/** Raw row returned by the getstudentanswerpapers endpoint */
interface RawAnswerPaperRow {
  exam_evauation_assignment_details: {
    examEvaluationAssignmentId: number
    studentAnswerPaperId: number
    evaluatedTotalMarks: number | null
    answerSheetCheckDate: string | null
    evaluatedAnswerPaperPath: string | null
    evaluationStatusCatDetId: number
    evaluationStatusCatDetCode: string
  }
  exam_std_answer_paper_details: {
    studentAnswerPath: string | null
    omrSerialNo: string
  }
}

/**
 * Fetches list of student answer papers assigned to an evaluator.
 * Angular: getDetailsByRequest(getstudentanswerpapersUrl, '', { examEvaluatorProfileId, examEvaluatorProfileDetId })
 *
 * NOTE: API returns an array where each element has two nested sub-objects
 * that must be merged. See Angular evaluator-assigned-answer-papers.component.ts line 110-150.
 * Note the typo "evauation" in the key name — matches backend response.
 */
export async function getStudentAnswerPapers(
  examEvaluatorProfileId: number,
  examEvaluatorProfileDetId: number,
  settingValue?: string,
): Promise<StudentAnswerPaper[]> {
  const raw = await crud.fetchDetails<RawAnswerPaperRow[]>(
    EXAM_EVAL_API.GET_STUDENT_ANSWER_PAPERS,
    { examEvaluatorProfileId, examEvaluatorProfileDetId },
  )
  if (!Array.isArray(raw)) return []

  const result: StudentAnswerPaper[] = []

  for (const row of raw) {
    const asgn = row?.exam_evauation_assignment_details
    const paper = row?.exam_std_answer_paper_details
    if (!asgn || !paper) continue

    let statusId = asgn.evaluationStatusCatDetId
    const statusCode = asgn.evaluationStatusCatDetCode

    // Angular flags rows with missing PDF path with the sentinel 'Path'
    // so they show a distinct state — we preserve the original statusId here
    // and let the page decide how to handle null studentAnswerPath.
    if (paper.studentAnswerPath == null) {
      statusId = asgn.evaluationStatusCatDetId
    }

    result.push({
      examEvaluationAssignmentId: asgn.examEvaluationAssignmentId,
      studentAnswerPaperId: asgn.studentAnswerPaperId,
      studentAnswerPath: paper.studentAnswerPath,
      omrSerialNo: paper.omrSerialNo,
      evaluatedTotalMarks: asgn.evaluatedTotalMarks,
      answerSheetCheckDate: asgn.answerSheetCheckDate,
      evaluatedAnswerPaperPath: asgn.evaluatedAnswerPaperPath,
      evaluationStatusCatDetId: statusId,
      evaluationStatusCatDetCode: statusCode,
      settingValue,
    })
  }

  // Sort ascending by status code (same as Angular)
  result.sort((a, b) => a.evaluationStatusCatDetId - b.evaluationStatusCatDetId)

  return result
}

// ─── Answer Paper PDF (base64) ────────────────────────────────────────────────

/**
 * Fetches the student answer paper PDF as a base64 string.
 * Angular: getBase64String(sheetDataUrl, '', { studentAnswerPaperId })
 * Returns a base64-encoded PDF string.
 */
export async function getAnswerPaperBase64(studentAnswerPaperId: number): Promise<string> {
  // Angular: getBase64String(sheetDataUrl, '', [{ paramName: 'id=', paramValue: studentAnswerPaperId }])
  // URL format: /sheetData?id={studentAnswerPaperId}
  //
  // NOTE: raw fetch is intentional here — the backend returns res.text() (a JSON-encoded string),
  // NOT a standard ApiResponse<T>. crud.fetchDetails() calls res.json() which would fail.
  const res = await fetch(
    `/api/proxy/${EXAM_EVAL_API.SHEET_DATA}?id=${studentAnswerPaperId}`,
  )
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
  // Backend returns JSON as text: { success: true, message: "<base64>" }
  // Angular: getBase64String uses responseType:'text', then JSON.parse(res).message
  const text = await res.text()
  let base64: string
  try {
    const parsed = JSON.parse(text) as { success?: boolean; message?: string }
    base64 = parsed.message ?? ''
  } catch {
    // Fallback: treat the whole response as raw base64
    base64 = text
  }

  // Strip whitespace and any data URL prefix (mirrors Angular's loadPDF logic)
  base64 = base64.replace(/\s/g, '')
  const dataUrlPrefix = 'data:application/pdf;base64,'
  if (base64.startsWith(dataUrlPrefix)) {
    base64 = base64.slice(dataUrlPrefix.length)
  }

  // Normalize URL-safe base64 to standard base64 (atob requires standard)
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/')

  // Pad to a multiple of 4
  const pad = base64.length % 4
  if (pad === 2) base64 += '=='
  else if (pad === 3) base64 += '='

  return base64
}

// ─── Evaluation Settings ──────────────────────────────────────────────────────

/**
 * Fetches a GeneralSettings value by code (e.g. 'EVALPDFSTARTEND', 'MarksIntervals').
 * Returns the first matching setting's value, or null if not found.
 */
export async function getEvalSetting(settingCode: string): Promise<string | null> {
  const rows = await crud.list<{ settingValue: string; settingCode: string }>(
    'GeneralSettings',
    `settingCode==${settingCode}.and.isActive==true`,
  )
  return rows[0]?.settingValue ?? null
}

// ─── Question Paper Draft Marks (Procedure) ───────────────────────────────────

// Raw response shapes from s_get_examquestionpaper_details_new
// Angular field names are snake_case — must be mapped to camelCase interface

interface RawQpMark {
  pk_questionpaper_marks_id: number
  questionnumber: string
  questioncode: string
  calculated_total_marks: number | null
  question: string
  max_question_marks: number
  lvl: number
  grp: number
  evaluated_marks: number | null
  rgb_color: string | null
  error_message: string | null
  no_action_yet: number
  mbtn_pk_std_evaluationpage_id: number | null
  isnotans_pk_std_evaluationpage_id: number | null
  // Marks-button annotation position (for stamp restoration on reload)
  mbtn_x_axis: number | null
  mbtn_y_axis: number | null
  mbtn_pagenumber: number | null
  mbtn_iconvalue: number | null
}

interface RawAssignDetail {
  fk_evaluationstatus_catdet_id: number
  omr_serial_no: string
  evaluation_enddate: string | null
  evaluationtime_sec: number | null
  studentanswer_path: string | null
  questionpaper_path?: string | null
  modelanswersheet_path?: string | null
  questionpaper_total_marks?: number
}

function mapRawQuestion(x: RawQpMark, assignmentId: number): QuestionMark {
  const hasMarks = x.mbtn_pk_std_evaluationpage_id != null
  const isNotAnswered = x.isnotans_pk_std_evaluationpage_id != null
  return {
    questionPaperMarksId: x.pk_questionpaper_marks_id,
    qno: x.questionnumber,
    qvalue: x.questioncode,
    calculated_total_marks: x.calculated_total_marks ?? 0,
    question: x.question,
    studentEvaluationPageId: x.mbtn_pk_std_evaluationpage_id ?? x.isnotans_pk_std_evaluationpage_id ?? 0,
    isNotAnswered,
    questionMarks: x.max_question_marks,
    level1No: x.lvl,
    groupNo: x.grp,
    // Angular: answeredMarks set from x.evaluated_marks when marks exist, else 0/null
    answeredMarks: hasMarks ? (x.evaluated_marks ?? 0) : (isNotAnswered ? 0 : null),
    // Angular: '#009688' default teal, '#96b9b5' once marked
    color: (hasMarks || isNotAnswered) ? '#96b9b5' : '#009688',
    rgb_color: x.rgb_color ?? undefined,
    no_action_yet: x.no_action_yet,
    isCheckedForNotAnswered: false,
    error_message: x.error_message ?? undefined,
    // Mark-stamp position — present only when a stamp was previously saved
    mbtn_x: x.mbtn_x_axis ?? null,
    mbtn_y: x.mbtn_y_axis ?? null,
    mbtn_pageNum: x.mbtn_pagenumber ?? null,
  }
}

function mapRawAssignment(x: RawAssignDetail, assignmentId: number): EvalAssignmentDetail {
  return {
    examEvaluationAssignmentId: assignmentId,
    evaluationStatusCatDetId: x.fk_evaluationstatus_catdet_id,
    omrSerialNo: x.omr_serial_no,
    evaluationEndDate: x.evaluation_enddate ?? null,
    evaluationStartDate: null, // not in result[1] response
    evaluatedTotalMarks: null,
    examEvaluatorProfileDetId: 0,
    evaluationTime: x.evaluationtime_sec ?? null,
    studentanswerPath: x.studentanswer_path ?? undefined,
    questionPaperPath: x.questionpaper_path ?? undefined,
    modelAnswerPaperPath: x.modelanswersheet_path ?? undefined,
    qpTotalMarks: x.questionpaper_total_marks,
  }
}

/**
 * Fetches question paper structure and any saved draft marks for an assignment.
 * Angular: dataFromProc(getExamQuestionPaperDetailsProcUrl,
 *   s_get_examquestionpaper_details_new,  ← NOTE: _new variant
 *   [{ in_flag, in_orgid, in_exam_evaluationassignment_id }])
 *
 * Returns:
 *   [0] → QuestionMark[] with all fields properly mapped from snake_case
 *   [1] → EvalAssignmentDetail[] (assignment header)
 */
export async function getExamQpDraftMarks(params: {
  examEvaluationAssignmentId: number
  orgId?: number
}): Promise<[QuestionMark[], EvalAssignmentDetail[]]> {
  // Angular URL: getAllRecords/s_get_examquestionpaper_details  (NO _new suffix)
  // "_new" is the in_flag value. All params from PROCCONSTANTS must be sent with defaults.
  const raw = await crud.getAllRecords<{ result: unknown[][] }>('s_get_examquestionpaper_details', {
    in_flag: 'list_exam_questionpaper_draftmarks_new',
    in_orgid: params.orgId ?? 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_questionpaper_template_id: 0,
    in_exam_questionpaper_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_exam_evaluationassignment_id: params.examEvaluationAssignmentId,
    in_exam_id: 0,
    in_course_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
  })

  // body.data for proc calls is { result: [[...], [...]] }
  // Angular: res.data.result[0] = questions, res.data.result[1][0] = assignment header
  const sets: unknown[][] = raw?.result ?? []
  const rawQuestions = (sets[0] ?? []) as RawQpMark[]
  const rawDetails = (sets[1] ?? []) as RawAssignDetail[]

  const questions = rawQuestions.map((x) => mapRawQuestion(x, params.examEvaluationAssignmentId))
  const details = rawDetails.map((x) => mapRawAssignment(x, params.examEvaluationAssignmentId))

  return [questions, details]
}

// ─── Update Evaluation Assignment Start Date ──────────────────────────────────

/**
 * Records the timestamp when an evaluator first opens an assignment.
 * Angular: UpdateDetailsByRequest(updateExamEvaluationAssignmentsStartDateUrl, PUT, { id }, { evaluationStartDate })
 */
export async function updateEvalAssignmentStartDate(
  examEvaluationAssignmentId: number,
  evaluationStartDate: string,
): Promise<void> {
  await putDetails(
    EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENTS_START_DATE,
    { evaluationStartDate },
    { examEvaluationAssignmentId },
  )
}

// ─── Update Evaluation Assignment (save/submit) ───────────────────────────────

/**
 * Saves evaluation progress or submits final evaluation.
 * Angular: UpdateDetailsByRequest(updateExamEvaluationAssignmentsUrl, PUT, { id }, payload)
 */
export async function updateEvalAssignment(
  examEvaluationAssignmentId: number,
  data: {
    evaluationStatusCatDetId?: number
    evaluatedTotalMarks?: number
    evaluationTime?: number
    evaluatedAnswerPaperPath?: string
  },
): Promise<void> {
  await putDetails(
    EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENTS,
    data,
    { examEvaluationAssignmentId },
  )
}

// ─── Save Student Evaluation Pages (annotations) ─────────────────────────────

/**
 * Saves the evaluator's marks/annotations for all pages.
 * Angular: postDetailsByRequest(addExamStudentEvaluationPagesList, ...)
 *
 * Two distinct shapes — DO NOT merge them. The backend proc
 * `s_get_examquestionpaper_details` keys `mbtn_*` columns off `icontype = 'marksBtn'`,
 * so any other iconType value gets written but never returned on reload.
 *
 * - MarkStampPayload  → a placed mark stamp (Angular evaluation.component.ts:676-728 + :1105)
 * - NotAnsweredPayload → questions flagged Not Answered (Angular :1074-1097)
 */
export interface MarkStampPayload {
  isActive: true
  questionPaperMarksId: number
  iconId: 2
  iconValue: number
  iconType: 'marksBtn'
  pageNumber: number
  x_Axis: number
  y_Axis: number
  marks: number
  examEvaluationAssignmentId: number
  studentAnswerPaper: null
  studentEvaluationPagePath: null
  isBlankPage: false
  isViewed: true
  isNotAnswered: false
  comments: null
}

export interface NotAnsweredPayload {
  questionPaperMarksId: number
  qno: string
  qvalue: string
  calculated_total_marks: number
  question: string
  studentEvaluationPageId: number
  isNotAnswered: true
  questionMarks: number
  level1No: number
  groupNo: number
  answeredMarks: number | null
  color: string
  error_message: string | null
  rgb_color: string | null
  isCheckedForNotAnswered: boolean
  no_action_yet: number
  pageNumber: null
  x_Axis: null
  y_Axis: null
  isActive: true
  marks: null
  examEvaluationAssignmentId: number
  studentAnswerPaper: null
  studentEvaluationPagePath: null
  isBlankPage: false
  isViewed: true
  comments: null
}

export type EvalPagePayload = MarkStampPayload | NotAnsweredPayload

export async function saveStudentEvalPages(pages: EvalPagePayload[]): Promise<void> {
  await crud.postDetails(EXAM_EVAL_API.ADD_STUDENT_EVAL_PAGES, pages)
}

// ─── Add Final Evaluation Papers ──────────────────────────────────────────────

/**
 * Marks an evaluation as complete and links the evaluated paper.
 * Angular: postDetailsByRequest(addfinalevaluationpapersUrl, ...)
 */
export async function addFinalEvalPapers(data: {
  examEvaluationAssignmentId: number
  studentAnswerPaperId: number
  evaluatedTotalMarks: number
  examEvaluatorProfileDetId?: number
}): Promise<void> {
  await crud.postDetails('addfinalevaluationpapers', data)
}

// ─── Update Evaluations Completed Count ──────────────────────────────────────

/**
 * Increments the completed count for an evaluator profile detail.
 * Angular: UpdateDetailsByPayload(updateEvaluationsCompletedCountUrl, PUT, payload)
 */
export async function updateEvalsCompletedCount(examEvaluatorProfileDetId: number): Promise<void> {
  await putDetails(EXAM_EVAL_API.UPDATE_EVALS_COMPLETED_COUNT, { examEvaluatorProfileDetId })
}

// ─── Save Final Evaluated PDF (multipart upload) ─────────────────────────────

/**
 * Uploads the final annotated PDF after evaluation is complete.
 * Angular: postDetailsByRequest(saveFinalExamStdEvaluationpdfUrl, ...) with FormData
 * containing the PDF file + examEvaluationAssignmentId (evaluation.component.ts:1399).
 */
export async function saveFinalEvalPdf(
  examEvaluationAssignmentId: number,
  file: File | Blob,
  filename: string,
): Promise<void> {
  const formData = new FormData()
  // Angular sends a File; Blob is accepted if a filename is supplied.
  if (file instanceof File) formData.append('file', file)
  else formData.append('file', file, filename)
  formData.append('examEvaluationAssignmentId', String(examEvaluationAssignmentId))
  await uploadFile(EXAM_EVAL_API.SAVE_FINAL_EVAL_PDF, formData)
}

// ─── Finalize Evaluation Marks (Proc) ────────────────────────────────────────

/**
 * Finalizes marks for an evaluation assignment via stored procedure.
 * Angular: dataFromProc(sPopExamQuestionPaperDetailsProcUrl, s_pop_exam_questionpaper_details,
 *   [{ in_flag: 'exam_questionpaper_finalmarks_update', in_exam_evaluationassignment_id }])
 *
 * Called as Step 3 of finishPaper() — after saving the annotated PDF.
 * Calculates totals, sets final status, etc. on the server.
 */
export async function finalizeEvalMarks(examEvaluationAssignmentId: number): Promise<void> {
  await crud.getAllRecords('s_pop_exam_questionpaper_details', {
    in_flag: 'exam_questionpaper_finalmarks_update',
    in_exam_evaluationassignment_id: examEvaluationAssignmentId,
  })
}

// ─── Reject / UFM (Domain Update) ────────────────────────────────────────────

/**
 * Rejects an evaluation assignment.
 * Angular: UpdateDetailsByRequest(ExamEvaluationAssignmentsUrl, 'domain/update/',
 *   query=examEvaluationAssignmentId=={id}, payload)
 *
 * Uses domain update (not the custom update endpoint) with the full payload
 * including isUfm:false to distinguish from UFM.
 */
export async function rejectEvalAssignment(
  examEvaluationAssignmentId: number,
  data: {
    evaluationStatusCatDetId: number
    omrSerialNo?: string
    evaluationTime: number
    evaluatedTotalMarks?: number | null
    answerSheetCheckDate: string
    evaluationStartDate?: string | null
    evaluationEndDate: string
    isUfm: false
    ufmReason: ''
    evaluatedAnswerPaperPath?: null
    isActive: true
    reason: string
  },
): Promise<void> {
  await domainUpdate('ExamEvaluationAssignments', 'examEvaluationAssignmentId', examEvaluationAssignmentId, data)
}

/**
 * Marks an evaluation assignment as UFM (Unfair Means).
 * Angular: UpdateDetailsByRequest(ExamEvaluationAssignmentsUrl, 'domain/update/',
 *   query=examEvaluationAssignmentId=={id}, payload)
 *
 * Same endpoint as reject but isUfm:true and ufmReason populated.
 */
export async function ufmEvalAssignment(
  examEvaluationAssignmentId: number,
  data: {
    evaluationStatusCatDetId: number
    omrSerialNo?: string
    evaluationTime: number
    evaluatedTotalMarks?: number | null
    answerSheetCheckDate: string
    evaluationStartDate?: string | null
    evaluationEndDate: string
    isUfm: true
    ufmReason: string
    evaluatedAnswerPaperPath?: null
    isActive: true
    reason: string
  },
): Promise<void> {
  await domainUpdate('ExamEvaluationAssignments', 'examEvaluationAssignmentId', examEvaluationAssignmentId, data)
}

// ─── Delete Evaluation Mark (Proc) ────────────────────────────────────────────

/**
 * Removes a specific question's marks from an evaluation via stored procedure.
 * Angular: dataFromProc(sPopExamQuestionPaperDetailsProcUrl, ..., { in_flag: 'delete_question', ... })
 */
export async function deleteEvalMark(
  examEvaluationAssignmentId: number,
  questionPaperMarksId: number,
): Promise<void> {
  await crud.getAllRecords('s_pop_exam_questionpaper_details', {
    in_flag: 'delete_question',
    in_exam_evaluationassignment_id: examEvaluationAssignmentId,
    in_questionpaper_marks_id: questionPaperMarksId,
  })
}

// ─── Admin: Exam Filters for Question Paper Management ────────────────────────

/**
 * Fetches cascading filter data (courses, exams, subjects, regulations) for admin pages.
 * Angular: dataFromProc(getExamFiltersBycodeUrl, ..., { in_flag: 'univ_exam_inep_filters' })
 */
export async function getExamFiltersForQp(params: {
  universityId?: number
  courseId?: number
  examId?: number
  regulationId?: number
  subjectId?: number
  employeeId?: number
  roleId?: number
}): Promise<unknown[][]> {
  const raw = await crud.getAllRecords<{ result: unknown[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_inep_filters',
    in_flag_type: 'QUESTION_SETTER',
    in_university_id: params.universityId ?? 0,
    in_course_id: params.courseId ?? 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId ?? 0,
    in_academic_year_id: 0,
    in_regulation_id: params.regulationId ?? 0,
    in_subject_id: params.subjectId ?? 0,
    in_loginuser_empid: params.employeeId ?? 0,
    in_loginuser_roleid: params.roleId ?? 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 'REGSUP',
  })
  // body.data for proc calls is { result: [[...], [...]] }
  return raw?.result ?? []
}

// ─── Admin: Get Question Paper List ──────────────────────────────────────────

/**
 * Fetches question papers for a given exam/subject/regulation combination.
 * Angular: dataFromProc(getExamEvaluationCodesUrl, ..., { in_flag: 'list_questionpaper_list' })
 */
export async function getQuestionPaperList(params: {
  examId: number
  subjectId: number
  regulationId?: number
  courseId?: number
  courseYearId?: number
}): Promise<ExamQuestionPaper[]> {
  const raw = await crud.getAllRecords<{ result: unknown[][] }>(
    's_get_examquestionpaper_details',
    {
      in_flag: 'list_questionpaper_list',
      in_orgid: 0,
      in_exam_id: params.examId,
      in_subject_id: params.subjectId,
      in_regulation_id: params.regulationId ?? 0,
      in_course_id: params.courseId ?? 0,
      in_course_year_id: params.courseYearId ?? 0,
      in_exam_questionpaper_template_id: 0,
      in_exam_questionpaper_id: 0,
      in_fdate: '1990-01-01',
      in_tdate: '1990-01-01',
      in_exam_month_yr: '',
      in_course_code: '',
      in_course_year_code: '',
      in_subject_code: '',
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_regulation_code: '',
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
    },
  )
  // body.data for proc calls is { result: [[...], [...]] }
  // Angular does: result.data.result[0] for the first (and only) result set
  const first = (raw?.result ?? [])[0]
  if (!Array.isArray(first)) return []
  return first as ExamQuestionPaper[]
}

// ─── Admin: Evaluation Templates ─────────────────────────────────────────────

/**
 * Fetches active evaluation templates for a university.
 * Angular: getDetailsByRequest(examQpTemplateUrl, 'list', { query: `Universities.universityId==${id}` })
 */
export async function getEvalTemplates(universityId: number): Promise<EvalTemplate[]> {
  return crud.list<EvalTemplate>(
    'ExamQpTemplate',
    `Universities.universityId==${universityId}.and.isActive==true`,
  )
}

// ─── College/University Filters ───────────────────────────────────────────────

/**
 * Fetches university/college filter data for admin template pages.
 * Angular: dataFromProc(collegeWiseDetailsUrl, ..., { in_flag: 'clg_filters' })
 */
export async function getCollegeFilters(params: {
  orgId?: number
  employeeId?: number
  roleId?: number
}): Promise<unknown[][]> {
  const raw = await crud.getAllRecords<{ result: unknown[][] }>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_filters',
    in_org_id: params.orgId ?? 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: params.employeeId ?? 0,
    in_loginuser_roleid: params.roleId ?? 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  })
  // body.data for proc calls is { result: [[...], [...]] }
  return raw?.result ?? []
}

// ─── Status code helpers ──────────────────────────────────────────────────────

/** Numeric evaluation status codes — match Angular constants */
export const EVAL_STATUS = {
  NEW: 626,
  ASSIGNED: 627,
  IN_PROGRESS: 628,
  EVALUATED: 629,
  FINALIZED: 631,
  REJECTED: 632,
  UFM: 633,
} as const

export type EvalStatusCode = (typeof EVAL_STATUS)[keyof typeof EVAL_STATUS]

/** Human-readable label for a status code */
export function evalStatusLabel(code: number): string {
  switch (code) {
    case EVAL_STATUS.NEW:
      return 'New'
    case EVAL_STATUS.ASSIGNED:
      return 'Assigned'
    case EVAL_STATUS.IN_PROGRESS:
      return 'In Progress'
    case EVAL_STATUS.EVALUATED:
      return 'Evaluated'
    case EVAL_STATUS.FINALIZED:
      return 'Finalised'
    case EVAL_STATUS.REJECTED:
      return 'Rejected'
    case EVAL_STATUS.UFM:
      return 'UFM'
    default:
      return 'Unknown'
  }
}

/** Returns true if the assignment is in a locked state (no further edits allowed) */
export function isEvalLocked(statusCode: number): boolean {
  const locked: number[] = [EVAL_STATUS.EVALUATED, EVAL_STATUS.FINALIZED, EVAL_STATUS.REJECTED]
  return locked.includes(statusCode)
}

// ─── Admin Evaluator Assignment (Evaluation Process) ──────────────────────────

type ProcRows = Record<string, unknown>[]

export async function getRegSupBaseFilters(employeeId: number): Promise<ProcRows> {
  const rows = await getUnivExamFiltersByType(employeeId, 'REGSUP').catch(() => [])
  return Array.isArray(rows) ? rows.filter((r) => txt(r.flag) === 'univ_exam_filters' || !r.flag) : []
}

export async function getRegSupRestFilters(params: {
  courseId: number
  academicYearId: number
  examId: number
  employeeId: number
}): Promise<ProcRows> {
  const data = await crud.getAllRecords<{ result: ProcRows[] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_in_regexamstd',
    in_flag_type: 'REGSUP',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId,
  }).catch(() => ({ result: [] }))

  return (data?.result ?? []).find((g) => txt(g?.[0]?.flag) === 'univ_exam_rest_filters') ?? []
}

export async function getRegSupSubjectFilters(params: {
  courseId: number
  academicYearId: number
  examId: number
  courseYearId: number
  regulationId: number
  employeeId: number
}): Promise<ProcRows> {
  const data = await crud.getAllRecords<{ result: ProcRows[] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_regexamstd',
    in_flag_type: 'REGSUP',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_sub_flag_type: 'NoLAB',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId,
  }).catch(() => ({ result: [] }))

  return (data?.result ?? []).find((g) => txt(g?.[0]?.flag) === 'univ_exam_sub_regexamstd') ?? []
}

export async function getEvaluatorAssignmentBundle(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
}): Promise<{ evaluators: ProcRows; students: ProcRows }> {
  const common = {
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId,
  }

  const [evalData, stdData] = await Promise.all([
    crud
      .getAllRecords<{ result: ProcRows[] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluatorassignment_list',
        ...common,
      })
      .catch(() => ({ result: [] })),
    crud
      .getAllRecords<{ result: ProcRows[] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluationstudent_list',
        ...common,
      })
      .catch(() => ({ result: [] })),
  ])

  return {
    evaluators: Array.isArray(evalData?.result?.[0]) ? evalData.result[0] : [],
    students: Array.isArray(stdData?.result?.[0]) ? stdData.result[0] : [],
  }
}

export async function getEvaluatorAssignmentBundleByFlag(
  params: {
    organizationId: number
    examId: number
    courseYearId: number
    subjectId: number
    regulationId: number
    courseId: number
    academicYearId: number
    employeeId: number
  },
  evaluatorListFlag: string,
): Promise<{ evaluators: ProcRows; summary: ProcRows; evaluatorStudents: ProcRows }> {
  const common = {
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId,
  }

  const data = await crud
    .getAllRecords<{ result: ProcRows[] }>('s_get_examevaluation_bycodes', {
      in_flag: evaluatorListFlag,
      ...common,
    })
    .catch(() => ({ result: [] }))

  const sets = data?.result ?? []
  return {
    evaluators: Array.isArray(sets[0]) ? sets[0] : [],
    summary: Array.isArray(sets[1]) ? sets[1] : [],
    evaluatorStudents: Array.isArray(sets[2]) ? sets[2] : [],
  }
}

export async function runPopStudentAssignment(params: {
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  await crud.getAllRecords('s_get_examevaluation_bycodes', {
    in_flag: 'popstudentassignment',
    in_profileids: '',
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  })
}

export async function assignEvaluatorProfiles(params: {
  profileIds: number[]
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  await crud.getAllRecords('s_get_examevaluation_bycodes', {
    in_flag: 'evaluatorassignment',
    in_profileids: params.profileIds.join(','),
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  })
}

export async function assignNextEval(examEvaluatorProfileDetId: number): Promise<void> {
  await crud.getAllRecords('s_get_examevaluation_bycodes', {
    in_flag: 'assign_next_eval',
    in_profileids: examEvaluatorProfileDetId,
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: 0,
    in_subject_id: 0,
    in_course_year_id: 0,
  })
}

export async function updateManualEvaluationAssignment(params: {
  profileId: number
  examEvaluationAssignmentIdsCsv: string
  timetableDetIds: string
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  await crud.getAllRecords('s_get_examevaluation_bycodes', {
    in_flag: 'UpdateEvaluationAssignment',
    in_profileids: params.profileId,
    in_omr_serial_nos: '',
    in_exam_evaluationassignment_ids: params.examEvaluationAssignmentIdsCsv,
    in_timetable_det_ids: params.timetableDetIds,
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  })
}

export async function reassignEvaluationAssignment(params: {
  profileId: number
  examEvaluationAssignmentIdsCsv: string
  timetableDetIds: string
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  const payload = {
    in_flag: 'reassignEvaluationAssignment',
    in_profileids: params.profileId,
    in_exam_evaluationassignment_ids: params.examEvaluationAssignmentIdsCsv,
    in_omr_serial_nos: '',
    in_timetable_det_ids: params.timetableDetIds,
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  }
  // Angular evaluatorassignmentUrl = s_pop_exam_evaluatorassignment (the assign
  // proc), NOT a read proc.
  await crud.getAllRecords('s_pop_exam_evaluatorassignment', payload)
}

export async function updateReevaluationCount(params: {
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  const payload = {
    in_flag: 'reevaluation_count_update',
    in_profileids: '',
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  }
  // Same assign proc as the re-assign call (flag reevaluation_count_update).
  await crud.getAllRecords('s_pop_exam_evaluatorassignment', payload)
}

export async function getModeratorEvaluatorProfiles(): Promise<Record<string, unknown>[]> {
  return crud.list<Record<string, unknown>>('ExamEvaluatorProfiles', 'role.roleId==64')
}

export async function listModeratorEvaluationMapping(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
  moderatorProfileId: number
}): Promise<Record<string, unknown>[]> {
  const data = await crud.getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
    in_flag: 'list_moderator_evaluation_mapping',
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: params.moderatorProfileId,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId,
  }).catch(() => ({ result: [] }))
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

export async function addMultipleEvaluators(payload: unknown): Promise<unknown> {
  return crud.postDetails(EXAM_EVAL_API.ADD_MULTIPLE_EVALUATORS, payload)
}

export async function getEvaluatedMarksReport(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
  isReevaluation: boolean
}): Promise<Record<string, unknown>[]> {
  const flag = params.isReevaluation ? 'list_reevaluationApprovalstudent_list' : 'list_evaluationApprovalstudent_list'
  const data = await crud.getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
    in_flag: flag,
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId,
  }).catch(() => ({ result: [] }))
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

export async function getReEvaluatorMasterList(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
  isReevaluation: boolean
}): Promise<Record<string, unknown>[]> {
  const flag = params.isReevaluation ? 'get_masterlistfor_reevaluation_validator' : 'get_masterlistfor_evaluation_validator'
  const data = await crud
    .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
      in_flag: flag,
      in_orgid: params.organizationId || 1,
      in_fdate: '1990-01-01',
      in_tdate: '1990-01-01',
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: '',
      in_exam_short_name: '',
      in_affiliatedto_catdet_id: 0,
      in_exam_id: params.examId,
      in_course_year_id: params.courseYearId,
      in_subject_id: params.subjectId,
      in_regulation_id: params.regulationId,
      in_course_id: params.courseId,
      in_academic_year_id: params.academicYearId,
      in_loginuser_empid: params.employeeId,
    })
    .catch(() => ({ result: [] }))
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

export async function getReEvaluatorDetailList(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
  isReevaluation: boolean
}): Promise<{ evaluationValidator: Record<string, unknown>[]; evaluatorList: Record<string, unknown>[] }> {
  const flag = params.isReevaluation ? 'get_listfor_reevaluation_validator' : 'get_listfor_evaluation_validator'
  const data = await crud
    .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
      in_flag: flag,
      in_orgid: params.organizationId || 1,
      in_fdate: '1990-01-01',
      in_tdate: '1990-01-01',
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: '',
      in_exam_short_name: '',
      in_affiliatedto_catdet_id: 0,
      in_exam_id: params.examId,
      in_course_year_id: params.courseYearId,
      in_subject_id: params.subjectId,
      in_regulation_id: params.regulationId,
      in_course_id: params.courseId,
      in_academic_year_id: params.academicYearId,
      in_loginuser_empid: params.employeeId,
    })
    .catch(() => ({ result: [] }))

  const sets = data?.result ?? []
  const evaluationValidator = sets.find((rows) => txt(rows?.[0]?.flag) === 'evaluation_validator') ?? []
  const evaluatorList = sets.find((rows) => txt(rows?.[0]?.flag) === 'evaluator_list') ?? []
  return { evaluationValidator, evaluatorList }
}

export async function addMultipleEvaluationAssignments(payload: unknown): Promise<unknown> {
  return crud.postDetails(EXAM_EVAL_API.ADD_MULTIPLE_EVAL_ASSIGNMENTS, payload)
}

export async function getMultiEvaluatorAssignBundle(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
}): Promise<{
  evaluators: Record<string, unknown>[]
  summary: Record<string, unknown>[]
  evaluatorOmrRows: Record<string, unknown>[]
  students: Record<string, unknown>[]
}> {
  const common = {
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId,
  }
  const [evalData, stdData] = await Promise.all([
    crud
      .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluatorassignment_list',
        ...common,
        in_evaluator_role_id: 64,
      })
      .catch(() => ({ result: [] })),
    crud
      .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluationstudent_list',
        ...common,
        in_evaluator_role_id: 0,
      })
      .catch(() => ({ result: [] })),
  ])
  return {
    evaluators: Array.isArray(evalData?.result?.[0]) ? evalData.result[0] : [],
    // Angular: StudentEvaluationAssignment summary = result[1] of the
    // list_evaluatorassignment_list (evaluator) call — NOT the student call.
    summary: Array.isArray(evalData?.result?.[1]) ? evalData.result[1] : [],
    evaluatorOmrRows: Array.isArray(evalData?.result?.[2]) ? evalData.result[2] : [],
    students: Array.isArray(stdData?.result?.[0]) ? stdData.result[0] : [],
  }
}

export async function assignMultipleUpdateEvaluationAssignment(params: {
  profileId: number
  omrSerialNosCsv: string
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  // Multi-evaluator-assign page only: Assign runs s_pop_exam_evaluatorassignment
  // (not the shared s_get_examevaluation_bycodes). Same flag + params.
  await crud.getAllRecords('s_pop_exam_evaluatorassignment', {
    in_flag: 'MultipleUpdateEvaluationAssignment',
    in_profileids: params.profileId,
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: params.omrSerialNosCsv,
    in_timetable_det_ids: '',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  })
}

export async function getReevaluationMultiAssignBundle(params: {
  organizationId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
  employeeId: number
}): Promise<{
  evaluators: Record<string, unknown>[]
  summary: Record<string, unknown>[]
  evaluatorOmrRows: Record<string, unknown>[]
  students: Record<string, unknown>[]
}> {
  const pickSetByFlag = (
    sets: Record<string, unknown>[][],
    flag: string,
    fallbackIndex: number,
  ): Record<string, unknown>[] => {
    const byFlag =
      sets.find((rows) => Array.isArray(rows) && rows.length > 0 && txt(rows[0]?.flag) === flag) ?? []
    if (byFlag.length > 0) return byFlag
    return Array.isArray(sets[fallbackIndex]) ? sets[fallbackIndex] : []
  }

  const common = {
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId,
  }
  const [evalData, stdData] = await Promise.all([
    crud
      .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluatorassignment_list_reevaluation',
        ...common,
        in_evaluator_role_id: 64,
      })
      .catch(() => ({ result: [] })),
    crud
      .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluationstudent_list_revision',
        ...common,
        in_evaluator_role_id: 0,
      })
      .catch(() => ({ result: [] })),
  ])
  const evalSets = evalData?.result ?? []
  const stdSets = stdData?.result ?? []

  let evaluators = pickSetByFlag(evalSets, 'list_evaluatorassignment_list_reevaluation', 0)
  let summary = pickSetByFlag(evalSets, 'list_evaluationstudent_summary_revision', 1)
  if (summary.length === 0) summary = pickSetByFlag(stdSets, 'list_evaluationstudent_summary_revision', 1)
  let evaluatorOmrRows = pickSetByFlag(evalSets, 'list_evaluatorassignment_omr_list_reevaluation', 2)
  let students = pickSetByFlag(stdSets, 'list_evaluationstudent_list_revision', 0)

  // Some deployments return normal flags even on re-evaluation screen; fallback to those.
  if (evaluators.length === 0 && students.length === 0) {
    const [evalFallback, stdFallback] = await Promise.all([
      crud
        .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
          in_flag: 'list_evaluatorassignment_list',
          ...common,
          in_evaluator_role_id: 64,
        })
        .catch(() => ({ result: [] })),
      crud
        .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
          in_flag: 'list_evaluationstudent_list',
          ...common,
          in_evaluator_role_id: 0,
        })
        .catch(() => ({ result: [] })),
    ])
    const eSets = evalFallback?.result ?? []
    const sSets = stdFallback?.result ?? []
    evaluators = pickSetByFlag(eSets, 'list_evaluatorassignment_list', 0)
    if (summary.length === 0) summary = pickSetByFlag(sSets, 'list_evaluationstudent_summary', 1)
    evaluatorOmrRows = pickSetByFlag(eSets, 'list_evaluatorassignment_omr_list', 2)
    students = pickSetByFlag(sSets, 'list_evaluationstudent_list', 0)
  }

  return { evaluators, summary, evaluatorOmrRows, students }
}

export async function assignMultipleUpdateEvaluationAssignmentRevision(params: {
  profileId: number
  omrSerialNosCsv: string
  examId: number
  subjectId: number
  courseYearId: number
}): Promise<void> {
  // Angular evaluatorassignmentUrl = s_pop_exam_evaluatorassignment (the assign
  // proc), NOT the read proc s_get_examevaluation_bycodes.
  await crud.getAllRecords('s_pop_exam_evaluatorassignment', {
    in_flag: 'MultipleUpdateEvaluationAssignment_revision',
    in_profileids: params.profileId,
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: params.omrSerialNosCsv,
    in_timetable_det_ids: '',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  })
}

export async function getReevaluationAssignSubjects(employeeId: number): Promise<Record<string, unknown>[]> {
  const data = await crud
    .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
      in_flag: 'list_exam_subjects',
      in_orgid: 1,
      in_fdate: '1990-01-01',
      in_tdate: '1990-01-01',
      in_exam_month_yr: '',
      in_course_code: '',
      in_course_year_code: '',
      in_subject_code: '',
      in_evalutor_profileid: 0,
      in_exam_date: '1990-01-01',
      in_regulation_code: '',
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: '',
      in_exam_short_name: '',
      in_affiliatedto_catdet_id: 1,
      in_loginuser_empid: employeeId || 0,
    })
    .catch(() => ({ result: [] }))
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

export async function getReevaluationAssignBundleByCodes(params: {
  employeeId: number
  courseCode: string
  examMonthYear: string
  courseYearCode: string
  subjectCode: string
}): Promise<{
  evaluators: Record<string, unknown>[]
  summary: Record<string, unknown>[]
  students: Record<string, unknown>[]
}> {
  const common = {
    in_orgid: 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_month_yr: params.examMonthYear,
    in_course_code: params.courseCode,
    in_course_year_code: params.courseYearCode,
    in_subject_code: params.subjectCode,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_code: '',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 1,
    in_loginuser_empid: params.employeeId || 0,
  }

  const [evalData, stdData] = await Promise.all([
    crud
      .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluatorassignment_list_reevaluation',
        ...common,
        in_evaluator_role_id: 64,
      })
      .catch(() => ({ result: [] })),
    crud
      .getAllRecords<{ result: Record<string, unknown>[][] }>('s_get_examevaluation_bycodes', {
        in_flag: 'list_evaluationstudent_list_revision',
        ...common,
      })
      .catch(() => ({ result: [] })),
  ])

  return {
    evaluators: Array.isArray(evalData?.result?.[0]) ? evalData.result[0] : [],
    summary: Array.isArray(evalData?.result?.[1]) ? evalData.result[1] : [],
    students: Array.isArray(stdData?.result?.[0]) ? stdData.result[0] : [],
  }
}

export async function runReevaluationAssignmentPopByCodes(params: {
  subjectCode: string
  courseYearCode: string
}): Promise<void> {
  await crud.getAllRecords('s_get_examevaluation_bycodes', {
    in_flag: 're_evaluation_assignment_pop',
    in_profileids: '',
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: 0,
    in_subject_id: params.subjectCode,
    in_course_year_id: params.courseYearCode,
  })
}

export async function assignReevaluationByCodes(params: {
  profileId: number
  subjectCode: string
  examMonthYear: string
  courseCode: string
  courseYearCode: string
  assignmentIdsCsv: string
  timetableDetIds: string
}): Promise<void> {
  await crud.getAllRecords('s_get_examevaluation_bycodes', {
    in_flag: 'UpdateEvaluationAssignment',
    in_profileids: params.profileId,
    in_subject_code: params.subjectCode,
    in_exam_month_yr: params.examMonthYear,
    in_coursecode: params.courseCode,
    in_coursegroup: '',
    in_courseyear: params.courseYearCode,
    in_exam_evaluationassignment_ids: params.assignmentIdsCsv,
    in_timetable_det_ids: params.timetableDetIds,
  })
}
