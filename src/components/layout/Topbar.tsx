'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut, User, Bell, LayoutGrid, HelpCircle, Search, ChevronDown } from 'lucide-react'
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

const roleAvatarStyle: Record<string, string> = {
  ADMIN:     'bg-red-100    text-red-700',
  PRINCIPAL: 'bg-red-100    text-red-700',
  STAFF:     'bg-blue-100   text-blue-700',
  STUDENT:   'bg-emerald-100 text-emerald-700',
  PARENT:    'bg-purple-100 text-purple-700',
}

export function Topbar() {
  const router = useRouter()
  const { user } = useSessionContext()
  const { toggleSidebar } = useNavigationStore()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  const avatarStyle = roleAvatarStyle[user?.userRole ?? ''] ?? 'bg-teal-100 text-teal-700'

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">

      {/* ── Mobile hamburger ─────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle navigation sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* ── Search bar ───────────────────────────────────────────────── */}
      <div className="relative flex-1 max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search records..."
          className={cn(
            'h-9 w-full rounded-lg border border-slate-200 bg-slate-50',
            'pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400',
            'focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20',
            'transition-colors duration-150'
          )}
        />
      </div>

      {/* ── Right side ───────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1">

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden="true"
          />
        </Button>

        {/* Apps / grid */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="All apps"
        >
          <LayoutGrid className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        {/* Help */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Help"
        >
          <HelpCircle className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="User menu"
            >
              {/* Name + role stacked */}
              <div className="hidden text-right md:block">
                <p className="text-[13px] font-semibold text-slate-800 leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-none">
                  {user?.roleName ?? 'User'}
                </p>
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn('text-xs font-bold', avatarStyle)}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-1">
              <p className="text-[13px] font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-slate-500 font-normal">{user?.roleName}</p>
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
  )
}
