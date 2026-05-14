'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleNavigation } from '@/lib/schedule-navigation'

/**
 * Root-level 404 — fires only for routes outside the (protected) layout
 * (e.g. /some-unknown-public-path). Just redirect to dashboard.
 */
export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    const cancel = scheduleNavigation(() => {
      router.replace('/dashboard')
    })
    return cancel
  }, [router])

  return null
}
