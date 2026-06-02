'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function HostelFeeListRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(
      qs
        ? `/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment?${qs}`
        : '/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment',
    )
  }, [router, searchParams])

  return null
}

/** Legacy slug — Angular uses `hostel-fee-payment`. */
export default function HostelFeeListRedirectPage() {
  return (
    <Suspense fallback={null}>
      <HostelFeeListRedirect />
    </Suspense>
  )
}
