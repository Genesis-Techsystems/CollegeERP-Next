import { create } from 'zustand'

/**
 * Transient store that lets a page override the LAST breadcrumb segment label
 * without rewriting the whole crumb trail. Parent segments stay auto-generated
 * from the URL by `useBreadcrumb`.
 *
 * Not persisted — clears when set back to null (typically on page unmount).
 */
interface BreadcrumbState {
  lastSegmentLabel: string | null
  setLastSegmentLabel: (label: string | null) => void
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  lastSegmentLabel: null,
  setLastSegmentLabel: (label) => set({ lastSegmentLabel: label }),
}))
