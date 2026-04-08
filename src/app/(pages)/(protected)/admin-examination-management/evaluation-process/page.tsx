'use client'

import Link from 'next/link'

export default function EvaluationProcessIndexPage() {
  const pages = [
    'create-evaluators',
    'assign-evaluators',
    'exam-question-papers',
    'exam-question-paper-marks',
    'exam-question-paper-marks-new',
    'exam-question-groups',
    'exam-evaluation-settings',
    'exam-std-answerpaper-pages',
    'exam-student-answer-paper',
    'upload-answer-sheets',
    'view-answer-sheets',
    'evaluator-exam-subject',
    'evaluator-assigned-answer-papers',
    'evaluator-subjects',
    'assign-evaluators-manual',
    'evaluation-approvals',
    'evaluation-reports',
    'exam-final-question-paper',
    're-assign-evaluators',
    'moderator-evaluators',
    'view-ex-fin-qn-paper',
    'published-exam-question-paper',
    'recordings-frame',
    'scan-upload-process',
    're-evaluation-assign',
    'evaluation-marks',
    'multi-evaluator-assign',
    'assign-reevaluator',
    'evaluated-marks-report',
    'update-evaluator-answer-papers-status',
    're-evaluation-multi-assign',
    'assign-questionpaper-template',
    'assign-questionpaper-template-new',
    'assign-qp-template',
    'create-questionpaper-template',
    'create-questionpaper-template-new',
    'assign-subjects-evaluator',
    'assign-evaluator-exam',
    'evaluation-moderation',
    'questionpaper-template',
    'chief-evaluation-pages',
  ]

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Evaluation Process</h2>
        </div>
        <div className="p-4 text-[13px] space-y-3">
          <p>Evaluation Process module is now active. Open any submenu page below:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pages.map((slug) => (
              <Link
                key={slug}
                href={`/admin-examination-management/evaluation-process/${slug}`}
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
