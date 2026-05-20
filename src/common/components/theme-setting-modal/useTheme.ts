'use client'

import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SidebarPosition = 'left' | 'right'

export type ColorScheme =
  | 'default'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red'

export type FontSize = 'sm' | 'md' | 'lg'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeSettings {
  /** Which side the sidebar is docked to */
  sidebarPosition: SidebarPosition
  /** Primary colour palette */
  colorScheme: ColorScheme
  /** Base font size for the application */
  fontSize: FontSize
  /** Light / dark / system preference */
  themeMode: ThemeMode
  /** Whether the sidebar starts collapsed */
  sidebarCollapsed: boolean
}

// ---------------------------------------------------------------------------
// Defaults & storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'erp_theme_settings'

export const DEFAULT_THEME: ThemeSettings = {
  sidebarPosition: 'left',
  colorScheme: 'default',
  fontSize: 'md',
  themeMode: 'light',
  sidebarCollapsed: false,
}

// CSS variable maps applied to :root so Tailwind utilities pick them up
const COLOR_SCHEME_VARS: Record<ColorScheme, Record<string, string>> = {
  default: {
    '--color-primary': '221 83% 53%',
    '--color-primary-foreground': '0 0% 100%',
  },
  blue: {
    '--color-primary': '210 100% 50%',
    '--color-primary-foreground': '0 0% 100%',
  },
  green: {
    '--color-primary': '142 71% 45%',
    '--color-primary-foreground': '0 0% 100%',
  },
  purple: {
    '--color-primary': '270 60% 55%',
    '--color-primary-foreground': '0 0% 100%',
  },
  orange: {
    '--color-primary': '25 95% 53%',
    '--color-primary-foreground': '0 0% 100%',
  },
  red: {
    '--color-primary': '0 84% 60%',
    '--color-primary-foreground': '0 0% 100%',
  },
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

function applyToDocument(settings: ThemeSettings): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // --- colour scheme ---
  const vars = COLOR_SCHEME_VARS[settings.colorScheme]
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

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
