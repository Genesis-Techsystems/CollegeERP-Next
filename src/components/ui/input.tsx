import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-[12px] file:font-medium",
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
