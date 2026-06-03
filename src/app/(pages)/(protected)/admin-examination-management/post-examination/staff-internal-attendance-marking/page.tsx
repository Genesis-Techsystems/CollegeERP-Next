import { redirect } from 'next/navigation'

export default function LegacyStaffInternalAttendanceMarkingRedirect() {
  redirect('/admin-examination-management/post-examination/internal-exam-attendance-marking')
}

