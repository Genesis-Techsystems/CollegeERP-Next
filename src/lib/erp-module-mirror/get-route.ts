import { ERP_MODULE_BY_ID } from './registry'
import type { ErpModuleMirrorConfig, ModuleRouteConfig } from './types'

export function getModuleConfig(moduleId: string): ErpModuleMirrorConfig | undefined {
  return ERP_MODULE_BY_ID[moduleId]
}

export function getModuleRoute(moduleId: string, slug: string): ModuleRouteConfig {
  const mod = ERP_MODULE_BY_ID[moduleId]
  const normalized = slug.replace(/^\/+/, '')
  const found = mod?.routes.find((route) => route.slug === normalized)
  if (found) return found
  const title = normalized
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    slug: normalized,
    title,
    description: `This ${mod?.moduleLabel ?? 'module'} screen is being migrated from the Angular application.`,
    kind: 'placeholder',
    angularPath: normalized,
  }
}

export function resolveModuleSlug(
  mod: ErpModuleMirrorConfig,
  segment: string,
): string {
  const first = segment.split('/')[0]!.toLowerCase()
  return mod.slugAliases?.[first] ?? mod.slugAliases?.[first.replace(/-/g, '')] ?? segment
}
