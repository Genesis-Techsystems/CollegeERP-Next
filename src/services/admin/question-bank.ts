/**
 * Question Bank (Assessment) service — Angular `question-bank-list` parity.
 *
 * API endpoints (match Angular CONSTANTS + crudService):
 *   GET  /domain/list/Assessment?query=…     — ADMIN: listAllDetails; else preparedbyUser
 *   POST /assessment                                     — create question bank (assessmentUrl)
 *   PUT  /assessment                                     — update question bank (assessmentUrl)
 *   POST /assessment/addQuestion                         — add / update / soft-delete question
 *   POST /assessment/importQuestionsDetails              — Excel parse (file only in FormData)
 *   GET  /courseLessonSearch?q={term}                    — subject search (listByIds)
 *   GET  /domain/list/GeneralDetail?…                    — question type lookup
 */

import type {
  Assessment,
  AssessmentQuestion,
  CourseQuestion,
  OnlineCourse,
  QuestionType,
} from "@/types/question-bank";
import type { ApiResponse } from "@/types/api";
import {
  domainList,
  domainListRawQuery,
  buildQuery,
  postDetails,
  putDetails,
  uploadFile,
  fetchDetails,
} from "../crud";
import { ENTITIES, ASSESSMENT_API, GM_CODES } from "@/config/constants";
import { AppError } from "@/lib/errors";

// ─── Question Bank CRUD ───────────────────────────────────────────────────────

/**
 * Newest first for the Question Bank grid.
 * Prefer `createdDt` DESC; break ties / missing dates with `assessmentId` DESC
 * so a just-created bank stays on the top row.
 */
function compareNewestFirst(a: Assessment, b: Assessment): number {
  const ta = a.createdDt ? Date.parse(a.createdDt) : Number.NaN;
  const tb = b.createdDt ? Date.parse(b.createdDt) : Number.NaN;
  const aOk = Number.isFinite(ta);
  const bOk = Number.isFinite(tb);
  if (aOk && bOk && tb !== ta) return tb - ta;
  return (b.assessmentId ?? 0) - (a.assessmentId ?? 0);
}

/** Angular: keep only truthy `isForQuestionbank` (drops false / null / undefined). */
function filterQuestionBankRows(rows: Assessment[]): Assessment[] {
  return rows.filter((r) => r.isForQuestionbank).sort(compareNewestFirst);
}

/**
 * Angular `listDetailsByTwoIdWithSort` → filter + sort on Assessment.
 * Do **not** add `isActive==true` — Angular keeps InActive banks in the grid
 * (status column only). A raw `&` would split the URL, so use `.and.`.
 * → `preparedbyUser.userId==1739.order(createdDt=DESC)`
 */
function buildQuestionBankListQuery(userId: number): string {
  return buildQuery(
    { "preparedbyUser.userId": userId },
    { field: "createdDt", direction: "DESC" },
  );
}

/**
 * List question banks — Angular `question-bank-list` parity:
 *   ADMIN: GET /domain/list/Assessment?query=order(createdDt=desc)&size=99999
 *   Non-ADMIN (QuestionPaperSetter and others):
 *     preparedbyUser.userId=={userId}.order(createdDt=DESC)
 * Active and InActive both returned; client filter: `isForQuestionbank`.
 */
export async function listQuestionBanks(
  userId?: number,
): Promise<Assessment[]> {
  if (userId != null && userId > 0) {
    const rows = await domainList<Assessment>(
      ENTITIES.ASSESSMENT.name,
      buildQuestionBankListQuery(userId),
    );
    return filterQuestionBankRows(rows);
  }
  // Match Angular listAllDetails query key order: query=order(createdDt=desc)&size=99999
  const rows = await domainListRawQuery<Assessment>(
    ENTITIES.ASSESSMENT.name,
    "order(createdDt=desc)",
    true,
  );
  return filterQuestionBankRows(rows);
}

/**
 * List tests (non–question-bank assessments).
 * Angular TestComponent: `listAllDetails(Assessment)` then filter `!isForQuestionbank`
 * (no preparedbyUser filter).
 */
export async function listTests(_userId?: number): Promise<Assessment[]> {
  const query = buildQuery({}, { field: "createdDt", direction: "DESC" });
  const rows = await domainList<Assessment>(ENTITIES.ASSESSMENT.name, query);
  return rows.filter((r) => !r.isForQuestionbank);
}

/**
 * Active question banks for “copy questions into test” picker.
 * Angular: `listDetailsByIdWithSort(Assessment, true, 'DESC', 'isActive', 'createdDt')`
 * → isActive==true.order(createdDt=DESC), then filter isForQuestionbank.
 */
export async function listActiveQuestionBanks(): Promise<Assessment[]> {
  const query = buildQuery(
    { isActive: true },
    { field: "createdDt", direction: "DESC" },
  );
  const rows = await domainList<Assessment>(ENTITIES.ASSESSMENT.name, query);
  return rows.filter((r) => r.isForQuestionbank);
}

/**
 * Test settings save — Angular uses `crudService.add(assessmentUrl, test)` (POST),
 * not PUT update.
 */
export async function saveTestSettings(
  data: Record<string, unknown>,
): Promise<Assessment> {
  return postDetails<Assessment>(ASSESSMENT_API.SAVE, data);
}

export async function getAssessmentById(
  assessmentId: number,
): Promise<Assessment | null> {
  if (!assessmentId) return null;
  const rows = await domainList<Assessment>(
    ENTITIES.ASSESSMENT.name,
    buildQuery({ assessmentId }),
  );
  return rows[0] ?? null;
}

/**
 * Create a question bank.
 * Angular: `crudService.add(assessmentUrl, details)` → POST /assessment
 */
export async function createQuestionBank(
  data: Record<string, unknown>,
): Promise<Assessment> {
  return postDetails<Assessment>(ASSESSMENT_API.SAVE, data);
}

export async function createTest(
  data: Record<string, unknown>,
): Promise<Assessment> {
  return postDetails<Assessment>(ASSESSMENT_API.SAVE, data);
}

/**
 * Update a question bank.
 * Angular: `crudService.update(assessmentUrl, request)` → PUT /assessment
 * (body includes assessmentId; not domain/update).
 */
export async function updateQuestionBank(
  data: Record<string, unknown>,
): Promise<Assessment> {
  return putDetails<Assessment>(ASSESSMENT_API.SAVE, data);
}

export async function updateTest(
  data: Record<string, unknown>,
): Promise<Assessment> {
  return putDetails<Assessment>(ASSESSMENT_API.SAVE, data);
}

// ─── Questions ────────────────────────────────────────────────────────────────

/**
 * Fetch all questions for a given question bank.
 * Returns the assessmentQuestionDTOs array from the Assessment record.
 */
export async function listQuestionsByBank(
  assessmentId: number,
): Promise<AssessmentQuestion[]> {
  const rows = await domainList<Assessment>(
    ENTITIES.ASSESSMENT.name,
    buildQuery({ assessmentId }),
  );
  return rows[0]?.assessmentQuestionDTOs ?? [];
}

/**
 * Add a new question or update an existing one (also used for soft-delete).
 * Angular: `crudService.add(addQuestionUrl, questionJson)` → POST /assessment/addQuestion
 */
export async function addOrUpdateQuestion(
  payload: Partial<CourseQuestion> & {
    assessmentId: number;
    assessmentQuestionId?: number;
    questionOwnerProfileId?: number | null;
  },
): Promise<CourseQuestion> {
  return postDetails<CourseQuestion>(ASSESSMENT_API.ADD_QUESTION, payload);
}

/**
 * Bulk-import: parse Excel via Angular `importAssessmentUrl`.
 * FormData contains **only** `file` (no assessmentId) — matches Angular upload().
 * Caller must POST each returned row via addOrUpdateQuestion / buildImportedQuestionPayload.
 */
export async function importQuestionsFromExcel(
  file: File,
): Promise<Partial<CourseQuestion>[]> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const body = (await uploadFile(
    ASSESSMENT_API.BULK_IMPORT,
    formData,
  )) as ApiResponse<Partial<CourseQuestion>[]> | null;

  if (!body?.success) {
    throw new AppError(
      "API_ERROR",
      body?.message ?? "Failed to import questions",
    );
  }
  return (body.data ?? []) as Partial<CourseQuestion>[];
}

/**
 * Build addQuestion payload for one imported Excel row — Angular `importedQuestions()`.
 */
export function buildImportedQuestionPayload(
  row: Partial<CourseQuestion>,
  assessmentId: number,
): Partial<CourseQuestion> & { assessmentId: number } {
  const options = (row.courseQuestionOptionDTOs ?? []).map((opt) => ({
    ...opt,
    courseQuestionOptionId: null,
    courseQuestionId: null,
    isActive: true,
  }));

  return {
    assessmentId,
    question: row.question,
    fbInputTypeCatId: row.fbInputTypeCatId,
    isActive: true,
    correctAnswerIds: [],
    courseQuestionOptionDTOs:
      options as CourseQuestion["courseQuestionOptionDTOs"],
    onlineCourseId: null,
    courseLessonId: null,
    courseLessonTopicId: null,
  };
}

// ─── Dropdown data ────────────────────────────────────────────────────────────

/**
 * Search courses by name for the question bank modal.
 * Angular: `listByIds(courseLessonSearchUrl, term, 'q')` → GET courseLessonSearch?q=
 * Only call when the user typed more than 4 characters (Angular `enteredCourse`).
 */
export async function searchCourses(term: string): Promise<OnlineCourse[]> {
  const q = term?.trim() ?? "";
  if (!q) return [];
  const data = await fetchDetails<OnlineCourse[] | OnlineCourse>(
    ASSESSMENT_API.COURSE_LESSON_SEARCH,
    { q },
  );
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
}

/**
 * Fetch question types (MC, TF, FB, SUB) from GeneralDetail.
 * Angular: listDetailsByTwoIds(GeneralDetail, questionType, 'true', generalMasterCode, isActive)
 */
export async function listQuestionTypes(): Promise<QuestionType[]> {
  return domainList<QuestionType>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({
      "GeneralMaster.generalMasterCode": GM_CODES.QUESTION_TYPE,
      isActive: true,
    }),
  );
}
