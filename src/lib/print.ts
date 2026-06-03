'use client'

import { useEffect, useState } from 'react'

/**
 * Conditional-render print mode.
 *
 * Pages call `setMode("seating")` (or whatever string they care about) and
 * then render the corresponding print layout instead of the normal UI when
 * `mode` is set. `triggerPrint` flips the mode, waits two animation frames
 * so React has a chance to render the new layout, then opens the browser
 * print dialog. The mode resets on the `afterprint` event, with a 1s
 * fallback for browsers that don't fire it.
 *
 * Usage:
 *   const { mode, triggerPrint } = usePrintMode()
 *   if (mode === 'seating') return <SeatingPrint ... />
 *   return <NormalUI onPrint={() => triggerPrint('seating')} />
 */
export function usePrintMode<T extends string = string>(): {
  mode: T | null
  setMode: (m: T | null) => void
  triggerPrint: (m: T) => void
} {
  const [mode, setMode] = useState<T | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reset = () => setMode(null)
    window.addEventListener('afterprint', reset)
    return () => window.removeEventListener('afterprint', reset)
  }, [])

  function triggerPrint(next: T): void {
    setMode(next)
    if (typeof window === 'undefined') return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
        // Fallback reset for browsers that don't fire afterprint.
        setTimeout(() => setMode(null), 1500)
      })
    })
  }

  return { mode, setMode, triggerPrint }
}
