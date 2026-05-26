import { mapModuleTail, normalizeLabelKey } from '@/lib/erp-modules-navigation-utils'
import { resolveModuleSlug } from './get-route'
import { ERP_MODULE_REGISTRY } from './registry'
import type { ErpModuleMirrorConfig } from './types'

function buildSlugMap(mod: ErpModuleMirrorConfig): Record<string, string> {
  const map: Record<string, string> = { ...(mod.slugAliases ?? {}) }
  // Longer slugs first so `vehicle-map` is not shadowed by `vehicle`.
  const routes = [...mod.routes].sort(
    (a, b) => b.slug.split('/')[0]!.length - a.slug.split('/')[0]!.length,
  )
  for (const route of routes) {
    const first = route.slug.split('/')[0]!.toLowerCase()
    map[first] = route.slug
    map[first.replace(/-/g, '')] = route.slug
  }
  return map
}

function mapModuleLabel(mod: ErpModuleMirrorConfig, label?: string): string | null {
  if (!label) return null
  const key = normalizeLabelKey(label)
  const modKey = normalizeLabelKey(mod.moduleLabel)

  if (mod.labelAliases?.[key]) {
    return `${mod.basePath}/${mod.labelAliases[key]}`
  }

  // Match specific screens before the module root (e.g. "Transport Details" must not
  // resolve to transport-dashboard because key.includes("transport")).
  // Longer titles first so "Student Transport Details" wins over "Transport Details".
  const routesByTitleLength = [...mod.routes].sort(
    (a, b) => normalizeLabelKey(b.title).length - normalizeLabelKey(a.title).length,
  )
  for (const route of routesByTitleLength) {
    const routeKey = normalizeLabelKey(route.title)
    // Exact title match only — avoid "Map Vehicle Route" → /transport/vehicle via "vehicle".
    if (key === routeKey) {
      return `${mod.basePath}/${route.slug}`
    }
  }

  if (key === modKey) {
    return `${mod.basePath}/${mod.defaultSlug}`
  }

  return null
}

function mapModuleHrefFromUrl(mod: ErpModuleMirrorConfig, href: string): string | null {
  const hrefRaw = href.trim()
  if (!hrefRaw || hrefRaw === '#') return null
  const hrefLower = hrefRaw.toLowerCase()

  const slugs = buildSlugMap(mod)
  const mapped = mapModuleTail(hrefRaw, mod.angularSegment, mod.basePath, slugs, mod.defaultSlug)
  if (mapped) return mapped

  const seg = `/${mod.angularSegment.replace(/\/$/, '')}/`
  if (hrefLower.includes(seg) || hrefLower.includes(`/apps/${mod.angularSegment}`)) {
    const idx = Math.max(hrefLower.indexOf(seg), hrefLower.indexOf(`/apps/${mod.angularSegment}`))
    const tailStart =
      hrefLower.indexOf(`/apps/${mod.angularSegment}`) >= 0
        ? hrefLower.indexOf(`/apps/${mod.angularSegment}`) + `/apps/${mod.angularSegment}`.length
        : idx + seg.length
    const tail = hrefRaw.slice(tailStart).split('?')[0].replace(/^\/+/, '')
    if (!tail) return `${mod.basePath}/${mod.defaultSlug}`
    const resolved = resolveModuleSlug(mod, tail)
    return `${mod.basePath}/${resolved}`
  }

  if (hrefLower.includes(mod.basePath.replace(/^\//, ''))) {
    const idx = hrefLower.indexOf(mod.basePath.replace(/^\//, ''))
    const tail = hrefRaw.slice(idx).split('?')[0]
    if (tail.startsWith(mod.basePath)) return tail
  }

  return null
}

function mapModuleHref(mod: ErpModuleMirrorConfig, href?: string, label?: string): string | null {
  // Sidebar labels from the API are authoritative when aliased (href in DB is often wrong).
  if (label) {
    const key = normalizeLabelKey(label)
    if (mod.labelAliases?.[key]) {
      return `${mod.basePath}/${mod.labelAliases[key]}`
    }
  }

  const hrefRaw = (href ?? '').trim()
  if (hrefRaw && hrefRaw !== '#') {
    const fromHref = mapModuleHrefFromUrl(mod, hrefRaw)
    if (fromHref) return fromHref
  }

  return mapModuleLabel(mod, label)
}

export function mapMirroredModuleNavRoute(href?: string, label?: string): string | null {
  for (const mod of ERP_MODULE_REGISTRY) {
    const route = mapModuleHref(mod, href, label)
    if (route) return route
  }
  return null
}

export function mapMirroredModuleLabelToRoute(label?: string): string | null {
  for (const mod of ERP_MODULE_REGISTRY) {
    const route = mapModuleLabel(mod, label)
    if (route) return route
  }
  return null
}

export function isMirroredModuleLabel(label: string | undefined, moduleId: string): boolean {
  if (!label) return false
  const mod = ERP_MODULE_REGISTRY.find((m) => m.id === moduleId)
  if (!mod) return false
  const key = normalizeLabelKey(label)
  const modKey = normalizeLabelKey(mod.moduleLabel)
  return key === modKey || key.includes(modKey)
}
