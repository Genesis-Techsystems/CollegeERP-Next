'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

const INDEX = '/admin-examination-management/exam-papers-delivery-process'

export default function ExamPapersDeliveryPlaceholderPage() {
  const params = useParams()
  const segments = (params.slug as string[] | undefined) ?? []
  const path = segments.join('/')

  return (
    <div className="p-6 max-w-lg">
      <div className="app-card p-5 space-y-3 text-[13px]">
        <h2 className="app-card-title">Exam papers delivery</h2>
        <p className="text-muted-foreground">
          This screen is not implemented yet.
          {path ? (
            <>
              {' '}
              Route: <code className="text-xs bg-muted px-1 py-0.5 rounded">{path}</code>
            </>
          ) : null}
        </p>
        <Link href={INDEX} className="text-blue-700 hover:underline inline-block">
          ← Back to module index
        </Link>
      </div>
    </div>
  )
}
