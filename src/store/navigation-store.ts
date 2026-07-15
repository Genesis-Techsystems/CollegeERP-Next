import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { NavItem } from '@/types/navigation'

interface NavigationState {
  navItems: NavItem[]
  collapsedItems: Set<string>
  /** True once setNavItems has been called — prevents re-seeding collapsedItems on re-renders */
  navItemsSeeded: boolean
  isSidebarOpen: boolean
  isSidebarCollapsed: boolean
  /** Transient: true while mouse is over the sidebar (not persisted) */
  isSidebarHovered: boolean
  /** When true, sidebar auto-collapses to icon-only after every navigation */
  autoCollapse: boolean
  /** Which side of the screen the sidebar is docked to */
  sidebarPosition: 'left' | 'right'
  setNavItems: (items: NavItem[]) => void
  toggleCollapsed: (id: string) => void
  /**
   * Open or close one collapsible group in a single store update.
   * When opening, siblingIds are closed (accordion) in the same Set mutation.
   */
  setGroupOpen: (id: string, open: boolean, siblingIds?: string[]) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  setSidebarHovered: (hovered: boolean) => void
  toggleAutoCollapse: () => void
  setSidebarPosition: (pos: 'left' | 'right') => void
}

function collectCollapsibleItemIds(items: NavItem[]): string[] {
  const ids: string[] = []

  for (const item of items) {
    if (item.children && item.children.length > 0) {
      ids.push(item.id, ...collectCollapsibleItemIds(item.children))
    }
  }

  return ids
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      navItems: [],
      collapsedItems: new Set(),
      navItemsSeeded: false,
      isSidebarOpen: true,
      isSidebarCollapsed: false,
      isSidebarHovered: false,
      autoCollapse: false,
      sidebarPosition: 'left',

      setNavItems: (items) =>
        set((state) => ({
          navItems: items,
          // Seed collapsedItems with every collapsible node (top-level + nested)
          // on first load so all submenus start closed by default. NavItem's
          // isOpen logic still forces the active branch open via
          // `isActive ? true : !collapsedItems.has(id)`.
          ...(state.navItemsSeeded
            ? {}
            : { collapsedItems: new Set(collectCollapsibleItemIds(items)), navItemsSeeded: true }),
        })),

      toggleCollapsed: (id) =>
        set((state) => {
          const next = new Set(state.collapsedItems)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          return { collapsedItems: next }
        }),

      setGroupOpen: (id, open, siblingIds = []) =>
        set((state) => {
          const next = new Set(state.collapsedItems)
          if (open) {
            for (const siblingId of siblingIds) {
              next.add(siblingId)
            }
            next.delete(id)
          } else {
            next.add(id)
          }
          return { collapsedItems: next }
        }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarHovered: (hovered) => set({ isSidebarHovered: hovered }),
      toggleAutoCollapse: () => set((state) => ({ autoCollapse: !state.autoCollapse })),
      setSidebarPosition: (pos) => set({ sidebarPosition: pos }),
    }),
    {
      name: 'nav-settings',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences — transient hover state never persisted
      partialize: (state) => ({
        autoCollapse: state.autoCollapse,
        isSidebarCollapsed: state.isSidebarCollapsed,
        sidebarPosition: state.sidebarPosition,
      }),
    },
  ),
)
