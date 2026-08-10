"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormFieldVariant } from "@/common/components/forms/form-field-variant";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * `outlined` — bordered box (default).
   * `standard` — Fuse / Angular Material underline-only field.
   * Inside GlobalFilterField, defaults to `standard` via context.
   */
  variant?: "outlined" | "standard";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant: variantProp, ...props }, ref) => {
    const variant = useFormFieldVariant(variantProp);
    const isStandard = variant === "standard";
    return (
      <input
        type={type}
        className={cn(
          "app-control flex w-full text-[length:var(--app-control-font-size)] text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-[length:var(--app-control-font-size)] file:font-medium",
          isStandard
            ? "h-9 rounded-none border-0 border-b border-black/12 bg-transparent px-0 py-1.5 shadow-none focus:border-b-2 focus:border-[#0c51a4] focus:ring-0"
            : "rounded-md border border-input bg-card px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-primary/15 focus:border-primary",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
