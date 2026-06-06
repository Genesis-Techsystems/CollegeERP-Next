import { redirect } from 'next/navigation'

// Route alias — plural `admin-post-examinations` variant of the Angular path
// for "Internal Exam Attendance Marking".
export default function LegacyAdminPostPluralExamAttendanceMarkingRedirectPage() {
  redirect('/admin-examination-management/post-examination/internal-exam-attendance-marking')
}
