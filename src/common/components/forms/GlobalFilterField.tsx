"use client";

import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FormFieldVariantContext } from "@/common/components/forms/form-field-variant";

export interface GlobalFilterFieldProps {
  /** Label text shown above the control (Angular mat-form-field label). */
  label: string;
  /** Optional icon rendered before the label. */
  icon?: LucideIcon;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function GlobalFilterField({
  label,
  icon: Icon,
  className,
  style,
  children,
}: GlobalFilterFieldProps) {
  return (
    <FormFieldVariantContext.Provider value="standard">
      <div className={cn("global-filter-field", className)} style={style}>
        <div className="global-filter-field__label">
          {Icon ? (
            <Icon className="global-filter-field__icon" aria-hidden />
          ) : null}
          <span>{label}</span>
        </div>
        <div className="global-filter-field__control">{children}</div>
      </div>
    </FormFieldVariantContext.Provider>
  );
}
