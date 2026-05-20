'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

export default function ParentAccountsAddSiblingPage() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  return (
    <PageContainer className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-[hsl(var(--primary))]">Add Sibling</h1>
      {userId ? (
        <p className="text-sm text-muted-foreground">
          Parent user ID:
          {' '}
          <span className="font-mono text-foreground">{userId}</span>
          . The sibling-enrollment flow will be connected here in a follow-up migration step.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Missing
          {' '}
          <code className="text-xs">userId</code>
          {' '}
          query parameter. Open this page from Parent Accounts using “Add Sibling”.
        </p>
      )}
      <Button variant="outline" asChild>
        <Link href="/user-management/parent-accounts">Back to Parent Accounts</Link>
      </Button>
    </PageContainer>
  )
}
