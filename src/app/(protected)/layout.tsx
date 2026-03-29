// Server Component — DO NOT add 'use client'
// NOTE: Next.js 16 requires Node >=20.9.0. If build fails, run: nvm use 20 (or node --version)

import { redirect } from 'next/navigation'
import { SessionProvider } from '@/context/SessionContext'
import { AppShell } from '@/components/layout/AppShell'
import { getSession } from '@/lib/session'
import { springGetUserDetails } from '@/integrations/spring-api'
import { buildNavTree } from '@/lib/navigation'
import type { NavItem } from '@/types/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session.user || !session.jwt) {
    redirect('/login')
  }

  // Fetch modules/pages server-side only — build nav tree here, never send raw data to client
  let navItems: NavItem[] = []
  try {
    const userDto = await springGetUserDetails(session.jwt)
    navItems = buildNavTree(userDto.modules ?? [], userDto.pages ?? [])
  } catch {
    // nav will be empty but app won't crash
  }

  return (
    <SessionProvider initialUser={session.user}>
      <AppShell initialNavItems={navItems}>{children}</AppShell>
    </SessionProvider>
  )
}
