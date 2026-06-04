'use client'

import { useEffect, useState } from 'react'

/**
 * Reads the live theme tokens (--primary / --accent) from the document and
 * returns chart-ready colour strings, re-computing whenever the active
 * [data-theme] (or dark mode) on <html> changes. Lets recharts — which can't
 * resolve CSS var() in its fill/stroke attributes — follow the colour theme.
 */
export interface ThemeChartColors {
  primary: string
  accent: string
  /** Categorical series: theme primary, theme accent, then a fixed tail */
  series: string[]
}

// Fixed categorical tail (amber, rose, violet, sky, emerald, orange) — these
// stay constant across themes so multi-series charts remain distinguishable.
const TAIL = [
  '38 92% 50%',
  '347 77% 50%',
  '262 83% 58%',
  '199 89% 48%',
  '160 84% 39%',
  '24 95% 53%',
]

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v ? `hsl(${v})` : fallback
}

function compute(): ThemeChartColors {
  const primary = readVar('--primary', 'hsl(243 75% 59%)')
  const accent = readVar('--accent', 'hsl(173 70% 41%)')
  return { primary, accent, series: [primary, accent, ...TAIL.map((h) => `hsl(${h})`)] }
}

const INITIAL: ThemeChartColors = {
  primary: 'hsl(243 75% 59%)',
  accent: 'hsl(173 70% 41%)',
  series: ['hsl(243 75% 59%)', 'hsl(173 70% 41%)', ...TAIL.map((h) => `hsl(${h})`)],
}

export function useThemeColors(): ThemeChartColors {
  const [colors, setColors] = useState<ThemeChartColors>(INITIAL)

  useEffect(() => {
    setColors(compute())
    const obs = new MutationObserver(() => setColors(compute()))
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })
    return () => obs.disconnect()
  }, [])

  return colors
}
