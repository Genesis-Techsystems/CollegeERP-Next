'use client'

import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/navigation'
import { IS_DEBUG_MODE, DebugPanel } from '@/debug'
import { useTheme } from '@/common/components/theme-setting-modal'
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
  const prevPathname = useRef(pathname)

  // Global page-header card — page name + breadcrumb trail, rendered above
  // each page's filter card. The dashboard renders its own breadcrumb, so it
  // is skipped here.
  const breadcrumbItems = useBreadcrumb()
  const pageTitle = breadcrumbItems[breadcrumbItems.length - 1]?.label ?? ''
  const showBreadcrumb = pathname !== '/dashboard'

  // The page's first .app-card renders this as its header row (globals.css
  // `[data-page-content] … ::before`) — page name + accent underline inside
  // the filters card without touching every page.
  const cssPageTitle = `"${pageTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

  // Accordion behavior for filters cards: clicking anywhere on a card header
  // row that hosts an `.app-card-title` forwards the click to the page's own
  // filter toggle button (identified by its funnel/chevron icon — NOTE:
  // lucide-react aliases Filter → Funnel, so the svg class is `lucide-funnel`).
  // Pages keep owning the open/close state — no per-page changes needed.
  function handlePageContentClick(e: ReactMouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    // Direct interactions (links, inputs, other buttons) work natively. The
    // filter button itself has pointer-events: none, so it never matches here.
    if (target.closest('button, a, input, select, textarea, label, [role="combobox"]')) return
    const headerRow = target.closest<HTMLElement>('.app-card > div')
    if (!headerRow || !headerRow.querySelector('.app-card-title')) return
    const toggle = headerRow.querySelector<HTMLButtonElement>(
      'button:has(svg[class*="lucide-funnel"]), button:has(svg[class*="lucide-filter"]), button:has(svg[class*="lucide-chevron-down"])',
    )
    if (!toggle) return
    // Pages unmount the panel conditionally, so closing can't be CSS-animated.
    // A View Transition snapshots before/after and cross-fades the change
    // (no-op in browsers without support).
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    if (doc.startViewTransition) {
      doc.startViewTransition(() => toggle.click())
    } else {
      toggle.click()
    }
  }

  // Apply the persisted theme (primary + sidebar palette) on every app load.
  useTheme()

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
        <div className="relative z-30 w-[248px] shrink-0" style={{ height: '100vh', position: 'sticky', top: 0 }} />
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
          sidebarIsExpanded ? 'w-[248px]' : 'w-[56px]',
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
          {/* Page container without outer card; sections control their own surfaces. */}
          <div
            className="mx-auto w-full max-w-none px-0 py-0"
            data-page-content
            onClick={handlePageContentClick}
            style={
              showBreadcrumb && pageTitle
                ? ({ '--page-title': cssPageTitle } as CSSProperties)
                : undefined
            }
          >
            {/* ── Breadcrumb card — page location, above the filters card ── */}
            {showBreadcrumb && (
              <div data-print-hide data-breadcrumb-card className="px-[var(--spacing-page-x)] pt-[var(--spacing-page-y)]">
                <div className="rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
                  <Breadcrumb items={breadcrumbItems} maxItems={5} />
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <Toaster richColors closeButton position="top-center" />
    </div>
  )
}
