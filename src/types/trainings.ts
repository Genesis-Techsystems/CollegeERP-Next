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
  isTrackAudience?: boolean | null
  isActive: boolean
  reason?: string | null
  createdDt?: string
  updatedDt?: string
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
  createdDt?: string
  updatedDt?: string
}

export interface TrainingStudent {
  trainingStdId: number
  trainingId: number
  employeeId: number
  collegeId: number
  isActive: boolean
  createdDt?: string
  updatedDt?: string
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
