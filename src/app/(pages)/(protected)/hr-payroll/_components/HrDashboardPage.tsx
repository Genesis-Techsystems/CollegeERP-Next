'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { HR_PAYROLL_HUB_SECTIONS } from '../_lib/route-config'

export function HrDashboardPage() {
  return (
    <PageContainer>
      <PageHeader title="HR Dashboard" />
      <div className="app-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-semibold text-base">HR &amp; Payroll</h2>
        </div>
        <div className="p-4 space-y-6">
          {HR_PAYROLL_HUB_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-[hsl(var(--primary))] mb-3">{section.title}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.map((card) => (
                  <div
                    key={card.href}
                    className="rounded-lg border bg-card p-4 flex flex-col gap-2 min-h-[100px]"
                  >
                    <p className="font-medium text-sm">{card.label}</p>
                    {card.description ? (
                      <p className="text-xs text-muted-foreground flex-1">{card.description}</p>
                    ) : null}
                    <Button asChild size="sm" variant="outline" className="w-fit">
                      <Link href={card.href}>Open</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
