'use client'

import { BookOpen } from 'lucide-react'
import { PageContainer } from '@/components/layout'

export default function LibraryDashboardPage() {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-primary/80" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--card-title))]">
            Library Dashboard
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The main purpose of this module is a computerized system that will manage the
            activities in the library, providing easy access for librarians and users. It helps
            librarians keep track of library information and provides electronic means of storage.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
