'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronRight, Eye, EyeOff, RotateCcw, Search, X } from 'lucide-react'
import { useNavigationStore } from '@/store/navigation-store'
import { useDebugStore } from '../debug-store'
import type { NavItem } from '@/types/navigation'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect all IDs in a subtree (including root) */
function collectIds(item: NavItem): string[] {
  const ids = [item.id]
  item.children?.forEach((child) => ids.push(...collectIds(child)))
  return ids
}

/**
 * Returns true if the item itself OR all of its descendants are hidden.
 * A hidden parent implicitly hides children in the sidebar, but the debug
 * panel tracks per-item flags independently for flexible UX.
 */
function isFullyHidden(item: NavItem, hiddenSet: Set<string>): boolean {
  if (hiddenSet.has(item.id)) return true
  if (!item.children?.length) return false
  return item.children.every((c) => isFullyHidden(c, hiddenSet))
}

/**
 * Returns true when the item is visible but some (not all) descendants
 * are hidden — used to show an indeterminate checkbox state on the parent.
 */
function isPartiallyHidden(item: NavItem, hiddenSet: Set<string>): boolean {
  if (hiddenSet.has(item.id) || !item.children?.length) return false
  const statuses = item.children.map((c) => isFullyHidden(c, hiddenSet))
  return statuses.some(Boolean) && !statuses.every(Boolean)
}

// ─── Search filter ────────────────────────────────────────────────────────────

/**
 * Recursively filter nav items by a search term.
 * A parent is included if it matches OR any descendant matches.
 * If a parent matches, all its children are included (context).
 */
function filterBySearch(items: NavItem[], term: string): NavItem[] {
  const lower = term.toLowerCase()
  return items.reduce<NavItem[]>((acc, item) => {
    if (item.label.toLowerCase().includes(lower)) {
      acc.push(item) // parent matches — include with all children
    } else if (item.children?.length) {
      const matched = filterBySearch(item.children, lower)
      if (matched.length) acc.push({ ...item, children: matched })
    }
    return acc
  }, [])
}

/** Highlight matched substring in a label string */
function HighlightMatch({ label, term }: { label: string; term: string }) {
  if (!term) return <>{label}</>
  const idx = label.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{label}</>
  return (
    <>
      {label.slice(0, idx)}
      <mark className="rounded bg-amber-200 px-0.5 text-amber-900">{label.slice(idx, idx + term.length)}</mark>
      {label.slice(idx + term.length)}
    </>
  )
}

// ─── Tree item ────────────────────────────────────────────────────────────────

interface NavTreeItemProps {
  item: NavItem
  depth: number
  hiddenSet: Set<string>
  /** Caller-controlled batch toggle: sets a list of IDs hidden/visible */
  onBatch: (ids: string[], hidden: boolean) => void
  /** When truthy, force all nodes expanded (search mode) */
  searchTerm?: string
}

function NavTreeItem({ item, depth, hiddenSet, onBatch, searchTerm }: NavTreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = Boolean(item.children?.length)
  const isSearching = Boolean(searchTerm)

  const hidden = hiddenSet.has(item.id)
  const fullyHidden = isFullyHidden(item, hiddenSet)
  const partiallyHidden = isPartiallyHidden(item, hiddenSet)

  // Descendent IDs used for cascade toggling
  const allIds = collectIds(item)

  function handleCheckboxChange() {
    if (fullyHidden) {
      // Restore: show this item + all descendants
      onBatch(allIds, false)
    } else {
      // Hide: hide this item + all descendants
      onBatch(allIds, true)
    }
  }

  // Visible children count for the badge
  const visibleChildCount = hasChildren
    ? item.children!.filter((c) => !hiddenSet.has(c.id)).length
    : 0

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-md py-1.5 pr-3 text-sm transition-colors select-none',
          fullyHidden ? 'opacity-40' : 'hover:bg-slate-100',
        )}
        style={{ paddingLeft: `${depth * 20 + 10}px` }}
      >
        {/* Expand/collapse chevron */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn('shrink-0', !hasChildren && 'invisible pointer-events-none')}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-slate-400 transition-transform',
              (isSearching || expanded) && 'rotate-90',
            )}
          />
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={!fullyHidden}
          ref={(el) => {
            if (el) el.indeterminate = partiallyHidden
          }}
          onChange={handleCheckboxChange}
          className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
          aria-label={`Toggle visibility of ${item.label}`}
        />

        {/* Label */}
        <span
          className={cn(
            'flex-1 truncate leading-snug',
            depth === 0 ? 'font-medium text-slate-800' : 'text-slate-600',
            fullyHidden && 'line-through text-slate-400',
          )}
        >
          <HighlightMatch label={item.label} term={searchTerm ?? ''} />
        </span>

        {/* Child visibility badge */}
        {hasChildren && (
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
              visibleChildCount === 0
                ? 'bg-rose-50 text-rose-500'
                : visibleChildCount === item.children!.length
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600',
            )}
          >
            {visibleChildCount}/{item.children!.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && (isSearching || expanded) && (
        <div>
          {item.children!.map((child) => (
            <NavTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              hiddenSet={hiddenSet}
              onBatch={onBatch}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function NavVisibilityPanel() {
  const { navItems } = useNavigationStore()
  const { settings, setNavItemsHidden, resetNavVisibility } = useDebugStore()
  const [searchTerm, setSearchTerm] = useState('')

  const hiddenSet = new Set(settings.nav.hiddenIds)
  const sorted = useMemo(
    () => navItems.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [navItems],
  )
  const displayedItems = useMemo(
    () => (searchTerm.trim() ? filterBySearch(sorted, searchTerm) : sorted),
    [sorted, searchTerm],
  )

  const allIds = sorted.flatMap((item) => collectIds(item))
  const visibleCount = allIds.filter((id) => !hiddenSet.has(id)).length
  const hasOverrides = settings.nav.hiddenIds.length > 0

  const handleBatch = useCallback(
    (ids: string[], hidden: boolean) => setNavItemsHidden(ids, hidden),
    [setNavItemsHidden],
  )

  return (
    <div className="flex h-full flex-col">
      {/* ── Search input ── */}
      <div className="shrink-0 border-b border-slate-200 px-3 py-2.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearchTerm('')}
            placeholder="Filter modules, submodules, pages…"
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-8 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs text-slate-500">
          <span className={cn('font-semibold', visibleCount === 0 ? 'text-rose-500' : 'text-slate-700')}>
            {visibleCount}
          </span>
          {' / '}
          {allIds.length} visible
          {searchTerm && (
            <span className="ml-2 text-slate-400">
              · {displayedItems.length} match{displayedItems.length !== 1 ? 'es' : ''}
            </span>
          )}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNavItemsHidden(allIds, false)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <Eye className="h-3 w-3" />
            Show all
          </button>
          <button
            type="button"
            onClick={() => setNavItemsHidden(allIds, true)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-100"
          >
            <EyeOff className="h-3 w-3" />
            Hide all
          </button>
        </div>
      </div>

      {/* ── Tree ── */}
      <div className="flex-1 overflow-y-auto py-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm font-medium">No nav items loaded</p>
            <p className="mt-1 text-xs text-slate-400">
              Navigate to any protected page to populate the tree.
            </p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-sm font-medium">No matches</p>
            <p className="mt-1 text-xs">Try a different search term</p>
          </div>
        ) : (
          displayedItems.map((item) => (
            <NavTreeItem
              key={item.id}
              item={item}
              depth={0}
              hiddenSet={hiddenSet}
              onBatch={handleBatch}
              searchTerm={searchTerm.trim() || undefined}
            />
          ))
        )}
      </div>

      {/* ── Reset bar (only when overrides are active) ── */}
      {hasOverrides && (
        <div className="shrink-0 border-t border-slate-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-amber-700">
              {settings.nav.hiddenIds.length} item
              {settings.nav.hiddenIds.length !== 1 ? 's' : ''} hidden
            </p>
            <button
              type="button"
              onClick={resetNavVisibility}
              className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
