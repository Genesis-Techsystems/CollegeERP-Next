'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, Pin, PinOff } from 'lucide-react'
import { NavItem } from '@/components/layout/NavItem'
import { useSessionContext } from '@/context/SessionContext'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import smartLogo from '@/assets/images/smart-campus-logo.png'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useSessionContext()
  const {
    navItems,
    isSidebarOpen,
    isSidebarCollapsed,
    isSidebarHovered,
    autoCollapse,
    toggleSidebarCollapsed,
    toggleAutoCollapse,
    setSidebarHovered,
  } = useNavigationStore()

  const navRef = useRef<HTMLElement>(null)
  const savedScrollRef = useRef(0)
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Same mounted guard as AppShell to stay in sync and avoid mismatches
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isExpanded = !mounted ? true : !isSidebarCollapsed || isSidebarHovered

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

  // On navigation: scroll the active depth-0 module to the TOP of the nav area
  // so the user always sees their current context starting from the top.
  useEffect(() => {
    if (!navRef.current) return

    // Prefer scrolling the active parent module header to the top
    const activeModule = navRef.current.querySelector<HTMLElement>(
      '[data-nav-module][data-active="true"]',
    )
    if (activeModule) {
      activeModule.scrollIntoView({ block: 'start', behavior: 'smooth' })
      return
    }

    // Fallback: active leaf item at depth-0 (module with no children)
    const activeLink = navRef.current.querySelector<HTMLElement>('a[aria-current="page"]')
    if (activeLink) {
      activeLink.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
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
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col bg-slate-900',
        isSidebarOpen ? '' : 'overflow-hidden md:flex',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex shrink-0 items-center py-4',
          isExpanded ? 'gap-3 px-4' : 'justify-center px-2',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Image
            src={smartLogo}
            alt="Campus Connect"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
        {isExpanded && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold uppercase tracking-wide text-white leading-none">
              {user?.collegeName ?? 'College ERP'}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 leading-none">
              Institutional Intelligence
            </p>
          </div>
        )}
      </div>

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
        <ul className="space-y-0.5">
          {navItems
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <li key={item.id}>
                <NavItem item={item} depth={0} />
              </li>
            ))}
        </ul>
      </nav>

      {/* ── Footer — compact icon row ─────────────────────────────────── */}
      <div className="shrink-0 px-2 py-2">
        <div className="flex items-center justify-around">

          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
          >
            {isSidebarCollapsed
              ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            }
          </button>

          <button
            type="button"
            onClick={toggleAutoCollapse}
            title={autoCollapse ? 'Auto-collapse on — click to pin' : 'Sidebar pinned — click to enable auto-collapse'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150',
              autoCollapse
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-indigo-400 hover:bg-slate-800 hover:text-indigo-300',
            )}
          >
            {autoCollapse
              ? <PinOff className="h-4 w-4" aria-hidden="true" />
              : <Pin className="h-4 w-4" aria-hidden="true" />
            }
          </button>

          <button
            type="button"
            title="Help Center"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>

        </div>
      </div>
    </aside>
  )
}
