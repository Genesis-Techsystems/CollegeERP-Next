'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { FilterCard } from '@/common/components/feedback'

function FacultyFeePayContent() {
  const searchParams = useSearchParams()
  const employeeId = searchParams.get('employeeId')
  const feeStructureId = searchParams.get('feeStructureId')

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Faculty Fee Payment">
        <p className="text-sm text-slate-600">
          Faculty transport payment for employee {employeeId ?? '—'}, structure{' '}
          {feeStructureId ?? '—'}. Full pay dialog from Angular (pay-popup) is not yet ported — use
          transport allocation receipt flow on the legacy app until this screen is completed.
        </p>
        <Button type="button" variant="outline" className="mt-4" asChild>
          <Link href="/accounts-and-fees/fees-collection/faculty-transport-payment">
            Back to Faculty Transport
          </Link>
        </Button>
      </FilterCard>
    </PageContainer>
  )
}

export default function FacultyFeePayPage() {
  return (
    <Suspense fallback={null}>
      <FacultyFeePayContent />
    </Suspense>
  )
}
