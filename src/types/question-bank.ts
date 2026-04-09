export interface CourseQuestionOption {
  courseQuestionOptionId: number | null
  courseQuestionId?: number
  options: string // HTML content
  isCorrectAnswer: boolean
  isActive: boolean
}

export interface CourseQuestion {
  courseQuestionId: number
  assessmentId: number
  question: string // HTML content
  marks: number
  fbInputTypeCatId: number
  fbInputTypeCatCode: 'MC' | 'TF' | 'FB' | 'SUB'
  fbInputTypeCatDisplayName: string
  isActive: boolean
  correctAnswerIds: number[]
  courseQuestionOptionDTOs: CourseQuestionOption[]
  onlineCourseId: number | null
  courseLessonId: number | null
  courseLessonTopicId: number | null
}

export interface AssessmentQuestion {
  assessmentQuestionId: number
  assessmentId: number
  courseQuestionDTO: CourseQuestion
}

export interface Assessment {
  assessmentId: number
  assessmentName: string
  assessmentNo: number
  assessmentDescription: string
  isActive: boolean
  isForQuestionbank: boolean
  isPublic: boolean
  isOnlineCourse: boolean
  onlineCourseId: number | null
  onlineCourseName?: string
  onlineCourseCode?: string
  courseLessonId: number | null
  courseLessonTopicId: number | null
  userId: number
  preparedbyUserId: number
  createdDt?: string
  reason?: string
  assessmentQuestionDTOs: AssessmentQuestion[]
}

// ─── Dropdown data for the modal ─────────────────────────────────────────────

export interface CourseLessonTopic {
  courseLessonTopicId: number
  topicName: string
}

export interface CourseLesson {
  courseLessonId: number
  lessonName: string
  courseLessonTopicDTOs: CourseLessonTopic[]
}

export interface OnlineCourse {
  onlineCourseId: number
  onlineCourseName: string
  onlineCourseCode: string
  subjectId: number
  courseLessonDTOs: CourseLesson[]
}

// ─── Question type from GeneralDetail lookup ──────────────────────────────────

export interface QuestionType {
  generalDetailId: number
  generalDetailCode: 'MC' | 'TF' | 'FB' | 'SUB'
  generalDetailDisplayName: string
}

// ─── Form value types ─────────────────────────────────────────────────────────

export interface QuestionBankFormValues {
  assessmentName: string
  assessmentNo: number | ''
  assessmentDescription: string
  isActive: boolean
  reason: string
  isPublic: boolean
  isOnlineCourse: boolean
  onlineCourseId: number | null
  courseLessonId: number | null
  courseLessonTopicId: number | null
}
