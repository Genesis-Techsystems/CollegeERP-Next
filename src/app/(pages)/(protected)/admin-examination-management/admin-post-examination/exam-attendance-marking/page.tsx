import { redirect } from 'next/navigation'

// Route alias — the DB menu href uses the Angular path
// `admin-examination-management/admin-post-examination/exam-attendance-marking`
// for "Internal Exam Attendance Marking".
export default function LegacyAdminPostExamAttendanceMarkingRedirectPage() {
  redirect('/admin-examination-management/post-examination/internal-exam-attendance-marking')
}
