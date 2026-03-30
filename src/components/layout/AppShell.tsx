'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/navigation'

interface AppShellProps {
  children: ReactNode
  initialNavItems: NavItem[]
}

export function AppShell({ children, initialNavItems }: AppShellProps) {
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    isSidebarHovered,
    autoCollapse,
    setNavItems,
    setSidebarCollapsed,
  } = useNavigationStore()

  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  // Prevents hydration mismatch: Zustand persist reads localStorage on client but
  // server has no access to it. Render with default (expanded) state until mounted,
  // then apply real persisted value — the CSS transition handles the visual change.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (initialNavItems.length > 0) setNavItems(initialNavItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-collapse only fires when sidebar was manually expanded and user opted in.
  // Hover-expanded state is excluded — hover collapse happens naturally on mouse-leave.
  useEffect(() => {
    if (prevPathname.current !== pathname && autoCollapse && !isSidebarHovered) {
      setSidebarCollapsed(true)
    }
    prevPathname.current = pathname
  }, [pathname, autoCollapse, isSidebarHovered, setSidebarCollapsed])

  // Before mount: render as expanded to match server HTML (avoids hydration mismatch)
  const sidebarIsExpanded = !mounted ? true : !isSidebarCollapsed || isSidebarHovered

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
          'relative z-30 shrink-0 overflow-hidden transition-all duration-200 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          sidebarIsExpanded ? 'w-64' : 'w-16',
        )}
        style={{ height: '100vh', position: 'sticky', top: 0 }}
      >
        <Sidebar />
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20">
          <Topbar />
        </div>

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
