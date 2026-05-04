import type { Module, SubModule, Page, NavItem } from '@/types/navigation'

/**
 * Removes any doubled leading segment from a URL path.
 * e.g. "a/b/a/b/c" → "/a/b/c"
 * Also ensures the result always starts with "/".
 *
 * Maps legacy Angular nav paths (e.g. admin-post-examination) onto App Router routes.
 */
export function normalizeHref(path: string): string {
  let raw = (path ?? '').trim()

  // Convert Angular/hash URLs to app-router paths.
  // Examples:
  // - https://host/#/admin-examination-management/... -> /admin-examination-management/...
  // - #/admin-examination-management/... -> /admin-examination-management/...
  if (raw.includes('#/')) {
    raw = raw.slice(raw.indexOf('#/') + 1)
  }

  // Drop domain if a full URL is provided.
  raw = raw.replace(/^https?:\/\/[^/]+/i, '')

  // Remove Angular "pages/" prefix when present.
  raw = raw.replace(/^\/?pages\//i, '')

  // Compatibility mapping: legacy admin-pre-examination variants -> pre-examination.
  raw = raw
    .replace(
      /\/admin-examination-management\/admin-pre-examination\//i,
      '/admin-examination-management/pre-examination/',
    )
    .replace(
      /\/admin-examination-management\/admin-pre-examinations\//i,
      '/admin-examination-management/pre-examination/',
    )
    .replace(
      /\/admin-examination-management\/pre-examinations\//i,
      '/admin-examination-management/pre-examination/',
    )
    // Student Information System legacy path variants.
    .replace(
      /\/admin-student-information-system\/student-readmission$/i,
      '/admin-student-information-system/student-re-admission',
    )
    .replace(
      /\/admin-student-information-system\/readmission-application$/i,
      '/admin-student-information-system/readmission-application',
    )
    // Legacy short page slugs used in old pre-examination sidebar.
    .replace(
      /\/admin-examination-management\/pre-examination\/subject-barcode$/i,
      '/admin-examination-management/pre-examination/exam-subject-barcode-generation',
    )
    .replace(
      /\/admin-examination-management\/pre-examination\/hallticket$/i,
      '/admin-examination-management/pre-examination/exam-hallticket',
    )
    .replace(
      /\/admin-examination-management\/pre-examination\/exam-hall-ticket$/i,
      '/admin-examination-management/pre-examination/exam-hallticket',
    )
    // Legacy post-examination module segment (singular + typo plural) → post-examination.
    .replace(
      /\/admin-examination-management\/admin-post-examinations\//i,
      '/admin-examination-management/post-examination/',
    )
    .replace(
      /\/admin-examination-management\/admin-post-examination\//i,
      '/admin-examination-management/post-examination/',
    )
    // Angular source folder `exam-re-valuation-fee-setup` vs route `revaluation-fee-setup` — canonical Next slug.
    .replace(
      /\/admin-examination-management\/admin-exam-masters\/exam-re-valuation-fee-setup/gi,
      '/admin-examination-management/admin-exam-masters/re-valuation-fee-setup',
    )
    // Legacy post-examination attendance slugs → canonical App Router paths (sidebar active state + links).
    .replace(
      /\/admin-examination-management\/post-examination\/staff-internal-attendance-marking(?=\/|$)/i,
      '/admin-examination-management/post-examination/internal-exam-attendance-marking',
    )
    .replace(
      /\/admin-examination-management\/post-examination\/exam-attendance-marking(?=\/|$)/i,
      '/admin-examination-management/post-examination/internal-exam-attendance-marking',
    )
    .replace(
      /\/admin-examination-management\/post-examination\/internal-exams-avg(?=\/|$)/i,
      '/admin-examination-management/post-examination/internal-exams-average',
    )

  // Normalize slashes and trim trailing slash.
  raw = raw.replace(/\/{2,}/g, '/').replace(/\/$/, '')

  // Strip any leading slash for processing
  const stripped = raw.startsWith('/') ? raw.slice(1) : raw
  const segments = stripped.split('/')

  // Find longest prefix that immediately repeats after itself
  for (let prefixLen = 1; prefixLen <= Math.floor(segments.length / 2); prefixLen++) {
    const prefix = segments.slice(0, prefixLen)
    const next = segments.slice(prefixLen, prefixLen * 2)
    if (prefix.length === next.length && prefix.every((s, i) => s === next[i])) {
      return '/' + segments.slice(prefixLen).join('/')
    }
  }

  return '/' + stripped
}

function overrideLegacyPreExamHref(href: string, label: string): string {
  const lower = (label ?? '').toLowerCase()
  const base = '/admin-examination-management/pre-examination'

  if (!href.startsWith(base)) return href

  if (lower.includes('student exam fee')) return `${base}/student-exam-fee-registration`
  if (lower.includes('exam scheduling')) return `${base}/exam-scheduling-forms`
  if (lower.includes('exam register subjec')) return `${base}/exam-register-subjects`
  if (lower.includes('online exam fee')) return `${base}/online-exam-fee-registration`
  if (lower.includes('internal exam registr')) return `${base}/internal-exam-registration-multiple`
  if (lower.includes('exam hallticket')) return `${base}/exam-hallticket`
  if (lower.includes('exam subject barcode')) return `${base}/exam-subject-barcode-generation`
  if (lower.includes('exam forms')) return `${base}/exam-forms`
  if (lower.includes('invigilator allot')) return `${base}/invigilator-allotment`
  if (lower.includes('additional exam fee')) return `${base}/additional-exam-fees`
  if (lower.includes('exam attendance-wise') || lower.includes('exam attendancewise')) {
    return `${base}/exam-attendancewise-subject-barcode`
  }
  if (lower.includes('student exam lab bat')) return `${base}/student-exam-lab-batches`
  if (lower.includes('manual') && lower.includes('fee')) return `${base}/exam-registration-manual-feeless`

  return href
}

/** Backend page.url often keeps Angular slugs; map by label to Next routes under post-examination. */
function overrideLegacyPostExamHref(href: string, label: string): string {
  const lower = (label ?? '').toLowerCase()
  const base = '/admin-examination-management/post-examination'

  const isInternalAttendance =
    lower.includes('internal') &&
    lower.includes('exam') &&
    lower.includes('attendance') &&
    (lower.includes('marking') || lower.includes('attendance marking')) &&
    !lower.includes('external')
  if (isInternalAttendance) {
    return `${base}/internal-exam-attendance-marking`
  }

  const isExternalAttendance =
    lower.includes('external') &&
    lower.includes('exam') &&
    lower.includes('attendance') &&
    (lower.includes('marking') || lower.includes('attendance marking'))
  if (isExternalAttendance) {
    return `${base}/external-exam-attendance-marking`
  }

  if (
    lower.includes('internal') &&
    (lower.includes('exams average') || lower.includes('exam average') || lower.includes('internal exams avg'))
  ) {
    return `${base}/internal-exams-average`
  }

  return href
}

function normalizePageHref(href: string, pageLabel: string): string {
  return normalizeHref(
    overrideLegacyPostExamHref(overrideLegacyPreExamHref(href, pageLabel), pageLabel),
  )
}

/**
 * Replicates Angular's addModuleToNavigation + addPagesToNavigation logic.
 * Takes raw modules[] and pages[] from UserDTO/SessionUser and builds a
 * hierarchical NavItem tree sorted by sortOrder.
 *
 * Rules mirrored from navbar.component.ts:
 * - Modules sorted by sortOrder ASC
 * - Module URL: use module.url if set (not null/'null'), else derive from moduleName
 *   (split by space, skip word 'and', join with '-')
 * - Module with no pages + no subModules → leaf item with href
 * - Module with pages or subModules → collapsable with children
 * - Module pages sorted by sortOrder ASC, href = moduleUrl/page.url
 * - SubModule pages sorted by sortOrder ASC, href = moduleUrl/subModuleUrl/page.url
 * - Standalone pages (addPagesToNavigation path): sorted by sortOrder ASC,
 *   href built from moduleName/submoduleName/page.url parts
 * - Default icon: modules → 'dashboard', pages → 'arrow_forward'
 */
export function buildNavTree(modules: Module[], pages: Page[]): NavItem[] {
  const hasModules = modules && modules.length > 0
  const hasPages = pages && pages.length > 0

  if (!hasModules && hasPages) {
    return buildStandalonePages(pages)
  }

  if (!hasModules) return []

  return buildModuleTree(modules, pages)
}

/** addPagesToNavigation path — flat pages with no module grouping */
function buildStandalonePages(pages: Page[]): NavItem[] {
  const sorted = [...pages].sort((a, b) => a.sortOrder - b.sortOrder)
  return sorted.map((page) => {
    const icon = normalizePageIcon(page.iconName)

    let moduleUrl = page.moduleName
      ? page.moduleName.toLowerCase().trim().replace(' ', '-')
      : null
    let subModuleUrl = page.submoduleName
      ? page.submoduleName.toLowerCase().trim().replace(' ', '-')
      : null
    const rawUrl = page.url ?? ''
    let href = rawUrl

    if (moduleUrl && subModuleUrl) {
      const fullPrefix = `${moduleUrl}/${subModuleUrl}`
      href = rawUrl.startsWith(fullPrefix + '/') || rawUrl === fullPrefix
        ? rawUrl
        : `${fullPrefix}/${rawUrl}`
    } else if (moduleUrl) {
      href = rawUrl.startsWith(moduleUrl + '/') || rawUrl === moduleUrl
        ? rawUrl
        : `${moduleUrl}/${rawUrl}`
    } else if (subModuleUrl) {
      href = rawUrl.startsWith(subModuleUrl + '/') || rawUrl === subModuleUrl
        ? rawUrl
        : `${subModuleUrl}/${rawUrl}`
    }

    const normalizedHref = normalizePageHref(href, page.displayName)

    return {
      id: `page_${page.pageId}`,
      label: page.displayName,
      icon,
      href: normalizedHref,
      sortOrder: page.sortOrder,
      isActive: page.isActive,
    }
  })
}

/** addModuleToNavigation path — modules with nested pages and submodules */
function buildModuleTree(modules: Module[], pages: Page[]): NavItem[] {
  const sorted = [...modules].sort((a, b) => a.sortOrder - b.sortOrder)
  const navItems: NavItem[] = []

  // If there are also standalone pages (pages.length > 0 with modules), Angular
  // calls addPagesToNavigation first and then addModuleToNavigation appends.
  // We prepend them here.
  if (pages && pages.length > 0) {
    navItems.push(...buildStandalonePages(pages))
  }

  for (const module of sorted) {
    const icon = normalizeModuleIcon(module.iconName)
    const moduleUrl = buildModuleUrl(module.url, module.moduleName)

    const moduleHasPages = module.pages && module.pages.length > 0
    const moduleHasSubModules = module.subModules && module.subModules.length > 0

    if (!moduleHasPages && !moduleHasSubModules) {
      navItems.push({
        id: `module_${module.moduleId}`,
        label: module.displayName,
        icon,
        href: normalizeHref(moduleUrl),
        sortOrder: module.sortOrder,
        isActive: module.isActive,
      })
    } else {
      const children: NavItem[] = []

      if (moduleHasPages) {
        const sortedPages = [...module.pages].sort((a, b) => a.sortOrder - b.sortOrder)
        for (const page of sortedPages) {
          const rawUrl = page.url ?? ''
          const href = rawUrl.startsWith(moduleUrl + '/') || rawUrl === moduleUrl
            ? rawUrl
            : `${moduleUrl}/${rawUrl}`
          const normalizedHref = normalizePageHref(href, page.displayName)
          children.push({
            id: `page_${page.pageId}`,
            label: page.displayName,
            icon: normalizePageIcon(page.iconName),
            href: normalizedHref,
            sortOrder: page.sortOrder,
            isActive: page.isActive,
          })
        }
      }

      if (moduleHasSubModules) {
        for (const subModule of module.subModules) {
          children.push(buildSubModuleItem(subModule, moduleUrl))
        }
      }

      navItems.push({
        id: `module_${module.moduleId}`,
        label: module.displayName,
        icon,
        sortOrder: module.sortOrder,
        isActive: module.isActive,
        children,
      })
    }
  }

  return navItems
}

function buildSubModuleItem(subModule: SubModule, moduleUrl: string): NavItem {
  const icon = normalizeModuleIcon(subModule.iconName)
  const subModuleUrl = buildSubModuleUrl(subModule.subModuleName)
  const subChildren: NavItem[] = []

  if (subModule.pages && subModule.pages.length > 0) {
    const sorted = [...subModule.pages].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const page of sorted) {
      const rawUrl = page.url ?? ''
      const fullPrefix = `${moduleUrl}/${subModuleUrl}`
      const href = rawUrl.startsWith(fullPrefix + '/') || rawUrl === fullPrefix
        ? rawUrl
        : `${fullPrefix}/${rawUrl}`
      const normalizedHref = normalizePageHref(href, page.displayName)
      subChildren.push({
        id: `page_${page.pageId}`,
        label: page.displayName,
        icon: normalizePageIcon(page.iconName),
        href: normalizedHref,
        sortOrder: page.sortOrder,
        isActive: page.isActive,
      })
    }
  }

  return {
    id: `sub_module_${subModule.subModuleId}`,
    label: subModule.displayName,
    icon,
    sortOrder: subModule.sortOrder,
    isActive: true,
    ...(subChildren.length > 0 ? { children: subChildren } : {}),
  }
}

/**
 * Derives the URL segment for a module.
 * Mirrors Angular: use module.url if present and not literal 'null',
 * otherwise split moduleName by spaces, skip word 'and', join with '-'.
 */
function buildModuleUrl(url: string | undefined, moduleName: string): string {
  if (url && url !== 'null') return url

  const parts = moduleName.toLowerCase().split(' ')
  let result = ''
  for (const part of parts) {
    if (part === 'and') continue
    result = result === '' ? part : `${result}-${part}`
  }
  return result
}

/**
 * Derives the URL segment for a submodule.
 * Same logic as buildModuleUrl but uses subModuleName.
 */
function buildSubModuleUrl(subModuleName: string | null | undefined): string {
  if (!subModuleName) return ''

  const parts = subModuleName.toLowerCase().split(' ')
  let result = ''
  for (const part of parts) {
    if (part === 'and') continue
    result = result === '' ? part : `${result}-${part}`
  }
  return result
}

function normalizeModuleIcon(iconName: string | undefined): string {
  if (!iconName || iconName === 'null' || iconName === 'undefined' || iconName === '') {
    return 'dashboard'
  }
  return iconName
}

function normalizePageIcon(iconName: string | undefined): string {
  if (!iconName || iconName === 'null' || iconName === 'undefined' || iconName === '') {
    return 'arrow_forward'
  }
  return iconName
}

/**
 * Converts a module/page name to a URL-safe slug.
 * Replicate Angular's URL generation approach.
 */
export function toNavSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}
