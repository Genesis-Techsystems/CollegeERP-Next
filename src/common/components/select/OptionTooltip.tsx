"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** Prefer tip when label is long; shorter labels still tip if visually truncated. */
export const SELECT_TOOLTIP_MIN_LENGTH = 20;

type OptionTooltipProps = {
  content?: string;
  children: ReactNode;
  className?: string;
  /** When false, children render without tooltip chrome. */
  enabled?: boolean;
};

function isOverflowing(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.scrollWidth > el.clientWidth + 1) return true;
  // Nested truncate target (e.g. label span inside wrapper)
  const truncated = el.querySelector<HTMLElement>(".truncate, [data-truncate]");
  if (truncated && truncated.scrollWidth > truncated.clientWidth + 1) return true;
  return false;
}

/**
 * Hover tooltip for select labels. Shown when text is truncated or longer than
 * {@link SELECT_TOOLTIP_MIN_LENGTH}. Portaled above dialogs/popovers (z-[1300]).
 */
export function OptionTooltip({
  content,
  children,
  className,
  enabled = true,
}: OptionTooltipProps) {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const tipText = content?.trim() || undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const maxW = Math.min(360, window.innerWidth - pad * 2);
    let left = rect.left;
    if (left + maxW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - maxW);
    }
    setCoords({
      top: rect.bottom + 6,
      left,
    });
  }, []);

  const shouldShowTip = useCallback(() => {
    if (!enabled || !tipText) return false;
    // Long labels always tip; shorter ones tip only when visually truncated.
    if (tipText.length >= SELECT_TOOLTIP_MIN_LENGTH) return true;
    return isOverflowing(triggerRef.current);
  }, [enabled, tipText]);

  const show = useCallback(() => {
    if (!shouldShowTip()) return;
    updatePosition();
    setOpen(true);
  }, [shouldShowTip, updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePosition]);

  const tip =
    open && mounted && coords && tipText
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className={cn(
              // Above Dialog (1100) and Popover (1200)
              "pointer-events-none fixed z-[1300] max-w-[min(22.5rem,calc(100vw-1rem))]",
              "rounded-md border border-slate-200 bg-white px-3 py-1.5",
              "text-[12px] font-medium leading-snug text-slate-900 shadow-md",
              "whitespace-normal break-words",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {tipText}
          </div>,
          document.body,
        )
      : null;

  return (
    <span
      ref={triggerRef}
      className={cn("min-w-0", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {tip}
    </span>
  );
}
