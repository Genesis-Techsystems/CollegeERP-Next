import { readEmployeeIdFromStorage, readOrganizationIdFromStorage } from '@/lib/user-context'

/** Sync read for modals — prefer `useFinanceSessionIds()` in page components. */
export function getFinanceSessionIds(): { organizationId: number; employeeId: number } {
  return {
    organizationId: readOrganizationIdFromStorage(),
    employeeId: readEmployeeIdFromStorage(),
  }
}
