'use client'

/**
 * MathContent — renders stored rich-text HTML with KaTeX math.
 *
 * The Tiptap Mathematics extension serializes math nodes as:
 *   <span data-type="inline-math" data-latex="x^2"></span>
 *   <div  data-type="block-math"  data-latex="x^2+y^2=r^2"></div>
 *
 * We pre-process the HTML string synchronously (useMemo) and inject
 * KaTeX-rendered HTML inside each math element before setting
 * dangerouslySetInnerHTML — so math is stable across accordion
 * expand/collapse cycles (no useEffect timing dependency).
 */

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/contrib/mhchem'
import { cn } from '@/lib/utils'

// HTML entities that may appear in data-latex attribute values
function decodeAttrEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function injectMath(html: string): string {
  // Match opening tags that contain data-type="inline-math" / data-type="block-math".
  // [^>]*? is lazy so each match stops at the first >.
  // Attribute order may vary — we extract data-latex from the captured attrs separately.

  // Inline: <span ... data-type="inline-math" ... data-latex="..." ...>
  let result = html.replace(
    /<span([^>]*?data-type="inline-math"[^>]*?)>/gi,
    (openTag, attrs) => {
      const m = attrs.match(/data-latex="([^"]*)"/)
      if (!m) return openTag
      const latex = decodeAttrEntities(m[1])
      try {
        return openTag + katex.renderToString(latex, {
          displayMode: false,
          throwOnError: false,
          strict: false,
        })
      } catch {
        return `${openTag}$${latex}$`
      }
    },
  )

  // Block: <div ... data-type="block-math" ... data-latex="..." ...>
  result = result.replace(
    /<div([^>]*?data-type="block-math"[^>]*?)>/gi,
    (openTag, attrs) => {
      const m = attrs.match(/data-latex="([^"]*)"/)
      if (!m) return openTag
      const latex = decodeAttrEntities(m[1])
      try {
        return openTag + katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
          strict: false,
        })
      } catch {
        return `${openTag}$$${latex}$$`
      }
    },
  )

  return result
}

interface MathContentProps {
  html: string
  className?: string
}

export function MathContent({ html, className }: MathContentProps) {
  const processedHtml = useMemo(() => injectMath(html), [html])

  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  )
}
