import { EXAM_EVAL_API } from '@/config/constants/api'
import { fetchDetails, getAllRecords, postDetails, uploadFile, crud } from '@/services/crud'

export async function runEvaluationProc<T = unknown>(procName: string, params: Record<string, unknown>): Promise<T> {
  return getAllRecords<T>(procName, params)
}

export async function uploadExamOmr(formData: FormData): Promise<unknown> {
  return uploadFile(EXAM_EVAL_API.UPLOAD_EXAM_OMR, formData)
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

