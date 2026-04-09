'use client'

/**
 * MathInsertModal — visual equation editor powered by MathLive.
 *
 * Key design decision: the MathLive virtual keyboard is re-parented INTO the
 * dialog's DOM via window.mathVirtualKeyboard.container. This means Radix never
 * sees keyboard clicks as "outside" the dialog — no onInteractOutside hacks needed.
 * All keyboard lifecycle management happens inside useEffect (client-only).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/contrib/mhchem' // ensures \ce{} chemistry support is loaded
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── MathLive <math-field> typed wrapper ─────────────────────────────────────

type MathFieldEl = HTMLElement & {
  getValue(fmt?: string): string
  setValue(v: string, opts?: object): void
  executeCommand(cmd: string | string[]): boolean
  focus(): void
}

function MathFieldComponent({
  fieldRef,
  onInput,
  style,
}: {
  fieldRef: React.RefObject<MathFieldEl | null>
  onInput: (e: Event) => void
  style?: React.CSSProperties
}) {
  // 'auto' shows keyboard on touch devices automatically
  return React.createElement('math-field', {
    ref: fieldRef,
    'math-virtual-keyboard-policy': 'auto',
    onInput,
    style,
  })
}

// ─── Symbol palettes ──────────────────────────────────────────────────────────

const MATH_PALETTE = [
  {
    label: 'Powers & Roots',
    symbols: [
      { display: 'x²',      insert: 'x^{2}',                       hint: 'Square' },
      { display: 'xⁿ',      insert: 'x^{n}',                       hint: 'Power' },
      { display: '√x',      insert: '\\sqrt{x}',                    hint: 'Square root' },
      { display: 'ⁿ√x',     insert: '\\sqrt[n]{x}',                 hint: 'nth root' },
      { display: 'a/b',     insert: '\\frac{a}{b}',                 hint: 'Fraction' },
      { display: '|x|',     insert: '|x|',                          hint: 'Absolute value' },
      { display: 'x⁻¹',     insert: 'x^{-1}',                      hint: 'Reciprocal' },
    ],
  },
  {
    label: 'Greek Letters',
    symbols: [
      { display: 'α', insert: '\\alpha',   hint: 'alpha' },
      { display: 'β', insert: '\\beta',    hint: 'beta' },
      { display: 'γ', insert: '\\gamma',   hint: 'gamma' },
      { display: 'δ', insert: '\\delta',   hint: 'delta' },
      { display: 'θ', insert: '\\theta',   hint: 'theta' },
      { display: 'λ', insert: '\\lambda',  hint: 'lambda' },
      { display: 'μ', insert: '\\mu',      hint: 'mu' },
      { display: 'π', insert: '\\pi',      hint: 'pi' },
      { display: 'σ', insert: '\\sigma',   hint: 'sigma' },
      { display: 'ω', insert: '\\omega',   hint: 'omega' },
      { display: 'Σ', insert: '\\Sigma',   hint: 'Sigma' },
      { display: 'Π', insert: '\\Pi',      hint: 'Pi' },
      { display: 'Δ', insert: '\\Delta',   hint: 'Delta' },
      { display: 'Ω', insert: '\\Omega',   hint: 'Omega' },
    ],
  },
  {
    label: 'Relations',
    symbols: [
      { display: '≤', insert: '\\leq',    hint: 'Less or equal' },
      { display: '≥', insert: '\\geq',    hint: 'Greater or equal' },
      { display: '≠', insert: '\\neq',    hint: 'Not equal' },
      { display: '≈', insert: '\\approx', hint: 'Approximately' },
      { display: '≡', insert: '\\equiv',  hint: 'Equivalent' },
      { display: '∝', insert: '\\propto', hint: 'Proportional' },
    ],
  },
  {
    label: 'Operators',
    symbols: [
      { display: '×', insert: '\\times',  hint: 'Multiply' },
      { display: '÷', insert: '\\div',    hint: 'Divide' },
      { display: '±', insert: '\\pm',     hint: 'Plus-minus' },
      { display: '·', insert: '\\cdot',   hint: 'Dot product' },
      { display: '∞', insert: '\\infty',  hint: 'Infinity' },
    ],
  },
  {
    label: 'Calculus',
    symbols: [
      { display: '∫',    insert: '\\int',                          hint: 'Integral' },
      { display: '∫ₐᵇ', insert: '\\int_{a}^{b}',                  hint: 'Definite integral' },
      { display: '∑',    insert: '\\sum_{i=1}^{n}',                hint: 'Sum' },
      { display: '∏',    insert: '\\prod_{i=1}^{n}',               hint: 'Product' },
      { display: 'lim',  insert: '\\lim_{x \\to 0}',               hint: 'Limit' },
      { display: 'd/dx', insert: '\\frac{d}{dx}',                  hint: 'Derivative' },
      { display: '∂',    insert: '\\frac{\\partial}{\\partial x}', hint: 'Partial derivative' },
    ],
  },
  {
    label: 'Arrows',
    symbols: [
      { display: '→', insert: '\\to',              hint: 'Right arrow' },
      { display: '←', insert: '\\leftarrow',       hint: 'Left arrow' },
      { display: '↔', insert: '\\leftrightarrow',  hint: 'Both arrows' },
      { display: '⇒', insert: '\\Rightarrow',      hint: 'Implies' },
      { display: '⇔', insert: '\\Leftrightarrow',  hint: 'If and only if' },
    ],
  },
]

const CHEM_PALETTE = [
  {
    label: 'Common Molecules',
    symbols: [
      { display: 'H₂O',      insert: 'H2O',     hint: 'Water' },
      { display: 'CO₂',      insert: 'CO2',      hint: 'Carbon dioxide' },
      { display: 'H₂SO₄',   insert: 'H2SO4',    hint: 'Sulfuric acid' },
      { display: 'HCl',      insert: 'HCl',      hint: 'Hydrochloric acid' },
      { display: 'NaOH',     insert: 'NaOH',     hint: 'Sodium hydroxide' },
      { display: 'NaCl',     insert: 'NaCl',     hint: 'Sodium chloride' },
      { display: 'NH₃',      insert: 'NH3',      hint: 'Ammonia' },
      { display: 'CH₄',      insert: 'CH4',      hint: 'Methane' },
      { display: 'C₆H₁₂O₆', insert: 'C6H12O6', hint: 'Glucose' },
    ],
  },
  {
    label: 'Reaction Arrows',
    symbols: [
      { display: '→', insert: '->',           hint: 'Reaction arrow' },
      { display: '⇌', insert: '<=>',          hint: 'Equilibrium' },
      { display: '↑', insert: '^',            hint: 'Gas produced' },
      { display: '↓', insert: 'v',            hint: 'Precipitate' },
      { display: 'Δ', insert: '->[\\Delta]',  hint: 'Heat' },
    ],
  },
  {
    label: 'States',
    symbols: [
      { display: '(s)',  insert: '(s)',  hint: 'Solid' },
      { display: '(l)',  insert: '(l)',  hint: 'Liquid' },
      { display: '(g)',  insert: '(g)',  hint: 'Gas' },
      { display: '(aq)', insert: '(aq)', hint: 'Aqueous' },
    ],
  },
  {
    label: 'Charges',
    symbols: [
      { display: 'A⁺',  insert: 'A+',     hint: 'Positive charge' },
      { display: 'A⁻',  insert: 'A-',     hint: 'Negative charge' },
      { display: 'A²⁺', insert: 'A^{2+}', hint: 'Double positive' },
      { display: 'A²⁻', insert: 'A^{2-}', hint: 'Double negative' },
    ],
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (latex: string) => void
  defaultMode?: 'math' | 'chemistry'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MathInsertModal({ open, onClose, onInsert, defaultMode = 'math' }: Props) {
  const [mode, setMode]               = useState<'math' | 'chemistry'>(defaultMode)
  const [latex, setLatex]             = useState('')
  const [preview, setPreview]         = useState('')
  const [previewError, setPreviewError] = useState(false)

  const mathFieldRef      = useRef<MathFieldEl | null>(null)
  const mathLiveLoaded    = useRef(false)

  // ── Load MathLive once (client-only: inside useEffect) ───────────────────
  useEffect(() => {
    if (mathLiveLoaded.current) return
    mathLiveLoaded.current = true
    import('mathlive').catch(() => {/* field degrades to plain input */})
  }, [])

  // ── Hide keyboard and reset field when modal closes ─────────────────────
  useEffect(() => {
    if (!open) {
      const kb = (window as any).mathVirtualKeyboard
      if (kb) kb.hide()
      setTimeout(() => mathFieldRef.current?.setValue?.(''), 300)
    }
  }, [open])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const kb = (window as any).mathVirtualKeyboard
      if (kb) kb.hide()
    }
  }, [])

  // ── Reset state when modal opens ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setMode(defaultMode)
      setLatex('')
      setPreview('')
      setPreviewError(false)
      requestAnimationFrame(() => mathFieldRef.current?.setValue?.(''))
    }
  }, [open, defaultMode])

  // ── KaTeX preview ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!latex.trim()) { setPreview(''); setPreviewError(false); return }
    try {
      const raw = mode === 'chemistry' ? `\\ce{${latex}}` : latex
      setPreview(katex.renderToString(raw, { displayMode: true, throwOnError: true }))
      setPreviewError(false)
    } catch {
      setPreviewError(true)
      setPreview('')
    }
  }, [latex, mode])

  // ── Sync MathLive field → React state ────────────────────────────────────
  const handleMathFieldInput = useCallback((e: Event) => {
    setLatex((e.target as MathFieldEl).getValue())
  }, [])

  // ── Mode switch ───────────────────────────────────────────────────────────
  const handleModeSwitch = (next: 'math' | 'chemistry') => {
    if (next === mode) return
    setMode(next)
    setLatex('')
    setPreview('')
    setPreviewError(false)
    mathFieldRef.current?.setValue?.('')
    requestAnimationFrame(() => mathFieldRef.current?.focus?.())
  }

  // ── Symbol insertion ──────────────────────────────────────────────────────
  const insertSymbol = useCallback((snippet: string) => {
    const field = mathFieldRef.current
    if (!field) return
    if (typeof field.executeCommand === 'function') {
      field.executeCommand(['insert', snippet])
      setLatex(field.getValue())
    } else {
      const next = (field.getValue?.() ?? '') + snippet
      field.setValue?.(next)
      setLatex(next)
    }
    requestAnimationFrame(() => field.focus?.())
  }, [])

  // ── Insert into editor ────────────────────────────────────────────────────
  const handleInsert = (displayMode: 'inline' | 'block') => {
    const trimmed = latex.trim()
    if (!trimmed || previewError) return
    let out: string
    if (mode === 'chemistry') {
      out = `$\\ce{${trimmed}}$`
    } else {
      out = displayMode === 'block' ? `$$${trimmed}$$` : `$${trimmed}$`
    }
    const kb = (window as any).mathVirtualKeyboard
    if (kb) kb.hide()
    onInsert(out)
    onClose()
  }

  const palette = mode === 'math' ? MATH_PALETTE : CHEM_PALETTE

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Insert Formula</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {(['math', 'chemistry'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleModeSwitch(m) }}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                mode === m
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'math' ? '∑ Math' : '⚗ Chemistry'}
            </button>
          ))}
        </div>

        {/* MathLive visual input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {mode === 'math'
                ? 'Type LaTeX or click symbols below.'
                : 'Type a formula or reaction (e.g. H2O, 2H2 + O2 -> 2H2O).'}
            </p>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                // Client-only: show keyboard
                const kb = (window as any).mathVirtualKeyboard
                if (kb) kb.show()
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              ⌨ Keyboard
            </button>
          </div>

          <MathFieldComponent
            fieldRef={mathFieldRef}
            onInput={handleMathFieldInput}
            style={{
              width: '100%',
              minHeight: '56px',
              fontSize: '1.2rem',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              padding: '8px 12px',
              background: 'hsl(var(--background))',
              fontFamily: 'inherit',
              display: 'block',
            }}
          />

          {mode === 'chemistry' && (
            <p className="text-xs text-muted-foreground">
              Auto-wrapped as <code className="bg-muted px-1 rounded">\ce&#123;…&#125;</code>
            </p>
          )}
        </div>

        {/* Live KaTeX preview */}
        <div className={cn(
          'min-h-[64px] rounded-md border px-4 py-3 flex items-center justify-center overflow-x-auto',
          previewError ? 'border-red-300 bg-red-50' : 'border-input bg-muted/30',
        )}>
          {previewError ? (
            <span className="text-sm text-red-500">Invalid formula — check your syntax</span>
          ) : preview ? (
            <span dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <span className="text-sm text-muted-foreground">Preview appears here…</span>
          )}
        </div>

        {/* Symbol palette */}
        <div className="space-y-3">
          {palette.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.symbols.map((sym) => (
                  <button
                    key={sym.insert}
                    type="button"
                    title={sym.hint}
                    onPointerDown={(e) => { e.preventDefault(); insertSymbol(sym.insert) }}
                    className="rounded border border-input bg-background px-2 py-1 text-sm hover:bg-muted transition-colors font-mono"
                  >
                    {sym.display}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onClose}
          >
            Cancel
          </Button>
          {mode === 'math' && (
            <Button
              type="button"
              variant="outline"
              disabled={!latex.trim() || previewError}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => handleInsert('inline')}
            >
              Insert Inline ($…$)
            </Button>
          )}
          <Button
            type="button"
            disabled={!latex.trim() || previewError}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => handleInsert(mode === 'chemistry' ? 'inline' : 'block')}
          >
            {mode === 'chemistry' ? 'Insert' : 'Insert Block ($$…$$)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
