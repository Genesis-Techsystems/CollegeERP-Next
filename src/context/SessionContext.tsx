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
