/**
 * Navigation types — derived from Angular navbar.component.ts, modules.ts, and page.ts.
 * Field names match what the Spring Boot /api/authorization endpoint returns at runtime.
 */

/**
 * A sub-module nested inside a Module. Used for 3-level nav trees.
 * Observed in navbar.component.ts: subModule.subModuleId, subModule.subModuleName, subModule.displayName, subModule.iconName, subModule.pages
 */
export interface SubModule {
  subModuleId: number
  subModuleName: string
  displayName: string
  iconName?: string
  sortOrder: number
  pages: Page[]
}

/**
 * A page (leaf navigation item) within a Module or SubModule.
 * Source: college_erp_angular_old/src/app/main/models/page.ts
 */
export interface Page {
  pageId: number
  pageName: string
  displayName: string
  pageCode?: string
  sortOrder: number
  iconName?: string
  url?: string
  canAdd: boolean
  canDelete: boolean
  canEdit: boolean
  canView: boolean
  isActive: boolean
  moduleId?: number
  moduleName?: string
  submoduleId?: number
  submoduleName?: string
}

/**
 * A top-level navigation module returned from /api/authorization.
 * Source: college_erp_angular_old/src/app/main/models/modules.ts + navbar.component.ts
 */
export interface Module {
  moduleId: number
  moduleName: string
  displayName: string
  iconName?: string
  url?: string
  sortOrder: number
  isActive: boolean
  pages: Page[]
  subModules: SubModule[]
}

/**
 * Normalised nav item used by the Next.js sidebar — converted from Module/Page at render time.
 */
export interface NavItem {
  id: string
  label: string
  icon?: string
  href?: string
  children?: NavItem[]
  sortOrder: number
  isActive?: boolean
}
