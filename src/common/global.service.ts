/**
 * Global application state helpers.
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/global.service.ts
 *
 * Angular dependencies removed:
 *   - @angular/core Injectable / BehaviorSubject / RxJS
 *
 * Replaced with a plain singleton object using simple getter/setter pairs.
 * For React components that need reactive updates, use the Zustand store
 * (src/store/) or React context instead of subscribing here.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmpSecurity {
  [key: string]: unknown
}

export interface EmployeeDetails {
  [key: string]: unknown
}

// ─── Singleton store ─────────────────────────────────────────────────────────

interface GlobalState {
  empSecurity: EmpSecurity | null
  dashboardUrl: string | null
  employeeDetails: EmployeeDetails | null
}

const state: GlobalState = {
  empSecurity: null,
  dashboardUrl: null,
  employeeDetails: null,
}

// ─── Setters ──────────────────────────────────────────────────────────────────

export function setEmpSecurity(data: EmpSecurity | null): void {
  state.empSecurity = data
}

export function setDashboardUrl(data: string | null): void {
  state.dashboardUrl = data
}

export function setEmployeeDetails(data: EmployeeDetails | null): void {
  state.employeeDetails = data
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export function getEmpSecurity(): EmpSecurity | null {
  return state.empSecurity
}

export function getDashboardUrl(): string | null {
  return state.dashboardUrl
}

export function getEmployeeDetails(): EmployeeDetails | null {
  return state.employeeDetails
}

// ─── Class-style API (backwards-compatible surface) ──────────────────────────

/**
 * GlobalService class mirrors the Angular service API.
 * Prefer the standalone functions above for new code.
 */
export class GlobalService {
  setEmpSecurity(data: EmpSecurity | null): void {
    setEmpSecurity(data)
  }

  setDashboardUrl(data: string | null): void {
    setDashboardUrl(data)
  }

  setEmployeeDetails(data: EmployeeDetails | null): void {
    setEmployeeDetails(data)
  }

  getEmpSecurity(): EmpSecurity | null {
    return getEmpSecurity()
  }

  getDashboardUrl(): string | null {
    return getDashboardUrl()
  }

  getEmployeeDetails(): EmployeeDetails | null {
    return getEmployeeDetails()
  }
}

/** Shared singleton instance — use where a single shared instance is needed. */
export const globalService = new GlobalService()
