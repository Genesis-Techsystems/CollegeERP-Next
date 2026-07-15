import { EXAM_EVAL_API } from '@/config/constants/api'
import { fetchDetails, getAllRecords, postDetails, uploadFile, crud } from '@/services/crud'

export async function runEvaluationProc<T = unknown>(procName: string, params: Record<string, unknown>): Promise<T> {
  return getAllRecords<T>(procName, params as Record<string, string | number>)
}

export async function uploadExamOmr(formData: FormData): Promise<unknown> {
  return uploadFile(EXAM_EVAL_API.UPLOAD_EXAM_OMR, formData)
}

/** Angular: GET generatePresignedUrls?answerPaperPath=… → data.answerPaperUrl */
export async function getAnswerPaperPresignedUrl(
  answerPaperPath: string,
): Promise<{ answerPaperUrl?: string }> {
  const path = String(answerPaperPath ?? "").trim().replace(/^\/+/, "");
  if (!path) {
    throw new Error("Answer paper path is required.");
  }
  return fetchDetails<{ answerPaperUrl?: string }>(
    EXAM_EVAL_API.GENERATE_PRESIGNED_URLS,
    { answerPaperPath: path },
  );
}

export async function addExamEvaluators(payload: unknown): Promise<unknown> {
  return postDetails(EXAM_EVAL_API.ADD_EXAM_EVALUATORS, payload)
}

export async function addExamQpTemplateAndDetails(payload: unknown): Promise<unknown> {
  return crud.postDetails('addExamQpTemplateAndDetails', payload)
}

export async function getExamQpTemplateAndDetails(examQpTemplateId = 0): Promise<Record<string, unknown>[]> {
  return fetchDetails<Record<string, unknown>[]>(EXAM_EVAL_API.GET_EXAM_QP_TEMPLATE_DETAILS, { examQpTemplateId })
}

