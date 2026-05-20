/**
 * ExamSession entity types.
 * Spring Boot entity: ExamSession
 * Primary key: examSessionId
 */

export interface ExamSession {
  examSessionId: number
  examSessionName: string
  /** "HH:mm:ss" or "HH:mm" format as stored by Spring Boot */
  sessionStartTime: string
  /** "HH:mm:ss" or "HH:mm" format as stored by Spring Boot */
  sessionEndTime: string
  /** University this session belongs to */
  universityId?: number
  universityCode?: string
  /** General master category code for session type (EXMSESN) */
  examsessioninCatId?: number
  examsessioninCatCode?: string
  isActive: boolean
  reason?: string
  createdDt?: string
  updatedDt?: string
}

export interface ExamSessionFormValues {
  examSessionName: string
  sessionStartTime: string
  sessionEndTime: string
  universityId: number
  examsessioninCatId?: number
  isActive: boolean
  reason: string
}
