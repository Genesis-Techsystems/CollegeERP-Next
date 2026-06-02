'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { getModuleConfig } from '@/lib/erp-module-mirror/get-route'

type ModuleDashboardPageProps = { moduleId: string }

export function ModuleDashboardPage({ moduleId }: Readonly<ModuleDashboardPageProps>) {
  const mod = getModuleConfig(moduleId)
  if (!mod) return null

  const links = mod.routes.filter((route) => route.kind !== 'dashboard')

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-6">
        <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
          {mod.dashboardTitle}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{mod.dashboardDescription}</p>
      </div>

      <div className="app-card p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-[hsl(var(--card-title))]">Screens</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((route) => (
            <li key={route.slug}>
              <Link
                href={`${mod.basePath}/${route.slug}`}
                className="block rounded-md border px-3 py-2 text-[13px] transition-colors hover:bg-muted/50"
              >
                <span className="font-medium text-foreground">{route.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                  {route.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  )
}
