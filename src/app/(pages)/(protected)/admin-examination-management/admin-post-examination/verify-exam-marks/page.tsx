import { redirect } from 'next/navigation'

export default function LegacyAdminPostVerifyExamMarksRedirectPage() {
  redirect('/admin-examination-management/post-examination/verify-exam-marks')
}

