/**
 * ExamGrade entity types.
 * Spring Boot entity: ExamGrade
 * Primary key: examGradesId
 *
 * Angular source: exam-grades-modal.component.ts
 * Fields: gradeName, gradeCode, minPoints, maxPoints,
 *         minScorePercent, maxScorePercent, creditPoints,
 *         description, isActive, reason
 *
 * Linked to: universityId, courseId, regulationId
 */

export interface ExamGrade {
  examGradesId: number
  gradeName: string
  gradeCode: string
  /** Minimum grade points (GPA) */
  minPoints: number
  /** Maximum grade points (GPA) */
  maxPoints: number
  /** Minimum score percentage to achieve this grade */
  minScorePercent: number
  /** Maximum score percentage for this grade band */
  maxScorePercent: number
  /** Credit points earned when this grade is achieved */
  creditPoints: number
  description?: string
  isActive: boolean
  reason?: string
  /** Linked university */
  universityId?: number
  /** Linked course */
  courseId?: number
  /** Linked regulation */
  regulationId?: number
  isForDisabled?: boolean
  createdDt?: string
  updatedDt?: string
}

export interface ExamGradeFormValues {
  gradeName: string
  gradeCode: string
  minPoints: number
  maxPoints: number
  minScorePercent: number
  maxScorePercent: number
  creditPoints: number
  description: string
  isActive: boolean
  reason: string
  /** FK fields injected from filter context */
  universityId?: number
  courseId?: number
  regulationId?: number
  isForDisabled?: boolean
}
