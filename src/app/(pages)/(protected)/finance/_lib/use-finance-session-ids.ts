'use client'

import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { resolveOrganizationId } from '@/lib/user-context'

/** Org + employee ids for finance stored-proc filters (session-first, localStorage fallback). */
export function useFinanceSessionIds() {
  const { user, isLoading: sessionLoading } = useSessionContext()
  const organizationId = resolveOrganizationId(user)
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading)
  const contextLoading = sessionLoading || isResolving
  const contextReady = !contextLoading && organizationId > 0

  return {
    organizationId,
    employeeId,
    contextLoading,
    contextReady,
  }
}
