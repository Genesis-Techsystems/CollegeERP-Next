/**
 * Seating Plan Setup service — client-side only.
 *
 * Entity: ExamRoomAllotment
 * Primary key: examRoomAllotmentId
 *
 * Angular source: exam-masters/exam-room-allotment/
 * POST endpoint: 'examroomallotment' (CONSTANTS.examRoomAllotmentPostUrl)
 * CRUD entity:   'ExamRoomAllotment'  (CONSTANTS.examRoomAllotmentCrudUrl)
 *
 * This page is called "Seating Plan Setup" in the Next.js migration.
 * It maps exam rooms to exam timetable slots (date + session + exam).
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'
import type { ExamRoomAllotment, SeatingPlanFormValues, RoomLookup } from '@/types/seating-plan'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List exam room allotments for a given exam, optionally filtered by timetable slot.
 *
 * @param examId - the parent exam master ID
 * @param examTimetableId - optional timetable slot filter
 * @returns array of ExamRoomAllotment records ordered by exam date ASC
 * @throws AppError on failure
 */
export async function getSeatingPlanRows(
  examId: number,
  examTimetableId?: number,
): Promise<ExamRoomAllotment[]> {
  const conditions: Record<string, string | number | boolean> = {
    'ExamMaster.examId': examId,
    isActive: true,
  }
  if (examTimetableId !== undefined) {
    conditions['ExamTimetable.examTimetableId'] = examTimetableId
  }

  const query = buildQuery(conditions, { field: 'examDate', direction: 'ASC' })
  return domainList<ExamRoomAllotment>(ENTITIES.EXAM_ROOM_ALLOTMENT.name, query)
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new exam room allotment (seating plan row).
 *
 * Payload uses nested FK objects:
 * {
 *   ExamMaster: { examId },
 *   ExamTimetable: { examTimetableId },
 *   Room: { roomId },
 *   totalRows, totalColumns, priority, isActive
 * }
 *
 * @param data - form values from SeatingPlanModal
 * @returns the created ExamRoomAllotment with server-assigned ID
 * @throws AppError on failure
 */
export async function createSeatingPlanRow(data: SeatingPlanFormValues): Promise<ExamRoomAllotment> {
  const payload = buildSeatingPayload(data)
  return domainCreate<ExamRoomAllotment>('ExamRoomAllotment', payload)
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing exam room allotment.
 *
 * @param id - examRoomAllotmentId of the record to update
 * @param data - updated form values
 * @returns the updated ExamRoomAllotment
 * @throws AppError on failure
 */
export async function updateSeatingPlanRow(
  id: number,
  data: SeatingPlanFormValues,
): Promise<ExamRoomAllotment> {
  const payload = buildSeatingPayload(data)
  return domainUpdate<ExamRoomAllotment>(ENTITIES.EXAM_ROOM_ALLOTMENT.name, ENTITIES.EXAM_ROOM_ALLOTMENT.pk, id, payload)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam room allotment (sets isActive: false).
 *
 * @param id - examRoomAllotmentId of the record to delete
 * @throws AppError on failure
 */
export async function deleteSeatingPlanRow(id: number): Promise<void> {
  return domainSoftDelete(ENTITIES.EXAM_ROOM_ALLOTMENT.name, ENTITIES.EXAM_ROOM_ALLOTMENT.pk, id)
}

// ─── Reference Data ───────────────────────────────────────────────────────────

/**
 * List available rooms / halls for seating assignment.
 * Rooms come from the Room entity with isActive = true.
 *
 * @returns array of RoomLookup records ordered by room code ASC
 * @throws AppError on failure
 */
export async function getRooms(): Promise<RoomLookup[]> {
  const query = buildQuery({ isActive: true }, { field: 'roomCode', direction: 'ASC' })
  return domainList<RoomLookup>(ENTITIES.ROOM.name, query)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the API payload from form values.
 * The Angular source (exam-room-allotment-modal.component.ts) sends flat FK fields
 * (examId, examTimetableId, roomId) — NOT nested PascalCase objects.
 */
function buildSeatingPayload(data: SeatingPlanFormValues): Record<string, unknown> {
  return {
    examId: data.examId,
    examTimetableId: data.examTimetableId,
    roomId: data.roomId,
    totalRows: data.totalRows,
    totalColumns: data.totalColumns,
    roomStrength: data.totalRows * data.totalColumns,
    priority: data.priority,
    isActive: data.isActive,
    reason: data.reason ?? '',
  }
}
