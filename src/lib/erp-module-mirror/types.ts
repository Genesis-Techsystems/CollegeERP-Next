export type ModuleRouteKind = 'dashboard' | 'master' | 'transaction' | 'report' | 'placeholder'

export type ModuleRouteConfig = {
  slug: string
  title: string
  description: string
  kind: ModuleRouteKind
  angularPath?: string
}

export type ErpModuleMirrorConfig = {
  id: string
  basePath: string
  angularSegment: string
  defaultSlug: string
  moduleLabel: string
  dashboardTitle: string
  dashboardDescription: string
  routes: ModuleRouteConfig[]
  /** Normalized menu labels → route slug (checked before fuzzy title match). */
  labelAliases?: Record<string, string>
  slugAliases?: Record<string, string>
}
