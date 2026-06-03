'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { NOTIFICATIONS_HUB_CARDS } from '../_lib/route-config'

export function NotificationsDashboardPage() {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="border-b bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
          <Bell className="mx-auto h-12 w-12 text-[hsl(var(--primary))] opacity-90" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-[hsl(var(--card-title))]">
            Notifications &amp; Announcements
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Admin notifications, employee inbox, and announcements — mirrored from Angular
            notifications-&amp;-announcements.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {NOTIFICATIONS_HUB_CARDS.map((card) => (
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
    </PageContainer>
  )
}
