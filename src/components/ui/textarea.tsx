"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormFieldVariant } from "@/common/components/forms/form-field-variant";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * `outlined` — bordered box.
   * `standard` — Fuse / Angular Material underline (app default).
   */
  variant?: "outlined" | "standard";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant: variantProp, ...props }, ref) => {
    const variant = useFormFieldVariant(variantProp);
    const isStandard = variant === "standard";
    return (
      <textarea
        className={cn(
          "app-control flex w-full text-[length:var(--app-control-font-size)] text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          isStandard
            ? "min-h-[2.25rem] rounded-none border-0 border-b border-black/12 bg-transparent px-0 py-1.5 shadow-none focus:border-b-2 focus:border-[#0c51a4] focus:ring-0"
            : "rounded-md border border-input bg-card px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-primary/15 focus:border-primary",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
