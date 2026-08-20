"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "app-label font-normal leading-none text-black/54 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

function withInputAsterisk(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    if (!children.includes("*")) return children;
    return children.split(/(\*)/g).map((part, index) =>
      part === "*" ? (
        <span key={index} className="text-destructive">
          *
        </span>
      ) : (
        part
      ),
    );
  }
  return children;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  >
    {withInputAsterisk(children)}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
