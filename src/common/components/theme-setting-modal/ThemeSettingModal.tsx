'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  useTheme,
  type ColorScheme,
  type FontSize,
  type SidebarPosition,
  type ThemeMode,
} from './useTheme'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import { Monitor, Moon, Sun, PanelLeft, PanelRight, RotateCcw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ThemeSettingModalProps {
  isOpen: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Small selector helpers
// ---------------------------------------------------------------------------

interface OptionButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

function OptionButton({ active, onClick, children, className }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Accessible toggle switch
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  id?: string
}

function ToggleSwitch({ checked, onChange, id }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Color swatches
// ---------------------------------------------------------------------------

const COLOR_SWATCHES: { scheme: ColorScheme; label: string; bg: string }[] = [
  { scheme: 'indigo-teal', label: 'Indigo & Teal', bg: 'bg-indigo-600' },
  { scheme: 'deep-blue',   label: 'Deep Blue',     bg: 'bg-blue-600' },
  { scheme: 'emerald',     label: 'Emerald',       bg: 'bg-emerald-600' },
  { scheme: 'violet',      label: 'Violet',        bg: 'bg-violet-600' },
  { scheme: 'rose',        label: 'Rose',          bg: 'bg-rose-600' },
  { scheme: 'amber',       label: 'Amber',         bg: 'bg-amber-600' },
  { scheme: 'slate-teal',  label: 'Slate Teal',    bg: 'bg-cyan-700' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThemeSettingModal({ isOpen, onClose }: ThemeSettingModalProps) {
  const { settings, updateSettings, resetSettings } = useTheme()
  const { setSidebarPosition } = useNavigationStore()

  function handleSidebarPositionChange(pos: SidebarPosition) {
    updateSettings({ sidebarPosition: pos })
    setSidebarPosition(pos)
  }

  function handleReset() {
    resetSettings()
    setSidebarPosition('left')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Theme Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Customize the application appearance including theme, colors, font size, and sidebar
            preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">

          {/* ── Appearance (light / dark / system) ─────────────────────── */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Appearance
            </Label>
            <div className="flex gap-2">
              {(
                [
                  { mode: 'light',  label: 'Light',  Icon: Sun },
                  { mode: 'dark',   label: 'Dark',   Icon: Moon },
                  { mode: 'system', label: 'System', Icon: Monitor },
                ] as {
                  mode: ThemeMode
                  label: string
                  Icon: React.ComponentType<{ className?: string }>
                }[]
              ).map(({ mode, label, Icon }) => (
                <OptionButton
                  key={mode}
                  active={settings.themeMode === mode}
                  onClick={() => updateSettings({ themeMode: mode })}
                  className="flex-1"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </OptionButton>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Color Scheme ────────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Color Scheme
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map(({ scheme, label, bg }) => (
                <button
                  key={scheme}
                  type="button"
                  title={label}
                  aria-label={`Color scheme: ${label}`}
                  aria-pressed={settings.colorScheme === scheme}
                  onClick={() => updateSettings({ colorScheme: scheme })}
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    bg,
                    settings.colorScheme === scheme
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'opacity-70 hover:opacity-100',
                  )}
                >
                  {settings.colorScheme === scheme && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              Selected: {settings.colorScheme}
            </p>
          </section>

          <Separator />

          {/* ── Sidebar Position ────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Sidebar Position
            </Label>
            <div className="flex gap-2">
              {(
                [
                  { pos: 'left',  label: 'Left',  Icon: PanelLeft },
                  { pos: 'right', label: 'Right', Icon: PanelRight },
                ] as {
                  pos: SidebarPosition
                  label: string
                  Icon: React.ComponentType<{ className?: string }>
                }[]
              ).map(({ pos, label, Icon }) => (
                <OptionButton
                  key={pos}
                  active={settings.sidebarPosition === pos}
                  onClick={() => handleSidebarPositionChange(pos)}
                  className="flex-1"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </OptionButton>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Font Size ───────────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Font Size
            </Label>
            <div className="flex gap-2">
              {(
                [
                  { size: 'sm', label: 'Small' },
                  { size: 'md', label: 'Medium' },
                  { size: 'lg', label: 'Large' },
                ] as { size: FontSize; label: string }[]
              ).map(({ size, label }) => (
                <OptionButton
                  key={size}
                  active={settings.fontSize === size}
                  onClick={() => updateSettings({ fontSize: size })}
                  className="flex-1"
                >
                  {label}
                </OptionButton>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Sidebar Collapsed ───────────────────────────────────────── */}
          <section className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="sidebar-collapsed-toggle"
                className="text-sm font-medium cursor-pointer"
              >
                Collapsed Sidebar by Default
              </Label>
              <span className="text-xs text-muted-foreground">
                Start with the sidebar minimized on page load
              </span>
            </div>
            <ToggleSwitch
              id="sidebar-collapsed-toggle"
              checked={settings.sidebarCollapsed}
              onChange={(next) => updateSettings({ sidebarCollapsed: next })}
            />
          </section>

        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="mr-auto gap-1"
            aria-label="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
