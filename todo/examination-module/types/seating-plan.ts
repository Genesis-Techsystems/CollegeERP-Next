/**
 * ExamRoomAllotment entity types.
 * Spring Boot entity: ExamRoomAllotment
 * Primary key: examRoomAllotmentId
 *
 * The Angular source uses entity name 'ExamRoomAllotment' for CRUD and
 * 'examroomallotment' for the POST (save) endpoint.
 *
 * This is the "Seating Plan Setup" page — it maps rooms to exam timetable
 * slots, recording total capacity and seat counts for each allotment.
 */

// ─── ExamRoomAllotment ────────────────────────────────────────────────────────

/** One exam room allotment row — one room assigned to one timetable slot */
export interface ExamRoomAllotment {
  /** Primary key — Spring Boot auto-generated */
  examRoomAllotmentId: number
  /** FK: parent exam master */
  examId: number
  /** Exam name — from joined ExamMaster */
  examName?: string
  /** FK: exam timetable row (ties room to a specific date+session+subject) */
  examTimetableId: number
  /** Exam date from the timetable row (ISO "YYYY-MM-DD") */
  examDate?: string
  /** Session name from the timetable row */
  examSessionName?: string
  /** FK: room / hall being assigned */
  roomId: number
  /** Room / hall code — from joined Room entity */
  roomCode?: string
  /** Room / hall name — from joined Room entity */
  roomName?: string
  /** Total number of rows of seats in the room */
  totalRows: number
  /** Total number of columns of seats in the room */
  totalColumns: number
  /** Total capacity = totalRows × totalColumns */
  roomStrength?: number
  /** Number of seats currently booked (students assigned) */
  bookedSeats?: number
  /** Number of seats blocked (unavailable) */
  blockedSeats?: number
  /** Available seats = roomStrength - bookedSeats - blockedSeats */
  availableSeats?: number
  /** Display priority order for the room in this exam */
  priority?: number
  /** Soft-delete flag */
  isActive: boolean
  /** Reason for deactivation */
  reason?: string
  /** Record creation timestamp (ISO string) */
  createdDt?: string
  /** Last update timestamp (ISO string) */
  updatedDt?: string
}

// ─── Form Values ──────────────────────────────────────────────────────────────

export interface SeatingPlanFormValues {
  examId: number
  examTimetableId: number
  roomId: number
  totalRows: number
  totalColumns: number
  priority: number
  isActive: boolean
  reason: string
}

// ─── Room lookup ──────────────────────────────────────────────────────────────

/** Room / hall record used in the seating plan room dropdown */
export interface RoomLookup {
  roomId: number
  roomCode: string
  roomName: string
  /** Room capacity (if stored on the Room entity) */
  roomCapacity?: number
}
