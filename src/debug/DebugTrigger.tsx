'use client'

/**
 * DebugTrigger — profile/avatar button rendered in the sidebar footer.
 *
 * Shows the user's initials as an avatar. In debug mode clicking it opens
 * the debug drawer. Only rendered when IS_DEBUG_MODE === true (gated by the
 * parent — Sidebar.tsx checks IS_DEBUG_MODE before importing this).
 */

import { useSessionContext } from '@/context/SessionContext'
import { useDebugStore } from './debug-store'
import { cn } from '@/lib/utils'

interface DebugTriggerProps {
  className?: string
}

export function DebugTrigger({ className }: DebugTriggerProps) {
  const { user } = useSessionContext()
  const { isOpen, togglePanel } = useDebugStore()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '??'
    : '??'

  return (
    <button
      type="button"
      onClick={togglePanel}
      title={
        user
          ? `${user.firstName} ${user.lastName ?? ''} — Debug Settings`
          : 'Debug Settings'
      }
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-150',
        isOpen
          ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white',
        className,
      )}
      aria-label="Open debug settings"
      aria-expanded={isOpen}
    >
      {initials}
    </button>
  )
}
