'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { AFFILIATED_HUB_CARDS } from '../_lib/route-config'

export default function CollegeBulkUploadsPage() {
  return (
    <PageContainer>
      <PageHeader title="Affiliated College Bulk Uploads" />
      <div className="app-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Affiliated College Bulk Uploads</h2>
        </div>
        <div className="p-4 grid gap-4 sm:grid-cols-2">
          {AFFILIATED_HUB_CARDS.map((card) => (
            <div
              key={card.step}
              className="rounded-lg border bg-card p-4 flex flex-col gap-2 min-h-[140px]"
            >
              <h3 className="font-semibold text-sm">
                {card.step}. {card.title}
              </h3>
              <p className="text-sm text-muted-foreground flex-1">{card.description}</p>
              <Button asChild className="w-fit">
                <Link href={card.href}>{card.title}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
