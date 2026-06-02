'use client'

import Link from 'next/link'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'

const REPORT_LINKS = [
  {
    label: 'Pre Payroll Audit Report',
    href: '/hr-payroll/payroll/pre-payroll-audit-report',
    description: 'Pivot audit before payroll run (month/year not applied).',
  },
  {
    label: 'Monthly Payroll Report',
    href: '/hr-payroll/payroll/monthly-payroll-report',
    description: 'Teaching staff pay bill for a selected month.',
  },
]

export function PayrollReportsPage() {
  return (
    <PageContainer className="space-y-6">
      <PageHeader title="Payroll Reports" />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORT_LINKS.map((card) => (
          <div key={card.href} className="app-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[hsl(var(--card-title))]">{card.label}</h2>
            <p className="text-sm text-muted-foreground">{card.description}</p>
            <Button asChild size="sm" variant="outline">
              <Link href={card.href}>Open</Link>
            </Button>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
