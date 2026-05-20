'use client'

import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   SPINNER — rotating arc ring
   ───────────────────────────────────────────────────────────────────────── */

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const spinnerSizes = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-current border-t-transparent',
        'animate-spin-smooth',
        spinnerSizes[size],
        className
      )}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   DOTS LOADER — three bouncing circles
   ───────────────────────────────────────────────────────────────────────── */

interface DotsLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const dotSizes = { sm: 'h-1.5 w-1.5', md: 'h-2 w-2', lg: 'h-3 w-3' }

export function DotsLoader({ size = 'md', className }: DotsLoaderProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'rounded-full bg-current animate-bounce-dots',
            dotSizes[size]
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   BARS LOADER — three height-oscillating bars
   ───────────────────────────────────────────────────────────────────────── */

interface BarsLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const barHeights = { sm: 'h-4', md: 'h-6', lg: 'h-8' }
const barWidths  = { sm: 'w-0.5', md: 'w-1', lg: 'w-1.5' }

export function BarsLoader({ size = 'md', className }: BarsLoaderProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-end gap-0.5', className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'rounded-sm bg-current animate-bar-grow origin-bottom',
            barHeights[size],
            barWidths[size]
          )}
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROGRESS BAR — horizontal sweep (top of content area)
   ───────────────────────────────────────────────────────────────────────── */

interface ProgressBarProps {
  className?: string
}

export function ProgressBar({ className }: ProgressBarProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('relative h-0.5 w-full overflow-hidden bg-primary/15', className)}
    >
      <span className="absolute inset-y-0 w-1/2 bg-primary animate-progress rounded-full" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PULSE DOT — tiny inline status indicator
   ───────────────────────────────────────────────────────────────────────── */

interface PulseDotProps {
  color?: string
  className?: string
}

export function PulseDot({ color = 'bg-primary', className }: PulseDotProps) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      <span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse-ring',
          color
        )}
      />
      <span className={cn('relative inline-flex rounded-full h-2 w-2', color)} />
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE LOADER — full-screen overlay for route transitions
   ───────────────────────────────────────────────────────────────────────── */

interface PageLoaderProps {
  label?: string
  className?: string
}

export function PageLoader({ label = 'Loading…', className }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-background/90 backdrop-blur-sm',
        'animate-fade-in',
        className
      )}
    >
      {/* Indigo ring spinner */}
      <div className="relative flex items-center justify-center h-14 w-14">
        {/* Outer glow ring */}
        <span className="absolute h-14 w-14 rounded-full bg-primary/10 animate-pulse-ring" />
        {/* Spinning arc */}
        <Spinner size="lg" className="text-primary" />
      </div>

      <p className="mt-4 text-sm font-medium text-muted-foreground tracking-wide">
        {label}
      </p>

      {/* Thin progress bar at very bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <ProgressBar />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION LOADER — inline within a content card/section
   ───────────────────────────────────────────────────────────────────────── */

interface SectionLoaderProps {
  label?: string
  variant?: 'spinner' | 'dots' | 'bars'
  className?: string
}

export function SectionLoader({
  label,
  variant = 'dots',
  className,
}: SectionLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12',
        className
      )}
    >
      {variant === 'spinner' && <Spinner size="lg" className="text-primary/70" />}
      {variant === 'dots'    && <DotsLoader size="md" className="text-primary/70" />}
      {variant === 'bars'    && <BarsLoader size="md" className="text-primary/70" />}
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  )
}
