'use client'

import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SidebarPosition = 'left' | 'right'

/** Switchable colour themes — each maps to a [data-theme] block in globals.css */
export type ColorScheme =
  | 'university-blue'
  | 'indigo-teal'
  | 'deep-blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'slate-teal'

export type FontSize = 'sm' | 'md' | 'lg'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeSettings {
  /** Which side the sidebar is docked to */
  sidebarPosition: SidebarPosition
  /** Active colour theme */
  colorScheme: ColorScheme
  /** Base font size for the application */
  fontSize: FontSize
  /** Light / dark / system preference */
  themeMode: ThemeMode
  /** Whether the sidebar starts collapsed */
  sidebarCollapsed: boolean
}

/** Theme metadata for switcher UIs (swatch = the visible accent colours). */
export interface ColorThemeMeta {
  id: ColorScheme
  label: string
  /** [primary, accent] swatch hex for previews */
  swatch: [string, string]
}

export const COLOR_THEMES: ColorThemeMeta[] = [
  { id: 'university-blue', label: 'University Blue', swatch: ['#185FA5', '#0C447C'] },
  { id: 'indigo-teal', label: 'Indigo & Teal', swatch: ['#4F46E5', '#14B8A6'] },
  { id: 'deep-blue', label: 'Deep Blue', swatch: ['#2563EB', '#0EA5E9'] },
  { id: 'emerald', label: 'Emerald', swatch: ['#059669', '#14B8A6'] },
  { id: 'violet', label: 'Violet', swatch: ['#7C3AED', '#D946EF'] },
  { id: 'rose', label: 'Rose', swatch: ['#E11D48', '#F97316'] },
  { id: 'amber', label: 'Amber', swatch: ['#D97706', '#FBBF24'] },
  { id: 'slate-teal', label: 'Slate Teal', swatch: ['#2A6F8E', '#3FB6A8'] },
]

// ---------------------------------------------------------------------------
// Defaults & storage key
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'erp_theme_settings'

export const DEFAULT_THEME: ThemeSettings = {
  sidebarPosition: 'left',
  colorScheme: 'university-blue',
  fontSize: 'md',
  themeMode: 'light',
  sidebarCollapsed: false,
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '13px',
  md: '15px',
  lg: '17px',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THEME
    return { ...DEFAULT_THEME, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_THEME
  }
}

function saveToStorage(settings: ThemeSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

export function applyToDocument(settings: ThemeSettings): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // --- colour theme (CSS [data-theme] block in globals.css) ---
  root.setAttribute('data-theme', settings.colorScheme)

  // --- font size ---
  root.style.setProperty('--font-size-base', FONT_SIZE_MAP[settings.fontSize])
  root.style.fontSize = FONT_SIZE_MAP[settings.fontSize]

  // --- dark / light mode ---
  const resolvedMode =
    settings.themeMode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : settings.themeMode

  root.classList.toggle('dark', resolvedMode === 'dark')

  // --- sidebar position data attribute (used by layout components) ---
  root.setAttribute('data-sidebar-position', settings.sidebarPosition)
  root.setAttribute('data-sidebar-collapsed', String(settings.sidebarCollapsed))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme() {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME)

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = loadFromStorage()
    setSettings(stored)
    applyToDocument(stored)
  }, [])

  const updateSettings = useCallback((partial: Partial<ThemeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      saveToStorage(next)
      applyToDocument(next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    saveToStorage(DEFAULT_THEME)
    applyToDocument(DEFAULT_THEME)
    setSettings(DEFAULT_THEME)
  }, [])

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}
