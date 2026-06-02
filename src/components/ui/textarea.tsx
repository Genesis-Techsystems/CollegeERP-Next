import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "app-control flex w-full rounded-md border border-input bg-card px-3 py-1.5 text-[length:var(--app-control-font-size)] text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
