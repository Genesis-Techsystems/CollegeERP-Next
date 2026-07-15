'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SessionUser } from '@/types/user'
import { useSession } from '@/hooks/useSession'

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

// Mirror the logged-in user's key fields into localStorage so the many pages
// that read localStorage.getItem('employeeId'/'organizationId'/…) (Angular
// convention) get real values from the /api/authorization session — not 0.
// Done in render (idempotent, only writes when changed) so the values are set
// before child pages' effects fire.
function syncUserToLocalStorage(user: SessionUser): void {
  if (typeof window === 'undefined') return
  const pairs: Array<[string, unknown]> = [
    ['employeeId', user.employeeId],
    ['organizationId', user.organizationId],
    // Angular login: localStorage.orgCode = organizationCode
    ['orgCode', user.organizationCode],
    ['universityCode', user.universityCode],
    ['collegeId', user.collegeId],
    ['academicYearId', user.academicYearId],
    ['userId', user.userId],
    ['userName', user.userName],
    ['userRole', user.userRole],
  ]
  for (const [key, value] of pairs) {
    if (value == null || value === '') continue
    const next = String(value)
    if (window.localStorage.getItem(key) !== next) window.localStorage.setItem(key, next)
  }
}

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

  if (user) syncUserToLocalStorage(user)

  return (
    <SessionContext.Provider value={{ user, isLoading, refetch: session.refetch }}>
      {children}
    </SessionContext.Provider>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: false,
      retry: false,
    },
  },
})

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
