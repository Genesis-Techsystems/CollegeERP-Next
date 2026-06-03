import { PageContainer } from '@/components/layout'
import { GraduationCap } from 'lucide-react'

export default function AdmissionDashboardPage() {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <GraduationCap className="mb-6 h-16 w-16 text-indigo-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[hsl(var(--card-title))]">
            Admission Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage enquiries, college applications, counselling allotments, and university student
            applications. Use the sidebar for Application Form, Enquiries, and Counselling screens.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
