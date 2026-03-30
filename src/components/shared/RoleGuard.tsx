'use client'

import type { ReactNode } from 'react'
import { useSessionContext } from '@/context/SessionContext'

/**
 * Client-side role-based rendering guard.
 * Renders children only if the current session user's role is in the allowed list.
 *
 * This is a UI guard only — access control must also be enforced server-side.
 *
 * @example
 * <RoleGuard roles={['ADMIN', 'SUPERADMIN']}>
 *   <AdminPanel />
 * </RoleGuard>
 */
interface RoleGuardProps {
  /** Render children only if the current user has one of these roles */
  roles: string[]
  /** Fallback to render if role check fails. Defaults to null. */
  fallback?: ReactNode
  /** Children to render if role check passes */
  children: ReactNode
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const { user } = useSessionContext()

  if (!user || !roles.includes(user.userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
