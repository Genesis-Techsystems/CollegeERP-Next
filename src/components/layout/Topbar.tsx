'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Menu,
  LogOut,
  User,
  Bell,
  Search,
  ChevronDown,
  Loader2,
  Palette,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSessionContext } from '@/context/SessionContext'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import { normalizeHref } from '@/lib/navigation'
import { getUserAccess, logout } from '@/services/auth'
import { Breadcrumb, useBreadcrumb } from '@/common/components/breadcrumb'
import { ThemeSettingModal } from '@/common/components/theme-setting-modal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchPage {
  displayName: string
  url: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleAvatarStyle: Record<string, string> = {
  ADMIN:     'bg-indigo-100  text-indigo-700',
  PRINCIPAL: 'bg-indigo-100  text-indigo-700',
  STAFF:     'bg-blue-100    text-blue-700',
  STUDENT:   'bg-emerald-100 text-emerald-700',
  PARENT:    'bg-purple-100  text-purple-700',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .filter((w) => w !== 'and')
    .join('-')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Topbar() {
  const router = useRouter()
  const { user } = useSessionContext()
  const { toggleSidebar } = useNavigationStore()
  const breadcrumbs = useBreadcrumb()
  const [themeOpen, setThemeOpen] = useState(false)

  // ── Search state ────────────────────────────────────────────────────────
  const [pages, setPages] = useState<SearchPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [activeResultIndex, setActiveResultIndex] = useState(-1)

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch accessible pages on mount once user is available ──────────────
  const fetchPages = useCallback(async (userId: number | string) => {
    setPagesLoading(true)
    try {
      const body: {
        success: boolean
        data?: {
          modules?: Array<{
            moduleName: string
            url?: string
            subModules?: Array<{
              subModuleName: string
              pages?: Array<{ displayName: string; url: string }>
            }>
            pages?: Array<{ displayName: string; url: string }>
          }>
        }
      } = await getUserAccess(userId)
      if (!body.success) {
        setPages([])
        return
      }

      const modules = body.data?.modules ?? []
      const collected: SearchPage[] = []

      for (const mod of modules) {
        const modUrl = slugify(mod.moduleName)

        if (mod.url && mod.url !== 'null') {
          collected.push({ displayName: mod.moduleName, url: mod.url })
        } else if (
          (mod.subModules?.length ?? 0) === 0 &&
          (mod.pages?.length ?? 0) === 0
        ) {
          collected.push({ displayName: mod.moduleName, url: modUrl })
        } else if (
          (mod.subModules?.length ?? 0) === 0 &&
          (mod.pages?.length ?? 0) > 0
        ) {
          for (const page of mod.pages ?? []) {
            collected.push({
              displayName: page.displayName,
              url: `${modUrl}/${page.url}`,
            })
          }
        } else if ((mod.subModules?.length ?? 0) > 0) {
          for (const sub of mod.subModules ?? []) {
            const subUrl = slugify(sub.subModuleName)
            for (const page of sub.pages ?? []) {
              collected.push({
                displayName: page.displayName,
                url: `${modUrl}/${subUrl}/${page.url}`,
              })
            }
          }
        }
      }
      setPages(collected)
    } catch {
      // Keep Topbar usable even when user-access API is temporarily unavailable.
      setPages([])
    } finally {
      setPagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.userId) {
      fetchPages(user.userId)
    }
  }, [user?.userId, fetchPages])

  // ── Close search on outside click ───────────────────────────────────────
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false)
        setIsSearchExpanded(false)
        setSearchTerm('')
        setActiveResultIndex(-1)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // ── Open search and focus input ──────────────────────────────────────────
  function openSearch() {
    setIsSearchExpanded(true)
    // wait for input to mount then focus
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  // ── Derived: filtered pages ──────────────────────────────────────────────
  const filteredPages =
    searchTerm.trim().length > 0
      ? pages
          .filter((p) =>
            p.displayName.toLowerCase().startsWith(searchTerm.toLowerCase()),
          )
          .slice(0, 8)
      : []

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchTerm(value)
    setActiveResultIndex(-1)
    setIsSearchOpen(value.trim().length > 0)
  }

  function navigateTo(page: SearchPage) {
    router.push(normalizeHref(page.url))
    setSearchTerm('')
    setIsSearchOpen(false)
    setActiveResultIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isSearchOpen || filteredPages.length === 0) {
      if (e.key === 'Escape') {
        setSearchTerm('')
        setIsSearchOpen(false)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveResultIndex((prev) =>
          prev < filteredPages.length - 1 ? prev + 1 : 0,
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveResultIndex((prev) =>
          prev > 0 ? prev - 1 : filteredPages.length - 1,
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeResultIndex >= 0 && filteredPages[activeResultIndex]) {
          navigateTo(filteredPages[activeResultIndex])
        }
        break
      case 'Escape':
        setSearchTerm('')
        setIsSearchOpen(false)
        setIsSearchExpanded(false)
        setActiveResultIndex(-1)
        break
    }
  }

  // ── User display ─────────────────────────────────────────────────────────
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  const avatarStyle =
    roleAvatarStyle[user?.userRole ?? ''] ?? 'bg-indigo-100 text-indigo-700'

  async function handleLogout() {
    await logout()
    // Full page reload clears the React Query cache (module-level QueryClient singleton),
    // all Zustand in-memory state, and all React component state — prevents previous
    // user's data from leaking into the next session.
    window.location.href = '/login'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5">

      {/* ── Mobile hamburger ─────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle navigation sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* ── Breadcrumb / page location ───────────────────────────────── */}
      <div className="hidden min-w-0 flex-1 items-center overflow-hidden md:flex">
        <Breadcrumb
          items={breadcrumbs}
          maxItems={4}
          className="text-[12px] text-muted-foreground"
        />
      </div>

      {/* ── Right side ───────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1">

        {/* ── Search icon / expanded input ─────────────────────────── */}
        <div
          ref={searchContainerRef}
          className="relative flex items-center"
          role="combobox"
          aria-expanded={isSearchOpen && filteredPages.length > 0}
          aria-haspopup="listbox"
          aria-owns="search-results-listbox"
        >
          {isSearchExpanded ? (
            <>
              {pagesLoading ? (
                <Loader2
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <input
                ref={searchInputRef}
                type="search"
                role="searchbox"
                aria-label="Search pages"
                aria-autocomplete="list"
                aria-controls="search-results-listbox"
                aria-activedescendant={
                  activeResultIndex >= 0
                    ? `search-result-${activeResultIndex}`
                    : undefined
                }
                placeholder="Search pages…"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchTerm.trim().length > 0 && filteredPages.length > 0) {
                    setIsSearchOpen(true)
                  }
                }}
                className={cn(
                  'h-9 w-64 rounded-md border border-input bg-background',
                  'pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground',
                  'focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15',
                  'transition-all duration-150',
                )}
              />
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Open search"
              onClick={openSearch}
            >
              {pagesLoading
                ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                : <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              }
            </Button>
          )}

          {/* ── Dropdown results ───────────────────────────────────── */}
          {isSearchOpen && filteredPages.length > 0 && (
            <div
              id="search-results-listbox"
              role="listbox"
              aria-label="Page search results"
              className="absolute top-full right-0 z-50 mt-1 w-64 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
            >
              {filteredPages.map((page, index) => (
                <button
                  key={page.url}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === activeResultIndex}
                  type="button"
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors',
                    index === activeResultIndex && 'bg-accent',
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault()
                  }}
                  onClick={() => navigateTo(page)}
                >
                  {page.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme selector */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Change theme"
          title="Change theme"
          onClick={() => setThemeOpen(true)}
        >
          <Palette className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card"
            aria-hidden="true"
          />
        </Button>

        {/* Divider */}
        <div className="mx-2 h-6 w-px bg-border" aria-hidden="true" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="User menu"
            >
              <div className="hidden text-right md:block">
                <p className="text-[13px] font-semibold text-foreground leading-tight tracking-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                  {user?.roleName ?? user?.userRole ?? 'User'}
                </p>
              </div>

              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                <AvatarFallback className={cn('text-[12px] font-semibold', avatarStyle)}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              <ChevronDown
                className="hidden h-3.5 w-3.5 text-muted-foreground md:block"
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-1">
              <p className="text-[13px] font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground font-normal">{user?.roleName}</p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled className="cursor-not-allowed opacity-60">
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <ThemeSettingModal isOpen={themeOpen} onClose={() => setThemeOpen(false)} />
    </>
  )
}
