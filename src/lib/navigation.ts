import type { Module, SubModule, Page, NavItem } from '@/types/navigation'
import { ensureErpModuleNavChildren, mapErpModuleNavRoute } from './erp-modules-navigation'
import { ensureTimetableNavChildren, mapTimetableNavRoute } from './timetable-navigation'
import { mapAdminInstitutionalRoomRoute } from './admin-institutional-navigation'

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
    // Angular exam-grades folder → App Router grade-setup slug.
    .replace(
      /\/admin-examination-management\/admin-exam-masters\/exam-grades(?=\/|$)/gi,
      '/admin-examination-management/admin-exam-masters/grade-setup',
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
    // Angular Assessments module folder typo `assissments` → canonical `assessments`.
    .replace(/\/apps\/assissments\//gi, '/assessments/')
    .replace(/\/assissments\//gi, '/assessments/')
    // Angular Accounts & Fees module (`accounts-fees` in router) → App Router path.
    .replace(/\/accounts-fees\//gi, '/accounts-and-fees/')
    .replace(/\/apps\/accounts-and-fees\//gi, '/accounts-and-fees/')
    // Angular Scholarship Management module → App Router path.
    .replace(/\/apps\/scholarship-management\//gi, '/scholarship-management/')
    .replace(/\/scholarship\//gi, '/scholarship-management/')
    // Angular Admission module → App Router path (`enquiry-form` folder routes as `enquiries`).
    .replace(/\/apps\/admission\//gi, '/admission/')
    .replace(/\/admission\/enquiry-form\//gi, '/admission/enquiries/')
    // Angular Accounts & Fees — hostel payment (Student Fee Collection).
    .replace(/\/fees-collection\/hostel-payment(?=\/|$)/gi, '/accounts-and-fees/fees-collection/hostel-payment')
    .replace(
      /\/fees-collection\/hostel-payment\/hostel-fee-payment/gi,
      '/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment',
    )
    .replace(
      /\/fees-collection\/hostel-payment\/hostel-fee-list/gi,
      '/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment',
    )
    // Angular Wallet module — legacy slugs map to Angular-parity App Router paths.
    .replace(/\/wallet\/university-wallet-transactions(?=\/|$)/gi, '/wallet/university-payment-wallet-transactions')
    .replace(/\/wallet\/wallet-transactions(?=\/|$)/gi, '/wallet/university-payment-wallet-transactions')
    .replace(/\/wallet\/university-wallet-recharge(?=\/|$)/gi, '/wallet/recharge-wallet')
    // Angular Admin institutional masters → App Router admin pages.
    .replace(/\/institutional-masters\/rooms-type(?=\/|$)/gi, '/admin/room-types')
    .replace(/\/institutional-masters\/rooms-types(?=\/|$)/gi, '/admin/room-types')
    .replace(/\/institutional-masters\/room-type(?=\/|$)/gi, '/admin/room-types')
    .replace(/\/institutional-masters\/room-types(?=\/|$)/gi, '/admin/room-types')
    .replace(/\/institutional-masters\/rooms(?=\/|$)/gi, '/admin/rooms')
    .replace(/\/institutional-masters\/room-details(?=\/|$)/gi, '/admin/room-details')
    .replace(/\/institutional-masters\/room-detail(?=\/|$)/gi, '/admin/room-details')
    .replace(/\/institutional-masters\/buildings(?=\/|$)/gi, '/admin/buildings')
    .replace(/\/institutional-masters\/building(?=\/|$)/gi, '/admin/buildings')
    .replace(/\/institutional-masters\/blocks(?=\/|$)/gi, '/admin/blocks')
    .replace(/\/institutional-masters\/block(?=\/|$)/gi, '/admin/blocks')
    .replace(/\/institutional-masters\/floors(?=\/|$)/gi, '/admin/floors')
    .replace(/\/institutional-masters\/floor(?=\/|$)/gi, '/admin/floors')
    // Angular Admin academic-settings submodule → flat App Router admin pages.
    .replace(/\/admin\/academic-settings\//gi, '/admin/')
    // Angular E-Office module (`Office/` menu prefix) → App Router path.
    .replace(/\/Office\//gi, '/e-office/')
    .replace(/\/apps\/e-office\//gi, '/e-office/')
    // Angular Affiliated Colleges module → App Router path.
    .replace(/\/apps\/affiliated-colleges\//gi, '/affiliated-colleges/')
    // Angular Attendance Management → App Router path.
    .replace(/\/admin-attendance-management\//gi, '/attendance-management/')
    .replace(/\/apps\/admin-attendance-management\//gi, '/attendance-management/')
    .replace(/\/staff-classes\/attendance-update\//gi, '/attendance-management/mark-attendance/')
    .replace(/\/exam-attendance\//gi, '/attendance-management/exam-attendance/')
    // Angular Mentorship / Counseling → App Router path.
    .replace(/\/staff-mentorship\//gi, '/mentorship/')
    .replace(/\/admin-counseling\//gi, '/mentorship/')
    // Angular Library module → App Router path.
    .replace(/\/apps\/library\//gi, '/library/')
    .replace(/\/pages\/library\//gi, '/library/')
    // Angular Notifications & Announcements (`notifications-&-announcements`) → App Router path.
    .replace(/\/notifications-&-announcements\//gi, '/notifications-and-announcements/')
    .replace(/\/notifications-%26-announcements\//gi, '/notifications-and-announcements/')
    .replace(
      /\/notifications-&-announcements$/i,
      '/notifications-and-announcements/employee-inbox',
    )
    // Student my notifications → App Router path.
    .replace(/\/student-communications\/student-announcements\/?/gi, '/my-notifications/')
    // Angular Timetable module (`/apps/timetable/` or nested `timetable/` segment) → App Router path.
    .replace(/\/apps\/time-table\//gi, '/time-table-management/')
    .replace(/\/apps\/timetable\//gi, '/time-table-management/')
    .replace(/\/time-table-management\/timetable\//gi, '/time-table-management/')
    .replace(/^\/timetable\//i, '/time-table-management/')
    // Legacy/hash paths that pointed at SIS student-subjects but belong to Affiliated Colleges.
    .replace(
      /\/affiliated-colleges\/student-subjects(?=\/|$)/gi,
      '/affiliated-colleges/assign-student-subjects',
    )
    .replace(
      /\/apps\/affiliated-colleges\/student-subjects(?=\/|$)/gi,
      '/affiliated-colleges/assign-student-subjects',
    )
    // Angular module prefix `/apps/user-management/` → App Router path.
    .replace(/\/apps\/user-management\//gi, '/user-management/')
    // Angular Email & SMS app folder → Next routes.
    .replace(/\/apps\/email-sms\//gi, '/email-sms/')
    /** SKOLO / some builds: module segment `email-&-sms` (ampersand) e.g. `#/email-&-sms/principal-to-Dept-email`. */
    .replace(/\/email-&-sms\//gi, '/email-sms/')
    .replace(/\/email-%26-sms\//gi, '/email-sms/')
    /** Canonical department-wise email; typo `depart-wise-email` (`ment` omitted). */
    .replace(/\/email-sms\/depart(?:ment)?-wise-email(?=\/|$)/gi, '/email-sms/department-wise-email')
    /** Shorthand slug sometimes used in menus. */
    .replace(/\/email-sms\/dept-wise-email(?=\/|$)/gi, '/email-sms/department-wise-email')
    /** Angular source folder `principal-to-dpt-email` (abbrev.) → App Router slug. */
    .replace(/\/email-sms\/principal-to-dpt-email(?=\/|$)/gi, '/email-sms/principal-to-dept-email')
    /** Legacy casing `principal-to-Dept-email` → canonical segment. */
    .replace(/\/email-sms\/principal-to-dept-email(?=\/|$)/gi, '/email-sms/principal-to-dept-email')
    /** Common menu typo `emial` → `email`. */
    .replace(/\/email-sms\/department-wise-emial(?=\/|$)/gi, '/email-sms/department-wise-email')
    .replace(/\/email-sms\/send-student-sms(?=\/|$)/gi, '/email-sms/send-sms-to-students')
    .replace(/\/email-sms\/send-login-details(?=\/|$)/gi, '/email-sms/send-login-details')
    .replace(/\/email-sms\/send-absent-sms(?=\/|$)/gi, '/email-sms/send-sms-to-absents')
    .replace(/\/email-sms\/send-staff-sms(?=\/|$)/gi, '/email-sms/send-sms-to-staff-attendance')
    /** Email & SMS — sent email audit trail. */
    .replace(/\/email-sms\/email-log(?=\/|$)/gi, '/email-sms/email-logs')
    .replace(/\/email-sms\/emaillogs(?=\/|$)/gi, '/email-sms/email-logs')
    /** Angular `principal-staff-to-admin-email` (folder variants) → App Router slug. */
    .replace(/\/email-sms\/principal-and-staff-to-admin-email(?=\/|$)/gi, '/email-sms/principal-staff-to-admin-email')
    .replace(/\/email-sms\/principal-staff-to-admin-emial(?=\/|$)/gi, '/email-sms/principal-staff-to-admin-email')
    .replace(/\/email-sms\/staff-principal-to-admin-email(?=\/|$)/gi, '/email-sms/principal-staff-to-admin-email')
    /** Angular `principal-to-staff-email` — minimal "Send Email To Admin" screen. */
    .replace(/\/email-sms\/send-email-to-admin(?=\/|$)/gi, '/email-sms/principal-to-staff-email')
    .replace(/\/email-sms\/principal-to-staff-emial(?=\/|$)/gi, '/email-sms/principal-to-staff-email')
    // Security/User Management legacy routes.
    .replace(
      /\/admin-user-management\/general-users-accounts(?=\/|$)/i,
      '/user-management/general-user-accounts',
    )
    .replace(
      /\/admin-user-management\/general-user-accounts(?=\/|$)/i,
      '/user-management/general-user-accounts',
    )
    .replace(
      /\/admin-user-management\/general-user-account(?=\/|$)/i,
      '/user-management/general-user-accounts',
    )
    .replace(
      /\/user-management\/general-users-accounts(?=\/|$)/i,
      '/user-management/general-user-accounts',
    )
    .replace(
      /\/user-management\/general-user-account(?=\/|$)/i,
      '/user-management/general-user-accounts',
    )
    .replace(
      /\/admin-user-management\/staff-accounts(?=\/|$)/i,
      '/user-management/staff-accounts',
    )
    .replace(
      /\/admin-user-management\/staff-account(?=\/|$)/i,
      '/user-management/staff-accounts',
    )
    .replace(
      /\/user-management\/staff-account(?=\/|$)/i,
      '/user-management/staff-accounts',
    )
    .replace(
      /\/user-management\/staff-accounts-list(?=\/|$)/i,
      '/user-management/staff-accounts',
    )
    .replace(
      /\/user-management\/staffs(?=\/|$)/i,
      '/user-management/staff-accounts',
    )
    .replace(
      /\/admin-user-management\/parent-accounts(?=\/|$)/i,
      '/user-management/parent-accounts',
    )
    .replace(
      /\/admin-user-management\/parent\/manage(?=\/|$)/i,
      '/user-management/parent-accounts/manage',
    )
    .replace(
      /\/user-management\/parent\/manage(?=\/|$)/i,
      '/user-management/parent-accounts/manage',
    )
    .replace(
      /\/admin-user-management\/parent-accounts\/add-sibling(?=\/|$)/i,
      '/user-management/parent-accounts/add-sibling',
    )
    .replace(
      /\/admin-user-management\/student-accounts(?=\/|$)/i,
      '/user-management/student-accounts',
    )
    .replace(
      /\/admin-user-management\/student-account(?=\/|$)/i,
      '/user-management/student-accounts',
    )
    .replace(
      /\/user-management\/student-account(?=\/|$)/i,
      '/user-management/student-accounts',
    )
    .replace(
      /\/admin-user-management\/student\/manage(?=\/|$)/i,
      '/user-management/student-accounts?add=1',
    )
    .replace(
      /\/user-management\/student\/manage(?=\/|$)/i,
      '/user-management/student-accounts?add=1',
    )
    .replace(
      /\/admin-user-management\/examination-accounts(?=\/|$)/i,
      '/user-management/examination-accounts',
    )
    .replace(
      /\/admin-user-management\/examination-account(?=\/|$)/i,
      '/user-management/examination-accounts',
    )
    .replace(
      /\/user-management\/examination-account(?=\/|$)/i,
      '/user-management/examination-accounts',
    )
    // Placements & Achievements — Angular `placement-companies` / legacy component slug.
    .replace(/\/apps\/placements-achievements\//gi, '/placements-achievements/')
    .replace(
      /\/placements-achievements\/placements\/company-placements-requirements(?=\/|$)/gi,
      '/placements-achievements/placements/placement-companies',
    )
    .replace(
      /\/placements-achievements\/company-placements-requirements(?=\/|$)/gi,
      '/placements-achievements/placements/placement-companies',
    )
    .replace(
      /\/placements-achievements\/placements\/placement-registered-studentslist(?=\/|$)/gi,
      '/placements-achievements/placements/placement-registered-list',
    )
    .replace(
      /\/placements-achievements\/placement-registered-studentslist(?=\/|$)/gi,
      '/placements-achievements/placements/placement-registered-list',
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

function overrideTimetableHref(href: string, pageLabel: string): string {
  const mapped = mapTimetableNavRoute(href, pageLabel)
  return mapped ?? href
}

function overrideErpModuleHref(href: string, pageLabel: string): string {
  const mapped = mapErpModuleNavRoute(href, pageLabel)
  return mapped ?? href
}

function overrideInstitutionalMastersHref(href: string, pageLabel: string): string {
  return mapAdminInstitutionalRoomRoute(href, pageLabel) ?? href
}

function normalizePageHref(href: string, pageLabel: string): string {
  const withInstitutional = overrideInstitutionalMastersHref(href, pageLabel)
  return normalizeHref(
    overrideErpModuleHref(
      overrideTimetableHref(
        overrideLegacyPostExamHref(overrideLegacyPreExamHref(withInstitutional, pageLabel), pageLabel),
        pageLabel,
      ),
      pageLabel,
    ),
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
function normalizeModuleKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Attach top-level `pages[]` entries to their parent module (Spring often sends them separately). */
function mergeFlatPagesIntoModules(modules: Module[], flatPages: Page[]): Module[] {
  if (!flatPages.length) return modules

  return modules.map((module) => {
    const moduleKeys = new Set([
      normalizeModuleKey(module.moduleName),
      normalizeModuleKey(module.displayName ?? ''),
    ])
    const attached = flatPages.filter((page) => {
      if (page.moduleId != null && page.moduleId === module.moduleId) return true
      const pageKey = normalizeModuleKey(page.moduleName ?? '')
      return pageKey.length > 0 && moduleKeys.has(pageKey)
    })
    if (attached.length === 0) return module

    const existingIds = new Set((module.pages ?? []).map((p) => p.pageId))
    const mergedPages = [...(module.pages ?? [])]
    for (const page of attached) {
      if (!existingIds.has(page.pageId)) mergedPages.push(page)
    }
    return { ...module, pages: mergedPages }
  })
}

/** Pages that are not linked to any module — shown as top-level nav items. */
function getOrphanPages(flatPages: Page[], modules: Module[]): Page[] {
  return flatPages.filter((page) => {
    if (page.moduleId != null) {
      return !modules.some((m) => m.moduleId === page.moduleId)
    }
    const pageKey = normalizeModuleKey(page.moduleName ?? '')
    if (!pageKey) return true
    return !modules.some((m) => {
      const keys = [normalizeModuleKey(m.moduleName), normalizeModuleKey(m.displayName ?? '')]
      return keys.includes(pageKey)
    })
  })
}

export function buildNavTree(modules: Module[], pages: Page[]): NavItem[] {
  const safeModules = modules ?? []
  const safePages = pages ?? []
  const hasModules = safeModules.length > 0
  const hasPages = safePages.length > 0

  if (!hasModules && hasPages) {
    return ensureErpModuleNavChildren(ensureTimetableNavChildren(buildStandalonePages(safePages)))
  }

  if (!hasModules) return []

  const mergedModules = mergeFlatPagesIntoModules(safeModules, safePages)
  const orphanPages = getOrphanPages(safePages, mergedModules)
  return ensureErpModuleNavChildren(
    ensureTimetableNavChildren(buildModuleTree(mergedModules, orphanPages)),
  )
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

export interface NavBreadcrumbSegment {
  label: string
  href?: string
}

export interface NavSearchPage {
  displayName: string
  url: string
}

/** Flattens the sidebar nav tree into searchable leaf pages with normalized hrefs. */
export function flattenNavItemsForSearch(items: NavItem[]): NavSearchPage[] {
  const collected: NavSearchPage[] = []

  function walk(nodes: NavItem[]) {
    for (const item of nodes) {
      if (item.href) {
        collected.push({
          displayName: item.label,
          url: normalizeHref(item.href),
        })
      }
      if (item.children?.length) walk(item.children)
    }
  }

  walk(items)

  const seen = new Set<string>()
  return collected.filter((page) => {
    if (seen.has(page.url)) return false
    seen.add(page.url)
    return true
  })
}

/** Same href pins NavItem uses so breadcrumbs match sidebar links. */
function resolveNavItemHrefForBreadcrumb(item: NavItem): string | null {
  const labelLower = (item.label ?? '').toLowerCase()

  if (labelLower.includes('room detail')) return '/admin/room-details'
  if (
    (labelLower.includes('college courses') && labelLower.includes('group'))
    || (labelLower.includes('college subject') && labelLower.includes('group'))
  ) {
    return '/admin/college-courses-groups'
  }

  if (!item.href) return null

  const hrefLower = item.href.toLowerCase()
  const masterSettingsMarker = 'master-settings/'
  const masterSettingsIndex = hrefLower.indexOf(masterSettingsMarker)
  if (masterSettingsIndex !== -1) {
    const slug = hrefLower
      .slice(masterSettingsIndex + masterSettingsMarker.length)
      .split('?')[0]
    if (slug) {
      return normalizeHref(`/admin/${slug}`).replace(/\/$/, '')
    }
  }

  const academicSettingsMarker = 'academic-settings/'
  const academicSettingsIndex = hrefLower.indexOf(academicSettingsMarker)
  if (academicSettingsIndex !== -1) {
    const slug = hrefLower
      .slice(academicSettingsIndex + academicSettingsMarker.length)
      .split('?')[0]
    if (slug) {
      return normalizeHref(`/admin/${slug}`).replace(/\/$/, '')
    }
  }

  return normalizePageHref(item.href, item.label).replace(/\/$/, '')
}

/**
 * Resolves breadcrumb segments from the sidebar nav tree so labels match the
 * menu (e.g. Master Setup → Organizations) instead of raw URL segments.
 */
export function findNavBreadcrumbItems(
  navItems: NavItem[],
  pathname: string,
): NavBreadcrumbSegment[] | null {
  const target = normalizeHref(pathname).replace(/\/$/, '') || '/'
  const match: { chain: NavItem[]; score: number } = { chain: [], score: 0 }

  function walk(items: NavItem[], chain: NavItem[]) {
    for (const item of items) {
      const nextChain = [...chain, item]
      const href = resolveNavItemHrefForBreadcrumb(item)

      if (href) {
        const exact = target === href
        const prefix = target.startsWith(`${href}/`)
        if (exact || prefix) {
          const score = href.length + (exact ? 10_000 : 0)
          if (score > match.score) {
            match.score = score
            match.chain = nextChain
          }
        }
      }

      if (item.children?.length) walk(item.children, nextChain)
    }
  }

  walk(navItems, [])

  if (match.chain.length === 0) return null

  const segments: NavBreadcrumbSegment[] = match.chain.map((item, index) => {
    const isLast = index === match.chain.length - 1
    return {
      label: item.label,
      href: !isLast && item.href ? normalizeHref(item.href) : undefined,
    }
  })

  return [{ label: 'Home', href: '/dashboard' }, ...segments]
}
