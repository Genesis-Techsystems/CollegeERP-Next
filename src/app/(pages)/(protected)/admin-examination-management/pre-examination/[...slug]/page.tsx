'use client'

import Link from 'next/link'
import { useMemo } from 'react'

type CatchAllPageProps = {
  params: {
    slug?: string[]
  }
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

export default function PreExaminationCatchAllPage({ params }: CatchAllPageProps) {
  const slug = params.slug ?? []
  const label = useMemo(() => toTitle(slug), [slug])

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">{label || 'Pre Examination'}</h2>
        </div>
        <div className="p-4 space-y-2 text-[13px]">
          <p>This Pre Examination page route is now active and ready for migration.</p>
          <p className="text-muted-foreground">
            We can now implement this screen with exact legacy UI/flow.
          </p>
          <div className="pt-1">
            <Link href="/admin-examination-management/pre-examination" className="text-blue-700 hover:underline">
              Back to Pre Examination
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

