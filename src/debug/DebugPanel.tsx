'use client'

/**
 * DebugPanel — slide-over drawer that houses all debug sub-panels.
 *
 * Adding a new tab:
 * 1. Add the id to DebugTab in debug-store.ts
 * 2. Add an entry to TABS below
 * 3. Add a case in the content block that renders your panel component
 *
 * The panel renders at the top of the React tree (inside AppShell) and uses
 * CSS `position: fixed` so it overlays the whole viewport regardless of where
 * it is mounted.
 */

import { useEffect } from 'react'
import { X, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebugStore, type DebugTab } from './debug-store'
import { NavVisibilityPanel } from './panels'

// ─── Tab registry ─────────────────────────────────────────────────────────────
// Add new { id, label } entries here as new panels are built.

const TABS: { id: DebugTab; label: string }[] = [
  { id: 'nav', label: 'Navigation' },
  // future: { id: 'flags', label: 'Feature Flags' },
  // future: { id: 'mock',  label: 'Mock Data' },
  // future: { id: 'api',   label: 'API Overrides' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function DebugPanel() {
  const { isOpen, activeTab, closePanel, setActiveTab } = useDebugStore()

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, closePanel])

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={closePanel}
      />

      {/* ── Drawer ── */}
      <div
        role="dialog"
        aria-label="Debug Settings"
        aria-modal="true"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Bug className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight text-slate-900">
                Debug Settings
              </h2>
              <p className="text-[10px] font-medium uppercase tracking-widest text-amber-500">
                Dev Mode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closePanel}
            aria-label="Close debug panel"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Tab strip ── */}
        <div className="flex shrink-0 border-b border-slate-200 bg-slate-50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2.5 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 bg-white text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'nav' && <NavVisibilityPanel />}
          {/* future panels rendered here */}
        </div>
      </div>
    </>
  )
}
