import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "app-control flex w-full rounded-md border border-input bg-card px-3 py-1.5 text-[length:var(--app-control-font-size)] text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-[length:var(--app-control-font-size)] file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
