import { EXAM_EVAL_API } from "@/config/constants/api";
import {
  fetchDetails,
  getAllRecords,
  postDetails,
  uploadFile,
  crud,
} from "@/services/crud";

type AnyRow = Record<string, any>;

export async function runEvaluationProc<T = unknown>(
  procName: string,
  params: Record<string, unknown>,
): Promise<T> {
  return getAllRecords<T>(procName, params as Record<string, string | number>);
}

export async function uploadExamOmr(formData: FormData): Promise<unknown> {
  return uploadFile(EXAM_EVAL_API.UPLOAD_EXAM_OMR, formData);
}

/**
 * Angular scan-upload-papers `getFiltersList`:
 * getAllRecords/s_get_collegeexamdetails_bycode
 * in_flag=exam_timetable_details …
 */
export async function getScanUploadTimetableFilters(
  organizationId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: AnyRow[][] }>(
    EXAM_EVAL_API.GET_COLLEGE_EXAM_DETAILS,
    {
      in_flag: "exam_timetable_details",
      in_org_id: organizationId || 0,
      in_college_id: 0,
      in_academic_year_id: 0,
      in_isadmin: "",
      in_exam_id: 0,
      in_timetable_id: 0,
      in_exam_date: "1990-01-01",
      in_subject_id: 0,
      in_loginuser_empid: 0,
      in_loginuser_roleid: 0,
    },
  );
  const groups = Array.isArray(data?.result) ? data.result : [];
  for (const group of groups) {
    if (
      Array.isArray(group) &&
      group.length > 0 &&
      String(group[0]?.flag ?? "") === "exam_timetable_details"
    ) {
      return group;
    }
  }
  return Array.isArray(groups[0]) ? groups[0] : [];
}

/**
 * Angular scan-upload-papers `getList`:
 * same proc, in_flag=exam_timetable_answerpaper_details
 * Uses `result[0]` (first result group) exactly like Angular.
 */
export async function getScanUploadAnswerPaperSummary(params: {
  organizationId: number;
  timetableId: number;
  examDate: string;
  subjectId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: AnyRow[][] }>(
    EXAM_EVAL_API.GET_COLLEGE_EXAM_DETAILS,
    {
      in_flag: "exam_timetable_answerpaper_details",
      in_org_id: params.organizationId || 0,
      in_college_id: 0,
      in_academic_year_id: 0,
      in_isadmin: 0,
      in_exam_id: 0,
      in_timetable_id: params.timetableId || 0,
      in_exam_date: params.examDate || "1990-01-01",
      in_subject_id: params.subjectId || 0,
      in_loginuser_empid: 0,
      in_loginuser_roleid: 0,
    },
  );
  const groups = Array.isArray(data?.result) ? data.result : [];
  return Array.isArray(groups[0]) ? groups[0] : [];
}

/** Extract uploaded path the way Angular forkJoin handler reads `element[0]`. */
export function extractExamOmrUploadPath(response: unknown): string {
  if (typeof response === "string") return response;
  if (Array.isArray(response) && typeof response[0] === "string") {
    return response[0];
  }
  const body = response as { data?: unknown; result?: unknown } | null;
  const data = body?.data ?? body?.result;
  if (typeof data === "string") return data;
  if (Array.isArray(data) && typeof data[0] === "string") return data[0];
  return "";
}

/** Angular: GET generatePresignedUrls?answerPaperPath=… → data.answerPaperUrl */
export async function getAnswerPaperPresignedUrl(
  answerPaperPath: string,
): Promise<{ answerPaperUrl?: string }> {
  const path = String(answerPaperPath ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!path) {
    throw new Error("Answer paper path is required.");
  }
  return fetchDetails<{ answerPaperUrl?: string }>(
    EXAM_EVAL_API.GENERATE_PRESIGNED_URLS,
    { answerPaperPath: path },
  );
}

export async function addExamEvaluators(payload: unknown): Promise<unknown> {
  return postDetails(EXAM_EVAL_API.ADD_EXAM_EVALUATORS, payload);
}

export async function addExamQpTemplateAndDetails(
  payload: unknown,
): Promise<unknown> {
  return crud.postDetails("addExamQpTemplateAndDetails", payload);
}

export async function getExamQpTemplateAndDetails(
  examQpTemplateId = 0,
): Promise<Record<string, unknown>[]> {
  return fetchDetails<Record<string, unknown>[]>(
    EXAM_EVAL_API.GET_EXAM_QP_TEMPLATE_DETAILS,
    { examQpTemplateId },
  );
}
