'use client'

/** Inline validation message rendered directly below a form field. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="pt-0.5 text-xs font-medium text-destructive">{message}</p>
}
