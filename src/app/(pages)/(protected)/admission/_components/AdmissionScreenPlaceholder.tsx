import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

interface AdmissionScreenPlaceholderProps {
  title: string
  description: string
  backHref?: string
  backLabel?: string
}

/** Temporary shell for multi-step Angular forms not yet fully ported. */
export function AdmissionScreenPlaceholder({
  title,
  description,
  backHref = '/admission/admission-dashboard',
  backLabel = 'Back to Admission',
}: Readonly<AdmissionScreenPlaceholderProps>) {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
