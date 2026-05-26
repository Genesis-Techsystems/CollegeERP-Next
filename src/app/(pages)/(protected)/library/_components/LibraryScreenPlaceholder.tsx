import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'

interface LibraryScreenPlaceholderProps {
  title: string
  description: string
  backHref?: string
  backLabel?: string
}

/** Temporary shell for library screens not yet fully ported from Angular. */
export function LibraryScreenPlaceholder({
  title,
  description,
  backHref = '/library/library-dashboard',
  backLabel = 'Back to Library Dashboard',
}: Readonly<LibraryScreenPlaceholderProps>) {
  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>
        <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
          Route scaffold is in place; full UI and API wiring will follow the Angular{' '}
          <code className="text-[11px]">library</code> module.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
