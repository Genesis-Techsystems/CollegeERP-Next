'use client'

import { type ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ProgressBar } from '@/components/ui/loader'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/navigation'

interface AppShellProps {
  children: ReactNode
  initialNavItems: NavItem[]
}

export function AppShell({ children, initialNavItems }: AppShellProps) {
  const { isSidebarOpen, setNavItems } = useNavigationStore()

  useEffect(() => {
    if (initialNavItems.length > 0) setNavItems(initialNavItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {/* Mobile overlay when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'relative z-30 shrink-0 transition-all duration-300 ease-in-out',
          isSidebarOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full w-64 md:translate-x-0'
        )}
        style={{ height: '100vh', position: 'sticky', top: 0 }}
      >
        <Sidebar />
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky topbar */}
        <div className="sticky top-0 z-20">
          <Topbar />
        </div>

        {/* Scrollable main with page-fade-up transition */}
        <main
          key={pathname}
          className="flex-1 overflow-y-auto scrollbar-thin animate-fade-up"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
