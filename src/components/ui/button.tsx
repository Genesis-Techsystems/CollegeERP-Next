import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "app-control inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[length:var(--app-control-font-size)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-0 text-white shadow bg-[linear-gradient(135deg,#1D9E75_0%,#1a6fa0_100%)] hover:bg-[linear-gradient(135deg,#1D9E75_0%,#1a6fa0_100%)]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-primary/30 bg-primary/10 text-primary shadow-sm hover:bg-primary/20",
        secondary: "bg-primary/85 text-primary-foreground shadow-sm hover:bg-primary",
        ghost: "text-primary hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-3 py-1",
        sm: "rounded-md px-2",
        lg: "rounded-md px-5",
        icon: "w-[var(--app-control-height)] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
