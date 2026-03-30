// ─── Auth Guard — Layer 3 of 3 ───────────────────────────────────────────────
//
// Client-side UI guard. Renders children only when the current user holds one
// of the required roles. Use this to hide buttons, sections, or entire panels
// from users who shouldn't see them.
//
// IMPORTANT: This is UI-only — it is NOT a security boundary. A determined user
// can bypass client-side checks. Real protection is in Layers 1 & 2.
//
// Layer 1 → src/middleware.ts
//   Fast cookie-presence check on every request.
//
// Layer 2 → src/app/(pages)/(protected)/layout.tsx
//   Full server-side session validation before any page renders.
//
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
