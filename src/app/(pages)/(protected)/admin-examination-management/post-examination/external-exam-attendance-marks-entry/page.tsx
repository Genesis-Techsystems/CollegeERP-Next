import { redirect } from 'next/navigation'

export default function LegacyExternalExamAttendanceMarksEntryRedirectPage() {
  redirect('/admin-examination-management/post-examination/external-exam-attendance-marking')
}

