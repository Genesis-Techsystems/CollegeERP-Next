'use client'

import { useSearchParams } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'

/**
 * Angular Zoom `join-host` embeds ZoomMtg SDK.
 * React opens meeting params and shows join details (SDK embed can be added later).
 */
export function JoinLivePage() {
  const searchParams = useSearchParams()
  const signature = searchParams.get('signature') ?? ''
  const meetingNumber = searchParams.get('meetingNumber') ?? ''
  const apiKey = searchParams.get('apiKey') ?? ''
  const userEmail = searchParams.get('userEmail') ?? ''
  const passWord = searchParams.get('passWord') ?? ''

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Join Live Class" />
      <div className="rounded-sm border bg-card p-4 space-y-3 text-sm">
        <p className="text-muted-foreground">
          Zoom meeting credentials loaded from check-in. Use the Zoom client or web SDK with these
          values to host the class.
        </p>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Meeting number</dt>
            <dd className="font-medium">{meetingNumber || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">API key</dt>
            <dd className="font-medium break-all">{apiKey || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{userEmail || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Password</dt>
            <dd className="font-medium">{passWord || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Signature</dt>
            <dd className="font-mono text-xs break-all">{signature || '—'}</dd>
          </div>
        </dl>
        <Button type="button" variant="outline" onClick={() => window.close()}>
          Close
        </Button>
      </div>
    </PageContainer>
  )
}
