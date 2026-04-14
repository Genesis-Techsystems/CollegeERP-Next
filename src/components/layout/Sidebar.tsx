'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  X,
} from 'lucide-react'
import { NavItem } from '@/components/layout/NavItem'
import type { NavItem as NavItemType } from '@/types/navigation'
import { useSessionContext } from '@/context/SessionContext'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import smartLogo from '@/assets/images/smart-campus-logo.png'
import { logout } from '@/services/auth'
import { IS_DEBUG_MODE, DebugTrigger, useDebugStore } from '@/debug'

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useSessionContext()
  const {
    navItems,
    isSidebarOpen,
    isSidebarCollapsed,
    isSidebarHovered,
    sidebarPosition,
    toggleSidebarCollapsed,
    setSidebarHovered,
  } = useNavigationStore()

  // Debug store — only subscribed to when IS_DEBUG_MODE is true
  const debugSettings = useDebugStore((s) => s.settings)

  const navRef = useRef<HTMLElement>(null)
  const savedScrollRef = useRef(0)
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Same mounted guard as AppShell to stay in sync and avoid mismatches
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isExpanded = !mounted ? true : !isSidebarCollapsed || isSidebarHovered

  // ── Nav search filter ────────────────────────────────────────────────────
  function filterBySearch(items: NavItemType[], term: string): NavItemType[] {
    const lower = term.toLowerCase()
    return items.reduce<NavItemType[]>((acc, item) => {
      if (item.label.toLowerCase().includes(lower)) {
        acc.push(item)
      } else if (item.children?.length) {
        const matched = filterBySearch(item.children, term)
        if (matched.length) acc.push({ ...item, children: matched })
      }
      return acc
    }, [])
  }

  // ── Debug visibility filter ──────────────────────────────────────────────
  // Recursively removes items whose IDs are in the debug hidden set.
  // A hidden parent implicitly hides all its children.
  function filterByDebug(items: NavItemType[], hiddenSet: Set<string>): NavItemType[] {
    return items.reduce<NavItemType[]>((acc, item) => {
      if (hiddenSet.has(item.id)) return acc
      acc.push(
        item.children?.length
          ? { ...item, children: filterByDebug(item.children, hiddenSet) }
          : item,
      )
      return acc
    }, [])
  }

  const displayedItems = useMemo(() => {
    let items = navItems.slice().sort((a, b) => a.sortOrder - b.sortOrder)
    if (searchTerm.trim()) items = filterBySearch(items, searchTerm)
    if (IS_DEBUG_MODE && debugSettings.nav.hiddenIds.length > 0) {
      items = filterByDebug(items, new Set(debugSettings.nav.hiddenIds))
    }
    return items
  }, [navItems, searchTerm, debugSettings.nav.hiddenIds])

  // Scroll nav to top whenever search results change
  useEffect(() => {
    if (searchTerm && navRef.current) {
      navRef.current.scrollTop = 0
    }
  }, [searchTerm])

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    } else {
      setSearchTerm('')
    }
  }, [searchOpen])

  // Preserve nav scroll position across collapse/expand cycles
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    if (!isExpanded) {
      savedScrollRef.current = nav.scrollTop
    } else {
      requestAnimationFrame(() => {
        if (navRef.current) navRef.current.scrollTop = savedScrollRef.current
      })
    }
  }, [isExpanded])

  // On navigation / navItems load: scroll the nav container so the active item
  // is visible. We use scrollTop instead of scrollIntoView so we control the
  // scrollable container precisely. A short timeout lets Collapsible open
  // animations finish before we measure positions.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const scroll = () => {
      const target =
        nav.querySelector<HTMLElement>('[data-nav-module][data-active="true"]') ??
        nav.querySelector<HTMLElement>('a[aria-current="page"]')
      if (!target) return

      const navTop = nav.getBoundingClientRect().top
      const targetTop = target.getBoundingClientRect().top
      const newScrollTop = nav.scrollTop + (targetTop - navTop) - 8 // 8px breathing room
      nav.scrollTo({ top: Math.max(0, newScrollTop), behavior: 'instant' })
    }

    // Wait for Collapsible open animations (~150 ms) before measuring
    const timer = setTimeout(scroll, 160)
    return () => clearTimeout(timer)
  }, [pathname, navItems])

  function handleMouseEnter() {
    clearTimeout(hoverLeaveTimer.current)
    setSidebarHovered(true)
  }

  function handleMouseLeave() {
    clearTimeout(hoverLeaveTimer.current)
    hoverLeaveTimer.current = setTimeout(() => setSidebarHovered(false), 120)
  }

  async function handleLogout() {
    await logout()
    // Full page reload clears the React Query cache (module-level QueryClient singleton),
    // all Zustand in-memory state, and all React component state — prevents previous
    // user's data from leaking into the next session.
    window.location.href = '/login'
  }

  const isRightPositioned = sidebarPosition === 'right'

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]',
        isSidebarOpen ? '' : 'overflow-hidden md:flex',
        isRightPositioned && 'order-last',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex shrink-0 items-center pt-5 pb-4',
          isExpanded ? 'gap-3 px-4' : 'justify-center px-2',
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
          <Image
            src={smartLogo}
            alt="Campus Connect"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
        {isExpanded && (
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-white leading-tight truncate">
              {user?.collegeName ?? 'Smart Campus'}
            </p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--sidebar-foreground))] leading-tight truncate">
              Connect ERP
            </p>
          </div>
        )}

        {/* Collapse toggle (matches reference placement near brand) */}
        {isExpanded && (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-surface))] hover:text-[hsl(var(--sidebar-foreground-active))] transition-colors duration-150"
          >
            {isRightPositioned ? (
              isSidebarCollapsed
                ? <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                : <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              isSidebarCollapsed
                ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* ── Search input ─────────────────────────────────────────────── */}
      {isExpanded && searchOpen && (
        <div className="shrink-0 px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground))]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              placeholder="Search menu…"
              className="h-8 w-full rounded-md bg-[hsl(var(--sidebar-surface))] pl-8 pr-8 text-[13px] text-[hsl(var(--sidebar-foreground))] placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sidebar-border))]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-foreground-active))]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-sidebar"
        style={{
          paddingLeft: isExpanded ? undefined : '0.25rem',
          paddingRight: isExpanded ? undefined : '0.25rem',
        }}
      >
        <ul className="space-y-0">
          {displayedItems.map((item) => (
            <li key={item.id}>
              <NavItem item={item} depth={0} />
            </li>
          ))}
        </ul>
        {searchTerm && displayedItems.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-slate-500">No results</p>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-2 py-2">
        <div className={cn('flex items-center gap-1', isExpanded ? 'justify-around' : 'justify-center')}>

          {isExpanded && (
            <>
              {/* Nav search toggle */}
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                title={searchOpen ? 'Close search' : 'Search menu'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150',
                  searchOpen
                    ? 'bg-[hsl(var(--sidebar-surface))] text-[hsl(var(--sidebar-foreground-active))]'
                    : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-surface))] hover:text-[hsl(var(--sidebar-foreground-active))]',
                )}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Debug trigger — profile avatar, only in debug mode */}
              {IS_DEBUG_MODE && <DebugTrigger />}

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))] hover:bg-red-900/40 hover:text-red-400 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

        </div>
      </div>
    </aside>
  )
}
