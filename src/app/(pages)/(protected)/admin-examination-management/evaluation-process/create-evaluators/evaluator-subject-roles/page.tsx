'use client'

import Link from 'next/link'

export default function EvaluatorSubjectRolesPage() {
  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">
            Evaluator Subject Roles
          </h2>
        </div>
        <div className="p-4 space-y-2 text-[13px]">
          <p>This route is active and reserved for evaluator subject role assignment workflow.</p>
          <Link
            href="/admin-examination-management/evaluation-process/create-evaluators"
            className="text-blue-700 hover:underline"
          >
            Back to Create Evaluators
          </Link>
        </div>
      </div>
    </div>
  )
}
