'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getHrPayrollConfig } from '../_lib/route-config'

type HrPayrollPlaceholderProps = { slug: string }

export function HrPayrollPlaceholder({ slug }: HrPayrollPlaceholderProps) {
  const config = getHrPayrollConfig(slug)

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{config.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          This screen mirrors Angular route{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">hr-payroll/{slug}</code>. Full
          workflow migration can be added incrementally on top of the shared HR &amp; Payroll services.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/hr-payroll/hr-dashboard">Back to HR Dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
