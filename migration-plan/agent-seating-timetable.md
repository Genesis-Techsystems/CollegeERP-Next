# Migration Agent Report: Seating Plan Setup + Exam Timetable

**Date:** 2026-03-29
**Agent:** claude-sonnet-4-6

---

## Summary

Built two pages under `admin-exam-masters` module:

1. **Seating Plan Setup** — `seating-plan-setup/page.tsx`
2. **Exam Timetable** — `exam-timetable/page.tsx`

---

## Entity Names Found

### Seating Plan Setup
- **Spring Boot entity:** `ExamRoomAllotment`
- **Primary key:** `examRoomAllotmentId`
- **CRUD entity name:** `ExamRoomAllotment` (from `CONSTANTS.examRoomAllotmentCrudUrl`)
- **POST endpoint:** `examroomallotment` (from `CONSTANTS.examRoomAllotmentPostUrl`)
- **Description:** Maps exam rooms to timetable slots (date + session). Tracks total rows, columns, capacity, booked/blocked/available seats.

### Exam Timetable
- **Spring Boot entity:** `ExamTimetable`
- **Primary key:** `examTimetableId`
- **CRUD entity name:** `ExamTimetable` (from `CONSTANTS.examTimetableUrl`)
- **POST endpoint:** `examtimetable` (from `CONSTANTS.examTimetablePostUrl`)
- **Description:** One row per subject scheduled on a date/session for an exam. Linked to ExamMaster, Subject, ExamSession, CourseYear, Regulation.

---

## Angular Source Files Read

- `college_erp_angular_old/src/app/main/apps/examination/exam-masters/exam-room-allotment/exam-room-allotment.component.ts`
- `college_erp_angular_old/src/app/main/apps/examination/exam-masters/exam-room-allotment/room-allotment/room-allotment.component.ts`
- `college_erp_angular_old/src/app/main/apps/examination/exam-masters/exam-room-allotment/exam-room-allotment-modal/exam-room-allotment-modal.component.ts`
- `college_erp_angular_old/src/app/main/apps/examination/exam-masters/exam-timetable/exam-timetable.component.ts`
- `college_erp_angular_old/src/app/main/apps/examination/exam-masters/exam-timetable/add-exam-timetable/add-exam-timetable.component.ts`
- `college_erp_angular_foundation_work/src/app/common/constants.ts` (for URL constants)

---

## Files Created

### Types
- `src/types/seating-plan.ts` — `ExamRoomAllotment`, `SeatingPlanFormValues`, `RoomLookup`
- `src/types/exam-timetable.ts` — `ExamTimetable`, `ExamTimetableFormValues`, `SubjectLookup`

### Services
- `src/services/seating-plan.service.ts` — `getSeatingPlanRows`, `createSeatingPlanRow`, `updateSeatingPlanRow`, `deleteSeatingPlanRow`, `getRooms`
- `src/services/exam-timetable.service.ts` — `getExamTimetables`, `createExamTimetable`, `updateExamTimetable`, `deleteExamTimetable`, `getSubjectsForCourseYear`, `getSubjectsForYear`

### Pages — Seating Plan Setup
- `src/app/(protected)/admin-examination-management/admin-exam-masters/seating-plan-setup/page.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/seating-plan-setup/SeatingPlanModal.tsx`

### Pages — Exam Timetable
- `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-timetable/page.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-timetable/ExamTimetableModal.tsx`

### API Constants Updated
- `src/config/constants/api.ts` — added `LIST_EXAM_TIMETABLE`, `SAVE_EXAM_TIMETABLE`, `EXAM_TIMETABLE_DETAILS_BY_DATE`, `LIST_EXAM_ROOM_ALLOTMENT`, `SAVE_EXAM_ROOM_ALLOTMENT`, `LIST_SUBJECT`

---

## Architecture Decisions

### Filter Cascade (both pages)
Both pages follow the same cascade used in `exam-master/page.tsx`:
`Course → Academic Year → Exam` (+ `Course Year` as optional table filter for timetable).
`getCollegeFilters()` from `exam-master.service.ts` provides the course and academic year lists.

### Seating Plan Modal — Timetable Slot Dropdown
The parent page pre-loads `ExamTimetable` rows for the selected exam and passes them as props to `SeatingPlanModal`. The modal user selects the slot (date + session + subject) before assigning a room. This avoids a redundant fetch inside the modal.

### Room Entity
Angular source references `Room` entity (`CONSTANTS.buildingCrudUrl`, `floorCrudUrl`, and `getExamRoomDetailsUrl`). The Spring Boot domain entity for rooms is assumed to be `Room` with PK `roomId`. `getRooms()` calls `domain/list/Room?query=isActive==true`. If the actual entity name differs (e.g. `ExamRoom`), update the entity string in `seating-plan.service.ts`.

### ExamTimetable Subjects
The Angular `add-exam-timetable` component loads subjects via a stored procedure (`univExamDetailsUrl`) that returns both subjects and sessions in a combined result. In the Next.js migration this is split:
- Sessions: `domain/list/ExamSession` (standard)
- Subjects: `domain/list/Subject?query=CourseYear.courseYearId=={id}.and.isActive==true`

If subjects need to be further scoped to the exam (i.e., only subjects registered for the exam), the stored proc `getAllRecords/s_get_exam_filters_bycode` (Angular `getExamFiltersBycodeUrl`) should be called instead. This is noted as a potential enhancement but requires the `in_flag=univ_exam_filters` proc parameters which differ by institution.

### Spring Boot Payload Shape (ExamTimetable)
Angular sends nested FK objects, e.g. `examMaster: { examId: N }`. The `buildTimetablePayload()` helper in the service constructs this shape from flat form values.

### Spring Boot Payload Shape (ExamRoomAllotment)
Angular uses uppercase entity object keys: `ExamMaster: { examId }`, `ExamTimetable: { examTimetableId }`, `Room: { roomId }`. The `buildSeatingPayload()` helper mirrors this.

---

## Assumptions / Known Gaps

1. **Room entity name:** Assumed `Room` with PK `roomId`. Verify against Spring Boot source.
2. **Subject load scope:** Currently loads all subjects for a CourseYear. Angular used a stored proc that scoped subjects to the specific exam. If this causes UX issues (too many subjects), switch to the `s_get_exam_filters_bycode` proc.
3. **ExamRoomAllotment columns** `bookedSeats`, `blockedSeats`, `availableSeats`: These are likely computed server-side or updated by a separate student-seating process. The modal does not allow editing them — they are display-only in the table.
4. **Seating Plan Setup** is a simplified version of the Angular `exam-room-allotment` component. The Angular version also includes a full student-seating assignment workflow (drag/drop students into seats, print seating stickers, etc.). Those sub-features (`assign-seating`, `print-seating-stickers`) are out of scope for this migration task and deferred to the backlog.
5. **Check Conflicts** — the Angular `exam-timetable` component has a "Check Conflicts" modal (`check-conflicts-modal`). This is deferred and not included in this migration.
