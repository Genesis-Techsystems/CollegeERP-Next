import { PageContainer } from '@/components/layout'
import { IndianRupee } from 'lucide-react'

export default function ScholarshipDashboardPage() {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <IndianRupee className="mb-6 h-16 w-16 text-indigo-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[hsl(var(--card-title))]">
            Scholarship Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Track scholarship awards, manage applications and proceedings, assign scholarships to
            students, and process government disbursements. Use the sidebar to open Scholarship Type,
            Scholarship Value, Applications, Proceedings, and related screens.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
