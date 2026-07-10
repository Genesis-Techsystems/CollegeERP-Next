'use client'

import Link from 'next/link'

export default function EvaluationProcessIndexPage() {
  const pages = [
    'create-evaluators',
    'assign-evaluators',
    'exam-question-papers',
    'exam-question-paper-marks',
    'exam-evaluation-settings',
    'upload-answer-sheets',
    'view-answer-sheets',
    'evaluator-exam-subject',
    'evaluator-assigned-answer-papers',
    'evaluator-subjects',
    'assign-evaluators-manual',
    'evaluation-approvals',
    'exam-final-question-paper',
    're-assign-evaluators',
    'moderator-evaluators',
    'view-ex-fin-qn-paper',
    'published-exam-question-paper',
    'scan-upload-process',
    're-evaluation-assign',
    'multi-evaluator-assign',
    'assign-reevaluator',
    'evaluated-marks-report',
    'update-evaluator-answer-papers-status',
    're-evaluation-multi-assign',
    'assign-questionpaper-template',
    'create-questionpaper-template',
    'assign-subjects-evaluator',
    'evaluation-moderation',
    'chief-evaluation-pages',
    'evaluation-templates',
  ]

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Evaluation Process</h2>
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
