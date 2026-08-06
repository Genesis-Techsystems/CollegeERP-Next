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

/** Min characters before a dropdown tooltip is shown (short labels need no tip). */
export const SELECT_TOOLTIP_MIN_LENGTH = 20;

type OptionTooltipProps = {
  content?: string;
  children: ReactNode;
  className?: string;
  /** When false, children render without tooltip chrome. */
  enabled?: boolean;
};

function isLongTooltipText(content?: string): content is string {
  const text = content?.trim() ?? "";
  return text.length > SELECT_TOOLTIP_MIN_LENGTH;
}

/**
 * Hover tooltip for truncated select labels (only when text is longer than
 * {@link SELECT_TOOLTIP_MIN_LENGTH} characters).
 * White background + dark text (readable on all themes). Portaled so it is not
 * clipped by the dropdown scroll container.
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
  const tipContent = isLongTooltipText(content) ? content.trim() : undefined;

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

  const show = useCallback(() => {
    if (!enabled || !tipContent) return;
    updatePosition();
    setOpen(true);
  }, [enabled, tipContent, updatePosition]);

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
    open && mounted && coords && tipContent
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[200] max-w-[min(22.5rem,calc(100vw-1rem))]",
              "rounded-md border border-slate-200 bg-white px-3 py-1.5",
              "text-[12px] font-medium leading-snug text-slate-900 shadow-md",
              "whitespace-normal break-words",
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {tipContent}
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
