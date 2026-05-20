'use client'

import dynamic from 'next/dynamic'

const MarkingPage = dynamic(
  () => import('../evaluator-subjects/marking/marking-content'),
  { ssr: false },
)

export default function AssignAnswerpapersDynamicPage() {
  return <MarkingPage />
}

