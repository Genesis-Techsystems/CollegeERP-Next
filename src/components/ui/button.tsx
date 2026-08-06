import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Angular Fuse button parity (theme-lime):
 * - default / Save → navy `#042956` (mat-accent), 5px radius
 * - Add / New → same navy, pill ends (Angular `.btn-add` / mat-raised accent)
 * - outline / Cancel → white bordered
 * - secondary / Back → white bordered (Angular Close / Back)
 *
 * Labels exactly "Back" → white back style.
 * Labels starting with Add/New (optional leading "+") → pill add style.
 */
const buttonVariants = cva(
  "app-control inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-[length:var(--app-control-font-size)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-[#042956] text-white shadow-sm hover:bg-[#031f42]",
        /** Angular toolbar Add / New (pill) */
        add: "border-0 bg-[#042956] text-white shadow-[0_2px_4px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.12)] hover:bg-[#031f42] rounded-full",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-card text-foreground shadow-sm hover:bg-muted hover:border-primary/40 hover:text-primary",
        secondary:
          "border border-[#cfcfcf] bg-white text-[#042956] shadow-sm hover:bg-[#f5f5f5]",
        /** Alias for Angular white Cancel / Back */
        back: "border border-[#cfcfcf] bg-white text-[#042956] shadow-sm hover:bg-[#f5f5f5]",
        ghost: "text-muted-foreground hover:bg-muted hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-w-[80px] px-3 py-1",
        sm: "rounded-[5px] px-2",
        lg: "rounded-[5px] px-5",
        icon: "w-[var(--app-control-height)] min-w-0 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function getNodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (React.isValidElement(node)) {
    return getNodeText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const label = getNodeText(children)
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const isBackLabel = label === "back";
    const isAddLabel = /^(?:\+\s*)?(?:add|new)\b/.test(label);
    // Force Angular Back / Add pill unless caller picked a non-primary tone.
    let resolvedVariant = variant;
    if (
      isBackLabel &&
      (variant == null ||
        variant === "outline" ||
        variant === "secondary" ||
        variant === "back" ||
        variant === "default")
    ) {
      resolvedVariant = "back";
    } else if (
      isAddLabel &&
      (variant == null || variant === "default" || variant === "add")
    ) {
      resolvedVariant = "add";
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant: resolvedVariant, size, className }),
          isAddLabel && resolvedVariant === "add" && "rounded-full px-4",
        )}
        ref={ref}
        data-app-back={isBackLabel ? "" : undefined}
        data-app-add={isAddLabel && resolvedVariant === "add" ? "" : undefined}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
