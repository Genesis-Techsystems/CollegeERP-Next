'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ScholarshipStructureForm } from '../_components/ScholarshipStructureForm'

function parseId(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function EditScholarshipValuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const feeSchStructureId = parseId(searchParams.get('feeSchStructureId'))

  useEffect(() => {
    if (!feeSchStructureId) {
      router.replace('/scholarship-management/scholarship-value')
    }
  }, [feeSchStructureId, router])

  if (!feeSchStructureId) {
    return null
  }

  return <ScholarshipStructureForm mode="edit" feeSchStructureId={feeSchStructureId} />
}
