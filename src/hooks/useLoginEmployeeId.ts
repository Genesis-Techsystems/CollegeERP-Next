'use client'

import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { resolveLoginEmployeeId, syncSessionUserToStorage } from '@/lib/user-context'
import { getEmployeeIdByUserId } from '@/services/auth'
import type { SessionUser } from '@/types/user'

/**
 * Resolves `in_loginuser_empid` for stored-proc filters.
 * Angular loads this via `employeedetailsbyid?userId=` after login.
 */
export function useLoginEmployeeId(user: SessionUser | null, sessionLoading: boolean) {
  const cached = resolveLoginEmployeeId(user)
  const needFetch = !sessionLoading && Boolean(user?.userId) && cached === 0

  const { data: fetched, isLoading: isFetching } = useQuery({
    queryKey: QK.loginEmployeeId(user?.userId ?? 0),
    queryFn: async () => {
      const id = await getEmployeeIdByUserId(user!.userId)
      if (id > 0 && user) {
        syncSessionUserToStorage({ ...user, employeeId: id })
      }
      return id
    },
    enabled: needFetch,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return {
    employeeId: cached || fetched || 0,
    isResolving: sessionLoading || (needFetch && isFetching),
  }
}
