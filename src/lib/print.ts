"use client";

import { useEffect, useState } from "react";

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
export function usePrintMode<T extends string = string>(
  defaultDelayMs = 500,
): {
  mode: T | null;
  setMode: (m: T | null) => void;
  triggerPrint: (m: T, delayOrOptions?: number | { delayMs?: number }) => void;
} {
  const [mode, setMode] = useState<T | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reset = () => setMode(null);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  function triggerPrint(
    next: T,
    delayOrOptions?: number | { delayMs?: number },
  ): void {
    const delayMs =
      typeof delayOrOptions === "number"
        ? delayOrOptions
        : (delayOrOptions?.delayMs ?? defaultDelayMs);
    setMode(next);
    if (typeof window === "undefined") return;
    // Angular parity: seating ~500ms, attendance/stickers ~1000ms before print().
    setTimeout(() => {
      window.print();
      // Fallback reset for browsers that don't fire afterprint.
      setTimeout(() => setMode(null), 1500);
    }, delayMs);
  }

  return { mode, setMode, triggerPrint };
}

/** Print HTML in a hidden iframe — avoids AppShell @media print blank sheets. */
export function printHtmlInIframe(html: string): void {
  if (typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  const cleanup = () => frame.remove();
  win.addEventListener("afterprint", cleanup);
  const images = Array.from(fdoc.images);
  const printFrame = () => {
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(cleanup, 1500);
    }, 50);
  };
  if (images.length === 0) {
    printFrame();
    return;
  }
  let loaded = 0;
  const tryPrint = () => {
    loaded += 1;
    if (loaded >= images.length) printFrame();
  };
  for (const img of images) {
    if (img.complete) tryPrint();
    else {
      img.addEventListener("load", tryPrint);
      img.addEventListener("error", tryPrint);
    }
  }
}

/**
 * Print a rendered DOM node via iframe (Angular `window.open` + write HTML parity).
 * Copies active stylesheets so Tailwind utility classes in the capture still apply.
 */
export function printElementInIframe(el: HTMLElement, title = "Print"): void {
  if (typeof document === "undefined") return;
  const headBits = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((n) => n.outerHTML)
    .join("\n");
  const safeTitle = String(title)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
${headBits}
<style>
  html, body { margin: 0; padding: 0; background: #fff !important; color: #000; }
  @page { margin: 1cm; }
  .page-break { page-break-before: always; break-before: page; }
  [data-print-hide], .print-hide, .screen-only { display: none !important; }
</style>
</head>
<body>${el.outerHTML}</body>
</html>`);
}
