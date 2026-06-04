'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  ChevronsLeft,
  ChevronsRight,
  LogOut,
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

  // Persist rehydrates before React hydration can finish; SSR always uses defaults.
  const collapsedForChrome = mounted && isSidebarCollapsed
  const isRightPositioned = mounted && sidebarPosition === 'right'

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

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col border-r border-[hsl(var(--sidebar-border))]',
        isSidebarOpen ? '' : 'overflow-hidden md:flex',
        isRightPositioned && 'order-last',
      )}
      style={{
        background: 'linear-gradient(180deg, hsl(var(--sidebar-background)), hsl(var(--sidebar-background-end)))',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-[hsl(var(--sidebar-border))]',
          isExpanded ? 'gap-3 px-4 py-4' : 'justify-center px-2 py-3',
        )}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Image
            src={smartLogo}
            alt="Smart Campus"
            width={26}
            height={26}
            className="h-[26px] w-[26px] object-contain brightness-0 invert"
          />
        </div>
        {isExpanded && (
          <div className="min-w-0 flex-1 mr-2">
            <p
              className="text-[13px] font-bold text-[hsl(var(--sidebar-foreground-active))] leading-[1.18] tracking-tight break-words"
              style={{ fontFamily: 'var(--font-heading), Sora, system-ui, sans-serif' }}
              title={user?.collegeName ?? 'Smart Campus'}
            >
              {user?.collegeName ?? 'Smart Campus'}
            </p>
            <p className="mt-0.5 text-[10.5px] text-[hsl(var(--sidebar-foreground))] leading-tight uppercase tracking-[0.12em] font-medium truncate">
              College ERP
            </p>
          </div>
        )}

        {isExpanded && (
          <button
            type="button"
            onClick={() => {
              setSidebarHovered(false)
              toggleSidebarCollapsed()
            }}
            title={collapsedForChrome ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsedForChrome ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground-active))]/85 hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))] transition-colors duration-150"
          >
            {(isRightPositioned ? !collapsedForChrome : collapsedForChrome)
              ? <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
              : <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
            }
          </button>
        )}
      </div>

      {/* ── Search input ─────────────────────────────────────────────── */}
      {isExpanded && searchOpen && (
        <div className="shrink-0 px-3 pt-3">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground))]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              placeholder="Search menu…"
              className="h-8 w-full rounded-md bg-[hsl(var(--sidebar-surface))] pl-8 pr-8 text-[13px] text-[hsl(var(--sidebar-foreground-active))] placeholder:text-[hsl(var(--sidebar-foreground))]/60 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sidebar-primary))]/40 focus:bg-[hsl(var(--sidebar-hover-bg))]"
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
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden scrollbar-sidebar',
          isExpanded ? 'py-2 px-2' : 'py-2 px-1',
        )}
      >
        {isExpanded && !searchTerm && (
          <div className="sidebar-section-label">Main Menu</div>
        )}
        <ul className="space-y-1">
          {displayedItems.map((item) => (
            <li key={item.id}>
              <NavItem item={item} depth={0} layoutHydrated={mounted} />
            </li>
          ))}
        </ul>
        {searchTerm && displayedItems.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-[hsl(var(--sidebar-foreground))]/70">No results</p>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] px-2 py-2">
        <div className={cn('flex items-center gap-1', isExpanded ? 'justify-between px-1' : 'justify-center')}>

          {isExpanded && (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                title={searchOpen ? 'Close search' : 'Search menu'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150',
                  searchOpen
                    ? 'bg-[hsl(var(--sidebar-hover-bg))] text-[hsl(var(--sidebar-foreground-active))]'
                    : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))]',
                )}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              {IS_DEBUG_MODE && <DebugTrigger />}

              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))] hover:bg-red-500/15 hover:text-red-400 transition-colors duration-150"
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
