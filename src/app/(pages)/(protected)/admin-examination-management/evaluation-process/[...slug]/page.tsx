'use client'

import Link from 'next/link'
import { use, useMemo } from 'react'

type CatchAllPageProps = {
  params: Promise<{
    slug?: string[]
  }>
}

function toTitle(parts: string[]) {
  return parts
    .map((p) =>
      p
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    )
    .join(' / ')
}

export default function EvaluationProcessCatchAllPage({ params }: CatchAllPageProps) {
  const { slug: slugParam } = use(params)
  const slug = slugParam ?? []
  const label = useMemo(() => toTitle(slug), [slug])

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">
            {label || 'Evaluation Process'}
          </h2>
        </div>
        <div className="p-4 space-y-2 text-[13px]">
          <p>This Evaluation Process route is now active and ready for migration.</p>
          <p className="text-muted-foreground">
            We can now implement this screen with exact legacy UI and flow.
          </p>
          <div className="pt-1">
            <Link
              href="/admin-examination-management/evaluation-process"
              className="text-blue-700 hover:underline"
            >
              Back to Evaluation Process
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
