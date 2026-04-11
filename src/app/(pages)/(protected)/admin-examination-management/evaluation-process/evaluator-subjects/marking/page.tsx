'use client'

import dynamic from 'next/dynamic'

const MarkingPage = dynamic(() => import('./marking-content'), { ssr: false })

export default function Page() {
  return <MarkingPage />
}
