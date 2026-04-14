import { redirect } from 'next/navigation'

export default function PostExaminationIndexRedirect() {
  redirect('/admin-examination-management/post-examination/internal-exam-attendance-marking')
}

