'use client'

import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SidebarPosition = 'left' | 'right'

/** Curated, cohesive ERP themes. Each retheme primary + sidebar + gradient together. */
export type ColorScheme =
  | 'royal-blue'
  | 'indigo'
  | 'emerald'
  | 'violet'
  | 'slate'
  | 'rose'

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
  colorScheme: 'royal-blue',
  fontSize: 'md',
  themeMode: 'light',
  sidebarCollapsed: false,
}

/** Theme preset metadata for building the picker UI (preview swatches + labels). */
export interface ThemeMeta {
  /** Display name */
  label: string
  /** Sidebar background preview color (CSS color) */
  sidebar: string
  /** Primary / accent preview color (CSS color) */
  accent: string
}

export const THEME_META: Record<ColorScheme, ThemeMeta> = {
  'royal-blue': { label: 'Royal Blue', sidebar: 'hsl(219 100% 14%)', accent: 'hsl(230 88% 52%)' },
  indigo:       { label: 'Indigo',     sidebar: 'hsl(224 45% 12%)',  accent: 'hsl(239 84% 67%)' },
  emerald:      { label: 'Emerald',    sidebar: 'hsl(168 60% 9%)',   accent: 'hsl(160 84% 40%)' },
  violet:       { label: 'Violet',     sidebar: 'hsl(263 45% 13%)',  accent: 'hsl(262 83% 62%)' },
  slate:        { label: 'Slate',      sidebar: 'hsl(217 33% 12%)',  accent: 'hsl(213 60% 52%)' },
  rose:         { label: 'Rose',       sidebar: 'hsl(345 45% 12%)',  accent: 'hsl(347 77% 55%)' },
}

// Full cohesive token maps applied to :root via inline style. Each theme drives
// the brand primary, focus ring, the sidebar palette (background gradient, active
// pill, hover, borders) and the logo gradient — so the whole shell stays in sync.
const THEME_VARS: Record<ColorScheme, Record<string, string>> = {
  'royal-blue': {
    '--primary': '230 88% 52%',
    '--primary-foreground': '0 0% 100%',
    '--ring': '230 88% 52%',
    '--sidebar-background': '219 100% 14%',
    '--sidebar-background-end': '220 100% 11%',
    '--sidebar-surface': '222 60% 22%',
    '--sidebar-primary': '230 88% 52%',
    '--sidebar-accent': '230 88% 52%',
    '--sidebar-border': '220 60% 18%',
    '--sidebar-hover-bg': '220 55% 20%',
    '--sidebar-active-bg': '230 88% 52%',
    '--sidebar-ring': '230 88% 52%',
    '--gradient-primary': 'linear-gradient(135deg, hsl(230 88% 52%), hsl(224 90% 60%))',
  },
  indigo: {
    '--primary': '243 76% 59%',
    '--primary-foreground': '0 0% 100%',
    '--ring': '243 76% 59%',
    '--sidebar-background': '224 45% 12%',
    '--sidebar-background-end': '224 45% 8%',
    '--sidebar-surface': '224 35% 20%',
    '--sidebar-primary': '239 84% 67%',
    '--sidebar-accent': '239 84% 67%',
    '--sidebar-border': '224 30% 18%',
    '--sidebar-hover-bg': '224 35% 18%',
    '--sidebar-active-bg': '239 84% 67%',
    '--sidebar-ring': '239 84% 67%',
    '--gradient-primary': 'linear-gradient(135deg, hsl(243 76% 59%), hsl(239 84% 67%))',
  },
  emerald: {
    '--primary': '160 84% 36%',
    '--primary-foreground': '0 0% 100%',
    '--ring': '160 84% 36%',
    '--sidebar-background': '168 60% 9%',
    '--sidebar-background-end': '168 60% 6%',
    '--sidebar-surface': '166 40% 18%',
    '--sidebar-primary': '160 84% 40%',
    '--sidebar-accent': '160 84% 40%',
    '--sidebar-border': '166 35% 16%',
    '--sidebar-hover-bg': '166 40% 15%',
    '--sidebar-active-bg': '160 84% 40%',
    '--sidebar-ring': '160 84% 40%',
    '--gradient-primary': 'linear-gradient(135deg, hsl(160 84% 36%), hsl(168 80% 42%))',
  },
  violet: {
    '--primary': '262 83% 58%',
    '--primary-foreground': '0 0% 100%',
    '--ring': '262 83% 58%',
    '--sidebar-background': '263 45% 13%',
    '--sidebar-background-end': '263 45% 9%',
    '--sidebar-surface': '263 35% 22%',
    '--sidebar-primary': '262 83% 62%',
    '--sidebar-accent': '262 83% 62%',
    '--sidebar-border': '263 30% 20%',
    '--sidebar-hover-bg': '263 35% 20%',
    '--sidebar-active-bg': '262 83% 62%',
    '--sidebar-ring': '262 83% 62%',
    '--gradient-primary': 'linear-gradient(135deg, hsl(262 83% 58%), hsl(272 80% 64%))',
  },
  slate: {
    '--primary': '215 28% 30%',
    '--primary-foreground': '0 0% 100%',
    '--ring': '213 60% 52%',
    '--sidebar-background': '217 33% 12%',
    '--sidebar-background-end': '217 33% 8%',
    '--sidebar-surface': '216 25% 22%',
    '--sidebar-primary': '213 60% 52%',
    '--sidebar-accent': '213 60% 52%',
    '--sidebar-border': '216 25% 18%',
    '--sidebar-hover-bg': '216 25% 18%',
    '--sidebar-active-bg': '213 60% 52%',
    '--sidebar-ring': '213 60% 52%',
    '--gradient-primary': 'linear-gradient(135deg, hsl(215 28% 30%), hsl(213 60% 52%))',
  },
  rose: {
    '--primary': '347 77% 50%',
    '--primary-foreground': '0 0% 100%',
    '--ring': '347 77% 50%',
    '--sidebar-background': '345 45% 12%',
    '--sidebar-background-end': '345 45% 8%',
    '--sidebar-surface': '345 35% 22%',
    '--sidebar-primary': '347 77% 55%',
    '--sidebar-accent': '347 77% 55%',
    '--sidebar-border': '345 30% 20%',
    '--sidebar-hover-bg': '345 35% 20%',
    '--sidebar-active-bg': '347 77% 55%',
    '--sidebar-ring': '347 77% 55%',
    '--gradient-primary': 'linear-gradient(135deg, hsl(347 77% 50%), hsl(340 80% 58%))',
  },
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '15px',
  md: '16px',   // browser default — applying the default theme is a no-op for sizing
  lg: '18px',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THEME
    const merged = { ...DEFAULT_THEME, ...JSON.parse(raw) } as ThemeSettings
    // Coerce schemes saved by an older build (e.g. 'default'/'blue') to a valid theme
    if (!THEME_VARS[merged.colorScheme]) merged.colorScheme = DEFAULT_THEME.colorScheme
    return merged
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

  // --- theme palette (primary + sidebar + gradient, cohesive) ---
  const vars = THEME_VARS[settings.colorScheme] ?? THEME_VARS['royal-blue']
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
