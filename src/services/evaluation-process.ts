import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  putDetails,
} from "@/services/crud";
import {
  EXAM_EVAL_API,
  NEXT_API,
  QUESTION_PAPER_API,
} from "@/config/constants/api";
import {
  getUnivExamFiltersByType,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from "@/services/pre-examination";

type AnyRow = Record<string, any>;

export async function getEvaluationExamFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  return getUnivExamFiltersByType(employeeId, "ALL");
}

export async function getEvaluationExamRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const bundle = await getUnivExamRestNoTtBundle(params);
  return Array.isArray(bundle.restFilters) ? bundle.restFilters : [];
}

export async function getEvaluationExamRestBundle(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  const bundle = await getUnivExamRestNoTtBundle(params);
  return {
    restFilters: Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
    regulations: Array.isArray(bundle.regulations) ? bundle.regulations : [],
  };
}

export async function listEvaluationSubjects(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  return getUnivExamSubjectUc(params);
}

export async function listExamQuestionPapers(filters?: {
  examId?: number;
  courseYearId?: number;
  courseGroupId?: number;
  subjectId?: number;
  subjectTypeId?: number;
  examDate?: string;
  isActive?: boolean;
}): Promise<AnyRow[]> {
  const where: Record<string, string | number | boolean> = {};
  if (filters?.examId) where.examId = filters.examId;
  if (filters?.courseYearId) where.courseYearId = filters.courseYearId;
  if (filters?.courseGroupId) where.courseGroupId = filters.courseGroupId;
  if (filters?.subjectId) where.subjectId = filters.subjectId;
  if (filters?.subjectTypeId) where.subjectTypeId = filters.subjectTypeId;
  if (filters?.examDate) where.examDate = filters.examDate;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  const queries =
    Object.keys(where).length > 0 ? [buildQuery(where)] : [undefined];
  const entities = ["ExamQuestionPaper", "ExamQuestionPapers"];

  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q);
        if (Array.isArray(rows)) return rows;
      } catch {
        // try next
      }
    }
  }
  return [];
}

export async function createExamQuestionPaper(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  // Angular: domain/create/ExamQuestionPapers (plural). Singular entity 422s.
  return domainCreate<AnyRow>("ExamQuestionPapers", payload);
}

export async function updateExamQuestionPaper(
  examQuestionPaperId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  // Angular: crudService.update(UpdateExamQuestionpaper, details) → PUT
  // /cms/updateExamQuestionPapers (POST yields 405 Method Not Allowed).
  const body = {
    ...payload,
    examQuestionPaperId,
    questionPaperId: examQuestionPaperId,
    pkExamQuestionpaperId: examQuestionPaperId,
  };
  try {
    return await putDetails<AnyRow>(EXAM_EVAL_API.UPDATE_EXAM_QUESTION_PAPERS, body);
  } catch {
    // Fallback: standard domain update used elsewhere for ExamQuestionPapers.
    return domainUpdate<AnyRow>(
      EXAM_EVAL_API.QUESTION_PAPERS,
      "questionPaperId",
      examQuestionPaperId,
      body,
    );
  }
}

function pickUploadPath(data: unknown, keys: string[]): string {
  if (!data) return "";
  if (typeof data === "string") return data.trim();
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = pickUploadPath(item, keys);
      if (found) return found;
    }
    return "";
  }
  if (typeof data === "object") {
    const row = data as AnyRow;
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    if (row.data != null) return pickUploadPath(row.data, keys);
    if (row.result != null) return pickUploadPath(row.result, keys);
  }
  return "";
}

/**
 * Upload Question Paper and/or Model Answer Paper files for an
 * exam question paper. Same API as Angular Network call:
 * POST /cms/uploadquestionpapermodelanswerpapers
 * FormData: questionPaperId, questionPaper, modelAnswerPaper
 */
export async function uploadQuestionPaperFiles(params: {
  examQuestionPaperId: number;
  questionPapers?: File[] | null;
  modelAnswerPapers?: File[] | null;
}): Promise<{
  success: boolean;
  message: string;
  data?: AnyRow;
  /** True when a non-empty QP/AS path is known after upload + entity re-read. */
  persisted: boolean;
}> {
  const formData = new FormData();
  // Angular UploadPapersComponent: questionPaperId = row.pk_exam_questionpaper_id
  formData.append("questionPaperId", String(params.examQuestionPaperId));
  for (const f of params.questionPapers ?? []) {
    formData.append("questionPaper", f, f.name);
  }
  for (const f of params.modelAnswerPapers ?? []) {
    formData.append("modelAnswerPaper", f, f.name);
  }

  const res = await fetch(NEXT_API.PROXY(EXAM_EVAL_API.PAPER_PATH_UPLOAD), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: AnyRow;
  } | null;

  if (!res.ok) {
    throw new Error(body?.message ?? `Upload failed (${res.status}).`);
  }

  let qpPath = pickUploadPath(body.data ?? body, [
    "questionPaperPath",
    "questionpaper_path",
    "questionPaper",
    "path",
  ]);
  let asPath = pickUploadPath(body.data ?? body, [
    "modelAnswerSheetPath",
    "modelanswersheet_path",
    "modelAnswerPaper",
    "modelAnswerPath",
  ]);

  // Upload may store files without returning paths. Re-read ExamQuestionPapers
  // (PK: questionPaperId) so Get List / filter changes can show the eye.
  try {
    const details = await domainList<AnyRow>(
      EXAM_EVAL_API.QUESTION_PAPERS,
      buildQuery({ questionPaperId: params.examQuestionPaperId }),
    );
    const detail = Array.isArray(details) ? details[0] : undefined;
    if (detail) {
      qpPath =
        qpPath ||
        pickUploadPath(detail, ["questionPaperPath", "questionpaper_path"]);
      asPath =
        asPath ||
        pickUploadPath(detail, [
          "modelAnswerSheetPath",
          "modelanswersheet_path",
        ]);
    }
  } catch {
    /* keep paths from upload response */
  }

  if (qpPath || asPath) {
    try {
      await updateExamQuestionPaper(params.examQuestionPaperId, {
        ...(qpPath ? { questionPaperPath: qpPath } : {}),
        ...(asPath ? { modelAnswerSheetPath: asPath } : {}),
      });
    } catch {
      /* Prefer list enrich / client cache even if explicit path update fails */
    }
  }

  const persisted = Boolean(qpPath || asPath);
  // Angular parent treats any HTTP body as truthy and still refreshes the list.
  // We only claim a durable upload when a stored path is available.
  return {
    success: body?.success !== false || persisted,
    message: persisted
      ? body?.message && !/no records?/i.test(body.message)
        ? body.message
        : "Uploaded successfully."
      : body?.message?.trim() ||
        "Upload finished but no file path was saved on the question paper.",
    persisted,
    data: {
      ...(typeof body?.data === "object" && body.data ? body.data : {}),
      questionPaperPath: qpPath || undefined,
      questionpaper_path: qpPath || undefined,
      modelAnswerSheetPath: asPath || undefined,
      modelanswersheet_path: asPath || undefined,
    },
  };
}

function unpackAssignmentRows(payload: unknown): AnyRow[] {
  if (Array.isArray(payload)) return payload as AnyRow[];
  const obj = (payload ?? {}) as Record<string, unknown>;
  // Angular: result.data.result[0]
  if (Array.isArray(obj.result)) {
    const result = obj.result as unknown[];
    if (Array.isArray(result[0])) return result[0] as AnyRow[];
    if (result.length > 0 && typeof result[0] === "object") {
      return result as AnyRow[];
    }
  }
  const nestedData = (obj.data ?? {}) as Record<string, unknown>;
  if (Array.isArray(nestedData.result)) {
    const result = nestedData.result as unknown[];
    if (Array.isArray(result[0])) return result[0] as AnyRow[];
    if (result.length > 0 && typeof result[0] === "object") {
      return result as AnyRow[];
    }
  }
  if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
  return [];
}

/** Normalize assignment row keys used by Template dropdown / eye view. */
function normalizeTemplateAssignmentRow(row: AnyRow): AnyRow {
  const templateId = Number(
    row.fk_exam_questionpaper_template_id ??
      row.examQuestionPaperTemplateId ??
      row.questionPaperTemplateId ??
      row.exam_questionpaper_template_id ??
      row.fk_exam_qp_template_id ??
      0,
  );
  const templateTitle =
    row.template_title ??
    row.templateTitle ??
    row.template_name ??
    row.templateName ??
    row.questionpaper_template_title ??
    "";
  return {
    ...row,
    fk_exam_questionpaper_template_id: templateId || null,
    examQuestionPaperTemplateId: templateId || null,
    template_title: templateTitle,
    templateTitle,
  };
}

export async function getAssignQuestionPaperTemplateList(params: {
  examId: number;
  courseYearId: number;
  regulationId: number;
  subjectId?: number;
}): Promise<AnyRow[]> {
  const payload = {
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId ?? 0,
  };

  // Angular uses CONSTANTS.getQuestionPaperAssignments via getDetailsByRequest
  // (REST), not the stored-proc first. Prefer that so we get template_title /
  // fk_exam_questionpaper_template_id for the Create QP modal dropdown.
  const endpointCandidates = [
    "getQuestionPaperAssignments",
    "getQPAssignments",
  ];
  for (const endpoint of endpointCandidates) {
    try {
      const data = await fetchDetails<unknown>(endpoint, payload);
      const rows = unpackAssignmentRows(data).map(normalizeTemplateAssignmentRow);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }

  try {
    const primary = await getAllRecords<unknown>(
      "s_get_question_paper_assignments",
      payload,
    );
    const rows = unpackAssignmentRows(primary).map(normalizeTemplateAssignmentRow);
    if (rows.length > 0) return rows;
  } catch {
    // fall through
  }

  const procCandidates = [
    "s_get_examquestionpaper_details",
    "s_get_examevaluation_bycodes",
  ];
  for (const proc of procCandidates) {
    try {
      const data = await getAllRecords<unknown>(proc, {
        in_flag: "getQuestionPaperAssignments",
        ...payload,
      });
      const rows = unpackAssignmentRows(data).map(normalizeTemplateAssignmentRow);
      if (rows.length > 0) return rows;
    } catch {
      // try next proc
    }
  }
  return [];
}

export async function getQuestionPaperTemplateViewRows(
  templateId?: number | null,
  examQuestionPaperId?: number,
): Promise<AnyRow[]> {
  // Angular view-template-modal always calls the proc — even when template id
  // is null (URL shows in_exam_questionpaper_template_id=null).
  const tplParam: string | number =
    templateId != null && Number(templateId) > 0 ? Number(templateId) : "null";
  const payload: Record<string, string | number> = {
    in_flag: "list_exam_questionpaper_details",
    in_orgid: 1,
    in_fdate: "1990-01-01",
    in_tdate: "1990-01-01",
    in_exam_questionpaper_template_id: tplParam,
    // Angular "View Template" path passes 0 for question paper id.
    in_exam_questionpaper_id: examQuestionPaperId ?? 0,
    in_exam_id: 0,
    in_course_year_id: 0,
    in_subject_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: "1990-01-01",
    in_regulation_id: 0,
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_exam_evaluationassignment_id: 0,
  };
  const data = await getAllRecords<{ result?: AnyRow[][] }>(
    "s_get_examquestionpaper_details",
    payload,
  ).catch(() => ({ result: [] }));
  if (Array.isArray(data?.result?.[0])) return data.result?.[0] ?? [];
  // Some proxies return a flat result list
  if (Array.isArray((data as AnyRow)?.result) && !Array.isArray((data as AnyRow).result?.[0])) {
    return ((data as AnyRow).result as AnyRow[]) ?? [];
  }
  return [];
}

/**
 * Fetch a single QuestionPaperMarks row by id (used to pre-fill the
 * "Edit Question" modal on manage-questions-paper). Angular calls
 * listDetailsById on CONSTANTS.ExamQuestionPaperMarksCrudUrl.
 */
export async function getQuestionPaperMarksById(
  questionPaperMarksId: number,
): Promise<AnyRow | null> {
  if (!questionPaperMarksId) return null;
  const rows = await domainList<AnyRow>(
    "ExamQuestionPaperMarks",
    buildQuery({ questionPaperMarksId }),
  ).catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * Update a QuestionPaperMarks row (question text / isActive). Mirrors
 * Angular updateQuestion() -> crudService.updateDetails on the same
 * CRUD url with key = questionPaperMarksId.
 */
export async function updateQuestionPaperMarks(
  questionPaperMarksId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    "ExamQuestionPaperMarks",
    "questionPaperMarksId",
    questionPaperMarksId,
    payload,
  );
}

/**
 * Create a QuestionPaperMarks row (used by Question Bank + Add Manual
 * Question flows). Mirrors Angular addDetails on
 * CONSTANTS.ExamQuestionPaperMarksCrudUrl.
 */
export async function createQuestionPaperMarks(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  // Angular posts to ExamQuestionPaperMarksCrudUrl ('ExamQuestionPaperMarks').
  // Do NOT fall back to 'QuestionPaperMarks' — that entity persists the row
  // without the level/group/subgroup positional fields, so the question-paper
  // detail proc can't match it to its template slot (question never shows).
  return domainCreate<AnyRow>("ExamQuestionPaperMarks", payload);
}

/**
 * List Assessment rows for a subject (used by Question Bank flow as
 * the "question paper banks" the user picks from). Mirrors Angular
 * listDetailsByTwoIdWithSort on CONSTANTS.assessmentCrudUrl with
 * onlineCourses.onlineCourseCode == subjectCode, sorted by createdDt
 * DESC. Each Assessment carries assessmentQuestionDTOs[] with the
 * questions inside the bank.
 */
export async function listAssessmentsBySubjectCode(
  subjectCode: string,
): Promise<AnyRow[]> {
  const code = String(subjectCode ?? "").trim();
  if (!code) return [];
  // Join conditions with the backend's '.and.' operator (NOT a literal '&',
  // which crud.list() percent-encodes to %26 -> Spring 400s). Produces:
  //   onlineCourses.onlineCourseCode==U21HSN02EG.and.isActive==true.order(createdDt=DESC)
  const q = buildQuery(
    { "onlineCourses.onlineCourseCode": code, isActive: true },
    { field: "createdDt", direction: "DESC" },
  );
  return domainList<AnyRow>("Assessment", q);
}

/**
 * Resolve a subject's code from its id via the Subject domain entity.
 * Fallback for the Question Bank flow: the evaluation subject-filter proc
 * (univ_exam_subject_uc) doesn't reliably expose subject_code, so when the
 * code isn't carried in the URL we look it up here. Subject.subjectCode is
 * the same value the Assessment list matches against onlineCourses.onlineCourseCode.
 */
export async function getSubjectCodeById(subjectId: number): Promise<string> {
  if (!subjectId) return "";
  const rows = await domainList<AnyRow>(
    "Subject",
    buildQuery({ subjectId }),
  ).catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  return String(row?.subjectCode ?? row?.subject_code ?? "").trim();
}

/** Recursively find the first non-empty value for any of `keys` anywhere in `obj`. */
function deepFindValue(obj: unknown, keys: string[], depth = 0): unknown {
  if (obj == null || typeof obj !== "object" || depth > 6) return undefined;
  const record = obj as Record<string, unknown>;
  // Direct keys on this object first.
  for (const k of keys) {
    const v = record[k];
    if (v != null && String(v).trim() !== "") return v;
  }
  // Then descend into nested objects/arrays.
  for (const v of Object.values(record)) {
    if (v && typeof v === "object") {
      const found = deepFindValue(v, keys, depth + 1);
      if (found != null) return found;
    }
  }
  return undefined;
}

/**
 * Resolve a subject code from a question-paper id. Ultimate fallback for the
 * Question Bank flow: questionPaperId is always carried in the URL, so even if
 * subjectCode and subjectId are missing we can still fire the Assessment list.
 * The ExamQuestionPaper record exposes a `subjectCode` field; we deep-scan the
 * response for it (it may sit on a nested relation), then fall back to a
 * subjectId lookup.
 */
export async function getSubjectCodeByQuestionPaperId(
  questionPaperId: number,
): Promise<string> {
  if (!questionPaperId) return "";
  // The CRUD entity is 'ExamQuestionPapers' and its primary key is
  // 'questionPaperId' (Angular ExamQuestionPaperCrudUrl, updateDetails key
  // 'questionPaperId'). 'ExamQuestionPaper' (singular) does not exist and
  // querying by 'examQuestionPaperId' 500s. The row carries the subject
  // relation; deep-scan it for the code, else fall back to a subjectId lookup.
  const rows = await domainList<AnyRow>(
    "ExamQuestionPapers",
    buildQuery({ questionPaperId }),
  ).catch(() => []);
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) return "";
  const code = deepFindValue(row, ["subjectCode", "subject_code"]);
  if (code != null && String(code).trim() !== "") return String(code).trim();
  const sid = Number(deepFindValue(row, ["subjectId", "fk_subject_id"]) ?? 0);
  return sid ? getSubjectCodeById(sid) : "";
}

/**
 * GeneralDetail rows for the Question Type modal "Difficulty Level" dropdown.
 * Mirrors Angular listDetailsByTwoIds(generalDetailsUrl, QuestionDifficulty,
 * 'true', generalDetailsByCodeUrl, isActive) — GM code 'QuestionDifficulty'.
 */
export async function listQuestionDifficultyLevels(): Promise<AnyRow[]> {
  const q = buildQuery({
    "GeneralMaster.generalMasterCode": "QuestionDifficulty",
    isActive: true,
  });
  return domainList<AnyRow>("GeneralDetail", q);
}

/**
 * GeneralDetail rows for the Question Type modal "Taxonomy Level" dropdown.
 * Mirrors Angular listDetailsByTwoIdsWithSort(generalDetailsUrl,
 * QuestionTaxonomyLevel, 'true', 'ASC', generalDetailsByCodeUrl, isActive,
 * 'generalDetailSortOrder') — GM code 'QuestionTaxonomyLevel', ordered.
 */
export async function listQuestionTaxonomyLevels(): Promise<AnyRow[]> {
  const q = buildQuery(
    {
      "GeneralMaster.generalMasterCode": "QuestionTaxonomyLevel",
      isActive: true,
    },
    { field: "generalDetailSortOrder", direction: "ASC" },
  );
  return domainList<AnyRow>("GeneralDetail", q);
}

export async function listQuestionPaperTemplates(): Promise<AnyRow[]> {
  const entities = [
    QUESTION_PAPER_API.QP_TEMPLATE,
    "ExamQuestionpaperTemplate",
    "ExamQuestionPaperTemplate",
    "ExamQpTemplate",
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  const queries = [
    "order(examQuestionPaperTemplateId=ASC)",
    buildQuery({ isActive: true }),
  ];
  for (const entity of entities) {
    for (const query of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, query);
        if (Array.isArray(rows) && rows.length > 0) return rows;
      } catch {
        // try next entity/query
      }
    }
  }
  return [];
}

export async function createQuestionPaperTemplateAssignment(payload: {
  examMasterId: number;
  regulationId: number;
  subjectId: number;
  examQuestionpaperTemplateId: number;
  courseYearId: number;
  isActive: boolean;
}): Promise<AnyRow> {
  return domainCreate<AnyRow>(QUESTION_PAPER_API.QP_TEMP_ASSIGN, payload);
}

export async function updateQuestionPaperTemplateAssignment(
  assignmentId: number,
  payload: {
    examQptempAssignId: number;
    examMasterId: number;
    regulationId: number;
    subjectId: number;
    examQuestionpaperTemplateId: number;
    courseYearId: number;
    isActive: boolean;
  },
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    QUESTION_PAPER_API.QP_TEMP_ASSIGN,
    "examQptempAssignId",
    assignmentId,
    payload,
  );
}

export async function getEvaluationApprovalsFilters(
  employeeId: number,
  organizationId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "filter_univexam_evaluator_moderator",
      // Angular sends the login org id — with 0 the proc returns no rows.
      in_orgid: organizationId || 0,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 0,
      in_exam_id: 0,
      in_course_year_id: 0,
      in_subject_id: 0,
      in_regulation_id: 0,
      in_course_id: 0,
      in_academic_year_id: 0,
      in_loginuser_empid: employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return (groups[0] ?? []).filter(Boolean);
}

export async function listEvaluationApprovals(params: {
  employeeId: number;
  organizationId?: number;
  courseId?: number;
  examId?: number;
  evaluatorProfileId?: number;
  academicYearId?: number;
  courseYearId?: number;
  subjectId?: number;
  regulationId?: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "list_evaluationApprovalstudent_list",
      // Angular sends the login org id — with 0 the proc returns no rows.
      in_orgid: params.organizationId ?? 0,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_evalutor_profileid: params.evaluatorProfileId ?? 0,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 0,
      in_exam_id: params.examId ?? 0,
      in_course_year_id: params.courseYearId ?? 0,
      in_subject_id: params.subjectId ?? 0,
      in_regulation_id: params.regulationId ?? 0,
      in_course_id: params.courseId ?? 0,
      in_academic_year_id: params.academicYearId ?? 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return (groups[0] ?? []).filter(Boolean);
}

export async function approveEvaluationAssignments(
  payload: Record<string, unknown>[],
): Promise<AnyRow> {
  return postDetails<AnyRow>(
    EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENT_STATUS,
    payload,
  );
}

export async function getFinalizeQuestionPaperFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_filters",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "ALL",
      in_param1: 0,
      in_param2: 0,
    },
  );
  const groups = data?.result ?? [];
  return groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_filters") ?? [];
}

export async function getFinalizeRegulations(params: {
  courseId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_rest_regulations",
      in_flag_type: "ALL",
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: params.employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "NoLAB",
      in_param1: 0,
      in_param2: 0,
    },
  );
  const groups = data?.result ?? [];
  return groups.find((g) => (g?.[0]?.flag ?? "") === "regulations") ?? [];
}

export async function getFinalizeSubjectUc(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  return getUnivExamSubjectUc({
    collegeId: 0,
    courseId: params.courseId,
    courseGroupId: 0,
    courseYearId: 0,
    examId: params.examId,
    academicYearId: params.academicYearId,
    regulationId: params.regulationId,
    employeeId: params.employeeId,
  });
}

/** Merge QP / AS file paths from ExamQuestionPapers CRUD (list proc often omits them). */
export async function enrichQuestionPaperFilePaths(
  rows: AnyRow[],
): Promise<AnyRow[]> {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const pickPath = (row: AnyRow | undefined, keys: string[]) => {
    if (!row) return "";
    for (const k of keys) {
      const v = row[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  return Promise.all(
    rows.map(async (row) => {
      const id = Number(
        row.pk_exam_questionpaper_id ??
          row.questionPaperId ??
          row.examQuestionPaperId ??
          0,
      );
      const qp = pickPath(row, ["questionpaper_path", "questionPaperPath"]);
      const as = pickPath(row, [
        "modelanswersheet_path",
        "modelAnswerSheetPath",
      ]);
      if (!id || (qp && as)) {
        return {
          ...row,
          questionpaper_path: qp || row.questionpaper_path,
          questionPaperPath: qp || row.questionPaperPath,
          modelanswersheet_path: as || row.modelanswersheet_path,
          modelAnswerSheetPath: as || row.modelAnswerSheetPath,
        };
      }

      // PK is questionPaperId — examQuestionPaperId query 500s on this entity.
      let detail: AnyRow | undefined;
      try {
        const list = await domainList<AnyRow>(
          EXAM_EVAL_API.QUESTION_PAPERS,
          buildQuery({ questionPaperId: id }),
        );
        if (Array.isArray(list) && list[0]) detail = list[0];
      } catch {
        /* leave detail unset */
      }
      if (!detail) return row;

      const qpPath =
        qp ||
        pickPath(detail, ["questionPaperPath", "questionpaper_path"]);
      const asPath =
        as ||
        pickPath(detail, ["modelAnswerSheetPath", "modelanswersheet_path"]);

      return {
        ...row,
        questionpaper_path: qpPath || null,
        questionPaperPath: qpPath || null,
        modelanswersheet_path: asPath || null,
        modelAnswerSheetPath: asPath || null,
      };
    }),
  );
}

export async function listFinalizableQuestionPapers(params: {
  employeeId: number;
  examId: number;
  courseId?: number;
  academicYearId?: number;
  courseYearId?: number;
  subjectId?: number;
  regulationId?: number;
  organizationId?: number;
}): Promise<AnyRow[]> {
  // Match Angular getQuestionpapers() request on s_get_examevaluation_bycodes
  // exactly (in_course_id / in_academic_year_id always 0; org + login emp set).
  const orgId =
    Number(
      params.organizationId ??
        (typeof globalThis !== "undefined"
          ? globalThis.localStorage?.getItem("organizationId")
          : 0) ??
        1,
    ) || 1;
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_examevaluation_bycodes",
    {
      in_flag: "list_questionpaper_list",
      in_orgid: orgId,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 0,
      in_exam_id: params.examId,
      in_course_year_id: params.courseYearId ?? 0,
      in_subject_id: params.subjectId ?? 0,
      in_regulation_id: params.regulationId ?? 0,
      in_course_id: 0,
      in_academic_year_id: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  const list = (groups[0] ?? []).filter(Boolean);
  // list_questionpaper_list often returns null questionpaper_path even when
  // ExamQuestionPapers has the file path — enrich so the eye icon survives refresh.
  return enrichQuestionPaperFilePaths(list);
}

export async function finalizeOneQuestionPaper(params: {
  questionPaperId: number;
  data?: Record<string, unknown>;
  statusCatDetId?: number;
}): Promise<AnyRow> {
  // Angular Finalize(): updateDetails(ExamQuestionPaperCrudUrl, fullRecord,
  // questionPaperId, 'questionPaperId') with questionPaperStatusCatDetId = 623
  // (Approved). Re-send the full mapped record so the update does not null out
  // the paper's other columns. Entity = 'ExamQuestionPapers', PK = questionPaperId.
  const payload = {
    ...(params.data ?? {}),
    questionPaperStatusCatDetId: params.statusCatDetId ?? 623,
  };
  return domainUpdate<AnyRow>(
    "ExamQuestionPapers",
    "questionPaperId",
    params.questionPaperId,
    payload,
  );
}

export async function listViewFinalQuestionPapers(params: {
  employeeId: number;
  courseId?: number;
  examId?: number;
  academicYearId?: number;
}): Promise<AnyRow[]> {
  const rows = await listFinalizableQuestionPapers({
    employeeId: params.employeeId,
    examId: params.examId ?? 0,
    courseId: params.courseId ?? 0,
    academicYearId: params.academicYearId ?? 0,
    courseYearId: undefined,
    subjectId: undefined,
    regulationId: undefined,
  });
  return rows.filter(
    (r) =>
      String(
        r?.question_status ?? r?.questionPaperStatus ?? "",
      ).toLowerCase() === "approved",
  );
}

export async function publishQuestionPaperColleges(
  payload: Record<string, unknown>[],
): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.ADD_QP_COLLEGES_LIST, payload);
}

function openPdfFromBase64(base64: string): void {
  let normalized = String(base64 ?? "")
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad === 2) normalized += "==";
  else if (pad === 3) normalized += "=";

  const byteCharacters = atob(normalized);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  globalThis.open?.(url, "_blank", "noopener,noreferrer");
}

export type QpDownloadKind = "questionPaper" | "modelAnswer";

const QP_BASE64_KEYS = [
  "questionPaperBase64",
  "questionpaperBase64",
  "question_paper_base64",
] as const;
const AS_BASE64_KEYS = [
  "modelAnswerSheetBase64",
  "modelAnswerPaperBase64",
  "modelanswersheetBase64",
  "answerSheetBase64",
  "model_answer_sheet_base64",
] as const;

function pickBase64Field(data: AnyRow | null | undefined, keys: readonly string[]): string {
  if (!data || typeof data !== "object") return "";
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const nested = data.data;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (nested && typeof nested === "object") {
    for (const k of keys) {
      const v = (nested as AnyRow)[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return "";
}

/** Soft GET — never throws (API often returns success:false "No Records(s) found."). */
export async function fetchQuestionPaperDownloadData(
  questionPaperId: number,
): Promise<AnyRow | null> {
  if (!questionPaperId) return null;
  try {
    return await fetchDetails<AnyRow>(
      QUESTION_PAPER_API.DOWNLOAD_QP_AND_ANSWER_SHEET,
      { id: questionPaperId },
    );
  } catch {
    return null;
  }
}

export async function getQuestionPaperPdfAvailability(
  questionPaperId: number,
): Promise<{ qp: boolean; as: boolean }> {
  const data = await fetchQuestionPaperDownloadData(questionPaperId);
  if (!data) return { qp: false, as: false };
  return {
    qp: Boolean(pickBase64Field(data, QP_BASE64_KEYS)),
    as: Boolean(pickBase64Field(data, AS_BASE64_KEYS)),
  };
}

/**
 * Mark list rows where MinIO path is null but downloadQPAndAnswerSheet has PDF
 * (so the eye icon can show — same preview Angular uses).
 */
export async function markQuestionPaperPdfAvailability(
  rows: AnyRow[],
): Promise<AnyRow[]> {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const limit = rows.slice(0, 25);
  const rest = rows.slice(25);
  const marked = await Promise.all(
    limit.map(async (row) => {
      const id = Number(
        row.pk_exam_questionpaper_id ??
          row.questionPaperId ??
          row.examQuestionPaperId ??
          0,
      );
      const hasQpPath = Boolean(
        String(row.questionpaper_path ?? row.questionPaperPath ?? "").trim(),
      );
      const hasAsPath = Boolean(
        String(
          row.modelanswersheet_path ?? row.modelAnswerSheetPath ?? "",
        ).trim(),
      );
      if (!id || (hasQpPath && hasAsPath)) {
        return {
          ...row,
          _qpPdfAvailable: hasQpPath || Boolean(row._qpPdfAvailable),
          _asPdfAvailable: hasAsPath || Boolean(row._asPdfAvailable),
        };
      }
      const avail = await getQuestionPaperPdfAvailability(id);
      return {
        ...row,
        // Keep session/cache flags if download probe is empty (list path often null).
        _qpPdfAvailable: hasQpPath || avail.qp || Boolean(row._qpPdfAvailable),
        _asPdfAvailable: hasAsPath || avail.as || Boolean(row._asPdfAvailable),
      };
    }),
  );
  return [...marked, ...rest];
}

/**
 * Angular preview via download API (not MinIO direct URL):
 *   GET downloadQPAndAnswerSheet?id={questionPaperId}
 *   → data.questionPaperBase64 / modelAnswerSheetBase64 → PDF blob in new tab
 *
 * Direct MinIO links often 404 (NoSuchKey) when NEXT_PUBLIC_MINIO_URL points at
 * a different host/bucket than where Spring stored the file.
 */
export async function downloadAndOpenQuestionPaperPdf(
  questionPaperId: number,
  kind: QpDownloadKind = "questionPaper",
): Promise<void> {
  if (!questionPaperId) {
    throw new Error("Question paper id is required.");
  }
  const data = await fetchQuestionPaperDownloadData(questionPaperId);
  const keys = kind === "modelAnswer" ? AS_BASE64_KEYS : QP_BASE64_KEYS;
  const base64 = pickBase64Field(data, keys);
  if (!base64) {
    throw new Error(
      kind === "modelAnswer"
        ? "Model answer PDF is not available."
        : "Question paper PDF is not available.",
    );
  }
  openPdfFromBase64(base64);
}

export async function getQuestionPaperPublishDetails(
  questionPaperId: number,
): Promise<{
  publishedList: AnyRow[];
  roles: AnyRow[];
  employees: AnyRow[];
}> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_examquestionpaper_details",
    {
      in_flag: "list_questionpaper_publish",
      in_orgid: 0,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_exam_questionpaper_template_id: 1,
      in_exam_questionpaper_id: 0,
      in_exam_id: 0,
      in_course_year_id: 0,
      in_subject_id: 0,
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_regulation_id: 0,
      in_emp_id: 0,
      in_questionpaper_id: questionPaperId,
      in_evaluator_role_id: 0,
      in_exam_evaluationassignment_id: 0,
    },
  );
  const groups = data?.result ?? [];
  return {
    publishedList: groups[0] ?? [],
    roles: groups[1] ?? [],
    employees: groups[2] ?? [],
  };
}

function pickNumSafe(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (n > 0) return n;
  }
  return 0;
}

export async function listPublishedExamQuestionPapers(params: {
  employeeId: number;
  examId: number;
  orgId?: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_examquestionpaper_details",
    {
      in_flag: "list_questionpaper_incharge",
      in_orgid: params.orgId ?? 0,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_exam_questionpaper_template_id: 1,
      in_exam_questionpaper_id: 0,
      in_exam_id: params.examId,
      in_course_year_id: 0,
      in_subject_id: 0,
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_regulation_id: 0,
      in_emp_id: params.employeeId || 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_exam_evaluationassignment_id: 0,
    },
  );
  const groups = data?.result ?? [];
  return (groups[0] ?? []).filter(Boolean);
}

export async function generateSecretCodeForPublishedQp(payload: {
  examQuestionPaperCollegeId: number;
  empId: number;
  examName: string;
  subjectName: string;
  subjectCode: string;
  examDate: string;
}): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.GENERATE_SECRET_CODE, payload);
}

export async function validateSecretCodeForPublishedQp(params: {
  code: string;
  examQuestionPaperCollegeId: number;
  empId: number;
}): Promise<any> {
  return fetchDetails<any>(EXAM_EVAL_API.VALIDATE_SECRET_CODE, params);
}

export async function getEvaluationModerationFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_filters",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_filters") ?? [];
}

export async function getEvaluationModerationRest(params: {
  employeeId: number;
  courseId: number;
  academicYearId: number;
  examId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_rest_in_regexamstd",
      in_flag_type: "REGSUP",
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
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return (
    groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_rest_filters") ?? []
  );
}

export async function getEvaluationModerationSubjects(params: {
  employeeId: number;
  courseId: number;
  academicYearId: number;
  examId: number;
  courseYearId: number;
  regulationId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_regexamstd",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_sub_flag_type: "NoLAB",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return (
    groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_sub_regexamstd") ??
    []
  );
}

export async function listEvaluationModerationData(params: {
  organizationId: number;
  employeeId: number;
  courseId: number;
  academicYearId: number;
  examId: number;
  courseYearId: number;
  subjectId: number;
  regulationId: number;
}): Promise<{
  evaluators: AnyRow[];
  totals: AnyRow[];
  omrRows: AnyRow[];
  students: AnyRow[];
}> {
  const common = {
    in_orgid: params.organizationId || 1,
    in_fdate: "1990-01-01",
    in_tdate: "1990-01-01",
    in_evalutor_profileid: 0,
    in_exam_date: "1990-01-01",
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: params.in_evaluator_role_id,
    in_academic_year: "",
    in_exam_short_name: "",
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId || 0,
  };
  const toResultGroups = async (
    flag:
      | "list_moderation_evaluatorassignment_list"
      | "list_moderation_evaluationstudent_list",
    evaluatorRoleId: number,
  ): Promise<AnyRow[][]> => {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(
        "s_get_examevaluation_bycodes",
        {
          in_flag: flag,
          ...common,
          in_evaluator_role_id: evaluatorRoleId,
        },
      );
      return data?.result ?? [];
    } catch (error: any) {
      // "No Records(s) found." is a valid empty-state for this flow.
      const msg = String(error?.message ?? "");
      if (msg.toLowerCase().includes("no records")) return [];
      throw error;
    }
  };

  const evaluatorGroups = await toResultGroups(
    "list_moderation_evaluatorassignment_list",
    64,
  );
  const studentGroups = await toResultGroups(
    "list_moderation_evaluationstudent_list",
    0,
  );
  return {
    evaluators: evaluatorGroups[0] ?? [],
    totals: evaluatorGroups[1] ?? [],
    omrRows: evaluatorGroups[2] ?? [],
    students: studentGroups[0] ?? [],
  };
}

/**
 * Angular evaluation-moderation Assign():
 *   GET getAllRecords/s_pop_exam_evaluatorassignment
 *   in_flag = AssignModerationEvaluation
 *   in_profileids = Formdata.examEvaluatorProfileId
 *     (pk_examevaluator_profiledet_id or pk_exam_evaluator_profile_id per Angular build)
 */
export async function assignModerationEvaluation(params: {
  profileId: number;
  examId: number;
  subjectId: number;
  courseYearId: number;
  omrSerialNos: string;
}): Promise<AnyRow> {
  return getAllRecords<AnyRow>("s_pop_exam_evaluatorassignment", {
    in_flag: "AssignModerationEvaluation",
    in_profileids: params.profileId,
    in_exam_evaluationassignment_ids: "",
    in_omr_serial_nos: params.omrSerialNos,
    in_timetable_det_ids: "",
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  });
}

export async function getChiefEvaluationFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_inep_filters",
      in_flag_type: "CHIEF_EVAL",
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "ALL",
      in_param1: 0,
      in_param2: "REGSUP",
    },
  ).catch(() => ({ result: [] }));
  const groups = data?.result ?? [];
  return (
    groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_inep_filters") ?? []
  );
}

export async function getChiefEvaluationSubjectFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_inep",
      in_flag_type: "CHIEF_EVAL",
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: params.employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "NoLAB",
      in_param1: 0,
      in_param2: 0,
    },
  ).catch(() => ({ result: [] }));
  const groups = data?.result ?? [];
  return (
    groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_sub_inep") ?? []
  );
}

export async function listChiefEvaluationRows(params: {
  employeeId: number;
  organizationId: number;
  examId: number;
  courseId: number;
  academicYearId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_examevaluation_bycodes",
    {
      in_flag: "list_evaluationApprovalstudent_list",
      in_orgid: params.organizationId || 1,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 0,
      in_exam_id: params.examId,
      in_course_year_id: params.courseYearId,
      in_subject_id: params.subjectId,
      in_regulation_id: params.regulationId,
      in_course_id: params.courseId,
      in_academic_year_id: params.academicYearId,
      in_loginuser_empid: params.employeeId || 0,
    },
  ).catch(() => ({ result: [] }));
  return (data?.result?.[0] ?? []).filter(Boolean);
}

export async function getChiefEvaluatorDetails(params: {
  employeeId: number;
  organizationId: number;
  examId: number;
  courseId: number;
  academicYearId: number;
  courseYearId: number;
  regulationId: number;
  subjectId: number;
}): Promise<{
  chiefDetails: AnyRow[];
  marks: AnyRow[];
  chiefEvaluations: AnyRow[];
}> {
  // Angular getChiefEvaluatorDetails() reads ALL three result groups:
  //   result[0] = chief details (assignment_allowed),
  //   result[1] = per-evaluator marks list (the pivot source, has evaluator_number),
  //   result[2] = the chief's own evaluations ("My Evaluations" column).
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_examevaluation_bycodes",
    {
      in_flag: "chief_evaluator_details",
      in_orgid: params.organizationId || 1,
      in_fdate: "1990-01-01",
      in_tdate: "1990-01-01",
      in_evalutor_profileid: 0,
      in_exam_date: "1990-01-01",
      in_emp_id: 0,
      in_questionpaper_id: 0,
      in_evaluator_role_id: 0,
      in_academic_year: "",
      in_exam_short_name: "",
      in_affiliatedto_catdet_id: 0,
      in_exam_id: params.examId,
      in_course_year_id: params.courseYearId,
      in_subject_id: params.subjectId,
      in_regulation_id: params.regulationId,
      in_course_id: params.courseId,
      in_academic_year_id: params.academicYearId,
      in_loginuser_empid: params.employeeId || 0,
    },
  ).catch(() => ({ result: [] }));
  const groups = data?.result ?? [];
  return {
    chiefDetails: (groups[0] ?? []).filter(Boolean),
    marks: (groups[1] ?? []).filter(Boolean),
    chiefEvaluations: (groups[2] ?? []).filter(Boolean),
  };
}

export async function assignChiefEvaluation(params: {
  evaluatorProfileId: number;
  evaluatorProfileDetId: number;
  examEvaluationAssignmentId: number;
  omrSerialNo: string;
}): Promise<AnyRow> {
  const payload = {
    in_flag: "chief_eval_assignment",
    in_evaluator_profile_id: params.evaluatorProfileId,
    in_evaluator_profiledet_id: params.evaluatorProfileDetId,
    in_exam_evaluationassignment_id: params.examEvaluationAssignmentId,
    in_omr_serial_no: params.omrSerialNo,
  };
  // Angular popExamChiefEvalAssign = s_pop_exam_chief_eval_assgn (note 'assgn').
  return getAllRecords<AnyRow>("s_pop_exam_chief_eval_assgn", payload);
}

export async function getAssignSubjectsEvaluatorRoles(): Promise<AnyRow[]> {
  const params = {
    in_viewname: "v_get_exam_eval_roles",
    in_select: "",
    in_whereclause: "",
  };
  const procs = [
    "s_get_viewdata",
    "s_get_viewdetails_bycode",
    "s_get_view_details_bycode",
    "s_get_viewdetails",
  ];
  for (const proc of procs) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, params);
      const groups = data?.result ?? [];
      const rows = (groups[0] ?? []).filter(Boolean);
      if (rows.length > 0) return rows;
    } catch {
      // try next proc variant
    }
  }
  return [
    { pk_role_id: 64, role_name: "Evaluator" },
    { pk_role_id: 96, role_name: "Moderator" },
    { pk_role_id: 97, role_name: "Chief Evaluator" },
  ];
}

export async function getAssignSubjectsEvaluatorRegulationSubjects(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_univ_exam_details",
    {
      in_flag: "clg_exam_subject_filters",
      in_flag_type: "",
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
      in_sub_flag_type: "",
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return groups.flatMap((g) => g ?? []).filter(Boolean);
}

/** Initial cascade rows — Angular `univ_exam_filters` / REGSUP (assign-evaluator-subjectroles). */
export async function getEvaluatorSubjectRolesExamFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_filters",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "ALL",
      in_param1: 0,
      in_param2: 0,
    },
  );
  const groups = data?.result ?? [];
  return groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_filters") ?? [];
}

/** Subjects after regulation — `univ_exam_subject_regexamstd` (matches Angular subject-roles). */
export async function getEvaluatorSubjectRolesSubjects(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  regulationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "univ_exam_subject_regexamstd",
      in_flag_type: "REGSUP",
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_sub_flag_type: "ALL",
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    },
  );
  const groups = data?.result ?? [];
  return (
    groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_sub_regexamstd") ??
    []
  );
}

/**
 * Post-save "map evaluators" side effects fired by the Angular subject-roles
 * submit(): populate the profile→employee mapping, then set up exam committees.
 * Both are fire-and-forget stored procs (responses are ignored).
 */
export async function popProfileEmployees(profileId: number): Promise<void> {
  if (!profileId) return;
  await getAllRecords("s_pop_profile_employees", {
    in_profile_id: profileId,
  }).catch(() => null);
}

export async function setupExamCommittees(): Promise<void> {
  await getAllRecords("s_pop_exam_committees", {
    in_flag: "exam_committees",
  }).catch(() => null);
}

/** Child rows for an evaluator profile (domain list; entity name may vary by backend). */
export async function listExamEvaluatorProfileDetails(
  profileId: number,
): Promise<AnyRow[]> {
  if (!profileId) return [];
  // Angular uses the dedicated getExamEvaluatorProfileDetails endpoint
  // (?examEvaluatorProfileId=<id>), NOT the generic domain/list.
  const res = await fetch(
    NEXT_API.PROXY(
      `getExamEvaluatorProfileDetails?examEvaluatorProfileId=${profileId}`,
    ),
  ).catch(() => null);
  if (!res || !res.ok) return [];
  const body = (await res.json().catch(() => null)) as
    | AnyRow[]
    | { data?: AnyRow[] | { resultList?: AnyRow[] } }
    | null;
  if (Array.isArray(body)) return body;
  const data = (body as { data?: AnyRow[] | { resultList?: AnyRow[] } } | null)
    ?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { resultList?: AnyRow[] }).resultList)) {
    return (data as { resultList?: AnyRow[] }).resultList ?? [];
  }
  return [];
}

export async function saveAssignSubjectsEvaluator(
  payload: Record<string, unknown>[],
): Promise<void> {
  const res = await fetch(
    NEXT_API.PROXY(EXAM_EVAL_API.UPDATE_EVALUATOR_PROFILES),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    throw new Error(
      body?.message ?? "Failed to save assign subjects evaluator details.",
    );
  }
}

export async function getExamEvaluationSettingsFilters(
  employeeId: number,
): Promise<AnyRow[]> {
  return getFinalizeQuestionPaperFilters(employeeId);
}

export async function listExamEvaluationSettings(
  examId: number,
): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    EXAM_EVAL_API.EVALUATION_SETTINGS,
    buildQuery({ "ExamMaster.examId": examId, isActive: true }),
  );
}

export async function createExamEvaluationSetting(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainCreate<AnyRow>(EXAM_EVAL_API.EVALUATION_SETTINGS, payload);
}

export async function updateExamEvaluationSetting(
  evaluationSettingId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    EXAM_EVAL_API.EVALUATION_SETTINGS,
    "evaluationSettingId",
    evaluationSettingId,
    payload,
  );
}

export async function listEvaluatorProfiles(): Promise<AnyRow[]> {
  // Newest first (Angular list adds query=order(createdDt=desc)).
  return domainList<AnyRow>(
    EXAM_EVAL_API.EVALUATOR_PROFILES,
    "order(createdDt=desc)",
  );
}

/**
 * Title (salutation) options for the Create/Edit Evaluator dialog. Mirrors
 * Angular getTitle() -> GeneralDetail by generalMasterCode 'TITLE'. Each row
 * has generalDetailId + generalDetailName/generalDetailDisplayName.
 */
export async function listEvaluatorTitles(): Promise<AnyRow[]> {
  const q = buildQuery({
    "GeneralMaster.generalMasterCode": "TITLE",
    isActive: true,
  });
  return domainList<AnyRow>("GeneralDetail", q);
}

/**
 * Evaluator bank details (Angular AddBankDetails/postBankDetails/UpdateBankDetails
 * on ExamEvaluatorBankDetailsUrl). Existing rows are looked up by the nested
 * examEvaluatorProfiles.examEvaluatorProfileId; create sends examEvaluatorProfilesId,
 * update keys on evaluatorBankDetailId.
 */
export async function getEvaluatorBankDetails(
  profileId: number,
): Promise<AnyRow[]> {
  if (!profileId) return [];
  const q = buildQuery({
    "examEvaluatorProfiles.examEvaluatorProfileId": profileId,
  });
  return domainList<AnyRow>(EXAM_EVAL_API.EVALUATOR_BANK_DETAILS, q).catch(
    () => [],
  );
}

export async function createEvaluatorBankDetails(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainCreate<AnyRow>(EXAM_EVAL_API.EVALUATOR_BANK_DETAILS, payload);
}

export async function updateEvaluatorBankDetails(
  evaluatorBankDetailId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    EXAM_EVAL_API.EVALUATOR_BANK_DETAILS,
    "evaluatorBankDetailId",
    evaluatorBankDetailId,
    payload,
  );
}

/**
 * Employee name/number search for the "Existing Employee" picker in the
 * Create Evaluator dialog. Mirrors Angular enteredEmployee() ->
 * listByIds(employeeSearchUrl, term, 'q') i.e. GET <employeeSearchUrl>?q=<term>.
 * TODO: confirm the exact employeeSearchUrl from the legacy global constants.
 */
export async function searchEvaluatorEmployees(q: string): Promise<AnyRow[]> {
  const term = String(q ?? "").trim();
  if (!term) return [];
  const res = await fetch(
    NEXT_API.PROXY(`employeesearch?q=${encodeURIComponent(term)}`),
  ).catch(() => null);
  if (!res || !res.ok) return [];
  const body = (await res.json().catch(() => null)) as
    | { data?: AnyRow[] }
    | AnyRow[]
    | null;
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  return [];
}

export async function createEvaluatorProfile(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.ADD_EVALUATOR_PROFILES, payload);
}

export async function updateEvaluatorProfile(
  payload: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(
    NEXT_API.PROXY(EXAM_EVAL_API.UPDATE_EVALUATOR_PROFILES),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message ?? "Failed to update evaluator profile.");
  }
}

export async function sendEvaluatorCredentials(
  payload: Record<string, unknown> | Record<string, unknown>[],
): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.SEND_EVALUATOR_CREDENTIALS, payload);
}

/** Active courses — Angular preferences modal `listDetailsByIdsWithSort` on Course. */
export async function listActiveCourses(): Promise<AnyRow[]> {
  return domainList<AnyRow>("Course", buildQuery({ isActive: true }));
}

/** Subjects for a course — Angular `listDetailsByTwoIds` Subject × course. */
export async function listSubjectsByCourseForPreferences(
  courseId: number,
): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    "Subject",
    buildQuery({ "Course.courseId": courseId, isActive: true }),
  );
}

/** Saved preferences for an evaluator profile. */
export async function listExamEvaluatorPreferences(
  profileId: number,
): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      "ExamEvaluatorProfiles.examEvaluatorProfileId": profileId,
      isActive: true,
    }),
    buildQuery({ examEvaluatorProfileId: profileId, isActive: true }),
  ];
  const entities = ["ExamEvaluatorPreferences", "ExamEvaluatorPreference"];
  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q);
        if (Array.isArray(rows) && rows.length) return rows;
      } catch {
        // try next
      }
    }
  }
  return [];
}

/**
 * Bulk replace/update preferences — Angular `updateMasterDetails(updateexamevaluatorereferencesUrl, details)` uses PUT.
 */
export async function updateExamEvaluatorPreferences(
  payload: AnyRow[],
): Promise<void> {
  await putDetails(EXAM_EVAL_API.UPDATE_EVALUATOR_PREFERENCES, payload);
}
