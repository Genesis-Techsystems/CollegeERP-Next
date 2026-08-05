/**
 * Feedback Question — Angular `FeedbackQuestion` / `feedbackQuestionUrl`.
 * Uses existing domain CRUD (no new backend endpoints).
 */
import { ENTITIES } from '@/config/constants/entities'
import type { FbQuestion } from '@/types/feedback-question'
import { buildQuery, domainCreate, domainList, domainUpdate } from './crud'

const E = ENTITIES.FEEDBACK_QUESTION

/** Angular `listAllDetails(feedbackQuestionUrl)` — newest first. */
export async function listFbQuestions(): Promise<FbQuestion[]> {
  return domainList<FbQuestion>(
    E.name,
    buildQuery({}, { field: 'fbQuestionId', direction: 'DESC' }),
  )
}

/** Angular `addDetails(feedbackQuestionUrl, details)`. */
export async function createFbQuestion(
  data: Omit<FbQuestion, 'fbQuestionId'>,
): Promise<FbQuestion> {
  return domainCreate<FbQuestion>(E.name, data)
}

/** Angular `updateDetails(..., details.fbQuestionId, fbQuestionIdUrl)`. */
export async function updateFbQuestion(
  id: number,
  data: Partial<FbQuestion>,
): Promise<FbQuestion> {
  return domainUpdate<FbQuestion>(E.name, E.pk, id, data)
}
