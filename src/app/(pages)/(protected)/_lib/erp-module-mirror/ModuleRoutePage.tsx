'use client'

import { getModuleConfig, getModuleRoute } from '@/lib/erp-module-mirror/get-route'
import { ModuleDashboardPage } from './ModuleDashboardPage'
import { ModuleScreenPlaceholder } from './ModuleScreenPlaceholder'

type ModuleRoutePageProps = { moduleId: string; slug: string }

export function ModuleRoutePage({ moduleId, slug }: Readonly<ModuleRoutePageProps>) {
  const mod = getModuleConfig(moduleId)
  const route = getModuleRoute(moduleId, slug)

  if (mod && slug === mod.defaultSlug && route.kind === 'dashboard') {
    return <ModuleDashboardPage moduleId={moduleId} />
  }

  return (
    <ModuleScreenPlaceholder
      moduleId={moduleId}
      title={route.title}
      description={route.description}
      angularPath={route.angularPath ? `${mod?.angularSegment ?? ''}${route.angularPath}` : undefined}
    />
  )
}
