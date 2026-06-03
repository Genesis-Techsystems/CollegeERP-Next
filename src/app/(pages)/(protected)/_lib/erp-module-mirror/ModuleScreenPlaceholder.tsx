'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getModuleConfig } from '@/lib/erp-module-mirror/get-route'

type ModuleScreenPlaceholderProps = {
  moduleId: string
  title: string
  description: string
  angularPath?: string
}

export function ModuleScreenPlaceholder({
  moduleId,
  title,
  description,
  angularPath,
}: Readonly<ModuleScreenPlaceholderProps>) {
  const mod = getModuleConfig(moduleId)
  const dashboardHref = mod ? `${mod.basePath}/${mod.defaultSlug}` : '/'

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>
        {angularPath ? (
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
            Angular route:{' '}
            <code className="rounded bg-muted px-1 py-0.5">{angularPath}</code>
          </p>
        ) : null}
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href={dashboardHref}>Back to {mod?.dashboardTitle ?? 'Dashboard'}</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
