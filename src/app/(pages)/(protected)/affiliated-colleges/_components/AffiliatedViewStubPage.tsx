'use client'

import { useRouter } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getAffiliatedConfig } from '../_lib/route-config'

type AffiliatedViewStubPageProps = { slug: string }

export function AffiliatedViewStubPage({ slug }: AffiliatedViewStubPageProps) {
  const config = getAffiliatedConfig(slug)
  const router = useRouter()

  return (
    <PageContainer>
      <PageHeader title={config.title} />
      <div className="app-card p-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          This screen mirrors Angular route{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">affiliated-colleges/{slug}</code>.
          Detailed grids and approval workflows can be migrated incrementally on top of the shared
          filter and summary services already in place.
        </p>
        <Button type="button" variant="outline" onClick={() => router.push('/affiliated-colleges/college-bulk-uploads')}>
          Back to Bulk Uploads
        </Button>
      </div>
    </PageContainer>
  )
}
