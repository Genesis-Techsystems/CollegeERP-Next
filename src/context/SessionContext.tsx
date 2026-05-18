'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SessionUser } from '@/types/user'
import { useSession } from '@/hooks/useSession'
import { resolveLoginEmployeeId, syncSessionUserToStorage } from '@/lib/user-context'
import { getEmployeeIdByUserId } from '@/services/auth'

interface SessionContextValue {
  user: SessionUser | null
  isLoading: boolean
  refetch: () => void
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoading: true,
  refetch: () => {},
})

// Inner component that uses useSession (must be inside QueryClientProvider)
function SessionProviderInner({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser?: SessionUser | null
}) {
  const session = useSession()

  // Use initialUser from server-side props to avoid loading flash
  const user = session.user ?? initialUser ?? null
  const isLoading = session.isLoading && !initialUser

  useEffect(() => {
    if (!user) return
    void (async () => {
      let employeeId = resolveLoginEmployeeId(user)
      if (!employeeId && user.userId) {
        employeeId = await getEmployeeIdByUserId(user.userId)
      }
      syncSessionUserToStorage(
        employeeId > 0 ? { ...user, employeeId } : user,
      )
    })()
  }, [user])

  return (
    <SessionContext.Provider value={{ user, isLoading, refetch: session.refetch }}>
      {children}
    </SessionContext.Provider>
  )
}

const queryClient = new QueryClient()

export function SessionProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser?: SessionUser | null
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProviderInner initialUser={initialUser}>{children}</SessionProviderInner>
    </QueryClientProvider>
  )
}

export function useSessionContext() {
  return useContext(SessionContext)
}
