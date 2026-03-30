import type { Module, Page } from './navigation'

/**
 * Full user object returned by GET /api/authorization?isMobile=false
 * Maps to Spring Boot UserDTO. Contains every field stored to localStorage
 * by login.component.ts (Angular source) as reference.
 *
 * SECURITY: This type is ONLY used server-side. Never send to the browser.
 * Use SessionUser for anything that crosses the server→client boundary.
 */
export interface UserDTO {
  userId: number
  userName: string
  firstName: string
  lastName?: string
  email?: string
  mobileNumber?: string
  userRole: string           // e.g. 'ADMIN' | 'STAFF' | 'STUDENT' | 'MSTUDENT' | 'PARENT' | 'SUPERADMIN'
  userTypeCode: string       // e.g. 'STAFF' | 'STUDENT' | 'PARENT'
  roleName: string
  userRoles: UserRoleEntry[]
  collegeId: number
  collegeCode: string
  collegeName: string
  organizationId?: number
  organizationCode?: string
  organizationName?: string
  universityId?: number
  universityCode?: string
  academicYearId: number
  academicYear: string
  employeeId?: number
  studentId?: number
  modules: Module[]
  pages: Page[]
  employeeDataSecurityCrudUrl?: string
}

/**
 * Individual role entry from the userRoles[] array on UserDTO.
 * Source: college_erp_angular_old/src/app/main/models/userRoles.ts
 */
export interface UserRoleEntry {
  userRoleId: number
  userId: number
  roleId: number
  roleName: string
  userName: string
  firstName?: string
  lastName?: string
  userTypeId?: number
  isActive: boolean
  createdDt: string
  updatedDt?: string
}

/**
 * Safe user shape stored in Iron Session AND returned to the browser.
 *
 * SECURITY RULES (enforced by type structure):
 * 1. NO jwt field — JWT must never leave the server.
 * 2. Privilege flags (isAdmin, isPrincipal, isManagement) are computed
 *    server-side from the session; never accept client-provided values.
 * 3. defaultDashboardPath is derived server-side from userRole.
 */
export interface SessionUser {
  userId: number
  userName: string
  firstName: string
  lastName?: string
  userRole: string
  userTypeCode: string
  roleName: string
  collegeId: number
  collegeCode: string
  collegeName: string
  /** Organization ID -- used for college-wise filter queries */
  organizationId?: number
  academicYearId: number
  academicYear: string
  employeeId?: number
  studentId?: number
  // Derived server-side — never trust client-provided values:
  isAdmin: boolean            // userRole === 'ADMIN' || userRole === 'SUPERADMIN'
  isPrincipal: boolean        // roleName includes 'PRINCIPAL'
  isManagement: boolean       // userTypeCode includes 'MGNT' or roleName includes 'MANAGEMENT'
  defaultDashboardPath: string // computed from userRole/userTypeCode on the server
}

/**
 * Iron Session data bag — SERVER ONLY.
 * iron-session v8: pass as a generic parameter, NOT via declare module augmentation.
 *
 * Usage in lib/session.ts:
 *   import { getIronSession, type SessionOptions } from 'iron-session'
 *   const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions)
 *
 * SECURITY: The jwt field must NEVER be included in SessionUser or any
 * response sent to the browser. It lives here and dies here.
 */
export interface IronSessionData {
  jwt?: string        // NEVER sent to browser — used only for server→Spring Boot proxy calls
  user?: SessionUser
  issuedAt?: number   // Unix timestamp (ms) of when the session was created
}
