'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/navigation'
import { IS_DEBUG_MODE, DebugPanel } from '@/debug'
import { Breadcrumb, useBreadcrumb } from '@/common/components/breadcrumb'
import { Toaster } from 'sonner'

interface AppShellProps {
  children: ReactNode
  initialNavItems: NavItem[]
}

export function AppShell({ children, initialNavItems }: Readonly<AppShellProps>) {
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    isSidebarHovered,
    autoCollapse,
    setNavItems,
    setSidebarCollapsed,
  } = useNavigationStore()

  const pathname = usePathname()
  const breadcrumbs = useBreadcrumb()
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

  // Prevent full-tree hydration drift in protected pages (sidebar/topbar are highly
  // interactive and depend on client-only persisted state and browser environment).
  // We render a stable shell frame first, then mount the interactive tree on client.
  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
        <div className="relative z-30 w-[260px] shrink-0" style={{ height: '100vh', position: 'sticky', top: 0 }} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-20 h-14 border-b border-border bg-card" />
          <main className="flex-1 overflow-y-auto bg-[hsl(var(--background))]">
            <div className="mx-auto w-full max-w-none px-0 py-0">
              <div className="px-6 pt-3 pb-1" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  const sidebarIsExpanded = !isSidebarCollapsed || isSidebarHovered

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {IS_DEBUG_MODE && <DebugPanel />}
      {/* Mobile overlay when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      {/* -- Sidebar --------------------------------------------------------- */}
      {/* data-print-hide on the wrapper too — hiding <aside> alone leaves a
          260px / 56px gutter on the printed sheet because this wrapper div
          carries the width. */}
      <div
        data-print-hide
        className={cn(
          'relative z-30 shrink-0 overflow-hidden transition-all duration-200 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // Match reference UI widths (tighter)
          sidebarIsExpanded ? 'w-[260px]' : 'w-[56px]',
        )}
        style={{ height: '100vh', position: 'sticky', top: 0 }}
      >
        <Sidebar />
      </div>

      {/* -- Main content area ---------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div data-print-hide className="sticky top-0 z-20">
          <Topbar />
        </div>

        <main
          key={pathname}
          className="flex-1 overflow-y-auto scrollbar-thin animate-fade-up bg-[hsl(var(--background))]"
        >
          {/* Page container without outer card; sections control their own surfaces */}
          <div className="mx-auto w-full max-w-none px-0 py-0">
            <div data-print-hide className="px-6 pt-3 pb-1">
              <Breadcrumb
                items={breadcrumbs}
                maxItems={4}
                className="text-[12px] text-muted-foreground"
              />
            </div>
            {children}
          </div>
        </main>
      </div>

      <Toaster richColors closeButton position="top-center" />
    </div>
  )
}
