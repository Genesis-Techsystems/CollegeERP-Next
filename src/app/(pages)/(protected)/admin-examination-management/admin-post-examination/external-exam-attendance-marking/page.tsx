import { redirect } from 'next/navigation'

export default function LegacyExternalExamAttendanceMarkingRedirectPage() {
  redirect('/admin-examination-management/post-examination/external-exam-attendance-marking')
}

