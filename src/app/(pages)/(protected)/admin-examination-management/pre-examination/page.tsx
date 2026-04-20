'use client'

import Link from 'next/link'

export default function PreExaminationIndexPage() {
  const pages = [
    'complete-exam-fee-registration',
    'student-exam-fee-registration',
    'exam-scheduling-forms',
    'exam-register-subjects',
    'online-exam-fee-registration',
    'internal-exam-registration-multiple',
    'exam-hallticket',
    'exam-subject-barcode-generation',
    'exam-forms',
    'invigilator-allotment',
    'additional-exam-fees',
    'exam-attendancewise-subject-barcode',
    'student-exam-lab-batches',
    'exam-registration-manual-feeless',
    'college-exam-timetable-view',
  ]

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Pre Examination</h2>
        </div>
        <div className="p-4 text-[13px] space-y-3">
          <p>Pre Examination tab is now active. Open any page below:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pages.map((slug) => (
              <Link
                key={slug}
                href={`/admin-examination-management/pre-examination/${slug}`}
                className="text-blue-700 hover:underline"
              >
                {slug}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

