'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { TIMETABLE_HUB_SECTIONS } from '../_lib/route-config'

export function TimetableDashboardPage() {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="border-b bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-[hsl(var(--primary))] opacity-90" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-[hsl(var(--card-title))]">
            Timetable Dashboard
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Generate teachers&apos; time schedules easily and quickly. Avoid time conflicts when
            creating and adjusting class timetables.
          </p>
        </div>
        <div className="space-y-6 p-4">
          {TIMETABLE_HUB_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-sm font-semibold text-[hsl(var(--primary))]">{section.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.map((card) => (
                  <div
                    key={card.href}
                    className="flex min-h-[108px] flex-col gap-2 rounded-lg border bg-card p-4"
                  >
                    <p className="text-sm font-medium">{card.label}</p>
                    {card.description ? (
                      <p className="flex-1 text-xs text-muted-foreground">{card.description}</p>
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
