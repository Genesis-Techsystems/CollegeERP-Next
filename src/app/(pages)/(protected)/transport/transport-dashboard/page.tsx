import { PageContainer } from '@/components/layout'
import { Bus } from 'lucide-react'

export default function TransportDashboardPage() {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <Bus className="mb-6 h-16 w-16 text-emerald-600" aria-hidden="true" />
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[hsl(var(--card-title))]">
            Transport Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage vehicles, routes, drivers, transport allocation, and student transport details.
            Use the sidebar for master data, allocation, and reports.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
