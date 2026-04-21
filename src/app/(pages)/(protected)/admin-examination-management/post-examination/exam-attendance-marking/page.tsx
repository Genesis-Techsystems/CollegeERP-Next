import { redirect } from 'next/navigation'

export default function LegacyExamAttendanceMarkingRedirect() {
  redirect('/admin-examination-management/post-examination/internal-exam-attendance-marking')
}

