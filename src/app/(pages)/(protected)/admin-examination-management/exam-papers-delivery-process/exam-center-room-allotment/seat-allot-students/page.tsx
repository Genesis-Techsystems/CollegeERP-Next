/**
 * Seat Allot Students — University Exam Center route.
 *
 * The seat-allotment workflow (assign students to a room's seats by
 * examRoomAllotmentId) is identical for the college and exam-center variants,
 * so this route renders the shared seating-plan-setup implementation. The
 * exam-center page navigates here with ?returnBase & ?univExamcenterId so the
 * page's Back button returns to the exam-center seating-plan page.
 */
export { default } from '../../../admin-exam-masters/seating-plan-setup/seat-allot-students/page'
