'use client'

import { Palette, Check, Sun, Moon, Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTheme, COLOR_THEMES, type ThemeMode } from './useTheme'

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export function ThemeSwitcher() {
  const { settings, updateSettings } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change theme"
          title="Theme"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <Palette className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 p-2">
        <DropdownMenuLabel className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Color theme
        </DropdownMenuLabel>

        <div className="grid grid-cols-1 gap-0.5">
          {COLOR_THEMES.map((t) => {
            const active = settings.colorScheme === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSettings({ colorScheme: t.id })}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                  active ? 'bg-accent/15 font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <span className="flex h-5 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-border">
                  <span className="h-full w-1/2" style={{ background: t.swatch[0] }} />
                  <span className="h-full w-1/2" style={{ background: t.swatch[1] }} />
                </span>
                <span className="flex-1">{t.label}</span>
                {active && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuLabel className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1">
          {MODES.map(({ id, label, icon: Icon }) => {
            const active = settings.themeMode === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => updateSettings({ themeMode: id })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
