'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { scheduleNavigation } from '@/lib/schedule-navigation'

/** Legacy `/student-accounts/manage` — opens the Add Student modal on the list page. */
export default function StudentAccountsManageRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    const cancel = scheduleNavigation(() => {
      router.replace('/user-management/student-accounts?add=1')
    })
    return cancel
  }, [router])
  return (
    <PageContainer className="py-8 text-sm text-muted-foreground">
      Opening Add Student…
    </PageContainer>
  )
}
