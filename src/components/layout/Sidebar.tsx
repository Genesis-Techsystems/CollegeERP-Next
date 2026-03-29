'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { HelpCircle, LogOut } from 'lucide-react'
import { NavItem } from '@/components/layout/NavItem'
import { useSessionContext } from '@/context/SessionContext'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import smartLogo from '@/assets/images/smart-campus-logo.png'

export function Sidebar() {
  const router = useRouter()
  const { user } = useSessionContext()
  const { navItems, isSidebarOpen } = useNavigationStore()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-slate-900 transition-all duration-300 ease-in-out',
        isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden md:w-64'
      )}
    >
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Image src={smartLogo} alt="Campus Connect" width={28} height={28} className="h-7 w-7 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold uppercase tracking-wide text-white leading-none">
            {user?.collegeName ?? 'College ERP'}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 leading-none">
            Institutional Intelligence
          </p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-2 py-3 scrollbar-sidebar"
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


      {/* ── Footer links ─────────────────────────────────────────────── */}
      <div className="border-t border-slate-800 px-2 py-2">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
        >
          <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Help Center
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  )
}
