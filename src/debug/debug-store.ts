/**
 * Debug store — Zustand store persisted to localStorage.
 *
 * Adding a new panel:
 * 1. Add a new key to DebugSettings + a DEFAULT value in DEFAULT_SETTINGS
 * 2. Add a new DebugTab literal to the DebugTab union
 * 3. Add an entry to TABS in DebugPanel.tsx
 * 4. Render the new panel component in DebugPanel.tsx's content block
 * 5. Add any new actions to this store
 *
 * Everything stays in src/debug/ — delete the folder to remove the feature.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DEBUG_STORAGE_KEY } from './constants'

// ─── Settings shape (one key per panel) ──────────────────────────────────────

export interface NavVisibilitySettings {
  /** IDs of NavItems that are hidden in the sidebar. Stored as array (JSON-safe). */
  hiddenIds: string[]
}

/**
 * Top-level settings bag — add new panels here.
 * Each key maps to one tab panel in the debug drawer.
 */
export interface DebugSettings {
  nav: NavVisibilitySettings
  // future: featureFlags: FeatureFlagSettings
  // future: mockData: MockDataSettings
  // future: apiOverrides: ApiOverrideSettings
}

const DEFAULT_SETTINGS: DebugSettings = {
  nav: { hiddenIds: [] },
}

// ─── Tab type — extend as new panels are added ────────────────────────────────

export type DebugTab = 'nav'
// future: | 'flags' | 'mock' | 'api'

// ─── Store interface ──────────────────────────────────────────────────────────

interface DebugStore {
  /** Whether the debug drawer is open */
  isOpen: boolean
  /** Currently active tab */
  activeTab: DebugTab
  /** All persisted debug settings */
  settings: DebugSettings

  // ── Drawer controls ─────────────────────────────────────────────────────
  openPanel: (tab?: DebugTab) => void
  closePanel: () => void
  togglePanel: () => void
  setActiveTab: (tab: DebugTab) => void

  // ── Nav visibility ───────────────────────────────────────────────────────
  /** Check if a nav item ID is marked as hidden */
  isNavHidden: (id: string) => boolean
  /** Toggle a single nav item ID */
  toggleNavItem: (id: string) => void
  /**
   * Set multiple nav item IDs as hidden or visible in one operation.
   * Used for "hide all descendants", "show all", etc.
   */
  setNavItemsHidden: (ids: string[], hidden: boolean) => void
  /** Remove all hidden-ID overrides, restoring full nav */
  resetNavVisibility: () => void
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useDebugStore = create<DebugStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeTab: 'nav',
      settings: DEFAULT_SETTINGS,

      // Drawer
      openPanel: (tab) =>
        set({ isOpen: true, ...(tab ? { activeTab: tab } : {}) }),
      closePanel: () => set({ isOpen: false }),
      togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Nav visibility
      isNavHidden: (id) => get().settings.nav.hiddenIds.includes(id),

      toggleNavItem: (id) =>
        set((s) => {
          const prev = s.settings.nav.hiddenIds
          const next = prev.includes(id)
            ? prev.filter((x) => x !== id)
            : [...prev, id]
          return { settings: { ...s.settings, nav: { hiddenIds: next } } }
        }),

      setNavItemsHidden: (ids, hidden) =>
        set((s) => {
          const current = new Set(s.settings.nav.hiddenIds)
          ids.forEach((id) => (hidden ? current.add(id) : current.delete(id)))
          return {
            settings: { ...s.settings, nav: { hiddenIds: [...current] } },
          }
        }),

      resetNavVisibility: () =>
        set((s) => ({
          settings: { ...s.settings, nav: { hiddenIds: [] } },
        })),
    }),
    {
      name: DEBUG_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist settings — drawer open/tab state are transient
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
)
