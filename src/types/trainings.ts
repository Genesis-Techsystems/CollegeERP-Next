export interface PlacementTraining {
  traningId: number
  trainingTitle: string
  trainingDescription?: string | null
  trainingTypeCatId?: number | null
  trainingTypeCatCode?: string | null
  trainingTypeCatDisplayName?: string | null
  trainerName: string
  trainerDetails?: string | null
  discussionPoints?: string | null
  startDate: string
  endDate: string
  yearName: string
  employeeId?: number | null
  empName?: string | null
  empNumber?: string | null
  collegeId: number
  collegeCode: string
  collegeName?: string | null
  /**
   * Angular form values: `true` (Student), `false` (Staff), or string `"null"` (All).
   * Backend expects the string `"null"` for All — not JSON null.
   */
  isTrackAudience?: boolean | null | 'null'
  isActive: boolean
  reason?: string | null
  createdDt?: string
  updatedDt?: string
  /** Nested details sometimes returned on Training list rows (Angular view modal). */
  trainigDetailDTOs?: TrainingDetail[] | null
}

export interface TrainingDetail {
  traningDetId: number
  trainingDetailTitle: string
  trainingDetailDesc?: string | null
  trainerName: string
  trainerDetails?: string | null
  location?: string | null
  noOfStudents?: number | null
  roomId?: number | null
  roomCode?: string | null
  roomName?: string | null
  startTime?: string | null
  endTime?: string | null
  fkDayIds?: string | null
  isRecurring?: boolean | null
  isActive: boolean
  reason?: string | null
  paTraningId: number
  collegeId: number
  collegeCode?: string | null
  yearName?: string | null
  /** Parent training fields returned on attendance classes list. */
  paTrainingTitle?: string | null
  paStartDate?: string | null
  paEndDate?: string | null
  createdDt?: string
  updatedDt?: string
}

export interface TrainingStudent {
  trainingStdId: number
  trainingId: number
  employeeId?: number | null
  studentId?: number | null
  collegeId: number
  isActive: boolean
  firstName?: string | null
  rollNumber?: string | null
  empNumber?: string | null
  createdDt?: string
  updatedDt?: string
  /** UI / attendance merge fields (not always persisted on create). */
  checked?: boolean
  isPresent?: boolean
  trainingSessionId?: number | null
  trainingStdAttendenceId?: number | null
  attendenceCapturedEmpId?: number | null
  attendanceDate?: string | null
}

export interface TrainingSession {
  trainingSessionId: number
  sessionDate: string
  fromTime?: string | null
  toTime?: string | null
  noOfAttendees?: number | null
  inchargeEmployeeId?: number | null
  inchargeEmpName?: string | null
  inchargeEmpNumber?: string | null
  sessionTakenBy?: string | null
  sessionTopicsCovered?: string | null
  isSessionCancelled?: boolean | null
  sessionCancelReason?: string | null
  isActive: boolean
  reason?: string | null
  traningDetId: number
  collegeId: number
  collegeCode?: string | null
  collegeName?: string | null
  trainerName?: string | null
  createdDt?: string
  updatedDt?: string
}

/** Angular domain entity `TrainingStudentAttendence` (spelling preserved). */
export interface TrainingStudentAttendence {
  trainingStdAttendenceId: number
  trainingSessionId: number
  studentId?: number | null
  employeeId?: number | null
  isPresent: boolean
  isActive: boolean
  attendenceCapturedEmpId?: number | null
  attendanceDate?: string | null
  firstName?: string | null
  rollNumber?: string | null
  empNumber?: string | null
}
