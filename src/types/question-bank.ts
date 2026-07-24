export interface CourseQuestionOption {
  courseQuestionOptionId: number | null;
  courseQuestionId?: number | null;
  options: string; // HTML content
  isCorrectAnswer: boolean;
  isActive: boolean;
}

export interface CourseQuestion {
  courseQuestionId: number;
  assessmentId: number;
  question: string; // HTML content
  marks: number;
  fbInputTypeCatId: number;
  fbInputTypeCatCode: "MC" | "TF" | "FB" | "SUB";
  fbInputTypeCatDisplayName: string;
  isActive: boolean;
  correctAnswerIds: number[];
  courseQuestionOptionDTOs: CourseQuestionOption[];
  onlineCourseId: number | null;
  courseLessonId: number | null;
  courseLessonTopicId: number | null;
}

export interface AssessmentQuestion {
  assessmentQuestionId: number;
  assessmentId: number;
  courseQuestionDTO: CourseQuestion;
}

export interface Assessment {
  assessmentId: number;
  assessmentName: string;
  assessmentNo: number;
  assessmentDescription: string;
  isActive: boolean;
  isForQuestionbank: boolean;
  isForPractice?: boolean;
  isCertification?: boolean;
  /** Angular publish(): set true then PUT /assessment */
  isSystemcorrection?: boolean;
  isPublic: boolean;
  isOnlineCourse: boolean;
  onlineCourseId: number | null;
  onlineCourseName?: string;
  onlineCourseCode?: string;
  courseLessonId: number | null;
  courseLessonTopicId: number | null;
  subjectId?: number | null;
  /** Used by Angular template for Question link visibility (`!== null`) */
  collegeCode?: string | null;
  /** Used by Angular template for Edit link visibility (`!== null`) */
  academicYear?: string | null;
  userId: number;
  preparedbyUserId: number;
  createdDt?: string;
  duration?: string | null;
  noOfMaxAttempts?: number | null;
  totalQuestions?: number | null;
  minMarksToPass?: number | null;
  minMarksPercentage?: number | null;
  reason?: string;
  assessmentQuestionDTOs: AssessmentQuestion[] | null;
}

// ─── Dropdown data for the modal ─────────────────────────────────────────────

export interface CourseLessonTopic {
  courseLessonTopicId: number;
  topicName: string;
}

export interface CourseLesson {
  courseLessonId: number;
  lessonName: string;
  courseLessonTopicDTOs: CourseLessonTopic[];
}

export interface OnlineCourse {
  onlineCourseId: number;
  onlineCourseName: string;
  onlineCourseCode: string;
  subjectId: number;
  courseLessonDTOs: CourseLesson[];
}

// ─── Question type from GeneralDetail lookup ──────────────────────────────────

export interface QuestionType {
  generalDetailId: number;
  generalDetailCode: "MC" | "TF" | "FB" | "SUB";
  generalDetailDisplayName: string;
}

// ─── Form value types ─────────────────────────────────────────────────────────

export interface QuestionBankFormValues {
  assessmentName: string;
  assessmentNo: number | "";
  assessmentDescription: string;
  isActive: boolean;
  reason: string;
  isPublic: boolean;
  isOnlineCourse: boolean;
  onlineCourseId: number | null;
  courseLessonId: number | null;
  courseLessonTopicId: number | null;
}
