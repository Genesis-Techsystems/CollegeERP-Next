import { create } from 'zustand'
import type { NavItem } from '@/types/navigation'

interface NavigationState {
  navItems: NavItem[]
  collapsedItems: Set<string>
  isSidebarOpen: boolean
  setNavItems: (items: NavItem[]) => void
  toggleCollapsed: (id: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  navItems: [],
  collapsedItems: new Set(),
  isSidebarOpen: true,
  setNavItems: (items) => set({ navItems: items }),
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
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}))
