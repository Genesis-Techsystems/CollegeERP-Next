import { cn } from '@/lib/utils'

// ─── FormField ────────────────────────────────────────────────────────────────
// Wraps a form control with a label and optional inline error message.
// Eliminates the repeated `<div className="space-y-1"><Label/>{children}{error}</div>`
// pattern found in every modal form across the codebase.

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  required,
  error,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
